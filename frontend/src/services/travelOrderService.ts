import { apiClient } from './api';
import { 
  TravelOrder, 
  TravelOrderSchema, 
  API_ENDPOINTS, 
  TravelOrderExpense 
} from '@sef-app/shared';
import { z } from 'zod';

export interface TravelOrderListResponse {
  data: TravelOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const travelOrderService = {
  async getTravelOrders(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate.toISOString());
    if (params?.endDate) queryParams.append('endDate', params.endDate.toISOString());

    const response = await apiClient.get<TravelOrderListResponse>(
      `${API_ENDPOINTS.TRAVEL_ORDERS}?${queryParams.toString()}`
    );
    return response;
  },

  async getTravelOrderById(id: string) {
    const response = await apiClient.get<TravelOrder>(
      API_ENDPOINTS.TRAVEL_ORDER_BY_ID(id)
    );
    return response;
  },

  async createTravelOrder(data: Partial<TravelOrder>) {
    const response = await apiClient.post<TravelOrder>(
      API_ENDPOINTS.TRAVEL_ORDERS,
      data
    );
    return response;
  },

  async updateTravelOrder(id: string, data: Partial<TravelOrder>) {
    const response = await apiClient.put<TravelOrder>(
      API_ENDPOINTS.TRAVEL_ORDER_BY_ID(id),
      data
    );
    return response;
  },

  async deleteTravelOrder(id: string) {
    const response = await apiClient.delete(
      API_ENDPOINTS.TRAVEL_ORDER_BY_ID(id)
    );
    return response;
  }
};
