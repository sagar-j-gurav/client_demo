#!/usr/bin/env node

/**
 * Frappe MCP Server - STDIO Transport
 * MCP server for Frappe CRM Lead management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { FrappeClient } from './frappe-client.js';
import { config } from './config/index.js';
import { searchLeadSchema, searchLead, type SearchLeadArgs } from './tools/search-lead.js';
import { addLeadSchema, addLead, type AddLeadArgs } from './tools/add-lead.js';
import { updateLeadSchema, updateLead, type UpdateLeadArgs } from './tools/update-lead.js';

// Load environment variables
dotenv.config();

/**
 * Main MCP Server class
 */
class FrappeMCPServer {
  private server: Server;
  private frappeClient: FrappeClient;

  constructor() {
    // Initialize Frappe client
    this.frappeClient = new FrappeClient(
      config.frappe.apiUrl,
      config.frappe.apiKey,
      config.frappe.apiSecret
    );

    // Initialize MCP server
    this.server = new Server(
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

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
              // Basic Information
              lead_name: { type: 'string', description: 'Full name of the lead' },
              first_name: { type: 'string', description: 'First name' },
              last_name: { type: 'string', description: 'Last name' },
              salutation: { type: 'string', description: 'Salutation (Mr, Ms, Dr, etc.)' },
              gender: { type: 'string', description: 'Gender' },
              job_title: { type: 'string', description: 'Job title' },

              // Contact Information
              email_id: { type: 'string', format: 'email', description: 'Email address' },
              mobile_no: { type: 'string', description: 'Mobile number' },
              phone: { type: 'string', description: 'Phone number' },
              whatsapp_no: { type: 'string', description: 'WhatsApp number' },
              website: { type: 'string', description: 'Website URL' },

              // Company Information
              company_name: { type: 'string', description: 'Company name' },
              annual_revenue: { type: 'number', description: 'Annual revenue' },

              // Location
              city: { type: 'string', description: 'City' },
              state: { type: 'string', description: 'State' },
              country: { type: 'string', description: 'Country' },

              // Classification
              lead_owner: { type: 'string', description: 'Lead owner (user email)' },
              industry: { type: 'string', description: 'Industry' },
              market_segment: { type: 'string', description: 'Market segment' },
              territory: { type: 'string', description: 'Territory' },
              source: { type: 'string', description: 'Lead source' },
              type: {
                type: 'string',
                enum: ['Client', 'Channel Partner', 'Consultant'],
                description: 'Lead type',
              },
              request_type: {
                type: 'string',
                enum: [
                  'Product Enquiry',
                  'Request for Information',
                  'Suggestions',
                  'Other',
                ],
                description: 'Request type',
              },

              // Custom Fields
              custom_enquiry_type: {
                type: 'string',
                enum: ['Product Development', 'Prototyping', 'Testing Services', 'Consultation'],
                description: 'Type of enquiry',
              },
              custom_enquiry_source: {
                type: 'string',
                enum: ['Website Chat', 'Enquiry Form', 'Phone', 'Email'],
                description: 'Source of enquiry',
              },
              custom_product_category: {
                type: 'string',
                enum: ['Electronics', 'Mechanical', 'Software', 'IoT', 'Medical Devices'],
                description: 'Product category',
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
                description: 'Custom lead status',
              },
              custom_budget_range: {
                type: 'string',
                enum: ['Under 50K', '50K-2L', '2L-5L', '5L+', 'Not Disclosed'],
                description: 'Budget range',
              },
              custom_timeline_expected: {
                type: 'string',
                enum: ['Urgent <2 weeks', '1 month', '2-3 months', 'Flexible'],
                description: 'Expected timeline',
              },
              custom_design_file_uploaded: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Design file uploaded (0 or 1)',
              },
              custom_prototype_quantity: {
                type: 'number',
                description: 'Prototype quantity',
              },
              custom__followup_notes: {
                type: 'string',
                description: 'Follow-up notes',
              },
              custom_information_pending_from_lead: {
                type: 'string',
                description: 'Information pending from lead',
              },
              custom_estimated_prototype_delivery: {
                type: 'string',
                description: 'Estimated prototype delivery date (YYYY-MM-DD)',
              },
            },
          },
        },
        {
          name: 'update_lead',
          description:
            'Update an existing lead in Frappe CRM. Requires the lead ID and one or more fields to update. Supports all standard and custom fields.',
          inputSchema: {
            type: 'object',
            properties: {
              lead_id: {
                type: 'string',
                description: 'Lead ID (name) to update - REQUIRED',
              },

              // Basic Information
              lead_name: { type: 'string', description: 'Full name of the lead' },
              first_name: { type: 'string', description: 'First name' },
              last_name: { type: 'string', description: 'Last name' },
              salutation: { type: 'string', description: 'Salutation (Mr, Ms, Dr, etc.)' },
              gender: { type: 'string', description: 'Gender' },
              job_title: { type: 'string', description: 'Job title' },

              // Contact Information
              email_id: { type: 'string', format: 'email', description: 'Email address' },
              mobile_no: { type: 'string', description: 'Mobile number' },
              phone: { type: 'string', description: 'Phone number' },
              whatsapp_no: { type: 'string', description: 'WhatsApp number' },
              website: { type: 'string', description: 'Website URL' },

              // Company Information
              company_name: { type: 'string', description: 'Company name' },
              annual_revenue: { type: 'number', description: 'Annual revenue' },

              // Location
              city: { type: 'string', description: 'City' },
              state: { type: 'string', description: 'State' },
              country: { type: 'string', description: 'Country' },

              // Classification
              lead_owner: { type: 'string', description: 'Lead owner (user email)' },
              industry: { type: 'string', description: 'Industry' },
              market_segment: { type: 'string', description: 'Market segment' },
              territory: { type: 'string', description: 'Territory' },
              source: { type: 'string', description: 'Lead source' },
              type: {
                type: 'string',
                enum: ['Client', 'Channel Partner', 'Consultant'],
                description: 'Lead type',
              },
              status: {
                type: 'string',
                enum: [
                  'Lead',
                  'Open',
                  'Replied',
                  'Opportunity',
                  'Quotation',
                  'Lost Quotation',
                  'Interested',
                  'Converted',
                  'Do Not Contact',
                ],
                description: 'Lead status',
              },
              request_type: {
                type: 'string',
                enum: [
                  'Product Enquiry',
                  'Request for Information',
                  'Suggestions',
                  'Other',
                ],
                description: 'Request type',
              },

              // Custom Fields
              custom_enquiry_type: {
                type: 'string',
                enum: ['Product Development', 'Prototyping', 'Testing Services', 'Consultation'],
                description: 'Type of enquiry',
              },
              custom_enquiry_source: {
                type: 'string',
                enum: ['Website Chat', 'Enquiry Form', 'Phone', 'Email'],
                description: 'Source of enquiry',
              },
              custom_product_category: {
                type: 'string',
                enum: ['Electronics', 'Mechanical', 'Software', 'IoT', 'Medical Devices'],
                description: 'Product category',
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
                description: 'Custom lead status',
              },
              custom_budget_range: {
                type: 'string',
                enum: ['Under 50K', '50K-2L', '2L-5L', '5L+', 'Not Disclosed'],
                description: 'Budget range',
              },
              custom_timeline_expected: {
                type: 'string',
                enum: ['Urgent <2 weeks', '1 month', '2-3 months', 'Flexible'],
                description: 'Expected timeline',
              },
              custom_design_file_uploaded: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Design file uploaded (0 or 1)',
              },
              custom_prototype_quantity: {
                type: 'number',
                description: 'Prototype quantity',
              },
              custom__followup_notes: {
                type: 'string',
                description: 'Follow-up notes',
              },
              custom_information_pending_from_lead: {
                type: 'string',
                description: 'Information pending from lead',
              },
              custom_estimated_prototype_delivery: {
                type: 'string',
                description: 'Estimated prototype delivery date (YYYY-MM-DD)',
              },
              custom_last_bot_interaction: {
                type: 'string',
                description: 'Last bot interaction datetime',
              },

              // Disable flag
              disabled: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Disable lead (0 or 1)',
              },
            },
            required: ['lead_id'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Start the server with STDIO transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Log startup info to stderr (not stdout, which is used for MCP communication)
    console.error('Frappe MCP Server started');
    console.error(`Environment: ${config.environment}`);
    console.error(`Frappe API URL: ${config.frappe.apiUrl}`);
  }
}

// Start the server
const server = new FrappeMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
