import apiClient, { ApiResponse } from './api';

export enum RecurringFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export enum RecurringInvoiceStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

interface Partner {
  id: string;
  name: string;
  pib: string;
  address?: string;
  city?: string;
  email?: string;
}

interface InvoiceItem {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalAmount: number;
}

export interface RecurringInvoice {
  id: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextRunAt: string;
  lastRunAt?: string;
  status: RecurringInvoiceStatus;
  partnerId: string;
  partner?: Partner;
  currency: string;
  items: InvoiceItem[];
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const recurringInvoiceService = {
  getAll: async (): Promise<ApiResponse<RecurringInvoice[]>> => {
    return apiClient.get('/api/recurring-invoices');
  },

  getById: async (id: string): Promise<ApiResponse<RecurringInvoice>> => {
    return apiClient.get(`/api/recurring-invoices/${id}`);
  },

  create: async (data: Partial<RecurringInvoice>): Promise<ApiResponse<RecurringInvoice>> => {
    return apiClient.post('/api/recurring-invoices', data);
  },

  update: async (id: string, data: Partial<RecurringInvoice>): Promise<ApiResponse<RecurringInvoice>> => {
    return apiClient.patch(`/api/recurring-invoices/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/api/recurring-invoices/${id}`);
  }
};
