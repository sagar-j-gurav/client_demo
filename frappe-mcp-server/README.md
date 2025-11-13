# Frappe MCP Server

A Model Context Protocol (MCP) server for Frappe/ERPNext CRM Lead management. This server provides tools to search, create, and update leads in Frappe CRM with support for custom fields specific to product development, prototyping, testing services, and consultation businesses.

## Features

- **Multiple Transport Modes**: Supports both STDIO and **HTTP Streamable** transports (MCP spec 2025-03-26)
- **Environment Management**: Separate configurations for Development, UAT, and Production
- **Process Management**: PM2 integration for UAT and Production deployments
- **Three Core Tools**:
  - `search_lead`: Search leads by email, mobile, phone, WhatsApp, name, company, or status
  - `add_lead`: Create new leads with full field support
  - `update_lead`: Update existing leads with any field

## Custom CRM Lead Fields

This MCP server supports the following custom fields for product development and prototyping businesses:

- **Enquiry Type**: Product Development | Prototyping | Testing Services | Consultation
- **Enquiry Source**: Website Chat | Enquiry Form | Phone | Email
- **Product Category**: Electronics | Mechanical | Software | IoT | Medical Devices
- **Lead Status**: New | Under Review | Design in Progress | Prototype Development | Information Pending | Quote Sent | Converted | Lost
- **Budget Range**: Under 50K | 50K-2L | 2L-5L | 5L+ | Not Disclosed
- **Timeline Expected**: Urgent <2 weeks | 1 month | 2-3 months | Flexible
- **Design File Uploaded**: Checkbox (0 or 1)
- **Prototype Quantity**: Integer
- **Follow-up Notes**: Long Text
- **Last Bot Interaction**: Datetime
- **Information Pending From Lead**: Long Text
- **Estimated Prototype Delivery**: Date

## Project Structure

```
frappe-mcp-server/
├── src/
│   ├── index.ts                 # STDIO transport server
│   ├── http-server.ts           # HTTP Streamable transport server
│   ├── frappe-client.ts         # Frappe API client
│   ├── tools/
│   │   ├── search-lead.ts       # Search lead tool
│   │   ├── add-lead.ts          # Add lead tool
│   │   └── update-lead.ts       # Update lead tool
│   ├── types/
│   │   └── lead.ts              # TypeScript type definitions
│   └── config/
│       ├── index.ts             # Config manager
│       ├── dev.ts               # Development config
│       ├── uat.ts               # UAT config
│       └── prod.ts              # Production config
├── ecosystem.config.js          # PM2 configuration
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## Installation

1. **Clone the repository**:
   ```bash
   cd frappe-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Frappe credentials:
   ```env
   NODE_ENV=dev
   FRAPPE_API_URL=https://your-frappe-instance.com
   FRAPPE_API_KEY=your_api_key_here
   FRAPPE_API_SECRET=your_api_secret_here
   HTTP_PORT=3000
   HTTP_HOST=localhost
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## Usage

### Development Mode

#### Option 1: STDIO Transport (for Claude Desktop)

For development with STDIO transport:

```bash
npm run dev
```

Use this mode with Claude Desktop or when running through MCP Inspector with STDIO.

#### Option 2: HTTP Streamable Transport (for MCP Inspector)

For development with HTTP Streamable transport:

```bash
npm run dev:http
```

The HTTP server will start on `http://localhost:3000` (or the port specified in `.env`).

**To test with MCP Inspector:**
1. Start the HTTP server: `npm run dev:http`
2. In MCP Inspector, use URL: `http://localhost:3000/sse`
3. Select transport type: `streamable-http`

### UAT Mode (with PM2)

1. **Set environment to UAT**:
   ```bash
   export NODE_ENV=uat
   # Or update .env file
   ```

2. **Start UAT server**:
   ```bash
   npm run uat
   ```

   This starts the HTTP server with:
   - 2 instances (cluster mode)
   - Port 3001
   - Max memory: 500MB per instance

