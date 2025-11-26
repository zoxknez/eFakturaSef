/**
 * KPO Service
 * Frontend API za KPO Knjigu (Knjiga prihoda i rashoda za preduzetnike)
 */

import apiClient from './api';

export interface KPOEntry {
  id: string;
  companyId: string;
  entryNumber: number;
  date: string;
  
  // Document reference
  documentType: 'INVOICE' | 'RECEIPT' | 'EXPENSE' | 'BANK' | 'OTHER';
  documentNumber: string;
  documentDate: string;
  
  // Partner
  partnerName?: string;
  partnerPIB?: string;
  
  // Description
  description: string;
  
  // Amounts
  incomeAmount: number;  // Prihod
  expenseAmount: number; // Rashod
  
  // Tax info
  vatAmount: number;
  vatRate: number;
  isVatIncluded: boolean;
  
  // Category
  category?: string;
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface KPOSummary {
  period: {
    from: string;
    to: string;
  };
  totalIncome: number;
  totalExpense: number;
  netResult: number;
  entryCount: number;
  
  // By category
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  
  // Monthly breakdown
  monthlyData: {
    month: string;
    income: number;
    expense: number;
    net: number;
  }[];
}

export interface CreateKPOEntryData {
  date: string;
  documentType: 'INVOICE' | 'RECEIPT' | 'EXPENSE' | 'BANK' | 'OTHER';
  documentNumber: string;
  documentDate: string;
  partnerName?: string;
  partnerPIB?: string;
  description: string;
  incomeAmount?: number;
  expenseAmount?: number;
  vatAmount?: number;
  vatRate?: number;
  isVatIncluded?: boolean;
  category?: string;
  notes?: string;
}

class KPOService {
  private basePath = '/kpo';

  /**
   * Get all KPO entries for company
   */
  async getAll(companyId: string, params?: {
    year?: number;
    month?: number;
    documentType?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.documentType) queryParams.append('documentType', params.documentType);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiClient.get<{ data: KPOEntry[]; pagination: any }>(
      `${this.basePath}/companies/${companyId}${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single entry
   */
  async getById(companyId: string, entryId: string) {
    return apiClient.get<KPOEntry>(
      `${this.basePath}/companies/${companyId}/${entryId}`
    );
  }

  /**
   * Get summary
   */
  async getSummary(companyId: string, params: {
    year: number;
    month?: number;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('year', params.year.toString());
    if (params.month) queryParams.append('month', params.month.toString());
    
    return apiClient.get<KPOSummary>(
      `${this.basePath}/companies/${companyId}/summary?${queryParams}`
    );
  }

  /**
   * Create new entry
   */
  async create(companyId: string, data: CreateKPOEntryData) {
    return apiClient.post<KPOEntry>(
      `${this.basePath}/companies/${companyId}`,
      data
    );
  }

  /**
   * Update entry
   */
  async update(companyId: string, entryId: string, data: Partial<CreateKPOEntryData>) {
    return apiClient.put<KPOEntry>(
      `${this.basePath}/companies/${companyId}/${entryId}`,
      data
    );
  }

  /**
   * Delete entry
   */
  async delete(companyId: string, entryId: string) {
    return apiClient.delete<void>(
      `${this.basePath}/companies/${companyId}/${entryId}`
    );
  }

  /**
   * Import entries from bank statement
   */
  async importFromBank(companyId: string, bankStatementId: string) {
    return apiClient.post<{ imported: number; skipped: number; entries: KPOEntry[] }>(
      `${this.basePath}/companies/${companyId}/import/bank`,
      { bankStatementId }
    );
  }

  /**
   * Export to Excel
   */
  async exportExcel(companyId: string, params: {
    year: number;
    month?: number;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('year', params.year.toString());
    if (params.month) queryParams.append('month', params.month.toString());
    
    return apiClient.get<Blob>(
      `${this.basePath}/companies/${companyId}/export?${queryParams}`,
      { responseType: 'blob' } as any
    );
  }
}

export const kpoService = new KPOService();
export default kpoService;
