/**
 * Advance Invoice Service
 * Frontend API za avansne fakture
 */

import apiClient from './api';
import type {
  AdvanceInvoiceListItem,
  AdvanceInvoiceDetail,
  CreateAdvanceInvoiceDTO,
  UseAdvanceDTO,
  AdvanceInvoiceListResponse,
  AdvanceInvoiceFilterParams,
  AdvanceInvoiceSummary
} from '@sef-app/shared';

// Re-export types for backwards compatibility
export type AdvanceInvoice = AdvanceInvoiceListItem;
export type { AdvanceInvoiceDetail, CreateAdvanceInvoiceDTO, UseAdvanceDTO };

// Legacy form data interface (maps to CreateAdvanceInvoiceDTO)
export interface CreateAdvanceInvoiceFormData {
  partnerId?: string;
  partnerName?: string;  // For display only
  partnerPIB?: string;   // For display only
  partnerAddress?: string;
  issueDate: string;
  dueDate?: string;
  advanceAmount: number;
  taxRate: number;
  currency?: string;
  description?: string;
  notes?: string;
}

class AdvanceInvoiceService {
  private basePath = '/advance-invoices';

  /**
   * Get all advance invoices
   */
  async getAll(companyId: string, params?: AdvanceInvoiceFilterParams) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.partnerId) queryParams.append('partnerId', params.partnerId);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.hasRemaining !== undefined) queryParams.append('hasRemaining', params.hasRemaining.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiClient.get<AdvanceInvoiceListResponse>(
      `${this.basePath}/companies/${companyId}${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single advance invoice
   */
  async getById(companyId: string, advanceId: string) {
    return apiClient.get<AdvanceInvoiceDetail>(
      `${this.basePath}/companies/${companyId}/${advanceId}`
    );
  }

  /**
   * Get available advances for partner (with remaining amount)
   */
  async getAvailableForPartner(companyId: string, partnerId: string) {
    return apiClient.get<AdvanceInvoiceListItem[]>(
      `${this.basePath}/companies/${companyId}/partner/${partnerId}/available`
    );
  }

  /**
   * Create advance invoice
   */
  async create(companyId: string, data: CreateAdvanceInvoiceDTO) {
    return apiClient.post<AdvanceInvoiceDetail>(
      `${this.basePath}/companies/${companyId}`,
      data
    );
  }

  /**
   * Update advance invoice (only drafts)
   */
  async update(companyId: string, advanceId: string, data: Partial<CreateAdvanceInvoiceDTO>) {
    return apiClient.put<AdvanceInvoiceDetail>(
      `${this.basePath}/companies/${companyId}/${advanceId}`,
      data
    );
  }

  /**
   * Mark as paid
   */
  async markPaid(companyId: string, advanceId: string, data: {
    paymentDate: string;
    amount: number;
    notes?: string;
  }) {
    return apiClient.post<AdvanceInvoiceDetail>(
      `${this.basePath}/companies/${companyId}/${advanceId}/pay`,
      data
    );
  }

  /**
   * Use advance against invoice
   */
  async useAdvance(companyId: string, advanceId: string, data: UseAdvanceDTO) {
    return apiClient.post<AdvanceInvoiceDetail>(
      `${this.basePath}/companies/${companyId}/${advanceId}/use`,
      data
    );
  }

  /**
   * Send to SEF
   */
  async sendToSEF(companyId: string, advanceId: string) {
    return apiClient.post<AdvanceInvoiceDetail>(
      `${this.basePath}/companies/${companyId}/${advanceId}/send`
    );
  }

  /**
   * Cancel advance invoice
   */
  async cancel(companyId: string, advanceId: string, reason?: string) {
    return apiClient.post<AdvanceInvoiceDetail>(
      `${this.basePath}/companies/${companyId}/${advanceId}/cancel`,
      { reason }
    );
  }

  /**
   * Delete draft advance invoice
   */
  async delete(companyId: string, advanceId: string) {
    return apiClient.delete<void>(
      `${this.basePath}/companies/${companyId}/${advanceId}`
    );
  }

  /**
   * Generate PDF
   */
  async generatePDF(companyId: string, advanceId: string): Promise<Blob> {
    const response = await fetch(`/api${this.basePath}/companies/${companyId}/${advanceId}/pdf`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.statusText}`);
    }
    
    return response.blob();
  }

  /**
   * Get summary for date range
   */
  async getSummary(companyId: string, fromDate: string, toDate: string) {
    return apiClient.get<AdvanceInvoiceSummary>(
      `${this.basePath}/companies/${companyId}/summary?fromDate=${fromDate}&toDate=${toDate}`
    );
  }
}

export const advanceInvoiceService = new AdvanceInvoiceService();
export default advanceInvoiceService;
