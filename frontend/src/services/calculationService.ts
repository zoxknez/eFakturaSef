import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { Calculation, CalculationStatus } from '@sef-app/shared';

export interface CalculationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CalculationStatus;
  startDate?: string;
  endDate?: string;
  partnerId?: string;
}

export const calculationService = {
  getAll: async (params?: CalculationListParams): Promise<ApiResponse<PaginatedResponse<Calculation>>> => {
    return apiClient.get('/api/calculations', params as Record<string, unknown>);
  },

  getById: async (id: string): Promise<ApiResponse<Calculation>> => {
    return apiClient.get(`/api/calculations/${id}`);
  },

  create: async (data: Partial<Calculation>): Promise<ApiResponse<Calculation>> => {
    return apiClient.post('/api/calculations', data);
  },

  createFromInvoice: async (invoiceId: string): Promise<ApiResponse<Calculation>> => {
    return apiClient.post(`/api/calculations/from-invoice/${invoiceId}`);
  },

  update: async (id: string, data: Partial<Calculation>): Promise<ApiResponse<Calculation>> => {
    return apiClient.put(`/api/calculations/${id}`, data);
  },

  post: async (id: string): Promise<ApiResponse<Calculation>> => {
    return apiClient.post(`/api/calculations/${id}/post`);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/api/calculations/${id}`);
  }
};
