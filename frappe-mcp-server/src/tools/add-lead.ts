/**
 * Add Lead Tool
 * Creates a new lead in Frappe CRM
 */

import { z } from 'zod';
import type { FrappeClient } from '../frappe-client.js';
import type { CreateLeadPayload } from '../types/lead.js';

export const addLeadSchema = z.object({
  // Basic Information
  lead_name: z.string().optional().describe('Full name of the lead (auto-generated if not provided)'),
  first_name: z.string().optional().describe('First name'),
  last_name: z.string().optional().describe('Last name'),
  salutation: z.string().optional().describe('Salutation (Mr, Ms, Dr, etc.)'),
  gender: z.string().optional().describe('Gender'),
  job_title: z.string().optional().describe('Job title'),

  // Contact Information (at least one required)
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
  custom_requirement_details: z
    .string()
    .optional()
    .describe('Detailed requirement description from the lead'),
});

export type AddLeadArgs = z.infer<typeof addLeadSchema>;

/**
 * Execute add lead operation
 */
export async function addLead(args: AddLeadArgs, frappeClient: FrappeClient) {
  // Validate that at least one contact method is provided
  if (!args.email_id && !args.mobile_no && !args.phone) {
    throw new Error(
      'At least one contact method is required: email_id, mobile_no, or phone'
    );
  }

  // Build the payload - only include fields with actual values
  // This prevents sending undefined/null/empty values to Frappe
  const payload: CreateLeadPayload = {};

  // Helper function to add field only if it has a value
  const addIfHasValue = (frappeFieldName: string, value: any) => {
    if (value !== undefined && value !== null && value !== '') {
      (payload as any)[frappeFieldName] = value;
    }
  };

  // Map MCP parameter names to Frappe CRM Lead field names
  // IMPORTANT: CRM Lead uses 'email' not 'email_id', 'organization' not 'company_name'

  // Basic Information
  addIfHasValue('lead_name', args.lead_name);
  addIfHasValue('first_name', args.first_name);
  addIfHasValue('last_name', args.last_name);
  addIfHasValue('salutation', args.salutation);
  addIfHasValue('gender', args.gender);
  addIfHasValue('job_title', args.job_title);

  // Contact Information - MAP email_id → email
  addIfHasValue('email', args.email_id);
  addIfHasValue('mobile_no', args.mobile_no);
  addIfHasValue('phone', args.phone);
  addIfHasValue('whatsapp_no', args.whatsapp_no);
  addIfHasValue('website', args.website);

  // Company Information - MAP company_name → organization
  addIfHasValue('organization', args.company_name);
  addIfHasValue('annual_revenue', args.annual_revenue);

  // Location
  addIfHasValue('city', args.city);
  addIfHasValue('state', args.state);
  addIfHasValue('country', args.country);

  // Classification
  addIfHasValue('lead_owner', args.lead_owner);
  addIfHasValue('industry', args.industry);
  addIfHasValue('market_segment', args.market_segment);
  addIfHasValue('territory', args.territory);
  addIfHasValue('source', args.source);
  addIfHasValue('type', args.type);
  addIfHasValue('request_type', args.request_type);

  // Custom Fields - use exact field names
  addIfHasValue('custom_enquiry_type', args.custom_enquiry_type);
  addIfHasValue('custom_enquiry_source', args.custom_enquiry_source);
  addIfHasValue('custom_product_category', args.custom_product_category);
  addIfHasValue('custom_lead_status', args.custom_lead_status);
  addIfHasValue('custom_budget_range', args.custom_budget_range);
  addIfHasValue('custom_timeline_expected', args.custom_timeline_expected);
  addIfHasValue('custom_design_file_uploaded', args.custom_design_file_uploaded);
  addIfHasValue('custom_prototype_quantity', args.custom_prototype_quantity);
  addIfHasValue('custom__followup_notes', args.custom__followup_notes);
  addIfHasValue('custom_information_pending_from_lead', args.custom_information_pending_from_lead);
  addIfHasValue('custom_estimated_prototype_delivery', args.custom_estimated_prototype_delivery);
  addIfHasValue('custom_requirement_details', args.custom_requirement_details);

  // Create the lead
  const newLead = await frappeClient.createLead(payload);

  // Format response
  // IMPORTANT: Read from Frappe field names (email, organization) not MCP parameter names
  const responseText = [
    `Lead created successfully!`,
    ``,
    `Lead ID: ${newLead.name}`,
    `Name: ${newLead.lead_name || newLead.first_name || 'N/A'}`,
    `Email: ${(newLead as any).email || 'N/A'}`,
    `Mobile: ${newLead.mobile_no || 'N/A'}`,
    `Phone: ${newLead.phone || 'N/A'}`,
    `Company: ${(newLead as any).organization || 'N/A'}`,
    `Status: ${newLead.status || 'N/A'}`,
  ];

  // Add custom fields to response if present
  if (newLead.custom_enquiry_type) {
    responseText.push(`Enquiry Type: ${newLead.custom_enquiry_type}`);
  }
  if (newLead.custom_enquiry_source) {
    responseText.push(`Enquiry Source: ${newLead.custom_enquiry_source}`);
  }
  if (newLead.custom_product_category) {
    responseText.push(`Product Category: ${newLead.custom_product_category}`);
  }
  if (newLead.custom_lead_status) {
    responseText.push(`Custom Status: ${newLead.custom_lead_status}`);
  }
  if (newLead.custom_budget_range) {
    responseText.push(`Budget Range: ${newLead.custom_budget_range}`);
  }
  if (newLead.custom_timeline_expected) {
    responseText.push(`Timeline: ${newLead.custom_timeline_expected}`);
  }
  if (newLead.custom_prototype_quantity) {
    responseText.push(`Prototype Quantity: ${newLead.custom_prototype_quantity}`);
  }
  if (newLead.custom_estimated_prototype_delivery) {
    responseText.push(`Estimated Delivery: ${newLead.custom_estimated_prototype_delivery}`);
  }

  responseText.push(``);
  responseText.push(`Created: ${newLead.creation || 'N/A'}`);

  return {
    content: [
      {
        type: 'text' as const,
        text: responseText.join('\n'),
      },
    ],
  };
}
