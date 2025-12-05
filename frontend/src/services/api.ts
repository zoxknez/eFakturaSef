import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { 
  DashboardOverview, 
  DashboardCharts, 
  DashboardAlerts, 
  DashboardInvoice,
  SEFHealthStatus,
  InvoiceListItem,
  InvoiceListResponse,
  InvoiceFilterParams,
  InvoiceStatusCounts,
  BulkOperationResult,
  IncomingInvoiceListItem,
  IncomingInvoiceListResponse,
  IncomingInvoiceDetail,
  IncomingInvoiceFilterParams,
  IncomingInvoiceStatusCounts,
  IncomingInvoicePaymentCounts,
  IncomingInvoiceSyncResult,
  CreateIncomingInvoiceDTO,
  IncomingInvoiceLineItem,
  PartnerAutocompleteItem,
  ProductAutocompleteItem,
  CreateInvoiceDTO
} from '@sef-app/shared';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
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

  // ================== INVOICE METHODS ==================

  /** Get paginated list of invoices with filters */
  async getInvoices(params?: InvoiceFilterParams | Record<string, unknown>): Promise<ApiResponse<InvoiceListResponse>> {
    return this.request({
      method: 'GET',
      url: '/api/invoices',
      params
    });
  }

  /** Get invoice status counts for tabs */
  async getInvoiceStatusCounts(): Promise<ApiResponse<InvoiceStatusCounts>> {
    return this.request({
      method: 'GET',
      url: '/api/invoices/counts'
    });
  }

  /** Get single invoice by ID */
  async getInvoice(id: string): Promise<ApiResponse<InvoiceListItem>> {
    return this.request({
      method: 'GET',
      url: `/api/invoices/${id}`
    });
  }

  /** Create new invoice */
  async createInvoice(data: CreateInvoiceDTO): Promise<ApiResponse<InvoiceListItem>> {
    return this.request({
      method: 'POST',
      url: '/api/invoices',
      data
    });
  }

  /** Update invoice (drafts only) */
  async updateInvoice(id: string, data: Record<string, unknown>): Promise<ApiResponse<InvoiceListItem>> {
    return this.request({
      method: 'PUT',
      url: `/api/invoices/${id}`,
      data
    });
  }

  /** Delete invoice (drafts only) */
  async deleteInvoice(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/api/invoices/${id}`
    });
  }

  /** Send invoice to SEF system (queued) */
  async sendInvoiceToSEF(id: string): Promise<ApiResponse<{ jobId: string; invoiceId: string; estimatedProcessingTime: string }>> {
    return this.request({
      method: 'POST',
      url: `/api/invoices/${id}/send`
    });
  }

  /** Get invoice status from SEF */
  async getInvoiceStatus(id: string): Promise<ApiResponse<{ Status: string; StatusDate?: string }>> {
    return this.request({
      method: 'GET',
      url: `/api/invoices/${id}/status`
    });
  }

  /** Cancel invoice in SEF */
  async cancelInvoice(id: string, reason?: string): Promise<ApiResponse<{ invoice: InvoiceListItem; sefResponse: unknown }>> {
    return this.request({
      method: 'POST',
      url: `/api/invoices/${id}/cancel`,
      data: { reason }
    });
  }

  /** Download invoice as PDF */
  async downloadInvoicePDF(id: string): Promise<Blob> {
    const response = await this.client.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /** Download invoice as UBL XML */
  async downloadInvoiceXML(id: string): Promise<Blob> {
    const response = await this.client.get(`/api/invoices/${id}/xml`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // ================== BULK OPERATIONS ==================

  /** Bulk send invoices to SEF */
  async bulkSendInvoices(invoiceIds: string[]): Promise<ApiResponse<BulkOperationResult>> {
    return this.request({
      method: 'POST',
      url: '/api/bulk/send',
      data: { invoiceIds }
    });
  }

  /** Bulk delete invoices (drafts only) */
  async bulkDeleteInvoices(invoiceIds: string[]): Promise<ApiResponse<BulkOperationResult>> {
    return this.request({
      method: 'DELETE',
      url: '/api/bulk/delete',
      data: { invoiceIds }
    });
  }

  /** Bulk export invoices */
  async bulkExportInvoices(invoiceIds: string[], format: 'pdf' | 'xml' | 'csv' | 'xlsx'): Promise<Blob> {
    const response = await this.client.post('/api/bulk/export', 
      { invoiceIds, format },
      { responseType: 'blob' }
    );
    return response.data;
  }

  // ================== COMPANY METHODS ==================
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
  async getDashboardOverview(): Promise<ApiResponse<DashboardOverview>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/overview'
    });
  }

  async getDashboardCharts(): Promise<ApiResponse<DashboardCharts>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/charts'
    });
  }

  async getDashboardRecent(limit: number = 10): Promise<ApiResponse<DashboardInvoice[]>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/recent',
      params: { limit }
    });
  }

  async getDashboardAlerts(): Promise<ApiResponse<DashboardAlerts>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/alerts'
    });
  }

  async getSEFHealth(): Promise<ApiResponse<SEFHealthStatus>> {
    return this.request({
      method: 'GET',
      url: '/api/dashboard/sef-health'
    });
  }

  async refreshSEFHealth(): Promise<ApiResponse<SEFHealthStatus>> {
    return this.request({
      method: 'POST',
      url: '/api/dashboard/sef-health/refresh'
    });
  }

  // ================== SEF API METHODS ==================

  /** Get SEF API version */
  async getSEFVersion(): Promise<ApiResponse<{ version: string }>> {
    return this.request({
      method: 'GET',
      url: '/api/sef/version'
    });
  }

  /** Get SEF unit measures list */
  async getSEFUnitMeasures(): Promise<ApiResponse<Array<{
    Code: string;
    Symbol?: string;
    NameEng: string;
    NameSrbLtn: string;
    NameSrbCyr: string;
    IsOnShortList: boolean;
  }>>> {
    return this.request({
      method: 'GET',
      url: '/api/sef/unit-measures'
    });
  }

  /** Get SEF VAT exemption reasons */
  async getSEFVatExemptionReasons(): Promise<ApiResponse<Array<{
    Id: number;
    Key: string;
    NameEng: string;
    NameSrbLtn: string;
    NameSrbCyr: string;
  }>>> {
    return this.request({
      method: 'GET',
      url: '/api/sef/vat-exemption-reasons'
    });
  }

  /** Check if company exists in SEF by VAT number (PIB) */
  async checkSEFCompany(vatNumber: string): Promise<ApiResponse<{
    exists: boolean;
    companyName?: string;
    vatNumber?: string;
    registrationCode?: string;
    isBudgetUser: boolean;
  }>> {
    return this.request({
      method: 'GET',
      url: '/api/sef/company/check',
      params: { vatNumber }
    });
  }

  /** Direct SEF health check */
  async checkSEFHealth(): Promise<ApiResponse<{
    healthy: boolean;
    nightPause: boolean;
    minutesUntilNightPauseEnds: number;
  }>> {
    return this.request({
      method: 'GET',
      url: '/api/sef/health'
    });
  }

  /** Get sales invoice changes from SEF */
  async getSEFSalesInvoiceChanges(date: string): Promise<ApiResponse<Array<{
    InvoiceId: number;
    LastModifiedUtc: string;
    Status: string;
  }>>> {
    return this.request({
      method: 'GET',
      url: '/api/sef/sales-invoice/changes',
      params: { date }
    });
  }

  /** Get purchase invoice changes from SEF */
  async getSEFPurchaseInvoiceChanges(date: string): Promise<ApiResponse<Array<{
    InvoiceId: number;
    LastModifiedUtc: string;
    Status: string;
  }>>> {
    return this.request({
      method: 'GET',
      url: '/api/sef/purchase-invoice/changes',
      params: { date }
    });
  }

  // LEGACY Dashboard method (kept for backward compatibility)
  async getDashboardData(): Promise<ApiResponse<DashboardOverview>> {
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

  async searchPartners(query: string): Promise<ApiResponse<PartnerAutocompleteItem[]>> {
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

  async searchProducts(query: string): Promise<ApiResponse<ProductAutocompleteItem[]>> {
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

  // Accounting methods
  async getAccounts(params?: {
    flat?: boolean;
    isActive?: boolean;
    type?: string;
  }): Promise<ApiResponse<unknown[]>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/accounts',
      params
    });
  }

  async getAccount(id: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: `/api/accounting/accounts/${id}`
    });
  }

  async createAccount(data: {
    code: string;
    name: string;
    type: string;
    description?: string;
    parentId?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: '/api/accounting/accounts',
      data
    });
  }

  async updateAccount(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'PUT',
      url: `/api/accounting/accounts/${id}`,
      data
    });
  }

  async deleteAccount(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: `/api/accounting/accounts/${id}`
    });
  }

  async initializeAccounts(): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: '/api/accounting/accounts/initialize'
    });
  }

  async createJournalEntry(data: unknown): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: '/api/accounting/journals',
      data
    });
  }

  async getJournalEntries(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/journals',
      params
    });
  }

  async postJournalEntry(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/accounting/journals/${id}/post`
    });
  }

  async reverseJournalEntry(id: string, reason?: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/accounting/journals/${id}/reverse`,
      data: { reason }
    });
  }

  async deleteJournalEntry(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'DELETE',
      url: `/api/accounting/journals/${id}`
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

  // =====================================================
  // INCOMING INVOICE METHODS
  // =====================================================

  async getIncomingInvoices(params?: IncomingInvoiceFilterParams): Promise<ApiResponse<IncomingInvoiceListResponse>> {
    return this.request({
      method: 'GET',
      url: '/api/incoming-invoices',
      params
    });
  }

  async getIncomingInvoice(id: string): Promise<ApiResponse<IncomingInvoiceDetail>> {
    return this.request({
      method: 'GET',
      url: `/api/incoming-invoices/${id}`
    });
  }

  async createIncomingInvoice(data: CreateIncomingInvoiceDTO): Promise<ApiResponse<IncomingInvoiceDetail>> {
    return this.request({
      method: 'POST',
      url: '/api/incoming-invoices',
      data
    });
  }

  async updateIncomingInvoiceStatus(
    id: string, 
    status: string, 
    reason?: string
  ): Promise<ApiResponse<IncomingInvoiceListItem>> {
    return this.request({
      method: 'PATCH',
      url: `/api/incoming-invoices/${id}/status`,
      data: { status, reason }
    });
  }

  async syncIncomingInvoices(): Promise<ApiResponse<IncomingInvoiceSyncResult>> {
    return this.request({
      method: 'POST',
      url: '/api/incoming-invoices/sync'
    });
  }

  async mapIncomingInvoiceProduct(
    id: string, 
    lineId: string, 
    productId: string | null
  ): Promise<ApiResponse<IncomingInvoiceLineItem>> {
    return this.request({
      method: 'POST',
      url: `/api/incoming-invoices/${id}/map-product`,
      data: { lineId, productId }
    });
  }

  async getIncomingInvoiceStatusCounts(): Promise<ApiResponse<IncomingInvoiceStatusCounts>> {
    return this.request({
      method: 'GET',
      url: '/api/incoming-invoices/counts'
    });
  }

  async getIncomingInvoicePaymentCounts(): Promise<ApiResponse<IncomingInvoicePaymentCounts>> {
    return this.request({
      method: 'GET',
      url: '/api/incoming-invoices/payment-counts'
    });
  }

  async downloadIncomingInvoicePDF(id: string): Promise<void> {
    const response = await this.client.get(`/api/incoming-invoices/${id}/pdf`, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ulazna-faktura-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async downloadIncomingInvoiceXML(id: string): Promise<void> {
    const response = await this.client.get(`/api/incoming-invoices/${id}/xml`, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ulazna-faktura-${id}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async exportIncomingInvoices(
    params?: IncomingInvoiceFilterParams & { format?: 'csv' | 'xlsx' }
  ): Promise<void> {
    const response = await this.client.get('/api/incoming-invoices/export', {
      params,
      responseType: 'blob'
    });
    
    const format = params?.format || 'xlsx';
    const blob = new Blob([response.data], { 
      type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ulazne-fakture.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async bulkUpdateIncomingInvoiceStatus(
    invoiceIds: string[], 
    status: string, 
    reason?: string
  ): Promise<ApiResponse<BulkOperationResult>> {
    return this.request({
      method: 'POST',
      url: '/api/incoming-invoices/bulk/status',
      data: { invoiceIds, status, reason }
    });
  }

  // ===========================================
  // VAT Records (PDV Evidencija)
  // ===========================================

  async getVATRecords(params?: { 
    type?: string; 
    fromDate?: string; 
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ data: unknown[]; pagination: unknown }>> {
    return this.request({
      method: 'GET',
      url: '/api/vat/records',
      params
    });
  }

  async getVATSummary(params?: { 
    fromDate?: string; 
    toDate?: string 
  }): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/vat/summary',
      params
    });
  }

  async exportKPO(params: { 
    fromDate: string; 
    toDate: string 
  }): Promise<void> {
    const response = await this.client.get('/api/vat/export/kpo', {
      params,
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KPO_${params.fromDate}_${params.toDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async exportKPR(params: { 
    fromDate: string; 
    toDate: string 
  }): Promise<void> {
    const response = await this.client.get('/api/vat/export/kpr', {
      params,
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KPR_${params.fromDate}_${params.toDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async generatePPPDV(params: { 
    fromDate: string; 
    toDate: string 
  }): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/vat/pppdv',
      params
    });
  }

  // ===========================================
  // Credit Notes (Knjižna Odobrenja)
  // ===========================================

  async getCreditNotes(params?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ data: unknown[]; pagination?: unknown }>> {
    return this.request({
      method: 'GET',
      url: '/api/credit-notes',
      params
    });
  }

  async getCreditNote(id: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: `/api/credit-notes/${id}`
    });
  }

  async createCreditNote(data: {
    originalInvoiceId: string;
    reason: string;
    lines: Array<{
      lineNumber: number;
      itemName: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
  }): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: '/api/credit-notes',
      data
    });
  }

  async sendCreditNoteToSEF(id: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: `/api/credit-notes/${id}/send`
    });
  }

  async cancelCreditNote(id: string, reason: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: `/api/credit-notes/${id}/cancel`,
      data: { reason }
    });
  }

  async deleteCreditNote(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: `/api/credit-notes/${id}`
    });
  }

  // ===========================================
  // Bank Statements
  // ===========================================

  async getBankStatements(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<{ data: unknown[]; pagination?: unknown }>> {
    return this.request({
      method: 'GET',
      url: '/api/bank-statements',
      params
    });
  }

  async getBankStatement(id: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: `/api/bank-statements/${id}`
    });
  }

  async uploadBankStatement(file: File): Promise<ApiResponse<unknown>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request({
      method: 'POST',
      url: '/api/bank-statements/upload',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  async getUnmatchedTransactions(): Promise<ApiResponse<unknown[]>> {
    return this.request({
      method: 'GET',
      url: '/api/bank-statements/transactions/unmatched'
    });
  }

  async matchTransaction(transactionId: string, invoiceId: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: `/api/bank-statements/transactions/${transactionId}/match`,
      data: { invoiceId }
    });
  }

  async ignoreTransaction(transactionId: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: `/api/bank-statements/transactions/${transactionId}/ignore`
    });
  }

  async autoMatchTransactions(statementId: string): Promise<ApiResponse<{ matched: number; unmatched: number }>> {
    return this.request({
      method: 'POST',
      url: `/api/bank-statements/${statementId}/auto-match`
    });
  }

  async postBankStatement(id: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: `/api/bank-statements/${id}/post`
    });
  }

  // ===========================================
  // Accounting Reports
  // ===========================================

  async getBalanceSheet(asOfDate: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/reports/balance-sheet',
      params: { asOfDate }
    });
  }

  async getIncomeStatement(fromDate: string, toDate: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/reports/income-statement',
      params: { fromDate, toDate }
    });
  }

  async getTrialBalance(fromDate: string, toDate: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/trial-balance',
      params: { fromDate, toDate }
    });
  }

  async getAgingReport(type: 'RECEIVABLE' | 'PAYABLE', asOfDate: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/reports/aging',
      params: { type, asOfDate }
    });
  }

  async getSalesByPartnerReport(fromDate: string, toDate: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/reports/sales-by-partner',
      params: { fromDate, toDate }
    });
  }

  async getSalesByProductReport(fromDate: string, toDate: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/reports/sales-by-product',
      params: { fromDate, toDate }
    });
  }

  async getMonthlySummaryReport(year: number): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/accounting/reports/monthly-summary',
      params: { year }
    });
  }

  async exportReport(
    reportType: string, 
    params: Record<string, unknown>,
    format: 'pdf' | 'xlsx' = 'pdf'
  ): Promise<void> {
    const response = await this.client.get(`/api/accounting/reports/${reportType}/export`, {
      params: { ...params, format },
      responseType: 'blob'
    });
    
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const blob = new Blob([response.data], { type: mimeTypes[format] });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-report.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ===========================================
  // Exchange Rates
  // ===========================================

  async getExchangeRates(params?: {
    date?: string;
    baseCurrency?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/exchange-rates',
      params
    });
  }

  async getExchangeRateHistory(
    currency: string, 
    fromDate: string, 
    toDate: string
  ): Promise<ApiResponse<unknown[]>> {
    return this.request({
      method: 'GET',
      url: `/api/exchange-rates/history/${currency}`,
      params: { fromDate, toDate }
    });
  }

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<ApiResponse<{ convertedAmount: number; rate: number }>> {
    return this.request({
      method: 'POST',
      url: '/api/exchange-rates/convert',
      data: { amount, fromCurrency, toCurrency, date }
    });
  }

  // ===========================================
  // Notifications
  // ===========================================

  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<ApiResponse<{ data: unknown[]; pagination?: unknown; unreadCount?: number }>> {
    return this.request({
      method: 'GET',
      url: '/api/notifications',
      params
    });
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'PATCH',
      url: `/api/notifications/${id}/read`
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.request({
      method: 'POST',
      url: '/api/notifications/mark-all-read'
    });
  }

  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: `/api/notifications/${id}`
    });
  }

  async clearAllNotifications(): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: '/api/notifications/clear-all'
    });
  }

  // ===========================================
  // Audit Logs
  // ===========================================

  async getAuditLogs(params?: Record<string, string>): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/audit-logs',
      params
    });
  }

  async exportAuditLogs(params?: Record<string, string>): Promise<ApiResponse<Blob>> {
    return this.request({
      method: 'GET',
      url: '/api/audit-logs/export',
      params,
      responseType: 'blob'
    });
  }

  // ===========================================
  // Password Reset (No Auth Required)
  // ===========================================

  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/forgot-password',
      data: { email }
    });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/reset-password',
      data: { token, password }
    });
  }

  async validateResetToken(token: string): Promise<ApiResponse<{ valid: boolean; email?: string }>> {
    return this.request({
      method: 'GET',
      url: '/api/auth/validate-reset-token',
      params: { token }
    });
  }

  // ===========================================
  // Company Profile
  // ===========================================

  async getCompanyProfile(): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/company/profile'
    });
  }

  async updateCompanyProfile(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'PUT',
      url: '/api/company/profile',
      data
    });
  }

  async uploadCompanyLogo(formData: FormData): Promise<ApiResponse<{ logoUrl: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/company/logo',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  async updateCompanySettings(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'PUT',
      url: '/api/company/settings',
      data
    });
  }

  // ===========================================
  // Users Management
  // ===========================================

  async getUsers(params?: { page?: number; limit?: number }): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: '/api/users',
      params
    });
  }

  async getUser(id: string): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'GET',
      url: `/api/users/${id}`
    });
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    password: string;
  }): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'POST',
      url: '/api/users',
      data
    });
  }

  async updateUser(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'PUT',
      url: `/api/users/${id}`,
      data
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: `/api/users/${id}`
    });
  }

  async toggleUserStatus(id: string, isActive: boolean): Promise<ApiResponse<unknown>> {
    return this.request({
      method: 'PATCH',
      url: `/api/users/${id}/status`,
      data: { isActive }
    });
  }

  // ===========================================
  // SEF Integration
  // ===========================================

  async testSEFConnection(): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/sef/test-connection'
    });
  }

  // ===========================================
  // Credit Note PDF Download
  // ===========================================

  async downloadCreditNotePDF(creditNoteId: string): Promise<Blob> {
    const response = await this.client.get(`/api/credit-notes/${creditNoteId}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // ===========================================
  // Report Downloads
  // ===========================================

  async downloadBalanceSheet(asOfDate: string, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await this.client.get('/api/accounting/reports/balance-sheet', {
      params: { asOfDate, format },
      responseType: 'blob'
    });
    return response.data;
  }

  async downloadIncomeStatement(fromDate: string, toDate: string, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await this.client.get('/api/accounting/reports/income-statement', {
      params: { fromDate, toDate, format },
      responseType: 'blob'
    });
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
