"""FastAPI error handling utilities."""

from typing import Dict, Any, Union
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.error_handler import UserFriendlyError

logger = logging.getLogger(__name__)


async def handle_error(request: Request, exc: Exception) -> JSONResponse:
    """Global error handler for FastAPI endpoints.
    
    Args:
        request: The FastAPI request
        exc: The exception that was raised
        
    Returns:
        A JSONResponse with a user-friendly error message
    """
    # Log the error
    logger.error(f"Error handling request {request.url}: {exc}", exc_info=True)
    
    # Define response structure
    response_data = {
        "success": False,
        "error": {
            "type": exc.__class__.__name__,
            "message": "We're experiencing technical difficulties. Please try again later.",
        }
    }
    
    # Handle different error types
    if isinstance(exc, UserFriendlyError):
        # Our custom user-friendly errors
        response_data["error"]["message"] = str(exc)
        return JSONResponse(
            status_code=400,
            content=response_data
        )
    
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        # FastAPI/Starlette HTTP exceptions
        response_data["error"]["message"] = exc.detail
        return JSONResponse(
            status_code=exc.status_code,
            content=response_data
        )
        
    if "openai" in str(exc).lower():
        # OpenAI API errors
        response_data["error"]["message"] = (
            "We're having trouble connecting to our AI service. "
            "Please try again in a few moments or contact TESCOM support "
            "at https://tescom.co.in/contact-us/ for assistance."
        )
        return JSONResponse(
            status_code=503,
            content=response_data
        )
    
    # Default internal server error
    return JSONResponse(
        status_code=500,
        content=response_data
    )
