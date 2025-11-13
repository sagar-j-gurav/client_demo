/**
 * Search Lead Tool
 * Searches for leads by email, mobile, phone, or whatsapp number
 */

import { z } from 'zod';
import type { FrappeClient } from '../frappe-client.js';

export const searchLeadSchema = z.object({
  email: z.string().email().optional().describe('Email address to search for'),
  mobile: z.string().optional().describe('Mobile number to search for'),
  phone: z.string().optional().describe('Phone number to search for'),
  whatsapp: z.string().optional().describe('WhatsApp number to search for'),
  lead_name: z.string().optional().describe('Lead name to search for'),
  company_name: z.string().optional().describe('Company name to search for'),
  status: z.string().optional().describe('Lead status to filter by'),
  custom_lead_status: z.string().optional().describe('Custom lead status to filter by'),
});

export type SearchLeadArgs = z.infer<typeof searchLeadSchema>;

/**
 * Execute search lead operation
 */
export async function searchLead(args: SearchLeadArgs, frappeClient: FrappeClient) {
  // Validate that at least one search criterion is provided
  if (
    !args.email &&
    !args.mobile &&
    !args.phone &&
    !args.whatsapp &&
    !args.lead_name &&
    !args.company_name &&
    !args.status &&
    !args.custom_lead_status
  ) {
    throw new Error(
      'At least one search criterion is required (email, mobile, phone, whatsapp, lead_name, company_name, status, or custom_lead_status)'
    );
  }

  // Build search filters
  const filters: any = {};

  if (args.email) {
    filters.email_id = args.email;
  }

  if (args.mobile) {
    filters.mobile_no = args.mobile;
  }

  if (args.phone) {
    filters.phone = args.phone;
  }

  if (args.whatsapp) {
    filters.whatsapp_no = args.whatsapp;
  }

  if (args.lead_name) {
    filters.lead_name = args.lead_name;
  }

  if (args.company_name) {
    filters.company_name = args.company_name;
  }

  if (args.status) {
    filters.status = args.status;
  }

  if (args.custom_lead_status) {
    filters.custom_lead_status = args.custom_lead_status;
  }

  // Search for leads
  const leads = await frappeClient.searchLeads(filters);

  if (leads.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'No leads found matching the search criteria.',
        },
      ],
    };
  }

  // Format results
  const resultsText = leads
    .map((lead, index) => {
      const parts = [
        `Lead ${index + 1}: ${lead.name}`,
        `  Name: ${lead.lead_name || 'N/A'}`,
        `  Email: ${lead.email_id || 'N/A'}`,
        `  Mobile: ${lead.mobile_no || 'N/A'}`,
        `  Phone: ${lead.phone || 'N/A'}`,
        `  WhatsApp: ${lead.whatsapp_no || 'N/A'}`,
        `  Company: ${lead.company_name || 'N/A'}`,
        `  Status: ${lead.status || 'N/A'}`,
        `  Lead Owner: ${lead.lead_owner || 'N/A'}`,
      ];

      // Add custom fields if present
      if (lead.custom_enquiry_type) {
        parts.push(`  Enquiry Type: ${lead.custom_enquiry_type}`);
      }
      if (lead.custom_enquiry_source) {
        parts.push(`  Enquiry Source: ${lead.custom_enquiry_source}`);
      }
      if (lead.custom_product_category) {
        parts.push(`  Product Category: ${lead.custom_product_category}`);
      }
      if (lead.custom_lead_status) {
        parts.push(`  Custom Status: ${lead.custom_lead_status}`);
      }
      if (lead.custom_budget_range) {
        parts.push(`  Budget Range: ${lead.custom_budget_range}`);
      }
      if (lead.custom_timeline_expected) {
        parts.push(`  Timeline: ${lead.custom_timeline_expected}`);
      }
      if (lead.custom_prototype_quantity) {
        parts.push(`  Prototype Qty: ${lead.custom_prototype_quantity}`);
      }
      if (lead.custom_estimated_prototype_delivery) {
        parts.push(`  Est. Delivery: ${lead.custom_estimated_prototype_delivery}`);
      }
      if (lead.custom__followup_notes) {
        parts.push(`  Follow-up Notes: ${lead.custom__followup_notes}`);
      }
      if (lead.custom_information_pending_from_lead) {
        parts.push(`  Pending Info: ${lead.custom_information_pending_from_lead}`);
      }

      parts.push(`  Created: ${lead.creation || 'N/A'}`);
      parts.push(`  Modified: ${lead.modified || 'N/A'}`);

      return parts.join('\n');
    })
    .join('\n\n');

  return {
    content: [
      {
        type: 'text' as const,
        text: `Found ${leads.length} lead(s):\n\n${resultsText}`,
      },
    ],
  };
}
