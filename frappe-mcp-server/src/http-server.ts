#!/usr/bin/env node

/**
 * Frappe MCP Server - HTTP Streamable Transport
 * MCP server for Frappe CRM Lead management with HTTP Streamable support
 */

// Load environment variables first, before importing config
import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { FrappeClient } from './frappe-client.js';
import { getConfig } from './config/index.js';
import { searchLeadSchema, searchLead, type SearchLeadArgs } from './tools/search-lead.js';
import { addLeadSchema, addLead, type AddLeadArgs } from './tools/add-lead.js';
import { updateLeadSchema, updateLead, type UpdateLeadArgs } from './tools/update-lead.js';

/**
 * HTTP MCP Server class
 */
class FrappeHTTPMCPServer {
  private app: express.Application;
  private frappeClient: FrappeClient;
  private config = getConfig();

  constructor() {
    this.app = express();
    this.app.use(express.json());

    // Initialize Frappe client
    this.frappeClient = new FrappeClient(
      this.config.frappe.apiUrl,
      this.config.frappe.apiKey,
      this.config.frappe.apiSecret
    );

    this.setupRoutes();
  }

  /**
   * Create and configure MCP server instance
   */
  private createMCPServer(): Server {
    const server = new Server(
      {
        name: 'frappe-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers(server);
    this.setupErrorHandling(server);

    return server;
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(server: Server): void {
    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'search_lead',
          description:
            'Search for leads in Frappe CRM by email, mobile, phone, WhatsApp number, name, company, or status. Returns matching lead records with all details including custom fields for product development and prototyping.',
          inputSchema: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'Email address to search for',
                format: 'email',
              },
              mobile: {
                type: 'string',
                description: 'Mobile number to search for',
              },
              phone: {
                type: 'string',
                description: 'Phone number to search for',
              },
              whatsapp: {
                type: 'string',
                description: 'WhatsApp number to search for',
              },
              lead_name: {
                type: 'string',
                description: 'Lead name to search for',
              },
              company_name: {
                type: 'string',
                description: 'Company name to search for',
              },
              status: {
                type: 'string',
                description: 'Lead status to filter by',
              },
              custom_lead_status: {
                type: 'string',
                description: 'Custom lead status to filter by',
              },
            },
          },
        },
        {
          name: 'add_lead',
          description:
            'Create a new lead in Frappe CRM. Supports all standard lead fields plus custom fields for product development, prototyping, testing services, and consultation business. At least one contact method (email, mobile, or phone) should be provided.',
          inputSchema: {
            type: 'object',
            properties: {
              // Include same properties as STDIO version
              lead_name: { type: 'string', description: 'Full name of the lead' },
              first_name: { type: 'string', description: 'First name' },
              last_name: { type: 'string', description: 'Last name' },
              email_id: { type: 'string', format: 'email', description: 'Email address' },
              mobile_no: { type: 'string', description: 'Mobile number' },
              phone: { type: 'string', description: 'Phone number' },
              company_name: { type: 'string', description: 'Company name' },
              custom_enquiry_type: {
                type: 'string',
                enum: ['Product Development', 'Prototyping', 'Testing Services', 'Consultation'],
              },
              custom_product_category: {
                type: 'string',
                enum: ['Electronics', 'Mechanical', 'Software', 'IoT', 'Medical Devices'],
              },
              custom_lead_status: {
                type: 'string',
                enum: [
                  'New',
                  'Under Review',
                  'Design in Progress',
                  'Prototype Development',
                  'Information Pending',
                  'Quote Sent',
                  'Converted',
                  'Lost',
                ],
              },
              custom_budget_range: {
                type: 'string',
                enum: ['Under 50K', '50K-2L', '2L-5L', '5L+', 'Not Disclosed'],
              },
              // Add other fields...
            },
          },
        },
        {
          name: 'update_lead',
          description:
            'Update an existing lead in Frappe CRM. Requires the lead ID and one or more fields to update.',
          inputSchema: {
            type: 'object',
            properties: {
              lead_id: { type: 'string', description: 'Lead ID (name) to update - REQUIRED' },
              // Include same properties as STDIO version
              lead_name: { type: 'string', description: 'Full name of the lead' },
              email_id: { type: 'string', format: 'email', description: 'Email address' },
              mobile_no: { type: 'string', description: 'Mobile number' },
              custom_lead_status: {
                type: 'string',
                enum: [
                  'New',
                  'Under Review',
                  'Design in Progress',
                  'Prototype Development',
                  'Information Pending',
                  'Quote Sent',
                  'Converted',
                  'Lost',
                ],
              },
              custom__followup_notes: { type: 'string', description: 'Follow-up notes' },
              // Add other fields...
            },
            required: ['lead_id'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'search_lead': {
            const validatedArgs = searchLeadSchema.parse(args);
            return await searchLead(validatedArgs as SearchLeadArgs, this.frappeClient);
          }

          case 'add_lead': {
            const validatedArgs = addLeadSchema.parse(args);
            return await addLead(validatedArgs as AddLeadArgs, this.frappeClient);
          }

          case 'update_lead': {
            const validatedArgs = updateLeadSchema.parse(args);
            return await updateLead(validatedArgs as UpdateLeadArgs, this.frappeClient);
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(server: Server): void {
    server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        environment: this.config.environment,
        version: '1.0.0',
      });
    });

    // Streamable HTTP endpoint for MCP
    this.app.post('/sse', async (req, res) => {
      console.log('New Streamable HTTP request received');

      // Create a new MCP server and transport for each request
      // This prevents request ID collisions
      const server = this.createMCPServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode - new transport per request
      });

      // Clean up on connection close
      res.on('close', () => {
        console.log('Streamable HTTP connection closed');
        transport.close();
      });

      try {
        // Connect the server to the transport
        await server.connect(transport);

        // Handle the request
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
          });
        }
      }
    });
  }

  /**
   * Start the HTTP server
   */
  start(): void {
    const port = this.config.http.port;
    const host = this.config.http.host;

    this.app.listen(port, host, () => {
      console.log(`Frappe MCP HTTP Server running on http://${host}:${port}`);
      console.log(`Environment: ${this.config.environment}`);
      console.log(`Frappe API URL: ${this.config.frappe.apiUrl}`);
      console.log(`Streamable HTTP endpoint: http://${host}:${port}/sse`);
      console.log(`Health check: http://${host}:${port}/health`);
      console.log(`Use this URL in MCP Inspector: http://${host}:${port}/sse`);
    });
  }
}

// Start the HTTP server
const server = new FrappeHTTPMCPServer();
server.start();
