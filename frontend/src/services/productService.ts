/**
 * Product Service - API communication for products
 */

import api from './api';
import type {
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductSummary,
  ProductPaginatedResponse,
  StockAdjustmentRequest,
  InventoryTransaction
} from '@sef-app/shared';

// Re-export types for convenience
export type {
  ProductListItem,
  CreateProductDTO,
  UpdateProductDTO,
  ProductSummary,
  ProductPaginatedResponse,
  StockAdjustmentRequest,
  InventoryTransaction
};

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  trackInventory?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productService = {
  /**
   * List products with pagination and filtering
   */
  async list(params: ProductListParams = {}): Promise<ProductPaginatedResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.trackInventory) queryParams.append('trackInventory', params.trackInventory);
    if (params.isActive) queryParams.append('isActive', params.isActive);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const response = await api.get<ProductPaginatedResponse>(
      `/products?${queryParams.toString()}`
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load products');
    }
    
    return response.data;
  },

  /**
   * Get single product by ID
   */
  async get(id: string): Promise<ProductListItem> {
    const response = await api.get<{ data: ProductListItem }>(`/products/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load product');
    }
    return response.data.data;
  },

  /**
   * Create new product
   */
  async create(data: CreateProductDTO): Promise<ProductListItem> {
    const response = await api.post<{ data: ProductListItem }>('/products', data);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create product');
    }
    return response.data.data;
  },

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductDTO): Promise<ProductListItem> {
    const response = await api.put<{ data: ProductListItem }>(`/products/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update product');
    }
    return response.data.data;
  },

  /**
   * Delete product (soft delete)
   */
  async delete(id: string): Promise<void> {
    const response = await api.delete(`/products/${id}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete product');
    }
  },

  /**
   * Adjust stock for a product
   */
  async adjustStock(productId: string, data: StockAdjustmentRequest): Promise<ProductListItem> {
    const response = await api.post<{ data: ProductListItem }>(
      `/products/${productId}/adjust-stock`,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to adjust stock');
    }
    return response.data.data;
  },

  /**
   * Get inventory history for a product
   */
  async getInventoryHistory(productId: string): Promise<InventoryTransaction[]> {
    const response = await api.get<{ data: InventoryTransaction[] }>(
      `/products/${productId}/inventory-history`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to load inventory history');
    }
    return response.data.data;
  },

  /**
   * Get product summary stats
   */
  async getSummary(): Promise<ProductSummary> {
    const response = await api.get<{ data: ProductSummary }>('/products/summary');
    if (!response.success || !response.data) {
      // Return default if endpoint doesn't exist
      return { total: 0, withInventory: 0, lowStock: 0, active: 0 };
    }
    return response.data.data;
  }
};

export default productService;
