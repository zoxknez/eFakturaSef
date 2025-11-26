import { apiClient, PaginatedResponse } from './api';
import { FixedAsset, FixedAssetSchema } from '@sef-app/shared';
import { z } from 'zod';

const BASE_URL = '/fixed-assets';

export const fixedAssetService = {
  getAll: async (page = 1, limit = 20, search = '') => {
    const response = await apiClient.get<PaginatedResponse<FixedAsset>>(BASE_URL, { params: { page, limit, search } });
    return response;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<FixedAsset>(`${BASE_URL}/${id}`);
    return response;
  },

  create: async (data: z.infer<typeof FixedAssetSchema>) => {
    const response = await apiClient.post<FixedAsset>(BASE_URL, data);
    return response;
  },

  update: async (id: string, data: Partial<z.infer<typeof FixedAssetSchema>>) => {
    const response = await apiClient.put<FixedAsset>(`${BASE_URL}/${id}`, data);
    return response;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`${BASE_URL}/${id}`);
    return response;
  },

  calculateAmortization: async (year: number, apply: boolean = false) => {
    const response = await apiClient.post<{
      data: Array<{
        assetId: string;
        name: string;
        inventoryNumber: string;
        currentValue: number;
        amortizationAmount: number;
        newValue: number;
      }>;
      message: string;
    }>(`${BASE_URL}/calculate-amortization`, { year, apply });
    return response;
  }
};
