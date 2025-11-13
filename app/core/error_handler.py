"""Error handling utilities for the RAG system."""

from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class UserFriendlyError(Exception):
    """Custom error class for user-friendly error messages."""
    pass

def create_error_response(error: Exception) -> Dict[str, Any]:
    """Create a user-friendly error response.
    
    Args:
        error: The exception that occurred
        
    Returns:
        A formatted error response dictionary
    """
    # Log the full error for debugging
    logger.error(f"Error occurred: {str(error)}", exc_info=True)
    
    # Define user-friendly messages for known error types
    error_messages = {
        "AuthenticationError": "I'm currently having trouble accessing some of my systems. Please try again in a few moments or contact TESCOM support at https://tescom.co.in/contact-us/",
        "ConnectionError": "I'm having trouble connecting to my knowledge base. Please try again in a few moments.",
        "TimeoutError": "The request took too long to process. Please try again with a simpler question.",
        "ValueError": "I couldn't understand part of the request. Please try rephrasing your question.",
    }
    
    # Get error type name
    error_type = error.__class__.__name__
    
    # Get appropriate user message
    user_message = error_messages.get(
        error_type,
        "I apologize, but I'm having trouble processing your request. Please contact TESCOM support at https://tescom.co.in/contact-us/ for assistance."
    )
    
    return {
        "answer": user_message,
        "sources": [],
        "document_types_searched": [],
        "processing_time_ms": 0,
        "metadata": {
            "response_type": "error",
            "error_type": error_type
        }
    }

def handle_openai_error(error: Exception) -> Dict[str, Any]:
    """Specifically handle OpenAI-related errors.
    
    Args:
        error: The OpenAI exception that occurred
        
    Returns:
        A formatted error response dictionary
    """
    # Log the full error for debugging
    logger.error(f"OpenAI error occurred: {str(error)}", exc_info=True)
    
    return {
        "answer": "I'm currently experiencing some technical limitations. Please try again in a few moments or contact TESCOM support at https://tescom.co.in/contact-us/ for immediate assistance.",
        "sources": [],
        "document_types_searched": [],
        "processing_time_ms": 0,
        "metadata": {
            "response_type": "error",
            "error_type": "OpenAIError"
        }
    }
