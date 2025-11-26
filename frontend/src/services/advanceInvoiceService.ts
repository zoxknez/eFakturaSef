/**
 * Advance Invoice Service
 * Frontend API za avansne fakture
 */

import apiClient from './api';

export interface AdvanceInvoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  
  // Partner
  partnerId?: string;
  partnerName: string;
  partnerPIB: string;
  partnerAddress?: string;
  
  // Dates
  issueDate: string;
  dueDate?: string;
  paymentDate?: string;
  
  // Amounts
  netAmount: number;
  vatAmount: number;
  vatRate: number;
  totalAmount: number;
  paidAmount: number;
  usedAmount: number;
  remainingAmount: number;
  
  currency: string;
  
  // Status
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_USED' | 'FULLY_USED' | 'CANCELLED';
  
  // SEF
  sefId?: string;
  sefStatus?: string;
  ublXml?: string;
  
  // Linked invoices
  linkedInvoiceIds?: string[];
  
  description?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations
  partner?: {
    id: string;
    name: string;
    pib: string;
  };
  linkedInvoices?: {
    id: string;
    invoiceNumber: string;
    amount: number;
  }[];
}

export interface CreateAdvanceInvoiceData {
  partnerId?: string;
  partnerName: string;
  partnerPIB: string;
  partnerAddress?: string;
  issueDate: string;
  dueDate?: string;
  netAmount: number;
  vatRate: number;
  currency?: string;
  description?: string;
  notes?: string;
}

export interface UseAdvanceData {
  invoiceId: string;
  amount: number;
  notes?: string;
}

class AdvanceInvoiceService {
  private basePath = '/advance-invoices';

  /**
   * Get all advance invoices
   */
  async getAll(companyId: string, params?: {
    status?: string;
    partnerId?: string;
    fromDate?: string;
    toDate?: string;
    hasRemaining?: boolean;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.partnerId) queryParams.append('partnerId', params.partnerId);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.hasRemaining !== undefined) queryParams.append('hasRemaining', params.hasRemaining.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiClient.get<{ data: AdvanceInvoice[]; pagination: any }>(
      `${this.basePath}/companies/${companyId}${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single advance invoice
   */
  async getById(companyId: string, advanceId: string) {
    return apiClient.get<AdvanceInvoice>(
      `${this.basePath}/companies/${companyId}/${advanceId}`
    );
  }

  /**
   * Get available advances for partner (with remaining amount)
   */
  async getAvailableForPartner(companyId: string, partnerId: string) {
    return apiClient.get<AdvanceInvoice[]>(
      `${this.basePath}/companies/${companyId}/partner/${partnerId}/available`
    );
  }

  /**
   * Create advance invoice
   */
  async create(companyId: string, data: CreateAdvanceInvoiceData) {
    return apiClient.post<AdvanceInvoice>(
      `${this.basePath}/companies/${companyId}`,
      data
    );
  }

  /**
   * Update advance invoice
   */
  async update(companyId: string, advanceId: string, data: Partial<CreateAdvanceInvoiceData>) {
    return apiClient.put<AdvanceInvoice>(
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
    return apiClient.post<AdvanceInvoice>(
      `${this.basePath}/companies/${companyId}/${advanceId}/pay`,
      data
    );
  }

  /**
   * Use advance against invoice
   */
  async useAdvance(companyId: string, advanceId: string, data: UseAdvanceData) {
    return apiClient.post<AdvanceInvoice>(
      `${this.basePath}/companies/${companyId}/${advanceId}/use`,
      data
    );
  }

  /**
   * Send to SEF
   */
  async sendToSEF(companyId: string, advanceId: string) {
    return apiClient.post<AdvanceInvoice>(
      `${this.basePath}/companies/${companyId}/${advanceId}/send`
    );
  }

  /**
   * Cancel advance invoice
   */
  async cancel(companyId: string, advanceId: string, reason?: string) {
    return apiClient.post<AdvanceInvoice>(
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
  async generatePDF(companyId: string, advanceId: string) {
    return apiClient.get<Blob>(
      `${this.basePath}/companies/${companyId}/${advanceId}/pdf`,
      { responseType: 'blob' } as any
    );
  }
}

export const advanceInvoiceService = new AdvanceInvoiceService();
export default advanceInvoiceService;
