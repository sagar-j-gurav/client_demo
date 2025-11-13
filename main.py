"""Main FastAPI application for RAG system."""

import logging
import time
from pathlib import Path
from typing import Optional
import tempfile
import shutil
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import get_settings
from app.core.models import (
    DocumentType,
    UploadResponse,
    QueryRequest,
    QueryResponse,
    HealthResponse,
    ErrorResponse
)
from app.core.document_processor import DocumentProcessor
from app.core.rag_engine import RAGEngine
from app.core.api_error_handler import handle_error
from app.core.error_handler import UserFriendlyError

# Register error handlers
app.exception_handler(Exception)(handle_error)  # Register global error handler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
rag_engine: Optional[RAGEngine] = None
doc_processor: Optional[DocumentProcessor] = None
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global rag_engine, doc_processor
    
    # Startup
    logger.info("Starting RAG FastAPI application...")
    try:
        rag_engine = RAGEngine()
        doc_processor = DocumentProcessor()
        logger.info("RAG engine initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG engine: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down RAG FastAPI application...")


# Initialize FastAPI app
app = FastAPI(
    title="RAG FastAPI Application",
    description="Production-ready RAG system with LlamaIndex and ChromaDB",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register error handlers
app.exception_handler(Exception)(handle_error)  # Global error handler


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "message": "RAG FastAPI Application",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/chatbot/api/upload",
            "query": "/chatbot/api/query",
            "health": "/chatbot/api/health",
            "stats": "/chatbot/api/stats"
        }
    }


@app.post(
    "/chatbot/api/upload",
    response_model=UploadResponse,
    tags=["Documents"],
    summary="Upload and index a document"
)
async def upload_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...)
):
    """Upload and index a document.
    
    Accepts either:
    - Excel file (.xlsx) for FAQ documents
    - Text file (.txt) for website or policy documents
    """
    start_time = time.time()
    tmp_path = None
    
    # Validate file size
    if file.size > settings.max_upload_size_mb * 1024 * 1024:
        raise UserFriendlyError(
            f"The file is too large. Please upload a file smaller than {settings.max_upload_size_mb}MB."
        )
    
    # Validate file type
    file_extension = Path(file.filename).suffix.lower()
    
    if document_type == DocumentType.FAQ and file_extension not in ['.xlsx', '.xls']:
        raise UserFriendlyError(
            "For FAQ documents, please upload an Excel file (.xlsx or .xls)."
        )
    
    if document_type in [DocumentType.WEBSITE, DocumentType.POLICY] and file_extension != '.txt':
        raise UserFriendlyError(
            "For website and policy documents, please upload a text file (.txt)."
        )
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
        # Save uploaded file
        content = await file.read()
        tmp_file.write(content)
        tmp_file.flush()
        
        tmp_path = Path(tmp_file.name)
        
        # Process document
        documents, metadata = doc_processor.process_document(
            file_path=tmp_path,
            document_type=document_type,
            additional_metadata={"original_filename": file.filename}
        )
        
        # Index documents
        stats = rag_engine.index_documents(documents, document_type)
        
        # Clean up temporary file
        if tmp_path.exists():
            tmp_path.unlink()
        
        # Prepare response
        response = UploadResponse(
            success=True,
            message=f"Successfully indexed {file.filename}",
            document_id=metadata.get("document_id"),
            document_type=document_type,
            chunks_created=stats["chunks_created"],
            metadata={
                **metadata,
                **stats,
                "processing_time_seconds": time.time() - start_time
            }
        )
        
        return response


@app.post(
    "/chatbot/api/query",
    response_model=QueryResponse,
    tags=["Query"],
    summary="Query the RAG system"
)
async def query_rag(request: QueryRequest):
    """Query the RAG system with a user question."""
    start_time = time.time()
    
    # Input validation
    if not request.query or not request.query.strip():
        raise UserFriendlyError("I didn't receive a question. Could you please ask me something?")
    
    # Execute query
    result = rag_engine.query(
        query_text=request.query,
        document_type=request.document_type,
        top_k=request.top_k,
        include_sources=request.include_sources
    )
    
    # Determine which document types were searched
    if request.document_type:
        doc_types_searched = [request.document_type.value]
    else:
        stats = rag_engine.get_stats()
        doc_types_searched = list(stats.get("document_types", {}).keys())
    
    # Prepare response
    response = QueryResponse(
        query=request.query,
        answer=result["answer"],
        sources=result.get("sources") if request.include_sources else None,
        document_types_searched=doc_types_searched,
        processing_time_ms=(time.time() - start_time) * 1000,
        metadata={
            "top_k_used": request.top_k,
            "model_used": settings.llm_model
        }
    )
    
    return response


@app.get(
    "/chatbot/api/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check endpoint"
)
async def health_check():
    """Check system health."""
    health = rag_engine.health_check()
    stats = rag_engine.get_stats()
    
    return HealthResponse(
        status="healthy" if all(health.values()) else "unhealthy",
        chroma_connected=health["chroma_connected"],
        openai_configured=health["openai_configured"],
        total_documents=stats["total_vectors"]
    )


@app.get(
    "/chatbot/api/stats",
    tags=["System"],
    summary="Get system statistics"
)
async def get_stats():
    """Get RAG system statistics."""
    stats = rag_engine.get_stats()
    return {
        "success": True,
        "stats": stats
    }


@app.delete(
    "/chatbot/api/clear",
    tags=["System"],
    summary="Clear all indexed documents"
)
async def clear_index():
    """Clear all documents from the index."""
    try:
        rag_engine.clear_index()
        return {
            "success": True,
            "message": "Index cleared successfully"
        }
    except Exception as e:
        logger.error(f"Clear index error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear index: {str(e)}"
        )


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=str(exc)
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc) if settings.reload else None
        ).dict()
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level="info"
    )