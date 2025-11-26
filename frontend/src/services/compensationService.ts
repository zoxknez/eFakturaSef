/**
 * Compensation Service
 * Frontend API za multilateralne kompenzacije
 */

import apiClient from './api';

export interface Compensation {
  id: string;
  companyId: string;
  number: string;
  date: string;
  status: 'DRAFT' | 'PENDING' | 'PARTIALLY_CONFIRMED' | 'CONFIRMED' | 'CANCELLED';
  
  // Amounts
  totalAmount: number;
  confirmedAmount: number;
  
  // Participants
  participantCount: number;
  
  // Metadata
  description?: string;
  notes?: string;
  
  // Dates
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  
  // Relations
  items?: CompensationItem[];
}

export interface CompensationItem {
  id: string;
  compensationId: string;
  
  // Debtor (dužnik)
  debtorId: string;
  debtorName: string;
  debtorPIB: string;
  
  // Creditor (poverilac)
  creditorId: string;
  creditorName: string;
  creditorPIB: string;
  
  // Reference
  itemType: 'INVOICE' | 'CREDIT_NOTE' | 'OTHER';
  referenceNumber: string;
  referenceDate: string;
  
  // Amounts
  originalAmount: number;
  compensationAmount: number;
  
  // Status
  isConfirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  
  notes?: string;
}

export interface CreateCompensationData {
  date: string;
  description?: string;
  items: {
    debtorId: string;
    creditorId: string;
    itemType: 'INVOICE' | 'CREDIT_NOTE' | 'OTHER';
    referenceNumber: string;
    referenceDate: string;
    originalAmount: number;
    compensationAmount: number;
    notes?: string;
  }[];
}

class CompensationService {
  private basePath = '/compensations';

  /**
   * Get all compensations for company
   */
  async getAll(companyId: string, params?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiClient.get<{ data: Compensation[]; pagination: any }>(
      `${this.basePath}/companies/${companyId}${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single compensation with items
   */
  async getById(companyId: string, compensationId: string) {
    return apiClient.get<Compensation>(
      `${this.basePath}/companies/${companyId}/${compensationId}`
    );
  }

  /**
   * Create new compensation
   */
  async create(companyId: string, data: CreateCompensationData) {
    return apiClient.post<Compensation>(
      `${this.basePath}/companies/${companyId}`,
      data
    );
  }

  /**
   * Update compensation
   */
  async update(companyId: string, compensationId: string, data: Partial<CreateCompensationData>) {
    return apiClient.put<Compensation>(
      `${this.basePath}/companies/${companyId}/${compensationId}`,
      data
    );
  }

  /**
   * Delete compensation
   */
  async delete(companyId: string, compensationId: string) {
    return apiClient.delete<void>(
      `${this.basePath}/companies/${companyId}/${compensationId}`
    );
  }

  /**
   * Confirm compensation item
   */
  async confirmItem(companyId: string, compensationId: string, itemId: string) {
    return apiClient.post<CompensationItem>(
      `${this.basePath}/companies/${companyId}/${compensationId}/items/${itemId}/confirm`
    );
  }

  /**
   * Generate PDF
   */
  async generatePDF(companyId: string, compensationId: string) {
    return apiClient.get<Blob>(
      `${this.basePath}/companies/${companyId}/${compensationId}/pdf`,
      { responseType: 'blob' } as any
    );
  }

  /**
   * Send compensation to participants via email
   */
  async sendToParticipants(companyId: string, compensationId: string) {
    return apiClient.post<{ sent: number; failed: number }>(
      `${this.basePath}/companies/${companyId}/${compensationId}/send`
    );
  }
}

export const compensationService = new CompensationService();
export default compensationService;
