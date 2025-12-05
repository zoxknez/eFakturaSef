/**
 * Recurring Invoice Service
 * API calls for managing recurring/periodic invoices
 */

import apiClient, { ApiResponse } from './api';
import type {
  RecurringInvoiceListItem,
  CreateRecurringInvoiceDTO,
  UpdateRecurringInvoiceDTO,
  RecurringInvoiceSummary
} from '@sef-app/shared';

// Re-export types for convenience
export { RecurringFrequency, RecurringInvoiceStatus } from '@sef-app/shared';
export type { RecurringInvoiceListItem, CreateRecurringInvoiceDTO, UpdateRecurringInvoiceDTO };

export const recurringInvoiceService = {
  /**
   * Get all recurring invoices for company
   */
  getAll: async (params?: {
    status?: string;
  }): Promise<ApiResponse<RecurringInvoiceListItem[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    
    const query = queryParams.toString();
    return apiClient.get(`/api/recurring-invoices${query ? `?${query}` : ''}`);
  },

  /**
   * Get single recurring invoice by ID
   */
  getById: async (id: string): Promise<ApiResponse<RecurringInvoiceListItem>> => {
    return apiClient.get(`/api/recurring-invoices/${id}`);
  },

  /**
   * Create new recurring invoice
   */
  create: async (data: CreateRecurringInvoiceDTO): Promise<ApiResponse<RecurringInvoiceListItem>> => {
    return apiClient.post('/api/recurring-invoices', data);
  },

  /**
   * Update recurring invoice
   */
  update: async (id: string, data: UpdateRecurringInvoiceDTO): Promise<ApiResponse<RecurringInvoiceListItem>> => {
    return apiClient.patch(`/api/recurring-invoices/${id}`, data);
  },

  /**
   * Pause a recurring invoice
   */
  pause: async (id: string): Promise<ApiResponse<RecurringInvoiceListItem>> => {
    return apiClient.patch(`/api/recurring-invoices/${id}`, { status: 'PAUSED' });
  },

  /**
   * Resume a paused recurring invoice
   */
  resume: async (id: string): Promise<ApiResponse<RecurringInvoiceListItem>> => {
    return apiClient.patch(`/api/recurring-invoices/${id}`, { status: 'ACTIVE' });
  },

  /**
   * Cancel (delete) a recurring invoice
   */
  cancel: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/api/recurring-invoices/${id}`);
  },

  /**
   * Get summary counts by status
   */
  getSummary: async (): Promise<ApiResponse<RecurringInvoiceSummary>> => {
    return apiClient.get('/api/recurring-invoices/summary');
  }
};
