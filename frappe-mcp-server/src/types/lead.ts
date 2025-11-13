/**
 * Frappe CRM Lead DocType Type Definitions
 */

/**
 * Default Lead fields from Frappe/ERPNext
 */
export interface Lead {
  // Identification
  name?: string; // Unique identifier
  naming_series?: string;

  // Personal Information
  lead_name?: string;
  salutation?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  job_title?: string;
  image?: string;

  // Contact Information
  email_id?: string; // Old Lead doctype field name (deprecated)
  email?: string; // CRM Lead uses this field name
  mobile_no?: string;
  phone?: string;
  phone_ext?: string;
  whatsapp_no?: string;
  fax?: string;
  website?: string;

  // Company Information
  company_name?: string; // Old Lead doctype field name (deprecated)
  organization?: string; // CRM Lead uses this field name
  company?: string;
  annual_revenue?: number;
  no_of_employees?: string;

  // Location
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;

  // Lead Classification
  lead_owner?: string;
  industry?: string;
  market_segment?: string;
  territory?: string;
  language?: string;
  type?: "Client" | "Channel Partner" | "Consultant";

  // Status & Qualification
  status?: "Lead" | "Open" | "Replied" | "Opportunity" | "Quotation" | "Lost Quotation" | "Interested" | "Converted" | "Do Not Contact";
  qualification_status?: "Unqualified" | "In Process" | "Qualified";
  qualified_by?: string;
  qualified_on?: string;

  // Request Information
  request_type?: "Product Enquiry" | "Request for Information" | "Suggestions" | "Other";

  // UTM Parameters
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;

  // Flags
  disabled?: number;
  blog_subscriber?: number;
  unsubscribed?: number;

  // Relations
  customer?: string;

  // Notes
  notes?: Array<{
    note?: string;
    added_by?: string;
    added_on?: string;
  }>;

  // Custom Fields for Product Development/Prototyping Business
  custom_enquiry_type?: "Product Development" | "Prototyping" | "Testing Services" | "Consultation";
  custom_enquiry_source?: "Website Chat" | "Enquiry Form" | "Phone" | "Email";
  custom_product_category?: "Electronics" | "Mechanical" | "Software" | "IoT" | "Medical Devices";
  custom_lead_status?: "New" | "Under Review" | "Design in Progress" | "Prototype Development" | "Information Pending" | "Quote Sent" | "Converted" | "Lost";
  custom_budget_range?: "Under 50K" | "50K-2L" | "2L-5L" | "5L+" | "Not Disclosed";
  custom_timeline_expected?: "Urgent <2 weeks" | "1 month" | "2-3 months" | "Flexible";
  custom_design_file_uploaded?: number;
  custom_prototype_quantity?: number;
  custom__followup_notes?: string;
  custom_last_bot_interaction?: string;
  custom_information_pending_from_lead?: string;
  custom_estimated_prototype_delivery?: string;
  custom_requirement_details?: string;

  // Standard Frappe fields
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  docstatus?: number;
}

/**
 * Lead search filters
 */
export interface LeadSearchFilters {
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  whatsapp_no?: string;
  lead_name?: string;
  company_name?: string;
  status?: string;
  custom_lead_status?: string;
}

/**
 * Lead creation payload
 * Uses actual Frappe CRM Lead field names
 */
export interface CreateLeadPayload {
  // Required fields
  lead_name?: string;
  email?: string; // CRM Lead uses 'email' not 'email_id'
  mobile_no?: string;

  // Optional personal information
  first_name?: string;
  last_name?: string;
  salutation?: string;
  gender?: string;
  job_title?: string;

  // Optional company information
  organization?: string; // CRM Lead uses 'organization' not 'company_name'
  annual_revenue?: number;

  // Optional contact information
  phone?: string;
  whatsapp_no?: string;
  website?: string;

  // Optional location
  city?: string;
  state?: string;
  country?: string;

  // Optional classification
  lead_owner?: string;
  industry?: string;
  market_segment?: string;
  territory?: string;
  source?: string;
  type?: string;
  request_type?: string;

  // Custom fields
  custom_enquiry_type?: string;
  custom_enquiry_source?: string;
  custom_product_category?: string;
  custom_lead_status?: string;
  custom_budget_range?: string;
  custom_timeline_expected?: string;
  custom_design_file_uploaded?: number;
  custom_prototype_quantity?: number;
  custom__followup_notes?: string;
  custom_information_pending_from_lead?: string;
  custom_estimated_prototype_delivery?: string;
  custom_requirement_details?: string;
}

/**
 * Lead update payload
 */
export interface UpdateLeadPayload {
  // Any field from Lead can be updated
  [key: string]: any;
}

/**
 * Frappe API Response wrapper
 */
export interface FrappeResponse<T> {
  data?: T;
  message?: T;
  exc?: string;
  exc_type?: string;
  _server_messages?: string;
}

/**
 * Frappe API List Response
 */
export interface FrappeListResponse<T> {
  data: T[];
}
