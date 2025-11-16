# Conversational Agent with Frappe MCP Integration

## Overview

This guide explains the new conversational agent system that integrates RAG (Retrieval-Augmented Generation) with Frappe Lead Management via MCP (Model Context Protocol).

## Architecture

```
┌─────────────────┐
│   User Chat     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Conversational Agent (Tess)       │
│  - Intent Classification            │
│  - Lead Qualification               │
│  - Information Extraction           │
│  - Context Management               │
└──┬──────────────────────┬───────────┘
   │                      │
   ▼                      ▼
┌──────────┐      ┌────────────────┐
│ RAG      │      │ Frappe MCP     │
│ Engine   │      │ Client         │
└──────────┘      └────────┬───────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Frappe MCP      │
                  │ HTTP Server     │
                  │ (Port 3000)     │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Frappe CRM      │
                  │ Lead Management │
                  └─────────────────┘
```

## Key Features

### 1. Intelligent Intent Classification
The agent automatically classifies user intent into:
- **GREETING** - Friendly welcome messages
- **GENERAL_QUERY** - Questions answered via RAG
- **POTENTIAL_LEAD** - Users showing commercial interest
- **PROVIDE_INFO** - Users sharing contact/project details
- **GOODBYE** - Conversation endings

### 2. Conversational Lead Capture
Instead of forms, the agent conversationally collects:
- Name (first_name, last_name)
- Contact (email, mobile, or phone - at least one required)
- Company information
- Project requirements
- Budget range
- Timeline expectations
- Product category (Electronics, Mechanical, Software, IoT, Medical Devices)
- Enquiry type (Product Development, Prototyping, Testing Services, Consultation)

### 3. Context Persistence
All conversations are stored in PostgreSQL:
- **conversations** table: Session state, collected lead data, lead ID
- **messages** table: Full conversation history with timestamps

### 4. Automatic Lead Creation
When minimum required info is collected:
1. Lead is automatically created in Frappe CRM
2. User receives confirmation with Lead ID
3. Conversation state is updated to `LEAD_CREATED`

## API Endpoints

### New Conversational Endpoint

**POST** `/chatbot/api/chat`

**Request:**
```json
{
  "session_id": "user-12345",
  "message": "I need help with product development"
}
```

**Response:**
```json
{
  "session_id": "user-12345",
  "message": "I need help with product development",
  "answer": "I'd love to help with your product development! To provide you with the best assistance, could I get your name and email address?",
  "response_type": "lead_qualification",
  "sources": [],
  "metadata": {
    "processing_time_ms": 1250
  },
  "timestamp": "2025-11-16T10:30:00"
}
```

**Response Types:**
- `conversational` - Greeting/goodbye responses
- `rag` - Answers from knowledge base
- `lead_qualification` - Identified potential lead
- `collecting_info` - Gathering lead information
- `lead_created` - Lead successfully created in Frappe
- `error` - Processing error

### Existing Endpoints

All existing endpoints remain functional:
- **POST** `/chatbot/api/upload` - Upload documents
- **POST** `/chatbot/api/query` - Direct RAG queries
- **GET** `/chatbot/api/health` - Health check
- **GET** `/chatbot/api/stats` - System statistics

## Example Conversation Flow

### Scenario 1: General Query → RAG Response

```
User: What services does TESCOM provide?
Tess: [Uses RAG to answer from knowledge base]
```

### Scenario 2: Lead Capture Flow

```
User: I need help developing an IoT prototype
Tess: I'd love to help with that! To provide you with the best assistance,
      could I get your name and email address?

User: My name is John and email is john@example.com
Tess: Great to meet you, John! Could you also share your phone number or
      mobile number?

User: Sure, it's +91-9876543210
Tess: Thank you! I've recorded your information.

      Lead created successfully!
      Lead ID: CRM-LEAD-2025-00123
      Name: John
      Email: john@example.com
      Mobile: +91-9876543210

      Our team will be in touch with you shortly. Is there anything else
      I can help you with in the meantime?
```

## Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    state VARCHAR(50) NOT NULL,  -- general_query, potential_lead, collecting_info, lead_created
    lead_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    lead_id VARCHAR(255)  -- Frappe Lead ID
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

## Configuration

### Environment Variables

Add to `.env`:

```env
# Frappe MCP Configuration
FRAPPE_MCP_URL=http://localhost:3000

# Existing configurations
OPENAI_API_KEY=your-api-key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_4
```

## Setup Instructions

### 1. Start Frappe MCP Server

```bash
cd frappe-mcp-server
npm run dev:http
```

Verify it's running at `http://localhost:3000/sse`

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

New dependency: `httpx==0.27.0`