3. **Manage UAT server**:
   ```bash
   npm run stop:uat      # Stop UAT server
   npm run restart:uat   # Restart UAT server
   npm run logs:uat      # View UAT logs
   ```

### Production Mode (with PM2)

1. **Set environment to production**:
   ```bash
   export NODE_ENV=prod
   # Or update .env file
   ```

2. **Start production server**:
   ```bash
   npm run prod
   ```

   This starts the HTTP server with:
   - 4 instances (cluster mode)
   - Port 3002
   - Max memory: 1GB per instance

3. **Manage production server**:
   ```bash
   npm run stop:prod      # Stop production server
   npm run restart:prod   # Restart production server
   npm run logs:prod      # View production logs
   ```

### PM2 Advanced Management

View all PM2 processes:
```bash
pm2 list
```

Monitor processes:
```bash
pm2 monit
```

View specific logs:
```bash
pm2 logs frappe-mcp-uat
pm2 logs frappe-mcp-prod
```

Stop all processes:
```bash
pm2 stop all
```

Delete all processes:
```bash
pm2 delete all
```

## Testing

### Using MCP Inspector with HTTP Streamable Transport (Recommended)

1. **Start the HTTP server**:
   ```bash
   npm run dev:http
   ```

   You should see:
   ```
   Frappe MCP HTTP Server running on http://localhost:3000
   Streamable HTTP endpoint: http://localhost:3000/sse
   ```

2. **Open MCP Inspector**:
   - Navigate to [https://inspector.modelcontextprotocol.io](https://inspector.modelcontextprotocol.io)
   - Or run locally: `npx @modelcontextprotocol/inspector`

3. **Connect to your server**:
   - In the Inspector, enter URL: `http://localhost:3000/sse`
   - Select transport type: **Streamable HTTP**
   - Click "Connect"

4. **Test the tools**:
   - `search_lead`: Search for leads
   - `add_lead`: Create new leads
   - `update_lead`: Update existing leads

### Using MCP Inspector with STDIO Transport

1. **Run the inspector with STDIO**:
   ```bash
   npm run inspector
   ```

   Or manually:
   ```bash
   npx @modelcontextprotocol/inspector node dist/index.js
   ```

2. **Test the tools** in the inspector web interface:
   - Navigate to the URL shown in the terminal (usually `http://localhost:6274`)
   - The server will auto-connect via STDIO
   - Test each tool: `search_lead`, `add_lead`, `update_lead`

### Testing HTTP Endpoints

1. **Test health endpoint**:
   ```bash
   curl http://localhost:3000/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "environment": "dev",
     "version": "1.0.0"
   }
   ```

### Using with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "frappe-crm": {
      "command": "node",
      "args": ["/path/to/frappe-mcp-server/dist/index.js"],
      "env": {
        "FRAPPE_API_URL": "https://your-frappe-instance.com",
        "FRAPPE_API_KEY": "your_api_key",
        "FRAPPE_API_SECRET": "your_api_secret"
      }
    }
  }
}
```

## API Tools Documentation

### 1. search_lead

Search for leads by various criteria.

**Parameters**:
- `email` (optional): Email address to search
- `mobile` (optional): Mobile number to search
- `phone` (optional): Phone number to search
- `whatsapp` (optional): WhatsApp number to search
- `lead_name` (optional): Lead name to search
- `company_name` (optional): Company name to search
- `status` (optional): Lead status filter
- `custom_lead_status` (optional): Custom lead status filter

**Example**:
```json
{
  "email": "john@example.com"
}
```

**Example with multiple criteria**:
```json
{
  "email": "john@example.com",
  "custom_lead_status": "Under Review"
}
```

### 2. add_lead

Create a new lead in Frappe CRM.

**Required**: At least one of `lead_name`, `email_id`, or `mobile_no`

**Parameters** (all optional unless noted):
- Basic: `lead_name`, `first_name`, `last_name`, `salutation`, `gender`, `job_title`
- Contact: `email_id`, `mobile_no`, `phone`, `whatsapp_no`, `website`
- Company: `company_name`, `annual_revenue`
- Location: `city`, `state`, `country`
- Classification: `lead_owner`, `industry`, `market_segment`, `territory`, `source`, `type`, `request_type`
- Custom Fields: `custom_enquiry_type`, `custom_enquiry_source`, `custom_product_category`, `custom_lead_status`, `custom_budget_range`, `custom_timeline_expected`, `custom_design_file_uploaded`, `custom_prototype_quantity`, `custom__followup_notes`, `custom_information_pending_from_lead`, `custom_estimated_prototype_delivery`

**Example**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email_id": "john.doe@example.com",
  "mobile_no": "+1234567890",
  "company_name": "TechCorp Inc",
  "custom_enquiry_type": "Prototyping",
  "custom_product_category": "Electronics",
  "custom_lead_status": "New",
  "custom_budget_range": "2L-5L",
  "custom_timeline_expected": "2-3 months",
  "custom_prototype_quantity": 10
}
```

