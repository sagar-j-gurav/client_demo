"""RAG engine for document indexing and retrieval."""

import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
    Document,
    Settings as LlamaSettings
)
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.prompts import PromptTemplate
from app.core.config import get_settings
from app.core.models import DocumentType, SourceChunk
from app.core.document_processor import create_text_splitter
from app.core.conversation_handler import ConversationHandler
from app.core.error_handler import create_error_response, handle_openai_error, UserFriendlyError

logger = logging.getLogger(__name__)

# Fallback error messages for consistent user-friendly error handling
FALLBACK_MESSAGES = {
    "TECHNICAL_ERROR": (
        "Sorry, I’m having a bit of trouble right now. "
        "Please try again shortly, or reach out to the TESCOM team here: "
        "https://tescom.co.in/contact-us/"
    ),
    "OPENAI_ERROR": (
        "I’m not able to respond at the moment. "
        "Please give it another try in a little while, or contact TESCOM support: "
        "https://tescom.co.in/contact-us/"
    ),
    "NO_DOCUMENTS": (
        "I don’t have any information to share with you just yet. "
        "Please add some details first so I can help you better."
    ),
    "NO_RELEVANT_CONTENT": (
        "I couldn’t find anything related to your question in the information I have. "
        "You might try rephrasing, or you can reach out to the TESCOM team for support: "
        "https://tescom.co.in/contact-us/"
    ),
    "EMPTY_QUERY": (
        "I didn’t catch your question. Could you please ask me something specific? "
        "I’m here to help with anything related to TESCOM!"
    ),
    "PROCESSING_ERROR": (
        "I’m having a little difficulty right now. "
        "Please try again in a moment or rephrase your question."
    )
}


