/**
 * Frappe API Client
 * Handles all interactions with Frappe/ERPNext API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Lead,
  LeadSearchFilters,
  CreateLeadPayload,
  UpdateLeadPayload,
  FrappeResponse,
  FrappeListResponse,
} from './types/lead.js';

export class FrappeClient {
  private client: AxiosInstance;
  private apiUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiUrl: string, apiKey: string, apiSecret: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Handle Frappe API errors
   */
  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<FrappeResponse<any>>;

      if (axiosError.response) {
        const data = axiosError.response.data;
        const errorMessage = data?.exc || data?.message || axiosError.message;
        throw new Error(`Frappe API Error: ${errorMessage}`);
      } else if (axiosError.request) {
        throw new Error(`Network Error: Unable to reach Frappe server at ${this.apiUrl}`);
      }
    }

    throw new Error(`Unknown Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  /**
   * Search for leads by email or mobile number
   */
  async searchLeads(filters: LeadSearchFilters): Promise<Lead[]> {
    try {
      // Build filter conditions
      const filterConditions: any[] = [];

      if (filters.email_id) {
        filterConditions.push(['email', 'like', `%${filters.email_id}%`]);
      }

      if (filters.mobile_no) {
        filterConditions.push(['mobile_no', 'like', `%${filters.mobile_no}%`]);
      }

      if (filters.phone) {
        filterConditions.push(['phone', 'like', `%${filters.phone}%`]);
      }

      if (filters.whatsapp_no) {
        filterConditions.push(['whatsapp_no', 'like', `%${filters.whatsapp_no}%`]);
      }

      if (filters.lead_name) {
        filterConditions.push(['lead_name', 'like', `%${filters.lead_name}%`]);
      }

      if (filters.company_name) {
        filterConditions.push(['organization', 'like', `%${filters.company_name}%`]);
      }

      if (filters.status) {
        filterConditions.push(['status', '=', filters.status]);
      }

      if (filters.custom_lead_status) {
        filterConditions.push(['custom_lead_status', '=', filters.custom_lead_status]);
      }

      // CRM Lead fields (using correct field names for CRM Lead doctype)
      const fields = [
        'name',
        'lead_name',
        'email',  // Note: CRM Lead uses 'email' not 'email_id'
        'mobile_no',
        'phone',
        'organization',  // Note: CRM Lead uses 'organization' not 'company_name'
        'website',
        'status',
        'lead_owner',
        'territory',
        'industry',
        'job_title',
        'source',
        'first_name',
        'last_name',
        'salutation',
        'creation',
        'modified',
        // Custom fields (now enabled)
        'custom_enquiry_type',
        'custom_enquiry_source',
        'custom_product_category',
        'custom_lead_status',
        'custom_budget_range',
        'custom_timeline_expected',
        'custom_design_file_uploaded',
        'custom_prototype_quantity',
        'custom__followup_notes',
        'custom_last_bot_interaction',
        'custom_information_pending_from_lead',
        'custom_estimated_prototype_delivery',
        'custom_requirement_details',
      ];

      const params: any = {
        fields: JSON.stringify(fields),
        limit_page_length: 100,
      };

      // Only add filters if there are any
      if (filterConditions.length > 0) {
        params.filters = JSON.stringify(filterConditions);
      }

      const response = await this.client.get<FrappeListResponse<Lead>>('/api/resource/CRM Lead', {
        params,
      });

      return response.data.data || [];
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get a single lead by name (ID)
   */
  async getLead(name: string): Promise<Lead | null> {
    try {
      const response = await this.client.get<FrappeResponse<Lead>>(`/api/resource/CRM Lead/${name}`);
      return response.data.data || response.data.message || null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.handleError(error);
    }
  }

  /**
   * Create a new lead
   */
  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    try {
      // Ensure we have at least one required field
      // Note: payload uses actual Frappe field names (email, organization)
      if (!payload.lead_name && !payload.email && !payload.mobile_no) {
        throw new Error('At least one of lead_name, email, or mobile_no is required');
      }

      // If lead_name is not provided, construct it from first_name and last_name or email
      if (!payload.lead_name) {
        if (payload.first_name || payload.last_name) {
          payload.lead_name = [payload.first_name, payload.last_name].filter(Boolean).join(' ');
        } else if (payload.email) {
          payload.lead_name = payload.email.split('@')[0];
        } else if (payload.mobile_no) {
          payload.lead_name = `Lead ${payload.mobile_no}`;
        }
      }

      const response = await this.client.post<FrappeResponse<Lead>>('/api/resource/CRM Lead', payload);

      return response.data.data || response.data.message!;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Update an existing lead
   */
  async updateLead(name: string, payload: UpdateLeadPayload): Promise<Lead> {
    try {
      // First check if lead exists
      const existingLead = await this.getLead(name);
      if (!existingLead) {
        throw new Error(`Lead with name '${name}' not found`);
      }

      const response = await this.client.put<FrappeResponse<Lead>>(
        `/api/resource/CRM Lead/${name}`,
        payload
      );

      return response.data.data || response.data.message!;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Delete a lead (soft delete by setting disabled flag)
   */
  async disableLead(name: string): Promise<Lead> {
    try {
      return await this.updateLead(name, { disabled: 1 });
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Test connection to Frappe API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/method/frappe.auth.get_logged_user');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
