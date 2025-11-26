import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// API Client class
class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    // Remove trailing slash and /api suffix to prevent double /api/api issues
    this.baseURL = apiUrl.replace(/\/$/, '').replace(/\/api$/, '');
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              const accessToken = response?.data?.accessToken;
              
              if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client(config);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          return {
            success: false,
            error: error.response.data?.error || 'Request failed',
            details: error.response.data?.details
          };
        } else if (error.request) {
          return {
            success: false,
            error: 'Network error - please check your connection'
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  // Generic HTTP methods
  async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request({ method: 'GET', url, params, ...config });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request({ method: 'POST', url, data, ...config });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request({ method: 'PUT', url, data, ...config });
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request({ method: 'PATCH', url, data, ...config });
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request({ method: 'DELETE', url });
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/login',
      data: { email, password }
    });
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyId: string;
  }): Promise<ApiResponse<{ user: any }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/register',
      data
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{
    accessToken: string;
    user: any;
  }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/refresh',
      data: { refreshToken }
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: '/api/auth/logout'
    });
  }

  // Invoice methods
  async getInvoices(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request({
      method: 'GET',
      url: '/api/invoices',
      params
    });
  }

  async getInvoice(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/api/invoices/${id}`
    });
  }

  async createInvoice(data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/api/invoices',
      data
    });
  }

  async updateInvoice(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      url: `/api/invoices/${id}`,
      data
    });
  }

  async deleteInvoice(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/api/invoices/${id}`
    });
  }

  async sendInvoiceToSEF(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/invoices/${id}/send`
    });
  }

  async getInvoiceStatus(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/api/invoices/${id}/status`
    });
  }

  async cancelInvoice(id: string, reason?: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/invoices/${id}/cancel`,
      data: { reason }
    });
  }

  async downloadInvoicePDF(id: string): Promise<Blob> {
    const response = await this.client.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async downloadInvoiceXML(id: string): Promise<Blob> {
    const response = await this.client.get(`/api/invoices/${id}/xml`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Company methods
  async getCompany(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/api/company'
    });
  }

  async updateCompany(data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      url: '/api/company',
      data
    });
  }

  // Dashboard methods
  async getDashboardOverview(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/overview'
    });
  }

  async getDashboardCharts(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/charts'
    });
  }

  async getDashboardRecent(limit: number = 10): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/recent',
      params: { limit }
    });
  }

  async getDashboardAlerts(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/alerts'
    });
  }

  // LEGACY Dashboard method (kept for backward compatibility)
  async getDashboardData(): Promise<ApiResponse<any>> {
    return this.getDashboardOverview();
  }

  // Partner methods
  async getPartners(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isActive?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request({
      method: 'GET',
      url: '/api/partners',
      params
    });
  }

  async getPartner(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/api/partners/${id}`
    });
  }

  async createPartner(data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/api/partners',
      data
    });
  }

  async updatePartner(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      url: `/api/partners/${id}`,
      data
    });
  }

  async deletePartner(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/api/partners/${id}`
    });
  }

  async searchPartners(query: string): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/api/partners/autocomplete',
      params: { q: query }
    });
  }

  // Product methods
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request({
      method: 'GET',
      url: '/api/products',
      params
    });
  }

  async getProduct(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/api/products/${id}`
    });
  }

  async createProduct(data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/api/products',
      data
    });
  }

  async updateProduct(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      url: `/api/products/${id}`,
      data
    });
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/api/products/${id}`
    });
  }

  async updateProductStock(id: string, adjustment: number, note?: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PATCH',
      url: `/api/products/${id}/stock`,
      data: { adjustment, note }
    });
  }

  async getLowStockProducts(): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/api/products/low-stock'
    });
  }

  async searchProducts(query: string): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: '/api/products/autocomplete',
      params: { q: query }
    });
  }

  async getInventoryHistory(id: string, params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request({
      method: 'GET',
      url: `/api/products/${id}/inventory-history`,
      params
    });
  }

  // Payment methods
  async getPayments(params?: {
    page?: number;
    limit?: number;
    invoiceId?: string;
    method?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request({
      method: 'GET',
      url: '/api/payments',
      params
    });
  }

  async getPayment(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/api/payments/${id}`
    });
  }

  async createPayment(data: {
    invoiceId: string;
    amount: number;
    currency?: string;
    paymentDate?: string;
    method: string;
    bankAccount?: string;
    reference?: string;
    note?: string;
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/api/payments',
      data
    });
  }

  async cancelPayment(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/api/payments/${id}`
    });
  }

  async getInvoicePayments(invoiceId: string): Promise<ApiResponse<any[]>> {
    return this.request({
      method: 'GET',
      url: `/api/invoices/${invoiceId}/payments`
    });
  }

  async getPaymentStats(params?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/api/payments/stats',
      params
    });
  }

  // Incoming Invoice methods
  async getIncomingInvoices(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    supplierPIB?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.request({
      method: 'GET',
      url: '/api/incoming-invoices',
      params
    });
  }

  async getIncomingInvoice(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/api/incoming-invoices/${id}`
    });
  }

  async createIncomingInvoice(data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/api/incoming-invoices',
      data
    });
  }

  async updateIncomingInvoiceStatus(id: string, status: string, reason?: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PATCH',
      url: `/api/incoming-invoices/${id}/status`,
      data: { status, reason }
    });
  }

  async syncIncomingInvoices(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/api/incoming-invoices/sync'
    });
  }

  async mapIncomingInvoiceProduct(id: string, lineId: string, productId: string | null): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/incoming-invoices/${id}/map-product`,
      data: { lineId, productId }
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
