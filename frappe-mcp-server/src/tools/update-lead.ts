/**
 * Update Lead Tool
 * Updates an existing lead in Frappe CRM
 */

import { z } from 'zod';
import type { FrappeClient } from '../frappe-client.js';
import type { UpdateLeadPayload } from '../types/lead.js';

export const updateLeadSchema = z.object({
  // Required: Lead ID to update
  lead_id: z.string().describe('Lead ID (name) to update'),

  // Basic Information
  lead_name: z.string().optional().describe('Full name of the lead'),
  first_name: z.string().optional().describe('First name'),
  last_name: z.string().optional().describe('Last name'),
  salutation: z.string().optional().describe('Salutation (Mr, Ms, Dr, etc.)'),
  gender: z.string().optional().describe('Gender'),
  job_title: z.string().optional().describe('Job title'),

  // Contact Information
  email_id: z.string().email().optional().describe('Email address'),
  mobile_no: z.string().optional().describe('Mobile number'),
  phone: z.string().optional().describe('Phone number'),
  whatsapp_no: z.string().optional().describe('WhatsApp number'),
  website: z.string().optional().describe('Website URL'),

  // Company Information
  company_name: z.string().optional().describe('Company name'),
  annual_revenue: z.number().optional().describe('Annual revenue'),

  // Location
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  country: z.string().optional().describe('Country'),

  // Classification
  lead_owner: z.string().optional().describe('Lead owner (user email)'),
  industry: z.string().optional().describe('Industry'),
  market_segment: z.string().optional().describe('Market segment'),
  territory: z.string().optional().describe('Territory'),
  source: z.string().optional().describe('Lead source'),
  type: z.enum(['Client', 'Channel Partner', 'Consultant']).optional().describe('Lead type'),
  status: z
    .enum([
      'Lead',
      'Open',
      'Replied',
      'Opportunity',
      'Quotation',
      'Lost Quotation',
      'Interested',
      'Converted',
      'Do Not Contact',
    ])
    .optional()
    .describe('Lead status'),
  request_type: z
    .enum(['Product Enquiry', 'Request for Information', 'Suggestions', 'Other'])
    .optional()
    .describe('Request type'),

  // Custom Fields - Product Development/Prototyping
  custom_enquiry_type: z
    .enum(['Product Development', 'Prototyping', 'Testing Services', 'Consultation'])
    .optional()
    .describe('Type of enquiry'),
  custom_enquiry_source: z
    .enum(['Website Chat', 'Enquiry Form', 'Phone', 'Email'])
    .optional()
    .describe('Source of enquiry'),
  custom_product_category: z
    .enum(['Electronics', 'Mechanical', 'Software', 'IoT', 'Medical Devices'])
    .optional()
    .describe('Product category'),
  custom_lead_status: z
    .enum([
      'New',
      'Under Review',
      'Design in Progress',
      'Prototype Development',
      'Information Pending',
      'Quote Sent',
      'Converted',
      'Lost',
    ])
    .optional()
    .describe('Custom lead status'),
  custom_budget_range: z
    .enum(['Under 50K', '50K-2L', '2L-5L', '5L+', 'Not Disclosed'])
    .optional()
    .describe('Budget range'),
  custom_timeline_expected: z
    .enum(['Urgent <2 weeks', '1 month', '2-3 months', 'Flexible'])
    .optional()
    .describe('Expected timeline'),
  custom_design_file_uploaded: z
    .number()
    .int()
    .min(0)
    .max(1)
    .optional()
    .describe('Design file uploaded (0 or 1)'),
  custom_prototype_quantity: z.number().int().optional().describe('Prototype quantity'),
  custom__followup_notes: z.string().optional().describe('Follow-up notes'),
  custom_information_pending_from_lead: z
    .string()
    .optional()
    .describe('Information pending from lead'),
  custom_estimated_prototype_delivery: z
    .string()
    .optional()
    .describe('Estimated prototype delivery date (YYYY-MM-DD)'),
  custom_last_bot_interaction: z.string().optional().describe('Last bot interaction datetime'),
  custom_requirement_details: z
    .string()
    .optional()
    .describe('Detailed requirement description from the lead'),

  // Disable flag
  disabled: z.number().int().min(0).max(1).optional().describe('Disable lead (0 or 1)'),
});

