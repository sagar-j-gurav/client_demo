

from typing import Optional, Dict, Any
from llama_index.core.prompts import PromptTemplate
from llama_index.llms.openai import OpenAI

class ConversationHandler:

    def __init__(self):
        """Initialize the conversation handler."""
        self.conversation_prompt = PromptTemplate("""You are Tess, an AI assistant from TESCOM. Analyze the user's message and respond with ONE of these exact responses:

For greetings (hi, hello, hey, good morning, etc.):
Hello! I'm Tess from TESCOM. How can I assist you today?

For identity questions about Tess specifically (who are you, what are you, tell me about yourself, etc.):
I am Tess, an AI assistant created by TESCOM to help answer your questions.

For goodbyes (bye, goodbye, see you, etc.):
Goodbye! Feel free to return if you need more help from Tess.

For ALL other questions including contact info, help requests, TESCOM questions, technical questions:
RAG

Message: {query}

Return ONLY the exact response text without any labels or prefixes.""")

    def handle_query(self, query: str, llm: OpenAI) -> Optional[Dict[str, Any]]:
        """Handle basic conversational queries using the prompt template.
        
        Args:
            query: The user's query text
            llm: The language model to use (should be a small, efficient model)
            
        Returns:
            A response dict if query can be handled, None otherwise
        """
        # Format the prompt with the user's query
        formatted_prompt = self.conversation_prompt.format(query=query)
        
        # Get response from LLM
        response = llm.complete(formatted_prompt)
        response_text = str(response).strip()
        
        # If RAG response, return None to let the main system handle it
        if response_text == "RAG":
            return None
            
        # For pre-defined responses, return them directly
        return self._create_response(response_text)

    def _create_response(self, answer: str) -> Dict[str, Any]:
        """Create a standard response dictionary.
        
        Args:
            answer: The response text
            
        Returns:
            A formatted response dictionary
        """
        return {
            "answer": answer,
            "sources": [],
            "document_types_searched": [],
            "processing_time_ms": 0,
            "metadata": {
                "response_type": "conversational",
                "handled_by": "conversation_handler"
            }
        }
