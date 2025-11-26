import { apiClient, PaginatedResponse } from './api';
import { PettyCashAccount, PettyCashEntry, PettyCashEntrySchema } from '@sef-app/shared';
import { z } from 'zod';

const BASE_URL = '/petty-cash';

export const pettyCashService = {
  // Accounts
  getAccounts: async () => {
    const response = await apiClient.get<PettyCashAccount[]>(`${BASE_URL}/accounts`);
    return response;
  },

  getAccount: async (id: string) => {
    const response = await apiClient.get<PettyCashAccount>(`${BASE_URL}/accounts/${id}`);
    return response;
  },

  createAccount: async (name: string, currency: string) => {
    const response = await apiClient.post<PettyCashAccount>(`${BASE_URL}/accounts`, { name, currency });
    return response;
  },

  getNextEntryNumber: async (accountId: string) => {
    const response = await apiClient.get<{ number: string }>(`${BASE_URL}/accounts/${accountId}/next-number`);
    return response;
  },

  // Entries
  listEntries: async (accountId?: string, page = 1, limit = 20) => {
    const response = await apiClient.get<PaginatedResponse<PettyCashEntry>>(`${BASE_URL}/entries`, {
      params: { accountId, page, limit }
    });
    return response;
  },

  createEntry: async (data: z.infer<typeof PettyCashEntrySchema>) => {
    const response = await apiClient.post<PettyCashEntry>(`${BASE_URL}/entries`, data);
    return response;
  }
};
