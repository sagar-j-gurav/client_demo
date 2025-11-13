"""Simple database setup for storing Q&A interactions."""

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from app.core.config import get_settings

Base = declarative_base()

class QARecord(Base):
    """Simple table to store questions and answers with timestamps."""
    __tablename__ = "qa_records"
    
    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

class Database:
    """Simple database manager."""
    
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
    
    def store_qa(self, question: str, answer: str):
        """Store a question-answer pair with timestamp."""
        session = self.get_session()
        try:
            qa_record = QARecord(
                question=question,
                answer=answer,
                timestamp=datetime.utcnow()
            )
            session.add(qa_record)
            session.commit()
            return qa_record.id
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

# Global database instance
db = None

def get_database():
    """Get database instance."""
    global db
    if db is None:
        db = Database()
    return db
