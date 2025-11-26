/**
 * IOS Service
 * Frontend API za Izvod Otvorenih Stavki
 */

import apiClient from './api';

export interface IOSReport {
  id: string;
  companyId: string;
  partnerId: string;
  number: string;
  asOfDate: string;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'DISPUTED' | 'RECONCILED';
  
  // Calculated balances
  debitBalance: number;  // Our receivables (partner owes us)
  creditBalance: number; // Our payables (we owe partner)
  balance: number;       // Net balance
  
  // Partner info (denormalized for display)
  partnerName?: string;
  partnerPIB?: string;
  partnerEmail?: string;
  
  // Confirmation
  confirmedAt?: string;
  confirmedBy?: string;
  partnerBalance?: number; // Balance reported by partner
  difference?: number;     // Discrepancy
  
  // Email tracking
  sentAt?: string;
  sentTo?: string;
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations
  items?: IOSItem[];
  partner?: {
    id: string;
    name: string;
    pib: string;
    email?: string;
  };
}

export interface IOSItem {
  id: string;
  iosReportId: string;
  
  // Document reference
  documentType: 'INVOICE' | 'CREDIT_NOTE' | 'PAYMENT' | 'ADVANCE' | 'OTHER';
  documentNumber: string;
  documentDate: string;
  dueDate?: string;
  
  // Amounts
  debitAmount: number;
  creditAmount: number;
  balance: number;
  
  // Status
  isPaid: boolean;
  daysOverdue?: number;
  
  description?: string;
}

export interface CreateIOSData {
  partnerId: string;
  asOfDate: string;
  notes?: string;
}

export interface PartnerBalance {
  partnerId: string;
  partnerName: string;
  partnerPIB: string;
  partnerEmail?: string;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  openInvoices: number;
  lastIOSDate?: string;
  lastIOSStatus?: string;
}

class IOSService {
  private basePath = '/ios';

  /**
   * Get all IOS reports for company
   */
  async getAll(companyId: string, params?: {
    partnerId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.partnerId) queryParams.append('partnerId', params.partnerId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiClient.get<{ data: IOSReport[]; pagination: any }>(
      `${this.basePath}/companies/${companyId}${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single IOS with items
   */
  async getById(companyId: string, iosId: string) {
    return apiClient.get<IOSReport>(
      `${this.basePath}/companies/${companyId}/${iosId}`
    );
  }

  /**
   * Get partner balances overview
   */
  async getPartnerBalances(companyId: string, params?: {
    minBalance?: number;
    hasOpenItems?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.minBalance) queryParams.append('minBalance', params.minBalance.toString());
    if (params?.hasOpenItems !== undefined) queryParams.append('hasOpenItems', params.hasOpenItems.toString());
    
    const query = queryParams.toString();
    return apiClient.get<PartnerBalance[]>(
      `${this.basePath}/companies/${companyId}/balances${query ? `?${query}` : ''}`
    );
  }

  /**
   * Generate IOS for partner
   */
  async generate(companyId: string, data: CreateIOSData) {
    return apiClient.post<IOSReport>(
      `${this.basePath}/companies/${companyId}`,
      data
    );
  }

  /**
   * Generate IOS for all partners with balance
   */
  async generateBulk(companyId: string, data: {
    asOfDate: string;
    minBalance?: number;
  }) {
    return apiClient.post<{ generated: number; skipped: number; reports: IOSReport[] }>(
      `${this.basePath}/companies/${companyId}/bulk`,
      data
    );
  }

  /**
   * Send IOS via email
   */
  async send(companyId: string, iosId: string) {
    return apiClient.post<IOSReport>(
      `${this.basePath}/companies/${companyId}/${iosId}/send`
    );
  }

  /**
   * Mark IOS as confirmed
   */
  async confirm(companyId: string, iosId: string, data?: {
    partnerBalance?: number;
    notes?: string;
  }) {
    return apiClient.post<IOSReport>(
      `${this.basePath}/companies/${companyId}/${iosId}/confirm`,
      data || {}
    );
  }

  /**
   * Mark IOS as disputed
   */
  async dispute(companyId: string, iosId: string, data: {
    partnerBalance: number;
    notes: string;
  }) {
    return apiClient.post<IOSReport>(
      `${this.basePath}/companies/${companyId}/${iosId}/dispute`,
      data
    );
  }

  /**
   * Generate PDF
   */
  async generatePDF(companyId: string, iosId: string) {
    return apiClient.get<Blob>(
      `${this.basePath}/companies/${companyId}/${iosId}/pdf`,
      { responseType: 'blob' } as any
    );
  }

  /**
   * Delete IOS report
   */
  async delete(companyId: string, iosId: string) {
    return apiClient.delete<void>(
      `${this.basePath}/companies/${companyId}/${iosId}`
    );
  }
}

export const iosService = new IOSService();
export default iosService;