export type UpdateLeadArgs = z.infer<typeof updateLeadSchema>;

/**
 * Execute update lead operation
 */
export async function updateLead(args: UpdateLeadArgs, frappeClient: FrappeClient) {
  const { lead_id, ...updateFields } = args;

  // Build the payload - only include fields with actual values
  // This prevents sending undefined/null/empty values to Frappe
  const payload: UpdateLeadPayload = {};

  // Add each field only if it has a value
  Object.keys(updateFields).forEach((key) => {
    const value = (updateFields as any)[key];
    // Include the value if it's not undefined, null, or empty string
    // Note: We allow 0 and false as valid values
    if (value !== undefined && value !== null && value !== '') {
      (payload as any)[key] = value;
    }
  });

  // Check if there are any fields to update
  if (Object.keys(payload).length === 0) {
    throw new Error('No fields provided to update. Please specify at least one field to update.');
  }

  // Update the lead
  const updatedLead = await frappeClient.updateLead(lead_id, payload);

  // Format response
  const responseText = [
    `Lead updated successfully!`,
    ``,
    `Lead ID: ${updatedLead.name}`,
    `Name: ${updatedLead.lead_name || 'N/A'}`,
    `Email: ${updatedLead.email_id || 'N/A'}`,
    `Mobile: ${updatedLead.mobile_no || 'N/A'}`,
    `Phone: ${updatedLead.phone || 'N/A'}`,
    `Company: ${updatedLead.company_name || 'N/A'}`,
    `Status: ${updatedLead.status || 'N/A'}`,
  ];

  // Add custom fields to response if present
  if (updatedLead.custom_enquiry_type) {
    responseText.push(`Enquiry Type: ${updatedLead.custom_enquiry_type}`);
  }
  if (updatedLead.custom_enquiry_source) {
    responseText.push(`Enquiry Source: ${updatedLead.custom_enquiry_source}`);
  }
  if (updatedLead.custom_product_category) {
    responseText.push(`Product Category: ${updatedLead.custom_product_category}`);
  }
  if (updatedLead.custom_lead_status) {
    responseText.push(`Custom Status: ${updatedLead.custom_lead_status}`);
  }
  if (updatedLead.custom_budget_range) {
    responseText.push(`Budget Range: ${updatedLead.custom_budget_range}`);
  }
  if (updatedLead.custom_timeline_expected) {
    responseText.push(`Timeline: ${updatedLead.custom_timeline_expected}`);
  }
  if (updatedLead.custom_prototype_quantity) {
    responseText.push(`Prototype Quantity: ${updatedLead.custom_prototype_quantity}`);
  }
  if (updatedLead.custom_estimated_prototype_delivery) {
    responseText.push(`Estimated Delivery: ${updatedLead.custom_estimated_prototype_delivery}`);
  }
  if (updatedLead.custom_design_file_uploaded !== undefined) {
    responseText.push(
      `Design File Uploaded: ${updatedLead.custom_design_file_uploaded ? 'Yes' : 'No'}`
    );
  }
  if (updatedLead.custom__followup_notes) {
    responseText.push(`Follow-up Notes: ${updatedLead.custom__followup_notes}`);
  }
  if (updatedLead.custom_information_pending_from_lead) {
    responseText.push(`Pending Info: ${updatedLead.custom_information_pending_from_lead}`);
  }
  if (updatedLead.custom_last_bot_interaction) {
    responseText.push(`Last Bot Interaction: ${updatedLead.custom_last_bot_interaction}`);
  }

  responseText.push(``);
  responseText.push(`Last Modified: ${updatedLead.modified || 'N/A'}`);

  // Show which fields were updated
  const updatedFields = Object.keys(updateFields).join(', ');
  responseText.push(``);
  responseText.push(`Updated fields: ${updatedFields}`);

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText.join('\n'),
      },
    ],
  };
}
