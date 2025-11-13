# Frappe MCP Server - Testing Guide

This guide provides detailed instructions for testing the Frappe MCP Server with MCP Inspector and Claude Desktop.

## Prerequisites

Before testing, ensure you have:

1. **Frappe Instance**: A running Frappe/ERPNext instance with:
   - API access enabled
   - API key and secret generated
   - CRM Lead DocType with custom fields configured

2. **Environment Variables**: Create a `.env` file with your Frappe credentials:
   ```env
   NODE_ENV=dev
   FRAPPE_API_URL=https://your-frappe-instance.com
   FRAPPE_API_KEY=your_api_key_here
   FRAPPE_API_SECRET=your_api_secret_here
   HTTP_PORT=3000
   HTTP_HOST=localhost
   ```

3. **Built Project**: Ensure the project is built:
   ```bash
   npm run build
   ```

## Testing with MCP Inspector (STDIO Transport)

The MCP Inspector is the official testing tool for MCP servers.

### Step 1: Start MCP Inspector

```bash
npm run inspector
```

Or manually:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

The inspector will:
1. Start a web server (usually on `http://localhost:5173`)
2. Launch your MCP server in STDIO mode
3. Open your default browser

### Step 2: Connect to Server

1. Open the URL shown in terminal (e.g., `http://localhost:5173`)
2. You should see the MCP Inspector interface
3. Click "Connect" to establish connection with your server
4. Verify the connection status shows "Connected"

### Step 3: Explore Available Tools

In the Inspector interface, you should see three tools listed:

1. **search_lead**
2. **add_lead**
3. **update_lead**

Click on each tool to view its parameters and description.

### Step 4: Test search_lead

#### Test Case 1: Search by Email

**Input**:
```json
{
  "email": "test@example.com"
}
```

**Expected Output**:
- If leads found: List of matching leads with details
- If no leads found: "No leads found matching the search criteria."

#### Test Case 2: Search by Mobile

**Input**:
```json
{
  "mobile": "+1234567890"
}
```

#### Test Case 3: Search by Custom Status

**Input**:
```json
{
  "custom_lead_status": "Under Review"
}
```

#### Test Case 4: Multiple Criteria

**Input**:
```json
{
  "email": "john@example.com",
  "custom_lead_status": "New"
}
```

### Step 5: Test add_lead

#### Test Case 1: Minimal Lead Creation

**Input**:
```json
{
  "email_id": "newlead@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Expected Output**:
- Success message with created lead ID
- Lead details including all provided fields

#### Test Case 2: Complete Lead with Custom Fields

**Input**:
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email_id": "jane.smith@techcorp.com",
  "mobile_no": "+1987654321",
  "company_name": "TechCorp Industries",
  "city": "San Francisco",
  "country": "United States",
  "custom_enquiry_type": "Prototyping",
  "custom_enquiry_source": "Website Chat",
  "custom_product_category": "Electronics",
  "custom_lead_status": "New",
  "custom_budget_range": "2L-5L",
  "custom_timeline_expected": "2-3 months",
  "custom_prototype_quantity": 50,
  "custom__followup_notes": "Customer interested in IoT device prototyping",
  "custom_information_pending_from_lead": "Product specifications and design files",
  "custom_estimated_prototype_delivery": "2024-03-15"
}
```

**Expected Output**:
- Success message with complete lead details
- All custom fields populated correctly

#### Test Case 3: Lead with Design File Flag

**Input**:
```json
{
  "email_id": "designer@example.com",
  "first_name": "Alex",
  "last_name": "Designer",
  "custom_enquiry_type": "Product Development",
  "custom_product_category": "Medical Devices",
  "custom_design_file_uploaded": 1,
  "custom_prototype_quantity": 5
}
```

### Step 6: Test update_lead

First, create a lead or use an existing lead ID.

#### Test Case 1: Update Status

**Input**:
```json
{
  "lead_id": "CRM-LEAD-2024-00001",
  "custom_lead_status": "Quote Sent"
}
```

**Expected Output**:
- Success message
- Updated lead details
- List of updated fields

#### Test Case 2: Update Multiple Fields

**Input**:
```json
{
  "lead_id": "CRM-LEAD-2024-00001",
  "custom_lead_status": "Design in Progress",
  "custom__followup_notes": "Started design phase. Customer approved initial concept.",
  "custom_estimated_prototype_delivery": "2024-04-01",
  "custom_last_bot_interaction": "2024-01-15 14:30:00"
}
```

#### Test Case 3: Update Contact Information

**Input**:
```json
{
  "lead_id": "CRM-LEAD-2024-00001",
  "phone": "+1555123456",
  "whatsapp_no": "+1555123456",
  "city": "Los Angeles"
}
```

### Step 7: Error Testing

#### Test Invalid Inputs

1. **Search with no criteria**:
   ```json
   {}
   ```
   Expected: Error message about required criteria

2. **Update non-existent lead**:
   ```json
   {
     "lead_id": "INVALID-ID"
   }
   ```
   Expected: Error message "Lead with name 'INVALID-ID' not found"

3. **Add lead with invalid email**:
   ```json
   {
     "email_id": "not-an-email",
     "first_name": "Test"
   }
   ```
   Expected: Validation error

