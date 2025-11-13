# Frappe MCP Server - Quick Start Guide

Get up and running with the Frappe MCP Server in 5 minutes!

## Quick Setup

### 1. Install Dependencies

```bash
cd frappe-mcp-server
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your Frappe credentials:

```env
NODE_ENV=dev
FRAPPE_API_URL=https://your-frappe-instance.com
FRAPPE_API_KEY=your_api_key_here
FRAPPE_API_SECRET=your_api_secret_here
HTTP_PORT=3000
```

### 3. Build Project

```bash
npm run build
```

### 4. Test with MCP Inspector (HTTP Streamable)

**Start the HTTP server:**
```bash
npm run dev:http
```

**Open MCP Inspector:**
- Go to [https://inspector.modelcontextprotocol.io](https://inspector.modelcontextprotocol.io)
- Enter URL: `http://localhost:3000/sse`
- Select transport: **Streamable HTTP**
- Click "Connect"

**Or test with STDIO:**
```bash
npm run inspector
```

## Quick Test Examples

### Search for a Lead

In MCP Inspector, use `search_lead`:

```json
{
  "email": "test@example.com"
}
```

### Create a Lead

Use `add_lead`:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email_id": "john.doe@example.com",
  "mobile_no": "+1234567890",
  "custom_enquiry_type": "Prototyping",
  "custom_product_category": "Electronics",
  "custom_lead_status": "New",
  "custom_budget_range": "2L-5L"
}
```

### Update a Lead

Use `update_lead` (replace with actual lead ID):

```json
{
  "lead_id": "CRM-LEAD-2024-00001",
  "custom_lead_status": "Quote Sent",
  "custom__followup_notes": "Sent quote via email"
}
```

## Running Different Modes

### Development (STDIO)

```bash
npm run dev
```

### Development (HTTP)

```bash
npm run dev:http
# Server runs on http://localhost:3000
```

### UAT (with PM2)

```bash
npm run uat
pm2 logs frappe-mcp-uat
```

### Production (with PM2)

```bash
npm run prod
pm2 logs frappe-mcp-prod
```

## Using with Claude Desktop

Add to `claude_desktop_config.json`:

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

Restart Claude Desktop, then ask:

```
Search for leads with email john@example.com
```

## Next Steps

- Read [README.md](README.md) for detailed documentation
- See [TESTING.md](TESTING.md) for comprehensive testing guide
- Configure custom fields in your Frappe instance

## Troubleshooting

**Can't connect to Frappe?**
- Check `FRAPPE_API_URL` in `.env`
- Verify API credentials are correct
- Ensure Frappe instance is accessible

**MCP Inspector won't connect?**
- Rebuild: `npm run build`
- Check for errors in terminal
- Verify .env file exists

**PM2 not starting?**
- Check: `pm2 list`
- View logs: `pm2 logs`
- Delete and restart: `pm2 delete all && npm run uat`

## Support

For detailed help, see:
- [README.md](README.md) - Full documentation
- [TESTING.md](TESTING.md) - Testing guide
- [MCP Documentation](https://modelcontextprotocol.io)