class RAGEngine:
    """Main RAG engine for document indexing and retrieval."""
    
    def __init__(self):
        """Initialize the RAG engine."""
        self.settings = get_settings()
        self._setup_llm_settings()
        self._initialize_chroma()
        self._initialize_index()
        self._setup_prompts()
        self.conversation_handler = ConversationHandler()
    
    def _setup_llm_settings(self):
        """Configure LlamaIndex global settings."""
        # Set up embedding model
        self.embed_model = OpenAIEmbedding(
            model=self.settings.embedding_model,
            api_key=self.settings.openai_api_key
        )
        LlamaSettings.embed_model = self.embed_model
        
        # Set up LLM
        self.llm = OpenAI(
            model=self.settings.llm_model,
            api_key=self.settings.openai_api_key,
            temperature=self.settings.llm_temperature,
            max_tokens=1000  # Ensure sufficient tokens for response
        )
        LlamaSettings.llm = self.llm
        
        # Set default chunk settings
        LlamaSettings.chunk_size = self.settings.default_chunk_size
        LlamaSettings.chunk_overlap = self.settings.default_chunk_overlap
    
    def _setup_prompts(self):
        """Setup custom prompts for the RAG system with Tess as TESCOM's assistant."""
        self.qa_prompt_template = PromptTemplate(
            """You are Tess, the friendly virtual assistant from TESCOM. 
    Your job is to answer user questions based only on the given context, while keeping a warm, approachable, and professional tone.

    Context:
    {context_str}

    Guidelines for Tess's response:
    - **Stay Natural & Approachable:** Write in a friendly, conversational tone. Do not start every response with "Hello!" or "Hi!" unless the user greets you first.  
    - **Answer Clearly (when context is available):** If the context has the answer, explain it simply and conversationally.  
    - **Handle Semantic Queries:** Look for related concepts even if exact words don't match. For example, "specialties", "capabilities", "services", "solutions" are often related.
    - **Use Context Wisely:** Extract relevant information even if it's not perfectly worded like the question.
    - **Handle Missing Context Gracefully:** If the context does not provide the answer, acknowledge it politely and guide the user.  
    - **Keep it Concise & Easy to Read:** Responses should be short, clear, and helpful.  
    - **Suggest Follow-Ups Only if Relevant:** Offer a follow-up question only when the context contains extra details the user hasn't asked about yet. Otherwise, don't force it.  
    - **Represent TESCOM Always:** Make sure the response reflects that Tess is TESCOM's assistant. Use phrasing like "At TESCOM…" or "Our TESCOM team…" when helpful.  

    User Question: {query_str}

    Tess's Answer: """
        )

    def _initialize_chroma(self):
        """Initialize ChromaDB client and collection."""
        try:
            # Initialize ChromaDB client
            self.chroma_client = chromadb.PersistentClient(
                path=self.settings.chroma_persist_dir,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection
            self.collection = self.chroma_client.get_or_create_collection(
                name=self.settings.chroma_collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            
            logger.info(f"ChromaDB initialized with collection: {self.settings.chroma_collection_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise
    
    def _initialize_index(self):
        """Initialize or load the vector store index."""
        try:
            # Create vector store
            self.vector_store = ChromaVectorStore(
                chroma_collection=self.collection
            )
            
            # Create storage context
            self.storage_context = StorageContext.from_defaults(
                vector_store=self.vector_store
            )
            
            # Create or load index
            if self.collection.count() > 0:
                # Load existing index
                self.index = VectorStoreIndex.from_vector_store(
                    vector_store=self.vector_store,
                    storage_context=self.storage_context
                )
                logger.info(f"Loaded existing index with {self.collection.count()} vectors")
            else:
                # Create new index
                self.index = VectorStoreIndex(
                    nodes=[],
                    storage_context=self.storage_context
                )
                logger.info("Created new empty index")
                
        except Exception as e:
            logger.error(f"Failed to initialize index: {e}")
            raise
    
    def index_documents(
        self,
        documents: List[Document],
        document_type: DocumentType
    ) -> Dict[str, Any]:
        """Index documents into the vector store.
        
        Args:
            documents: List of documents to index
            document_type: Type of documents being indexed
            
        Returns:
            Indexing statistics
        """
        try:
            # Create appropriate text splitter
            text_splitter = create_text_splitter(document_type)
            
            # Process documents into nodes
            nodes = []
            for doc in documents:
                doc_nodes = text_splitter.get_nodes_from_documents([doc])
                nodes.extend(doc_nodes)
            
            # Add nodes to index
            self.index.insert_nodes(nodes)
            
            stats = {
                "documents_processed": len(documents),
                "chunks_created": len(nodes),
                "total_vectors": self.collection.count()
            }
            
            logger.info(f"Indexed {len(nodes)} chunks from {len(documents)} documents")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to index documents: {e}")
            raise

    def query(
        self,
        query_text: str,
        document_type: Optional[DocumentType] = None,
        top_k: int = 5,
        include_sources: bool = True
    ) -> Dict[str, Any]:
        """Query the RAG system with proper document retrieval and LLM generation.
        
        Args:
            query_text: User query
            document_type: Optional filter by document type
            top_k: Number of chunks to retrieve
            include_sources: Whether to include source chunks
            
        Returns:
            Query response with answer and sources
        """
        try:
            # Try conversation handler first using our existing LLM
            conversation_response = self.conversation_handler.handle_query(
                query_text,
                llm=self.llm  # Use the existing configured LLM
            )
            if conversation_response:
                return conversation_response

            # Step 1: Expand query for better semantic matching
            expanded_queries = self._expand_query(query_text)
            logger.info(f"Expanded query '{query_text}' to: {expanded_queries}")
            
            # Step 2: Retrieve relevant documents using expanded queries
            all_retrieved_nodes = []
            
            # Create retriever with filters
            filters = None
            if document_type:
                filters = {"document_type": document_type.value}
                logger.info(f"Applying document type filter: {document_type.value}")
            
            # Configure retriever with increased top_k for better recall
            enhanced_top_k = max(top_k, 8)  # Ensure we get at least 8 candidates
            retriever = VectorIndexRetriever(
                index=self.index,
                similarity_top_k=enhanced_top_k,
                filters=filters
            )
            
            for query in expanded_queries:
                logger.info(f"Retrieving documents for query: {query}")
                # Retrieve nodes for this query variant
                nodes = retriever.retrieve(query)
                all_retrieved_nodes.extend(nodes)
            
            # Remove duplicates and sort by score
            seen_ids = set()
            retrieved_nodes = []
            for node in sorted(all_retrieved_nodes, key=lambda x: x.score, reverse=True):
                if node.node.id_ not in seen_ids:
                    retrieved_nodes.append(node)
                    seen_ids.add(node.node.id_)
            
            logger.info(f"Retrieved {len(retrieved_nodes)} unique nodes from expanded queries")
            
            # Step 2: Filter nodes by similarity score with adaptive threshold
            # Use a lower threshold for better recall, especially for semantic queries
            similarity_threshold = 0.3  # Lowered from 0.5 for better semantic matching
            relevant_nodes = [
                node for node in retrieved_nodes 
                if node.score >= similarity_threshold
            ]
            
            # If no nodes meet threshold, use top 2 nodes anyway for fallback
            if not relevant_nodes and retrieved_nodes:
                relevant_nodes = retrieved_nodes[:2]
                logger.info(f"No nodes above threshold {similarity_threshold}, using top {len(relevant_nodes)} nodes as fallback")
            
            logger.info(f"Filtered to {len(relevant_nodes)} relevant nodes (score >= {similarity_threshold})")
            
            # Step 3: Prepare context from retrieved documents
            if not relevant_nodes:
                logger.warning("No relevant documents found for the query")
                answer = FALLBACK_MESSAGES["NO_RELEVANT_CONTENT"]
            else:
                # Combine retrieved text as context
                context_parts = []
                for i, node in enumerate(relevant_nodes, 1):
                    context_parts.append(f"[Document {i}]:\n{node.node.text}\n")
                
                context_str = "\n".join(context_parts)
                
                # Log context size
                logger.info(f"Context prepared with {len(context_str)} characters from {len(relevant_nodes)} documents")
                
                # Step 4: Generate answer using LLM with context
                logger.info("Generating answer using LLM...")
                
                formatted_prompt = self.qa_prompt_template.format(
                    context_str=context_str,
                    query_str=query_text
                )
                
                llm_response = self.llm.complete(formatted_prompt)
                answer = str(llm_response)
                
                logger.info(f"Generated answer with {len(answer)} characters")
            
            # Step 5: Prepare response with sources
            result = {
                "answer": answer,
                "sources": []
            }
            
            # Add source chunks if requested
            if include_sources and relevant_nodes:
                for node in relevant_nodes[:3]:  # Limit to top 3 sources for readability
                    source = SourceChunk(
                        text=node.node.text[:500] + "..." if len(node.node.text) > 500 else node.node.text,
                        score=node.score,
                        metadata=node.node.metadata,
                        chunk_id=node.node.id_
                    )
                    result["sources"].append(source.dict())
                
                logger.info(f"Added {len(result['sources'])} source chunks to response")
            
            return result
                
        except Exception as e:
            if isinstance(e, UserFriendlyError):
                return {"answer": str(e), "sources": []}
            elif "openai" in str(e).lower():
                logger.error(f"OpenAI error: {e}", exc_info=True)
                return {"answer": FALLBACK_MESSAGES["OPENAI_ERROR"], "sources": []}
            else:
                logger.error(f"Query failed: {e}", exc_info=True)
                return {"answer": FALLBACK_MESSAGES["TECHNICAL_ERROR"], "sources": []}
        



    
    def query_with_streaming(
        self,
        query_text: str,
        document_type: Optional[DocumentType] = None,
        top_k: int = 5
    ):
        """Query with streaming response for real-time output.
        
        This method yields tokens as they are generated for a better UX.
        """
        try:
            # Validate inputs
            if not query_text or not query_text.strip():
                yield FALLBACK_MESSAGES["EMPTY_QUERY"]
                return

            # Check if there are any documents in the index
            if self.collection.count() == 0:
                yield FALLBACK_MESSAGES["NO_DOCUMENTS"]
                return
            
            # Retrieve relevant documents
            filters = None
            if document_type:
                filters = {"document_type": document_type.value}
            
            try:
                retriever = VectorIndexRetriever(
                    index=self.index,
                    similarity_top_k=top_k,
                    filters=filters
                )
                
                retrieved_nodes = retriever.retrieve(query_text)
                # Use same adaptive threshold for streaming
                relevant_nodes = [n for n in retrieved_nodes if n.score >= 0.3]
                
                # Fallback for streaming as well
                if not relevant_nodes and retrieved_nodes:
                    relevant_nodes = retrieved_nodes[:2]
                
                if not relevant_nodes:
                    yield FALLBACK_MESSAGES["NO_RELEVANT_CONTENT"]
                    return
                
                # Prepare context
                context = "\n".join([f"[{i}]: {n.node.text}" for i, n in enumerate(relevant_nodes, 1)])
                
                # Stream response from LLM
                prompt = self.qa_prompt_template.format(
                    context_str=context,
                    query_str=query_text
                )
                
                # Stream tokens
                streaming_response = self.llm.stream_complete(prompt)
                for token in streaming_response:
                    yield token.delta
                    
            except Exception as llm_error:
                # Handle OpenAI specific errors
                if "openai" in str(llm_error).lower():
                    yield FALLBACK_MESSAGES["OPENAI_ERROR"]
                else:
                    yield FALLBACK_MESSAGES["PROCESSING_ERROR"]
                logger.error(f"LLM error in streaming: {llm_error}", exc_info=True)
                return
                
        except Exception as e:
            logger.error(f"Unexpected error in streaming query: {e}", exc_info=True)
            yield FALLBACK_MESSAGES["TECHNICAL_ERROR"]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG engine statistics."""
        try:
            # Get document type counts
            doc_type_counts = {}
            if self.collection.count() > 0:
                # Query collection for unique document types
                results = self.collection.get(limit=1000)
                if results and 'metadatas' in results:
                    for metadata in results['metadatas']:
                        if metadata and 'document_type' in metadata:
                            doc_type = metadata['document_type']
                            doc_type_counts[doc_type] = doc_type_counts.get(doc_type, 0) + 1
            
            return {
                "total_vectors": self.collection.count(),
                "document_types": doc_type_counts,
                "index_ready": self.collection.count() > 0,
                "embedding_model": self.settings.embedding_model,
                "llm_model": self.settings.llm_model
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                "total_vectors": 0,
                "document_types": {},
                "index_ready": False
            }
    
    def clear_index(self):
        """Clear all documents from the index."""
        try:
            self.chroma_client.delete_collection(self.settings.chroma_collection_name)
            self._initialize_chroma()
            self._initialize_index()
            logger.info("Index cleared successfully")
        except Exception as e:
            logger.error(f"Failed to clear index: {e}")
            raise
    
    def health_check(self) -> Dict[str, Any]:
        """Check health of RAG engine components."""
        health = {
            "chroma_connected": False,
            "openai_configured": False,
            "index_ready": False
        }
        
        try:
            # Check ChromaDB
            self.chroma_client.heartbeat()
            health["chroma_connected"] = True
        except:
            pass
        
        # Check OpenAI configuration
        health["openai_configured"] = bool(self.settings.openai_api_key)
        
        # Check index
        try:
            health["index_ready"] = self.collection.count() > 0
        except:
            pass
        
        return health
    
    def _expand_query(self, query_text: str) -> List[str]:
        """Expand query with semantic variations for better retrieval.
        
        Args:
            query_text: Original user query
            
        Returns:
            List of query variations including the original
        """
        # Start with original query
        queries = [query_text.strip()]
        
        # Define semantic expansions for common terms
        expansions = {
            "specialties": ["capabilities", "services", "solutions", "expertise", "competencies", "offerings"],
            "capabilities": ["specialties", "services", "solutions", "expertise", "competencies"],
            "services": ["specialties", "capabilities", "solutions", "offerings", "expertise"],
            "solutions": ["specialties", "capabilities", "services", "offerings", "expertise"],
            "expertise": ["specialties", "capabilities", "services", "solutions", "competencies"],
            "core": ["main", "primary", "key", "principal", "fundamental"],
            "main": ["core", "primary", "key", "principal"],
            "primary": ["core", "main", "key", "principal"],
            "what do you do": ["services", "capabilities", "specialties", "solutions"],
            "what can you do": ["services", "capabilities", "specialties", "solutions"],
            "about": ["overview", "information", "details"],
            "company": ["organization", "business", "firm", "tescom"],
            "tescom": ["company", "organization", "business"]
        }
        
        # Convert to lowercase for matching
        query_lower = query_text.lower()
        
        # Add expanded variations
        for term, synonyms in expansions.items():
            if term in query_lower:
                for synonym in synonyms:
                    # Replace the term with synonym
                    expanded = query_lower.replace(term, synonym)
                    if expanded != query_lower and expanded not in [q.lower() for q in queries]:
                        queries.append(expanded)
        
        # Add some specific query patterns for common questions
        if any(word in query_lower for word in ["what", "core", "special"]):
            if "special" in query_lower:
                queries.extend([
                    "core specialities",
                    "main services",
                    "primary capabilities",
                    "key solutions"
                ])
        
        # Limit to avoid too many queries
        return queries[:5]