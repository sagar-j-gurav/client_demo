"""Enhanced database for conversational agent with lead capture."""

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from app.core.config import get_settings
import enum
import json

Base = declarative_base()


class ConversationState(str, enum.Enum):
    """Conversation states for lead capture flow."""
    GENERAL_QUERY = "general_query"
    POTENTIAL_LEAD = "potential_lead"
    COLLECTING_INFO = "collecting_info"
    LEAD_CREATED = "lead_created"


class Conversation(Base):
    """Table to store conversation history with context."""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), nullable=False, index=True, unique=True)
    state = Column(Enum(ConversationState), default=ConversationState.GENERAL_QUERY, nullable=False)
    lead_data = Column(JSON, default=dict)  # Stores partially collected lead info
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    lead_id = Column(String(255), nullable=True)  # Frappe Lead ID if created


class Message(Base):
    """Table to store individual messages in conversations."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata = Column(JSON, default=dict)  # Additional context


class ConversationDatabase:
    """Database manager for conversational agent."""

    def __init__(self, database_url: str = None):
        if database_url is None:
            settings = get_settings()
            database_url = settings.database_url

        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

        # Create tables
        Base.metadata.create_all(bind=self.engine)

    def get_session(self):
        """Get database session."""
        return self.SessionLocal()

    def get_or_create_conversation(self, session_id: str) -> Conversation:
        """Get existing conversation or create new one."""
        session = self.get_session()
        try:
            conversation = session.query(Conversation).filter(
                Conversation.session_id == session_id
            ).first()

            if not conversation:
                conversation = Conversation(
                    session_id=session_id,
                    state=ConversationState.GENERAL_QUERY,
                    lead_data={}
                )
                session.add(conversation)
                session.commit()
                session.refresh(conversation)

            return conversation
        finally:
            session.close()

    def update_conversation_state(
        self,
        session_id: str,
        state: ConversationState,
        lead_data: Optional[Dict[str, Any]] = None,
        lead_id: Optional[str] = None
    ):
        """Update conversation state and lead data."""
        session = self.get_session()
        try:
            conversation = session.query(Conversation).filter(
                Conversation.session_id == session_id
            ).first()

            if conversation:
                conversation.state = state
                if lead_data is not None:
                    conversation.lead_data = lead_data
                if lead_id is not None:
                    conversation.lead_id = lead_id
                conversation.updated_at = datetime.utcnow()
                session.commit()
        finally:
            session.close()

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """Add a message to the conversation history."""
        session = self.get_session()
        try:
            message = Message(
                session_id=session_id,
                role=role,
                content=content,
                metadata=metadata or {}
            )
            session.add(message)
            session.commit()
            session.refresh(message)
            return message
        finally:
            session.close()

    def get_conversation_history(
        self,
        session_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get recent conversation history."""
        session = self.get_session()
        try:
            messages = session.query(Message).filter(
                Message.session_id == session_id
            ).order_by(Message.timestamp.desc()).limit(limit).all()

            # Reverse to get chronological order
            messages = list(reversed(messages))

            return [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.metadata
                }
                for msg in messages
            ]
        finally:
            session.close()

    def get_lead_data(self, session_id: str) -> Dict[str, Any]:
        """Get collected lead data for a session."""
        session = self.get_session()
        try:
            conversation = session.query(Conversation).filter(
                Conversation.session_id == session_id
            ).first()

            if conversation:
                return conversation.lead_data or {}
            return {}
        finally:
            session.close()

    def clear_old_conversations(self, days: int = 30):
        """Clear conversations older than specified days."""
        session = self.get_session()
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            # Delete old messages
            session.query(Message).filter(
                Message.timestamp < cutoff_date
            ).delete()

            # Delete old conversations
            session.query(Conversation).filter(
                Conversation.updated_at < cutoff_date
            ).delete()

            session.commit()
        finally:
            session.close()


# Global database instance
conversation_db = None


def get_conversation_database():
    """Get conversation database instance."""
    global conversation_db
    if conversation_db is None:
        conversation_db = ConversationDatabase()
    return conversation_db
