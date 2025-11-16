"""Intelligent conversational agent with RAG and lead capture capabilities."""

import logging
import json
from typing import Dict, Any, Optional, List, Tuple
from llama_index.llms.openai import OpenAI
from llama_index.core.prompts import PromptTemplate

from app.core.config import get_settings
from app.core.conversation_database import (
    get_conversation_database,
    ConversationState
)
from app.core.frappe_mcp_client import get_frappe_mcp_client

logger = logging.getLogger(__name__)


class ConversationalAgent:
    """Intelligent agent that handles conversations, RAG queries, and lead capture."""

    def __init__(self, rag_engine):
        """Initialize the conversational agent.

        Args:
            rag_engine: RAGEngine instance for knowledge base queries
        """
        self.settings = get_settings()
        self.rag_engine = rag_engine
        self.conversation_db = get_conversation_database()
        self.frappe_client = get_frappe_mcp_client()

        # Use a capable model for intent classification and conversation
        self.llm = OpenAI(
            model=self.settings.llm_model,
            api_key=self.settings.openai_api_key,
            temperature=0.3
        )

        self._setup_prompts()

    def _setup_prompts(self):
        """Setup prompts for the conversational agent."""

        # Intent classification prompt
        self.intent_prompt = PromptTemplate("""You are Tess, TESCOM's AI assistant. Analyze the user's message and classify their intent.

Conversation History:
{history}

Current Message: {message}

Classify the intent as ONE of:
1. GREETING - User is saying hi, hello, greeting
2. GENERAL_QUERY - Asking about TESCOM services, FAQs, general information
3. POTENTIAL_LEAD - User seems interested in services, asking for quotes, wants to discuss a project, or mentions specific requirements
4. PROVIDE_INFO - User is providing information (name, email, phone, company, project details)
5. GOODBYE - User is ending the conversation

Respond with ONLY the classification (GREETING, GENERAL_QUERY, POTENTIAL_LEAD, PROVIDE_INFO, or GOODBYE).""")

        # Lead qualification prompt
        self.lead_qualification_prompt = PromptTemplate("""You are Tess from TESCOM, helping to understand if this user might need our product development and prototyping services.

Conversation History:
{history}

Current Message: {message}

Analyze if this user shows signs of being a potential lead based on:
- Asking about specific services
- Mentioning project requirements
- Discussing prototyping/product development needs
- Requesting quotes or pricing
- Showing commercial intent

Respond with JSON format:
{{
    "is_potential_lead": true/false,
    "confidence": 0-100,
    "reason": "brief explanation",
    "suggested_response": "friendly response to keep the conversation going"
}}""")

        # Information extraction prompt
        self.info_extraction_prompt = PromptTemplate("""Extract lead information from the conversation.

Conversation History:
{history}

Current Message: {message}

Extract any of these fields that are mentioned:
- first_name
- last_name
- email_id (email address)
- mobile_no (mobile/phone number)
- company_name
- custom_enquiry_type (Product Development, Prototyping, Testing Services, Consultation)
- custom_product_category (Electronics, Mechanical, Software, IoT, Medical Devices)
- custom_requirement_details (detailed description of requirements)

Current Lead Data:
{current_lead_data}

Respond with JSON format containing ONLY the fields that were mentioned in the current message.
If a field is not mentioned, don't include it. Do NOT repeat fields from current_lead_data unless the user is updating them.

Example:
{{"first_name": "John", "email_id": "john@example.com"}}

Extract in JSON format:""")

        # Conversational response prompt
        self.conversation_prompt = PromptTemplate("""You are Tess, a friendly AI assistant from TESCOM.

Conversation State: {state}
Lead Data Collected: {lead_data}
Missing Required Fields: {missing_fields}

Conversation History:
{history}

User Message: {message}

Generate a friendly, conversational response that:
1. If collecting lead info: Ask for the NEXT missing required field naturally (email, mobile, or phone - at least one required)
2. If info is complete: Confirm you'll create their lead and provide next steps
3. Keep it warm and professional
4. Don't repeat information already collected
5. Make it feel like a natural conversation, not a form

Your response:""")

    async def _classify_intent(self, message: str, history: List[Dict[str, Any]]) -> str:
        """Classify user's intent from their message."""
        try:
            history_text = self._format_history(history)
            prompt = self.intent_prompt.format(
                history=history_text,
                message=message
            )

            response = self.llm.complete(prompt)
            intent = str(response).strip().upper()

            logger.info(f"Classified intent: {intent}")
            return intent

        except Exception as e:
            logger.error(f"Error classifying intent: {e}")
            return "GENERAL_QUERY"

    async def _check_potential_lead(
        self,
        message: str,
        history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check if user is a potential lead."""
        try:
            history_text = self._format_history(history)
            prompt = self.lead_qualification_prompt.format(
                history=history_text,
                message=message
            )

            response = self.llm.complete(prompt)
            result_text = str(response).strip()

            # Parse JSON response
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "").replace("```", "").strip()
            elif result_text.startswith("```"):
                result_text = result_text.replace("```", "").strip()

            result = json.loads(result_text)
            logger.info(f"Lead qualification: {result}")
            return result

        except Exception as e:
            logger.error(f"Error in lead qualification: {e}")
            return {
                "is_potential_lead": False,
                "confidence": 0,
                "reason": "Error in qualification"
            }

    async def _extract_info(
        self,
        message: str,
        history: List[Dict[str, Any]],
        current_lead_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract lead information from user message."""
        try:
            history_text = self._format_history(history)
            prompt = self.info_extraction_prompt.format(
                history=history_text,
                message=message,
                current_lead_data=json.dumps(current_lead_data)
            )

            response = self.llm.complete(prompt)
            result_text = str(response).strip()

            # Clean up JSON
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "").replace("```", "").strip()
            elif result_text.startswith("```"):
                result_text = result_text.replace("```", "").strip()

            extracted = json.loads(result_text)
            logger.info(f"Extracted info: {extracted}")
            return extracted

        except Exception as e:
            logger.error(f"Error extracting info: {e}")
            return {}

    async def _generate_response(
        self,
        message: str,
        history: List[Dict[str, Any]],
        state: str,
        lead_data: Dict[str, Any]
    ) -> str:
        """Generate a conversational response."""
        try:
            # Determine missing required fields
            required_contact = ["email_id", "mobile_no", "phone"]
            has_contact = any(lead_data.get(field) for field in required_contact)

            missing_fields = []
            if not has_contact:
                missing_fields.append("At least one contact method (email, mobile, or phone)")
            if not lead_data.get("first_name"):
                missing_fields.append("name")

            history_text = self._format_history(history)
            prompt = self.conversation_prompt.format(
                state=state,
                lead_data=json.dumps(lead_data),
                missing_fields=", ".join(missing_fields) if missing_fields else "None",
                history=history_text,
                message=message
            )

            response = self.llm.complete(prompt)
            return str(response).strip()

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "I apologize, I'm having trouble processing that. Could you please rephrase?"

    def _format_history(self, history: List[Dict[str, Any]], limit: int = 5) -> str:
        """Format conversation history for prompts."""
        if not history:
            return "No previous conversation"

        # Get last N messages
        recent = history[-limit:]
        formatted = []
        for msg in recent:
            role = "User" if msg["role"] == "user" else "Tess"
            formatted.append(f"{role}: {msg['content']}")

        return "\n".join(formatted)

    async def handle_message(
        self,
        session_id: str,
        message: str
    ) -> Dict[str, Any]:
        """Handle a user message with intelligent routing.

        Args:
            session_id: Unique session identifier
            message: User's message

        Returns:
            Response dictionary with answer and metadata
        """
        try:
            # Get or create conversation
            conversation = self.conversation_db.get_or_create_conversation(session_id)

            # Get conversation history
            history = self.conversation_db.get_conversation_history(session_id)

            # Add user message to history
            self.conversation_db.add_message(session_id, "user", message)

            # Classify intent
            intent = await self._classify_intent(message, history)

            # Handle different intents
            if intent == "GREETING":
                answer = "Hello! I'm Tess from TESCOM. How can I assist you today?"
                self.conversation_db.add_message(session_id, "assistant", answer)
                return self._create_response(answer, "conversational")

            elif intent == "GOODBYE":
                answer = "Thank you for connecting with TESCOM! Feel free to reach out anytime you need assistance."
                self.conversation_db.add_message(session_id, "assistant", answer)
                return self._create_response(answer, "conversational")

            # For GENERAL_QUERY - Use RAG
            elif intent == "GENERAL_QUERY":
                # Check if it's actually a potential lead
                lead_check = await self._check_potential_lead(message, history)

                if lead_check.get("is_potential_lead") and lead_check.get("confidence", 0) > 60:
                    # Transition to lead collection
                    self.conversation_db.update_conversation_state(
                        session_id,
                        ConversationState.POTENTIAL_LEAD
                    )

                    answer = lead_check.get("suggested_response",
                                           "I'd love to help with that! To provide you with the best assistance, could I get your name and email address?")

                    self.conversation_db.add_message(session_id, "assistant", answer)
                    return self._create_response(answer, "lead_qualification")
                else:
                    # Use RAG for general query
                    rag_result = self.rag_engine.query(message)
                    answer = rag_result.get("answer", "I'm sorry, I couldn't find an answer to that.")

                    self.conversation_db.add_message(session_id, "assistant", answer)
                    return self._create_response(answer, "rag", rag_result.get("sources"))

            # For PROVIDE_INFO or POTENTIAL_LEAD - Collect lead information
            elif intent in ["PROVIDE_INFO", "POTENTIAL_LEAD"]:
                current_state = conversation.state
                lead_data = conversation.lead_data or {}

                # Extract information from message
                extracted_info = await self._extract_info(message, history, lead_data)

                # Merge with existing lead data
                lead_data.update(extracted_info)

                # Update conversation
                self.conversation_db.update_conversation_state(
                    session_id,
                    ConversationState.COLLECTING_INFO,
                    lead_data=lead_data
                )

                # Check if we have minimum required info
                has_contact = any(lead_data.get(field) for field in ["email_id", "mobile_no", "phone"])
                has_name = lead_data.get("first_name") or lead_data.get("lead_name")

                if has_contact and has_name:
                    # Create lead in Frappe
                    frappe_result = await self.frappe_client.add_lead(lead_data)

                    if frappe_result.get("success"):
                        # Extract lead ID from response text
                        response_text = frappe_result.get("text", "")
                        lead_id = None
                        if "Lead ID:" in response_text:
                            lead_id = response_text.split("Lead ID:")[1].split("\n")[0].strip()

                        self.conversation_db.update_conversation_state(
                            session_id,
                            ConversationState.LEAD_CREATED,
                            lead_id=lead_id
                        )

                        answer = f"Thank you! I've recorded your information. {response_text}\n\nOur team will be in touch with you shortly. Is there anything else I can help you with in the meantime?"

                        self.conversation_db.add_message(session_id, "assistant", answer)
                        return self._create_response(answer, "lead_created", metadata={"lead_id": lead_id})
                    else:
                        answer = "I've noted your information. However, there was a small issue saving it. Our team will still reach out to you soon. Is there anything else you'd like to know about TESCOM?"
                        self.conversation_db.add_message(session_id, "assistant", answer)
                        return self._create_response(answer, "lead_error")
                else:
                    # Generate conversational follow-up to collect more info
                    answer = await self._generate_response(
                        message,
                        history,
                        "collecting_info",
                        lead_data
                    )

                    self.conversation_db.add_message(session_id, "assistant", answer)
                    return self._create_response(answer, "collecting_info")

            # Default: Use RAG
            else:
                rag_result = self.rag_engine.query(message)
                answer = rag_result.get("answer", "I'm here to help! Could you please rephrase your question?")

                self.conversation_db.add_message(session_id, "assistant", answer)
                return self._create_response(answer, "rag", rag_result.get("sources"))

        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            return self._create_response(
                "I apologize, but I'm having trouble processing your request. Please try again or contact TESCOM support at https://tescom.co.in/contact-us/",
                "error"
            )

    def _create_response(
        self,
        answer: str,
        response_type: str,
        sources: Optional[List] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a standardized response."""
        return {
            "answer": answer,
            "sources": sources or [],
            "response_type": response_type,
            "metadata": metadata or {}
        }