## Testing HTTP SSE Transport

### Step 1: Start HTTP Server

```bash
npm run dev:http
```

The server will start on `http://localhost:3000` (or your configured port).

### Step 2: Test Health Endpoint

```bash
curl http://localhost:3000/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "environment": "dev",
  "version": "1.0.0"
}
```

### Step 3: Test SSE Connection

You can test the SSE endpoint using a tool like `curl`:

```bash
curl -N http://localhost:3000/sse
```

This should keep the connection open and show SSE events.

### Step 4: Test with MCP Client

Use an MCP client library to connect to:
- SSE endpoint: `http://localhost:3000/sse`
- Message endpoint: `http://localhost:3000/message`

## Testing with Claude Desktop

### Step 1: Configure Claude Desktop

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "frappe-crm": {
      "command": "node",
      "args": ["/absolute/path/to/frappe-mcp-server/dist/index.js"],
      "env": {
        "FRAPPE_API_URL": "https://your-frappe-instance.com",
        "FRAPPE_API_KEY": "your_api_key",
        "FRAPPE_API_SECRET": "your_api_secret"
      }
    }
  }
}
```

### Step 2: Restart Claude Desktop

Close and restart Claude Desktop to load the new configuration.

### Step 3: Verify Server is Loaded

In a new conversation, you should see the server listed in the available tools.

### Step 4: Test with Natural Language

Try these prompts in Claude Desktop:

1. **Search for a lead**:
   ```
   Search for a lead with email john@example.com
   ```

2. **Create a new lead**:
   ```
   Create a new lead with the following details:
   - Name: Sarah Johnson
   - Email: sarah@example.com
   - Company: InnovateTech
   - Enquiry Type: Prototyping
   - Product Category: IoT
   - Budget Range: 2L-5L
   ```

3. **Update a lead**:
   ```
   Update lead CRM-LEAD-2024-00001 and set the status to "Quote Sent" and add a follow-up note: "Sent detailed quote for 50 units"
   ```

## PM2 Testing (UAT/Production)

### Test UAT Deployment

1. **Start UAT server**:
   ```bash
   npm run uat
   ```

2. **Verify PM2 status**:
   ```bash
   pm2 list
   ```

   Should show `frappe-mcp-uat` with 2 instances running.

3. **Test health endpoint**:
   ```bash
   curl http://localhost:3001/health
   ```

4. **Check logs**:
   ```bash
   npm run logs:uat
   ```

5. **Monitor resources**:
   ```bash
   pm2 monit
   ```

### Test Production Deployment

1. **Start production server**:
   ```bash
   npm run prod
   ```

2. **Verify PM2 status**:
   ```bash
   pm2 list
   ```

   Should show `frappe-mcp-prod` with 4 instances running.

3. **Test health endpoint**:
   ```bash
   curl http://localhost:3002/health
   ```

4. **Load testing** (optional):
   ```bash
   # Install Apache Bench if not available
   ab -n 1000 -c 10 http://localhost:3002/health
   ```

## Common Issues and Solutions

### Issue: Connection Timeout

**Symptoms**: Server cannot connect to Frappe instance

**Solutions**:
1. Verify `FRAPPE_API_URL` is correct
2. Check network connectivity
3. Verify Frappe instance is running
4. Check firewall rules

### Issue: Authentication Failed

**Symptoms**: 401 or 403 errors from Frappe API

**Solutions**:
1. Verify API key and secret are correct
2. Check API user has necessary permissions
3. Regenerate API credentials if needed

### Issue: Tool Not Found

**Symptoms**: "Unknown tool" error in MCP Inspector

**Solutions**:
1. Rebuild the project: `npm run build`
2. Restart the MCP Inspector
3. Clear browser cache

### Issue: PM2 Memory Issues

**Symptoms**: Process restarts frequently

**Solutions**:
1. Check logs: `pm2 logs`
2. Increase `max_memory_restart` in `ecosystem.config.js`
3. Reduce number of instances

## Performance Testing

### Test Response Times

Use the MCP Inspector's timing information to verify:
- Search queries: < 2 seconds
- Create lead: < 3 seconds
- Update lead: < 2 seconds

### Test Concurrent Requests

For HTTP transport:
```bash
# Install hey (HTTP load testing tool)
hey -n 100 -c 10 http://localhost:3000/health
```

## Validation Checklist

Before deploying to production, ensure:

- [ ] All three tools work correctly in MCP Inspector
- [ ] Error handling works for invalid inputs
- [ ] Frappe API connection is stable
- [ ] Custom fields are properly populated
- [ ] Search returns accurate results
- [ ] PM2 processes start and run stably
- [ ] Health endpoint responds correctly
- [ ] Logs are being written properly
- [ ] Memory usage is within limits
- [ ] Response times are acceptable

## Next Steps

After successful testing:

1. Configure custom fields in your Frappe instance
2. Set up proper production credentials
3. Deploy to production environment
4. Monitor logs and performance
5. Set up alerts for errors

## Support

If you encounter issues:
1. Check server logs: `pm2 logs` or console output
2. Verify Frappe API is accessible
3. Review error messages in MCP Inspector
4. Check Frappe API documentation
5. Consult MCP SDK documentation