### 3. update_lead

Update an existing lead.

**Required**: `lead_id` (the Lead's name/ID from Frappe)

**Parameters**: Same as `add_lead`, plus:
- `status`: Lead status
- `custom_last_bot_interaction`: Last bot interaction datetime
- `disabled`: Disable the lead (0 or 1)

**Example**:
```json
{
  "lead_id": "CRM-LEAD-2024-00001",
  "custom_lead_status": "Quote Sent",
  "custom__followup_notes": "Sent quote via email. Waiting for response.",
  "custom_last_bot_interaction": "2024-01-15 10:30:00"
}
```

## Environment Configuration

### Development (dev)
- **Transport**: STDIO (default) or HTTP
- **Logging**: Debug level
- **PM2**: Disabled
- **Port**: 3000 (HTTP mode)

### UAT (uat)
- **Transport**: HTTP SSE
- **Logging**: Info level
- **PM2**: Enabled (2 instances)
- **Port**: 3001
- **Memory**: 500MB per instance

### Production (prod)
- **Transport**: HTTP SSE
- **Logging**: Error level only
- **PM2**: Enabled (4 instances)
- **Port**: 3002
- **Memory**: 1GB per instance

## Frappe API Setup

To use this MCP server, you need to set up API credentials in your Frappe instance:

1. **Create API Key**:
   - Go to Frappe/ERPNext
   - Navigate to: User → API Access → Generate Keys
   - Copy the API Key and API Secret

2. **Set Permissions**:
   - Ensure the API user has permissions to:
     - Read, Write, Create on Lead DocType
     - Access to custom fields

3. **Configure Custom Fields** in Frappe:
   - Go to: Customize Form → Lead
   - Add the custom fields listed in the "Custom CRM Lead Fields" section above

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Frappe API

**Solution**:
- Verify `FRAPPE_API_URL` is correct and accessible
- Check API credentials are valid
- Ensure Frappe instance allows API access from your IP
- Check firewall settings

### PM2 Issues

**Problem**: PM2 processes not starting

**Solution**:
```bash
# Check PM2 status
pm2 list

# View detailed logs
pm2 logs

# Delete and restart
pm2 delete all
npm run build
npm run uat  # or npm run prod
```

### Memory Issues

**Problem**: Server running out of memory

**Solution**:
- Adjust `max_memory_restart` in `ecosystem.config.js`
- Reduce number of instances
- Check for memory leaks in logs

## Development

### Code Structure

- **frappe-client.ts**: Handles all Frappe API interactions
- **tools/**: Each tool is a separate module with schema validation
- **config/**: Environment-specific configurations
- **types/**: TypeScript type definitions for type safety

### Adding New Tools

1. Create a new file in `src/tools/`
2. Define Zod schema for input validation
3. Implement the tool function
4. Register the tool in `src/index.ts` and `src/http-server.ts`

## License

MIT

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Frappe API documentation
3. Check MCP SDK documentation: https://modelcontextprotocol.io

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- All tools have proper input validation
- Error handling is comprehensive
- Documentation is updated