### 3. Database Setup

The tables will be created automatically on first run. Or manually run:

```bash
python -c "from app.core.conversation_database import get_conversation_database; get_conversation_database()"
```

### 4. Start FastAPI Application

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn app.main:app --reload
```

### 5. Test the Conversational Agent

```bash
curl -X POST http://localhost:8000/chatbot/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-user-123",
    "message": "Hello"
  }'
```

## Integration Points

### 1. Frappe MCP Client (`app/core/frappe_mcp_client.py`)

Communicates with Frappe MCP server via HTTP Streamable transport:
- `search_lead()` - Search for existing leads
- `add_lead()` - Create new lead
- `update_lead()` - Update lead information

### 2. Conversational Agent (`app/core/conversational_agent.py`)

Main intelligence layer:
- Intent classification using GPT-4o-mini
- Lead qualification (confidence scoring)
- Information extraction from natural language
- Conversational response generation

### 3. Conversation Database (`app/core/conversation_database.py`)

Manages conversation state:
- Session management
- Lead data accumulation
- Message history tracking

## Conversation States

```
GENERAL_QUERY
    ↓ (shows commercial intent)
POTENTIAL_LEAD
    ↓ (starts sharing info)
COLLECTING_INFO
    ↓ (minimum info collected)
LEAD_CREATED
```

## Lead Data Mapping

### Required Fields (At Least One Contact Method)
- `email_id` or `mobile_no` or `phone`
- `first_name` (extracted from conversation)

### Optional Fields Extracted
- `last_name`
- `company_name`
- `custom_enquiry_type`
- `custom_enquiry_source`
- `custom_product_category`
- `custom_lead_status`
- `custom_budget_range`
- `custom_timeline_expected`
- `custom_requirement_details`
- And all other CRM Lead custom fields

## Prompts and Context Engineering

### Intent Classification Prompt
Analyzes user message against conversation history to determine intent.

### Lead Qualification Prompt
Evaluates if user shows commercial interest based on:
- Service inquiries
- Project requirements mentioned
- Quote/pricing requests
- Specific needs discussion

Returns JSON with confidence score (0-100).

### Information Extraction Prompt
Intelligently extracts structured data from natural conversation:
```
User: "Hi, I'm John Smith from Acme Corp, email is john@acme.com"

Extracted:
{
  "first_name": "John",
  "last_name": "Smith",
  "company_name": "Acme Corp",
  "email_id": "john@acme.com"
}
```

### Conversational Response Prompt
Generates natural follow-up questions to collect missing information.

## Best Practices

### 1. Session Management
- Use unique session IDs per user (e.g., user ID, UUID, or browser fingerprint)
- Sessions persist across page reloads
- Old sessions auto-expire after 30 days

### 2. Error Handling
- MCP connection failures fallback to RAG-only mode
- Partial lead data is saved even if creation fails
- Graceful degradation for all services

### 3. Privacy
- Don't store sensitive info in plain text
- Implement session timeouts
- Allow users to clear their conversation data

### 4. Performance
- Intent classification uses efficient model (gpt-4o-mini)
- Database queries are indexed
- Async operations for MCP calls

## Monitoring and Debugging

### Check Conversation State

```python
from app.core.conversation_database import get_conversation_database

db = get_conversation_database()
conversation = db.get_or_create_conversation("session-123")
print(f"State: {conversation.state}")
print(f"Lead Data: {conversation.lead_data}")
print(f"Lead ID: {conversation.lead_id}")
```

### View Conversation History

```python
history = db.get_conversation_history("session-123", limit=20)
for msg in history:
    print(f"{msg['role']}: {msg['content']}")
```

### Check Frappe MCP Connection

```python
from app.core.frappe_mcp_client import get_frappe_mcp_client

client = get_frappe_mcp_client()
tools = await client.list_tools()
print(tools)
```

## Troubleshooting

### Issue: MCP Connection Refused
**Solution:** Ensure Frappe MCP server is running on port 3000
```bash
cd frappe-mcp-server && npm run dev:http
```

### Issue: Leads Not Being Created
**Check:**
1. Frappe MCP server logs
2. Frappe API credentials in `.env`
3. Minimum required fields collected (email/mobile/phone + name)

### Issue: Context Not Persisting
**Check:**
1. PostgreSQL connection
2. Session ID consistency across requests
3. Database tables created properly

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice input/output integration
- [ ] Sentiment analysis
- [ ] Lead scoring and prioritization
- [ ] Integration with more CRMs
- [ ] Analytics dashboard
- [ ] A/B testing for prompts

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review conversation state in database
3. Test Frappe MCP connection independently
4. Verify OpenAI API quota

## License

Same as main application.
