/**
 * PPPDV Service
 * Frontend API za PPPDV poreske prijave
 */

import apiClient from './api';

export interface PPPDVReport {
  id: string;
  companyId: string;
  year: number;
  month?: number;
  quarter?: number;
  periodType: 'MONTHLY' | 'QUARTERLY';
  status: 'DRAFT' | 'CALCULATED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  
  // Promet dobara i usluga
  field001: number; // Promet dobara i usluga po opštoj stopi (20%)
  field002: number; // Promet dobara i usluga po posebnoj stopi (10%)
  field003: number; // Promet oslobođen PDV-a sa pravom na odbitak
  field004: number; // Promet oslobođen PDV-a bez prava na odbitak
  field005: number; // Promet po članu 6a (mesto prometa van RS)
  
  // Nabavke
  field101: number; // Nabavke po opštoj stopi
  field102: number; // Nabavke po posebnoj stopi
  field103: number; // Nabavke oslobođene PDV-a
  field104: number; // Uvoz dobara
  
  // Obračunati PDV
  field201: number; // Obračunati PDV po opštoj stopi
  field202: number; // Obračunati PDV po posebnoj stopi
  field203: number; // Ukupno obračunati PDV
  
  // Prethodni PDV
  field301: number; // Prethodni PDV po opštoj stopi
  field302: number; // Prethodni PDV po posebnoj stopi
  field303: number; // Prethodni PDV pri uvozu
  field304: number; // Ukupno prethodni PDV
  
  // Poreska obaveza
  field401: number; // PDV za uplatu (obaveza - prethodni)
  field402: number; // PDV za povraćaj
  
  xmlContent?: string;
  submittedAt?: string;
  submissionReference?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PPPDVCalculation {
  year: number;
  periodType: 'MONTHLY' | 'QUARTERLY';
  period: number; // month or quarter
  outputVAT: {
    general: { base: number; tax: number };
    reduced: { base: number; tax: number };
    exempt: { base: number };
    exports: { base: number };
  };
  inputVAT: {
    general: { base: number; tax: number };
    reduced: { base: number; tax: number };
    imports: { base: number; tax: number };
  };
  totalOutputVAT: number;
  totalInputVAT: number;
  balance: number;
}

export interface CreatePPPDVData {
  year: number;
  periodType: 'MONTHLY' | 'QUARTERLY';
  month?: number;
  quarter?: number;
}

class PPPDVService {
  private basePath = '/pppdv';

  /**
   * Get all PPPDV reports for company
   */
  async getReports(companyId: string, params?: {
    year?: number;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    return apiClient.get<PPPDVReport[]>(
      `${this.basePath}/companies/${companyId}/reports${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get single PPPDV report
   */
  async getReport(companyId: string, reportId: string) {
    return apiClient.get<PPPDVReport>(
      `${this.basePath}/companies/${companyId}/reports/${reportId}`
    );
  }

  /**
   * Calculate PPPDV for period (without saving)
   */
  async calculate(companyId: string, data: CreatePPPDVData) {
    return apiClient.post<PPPDVCalculation>(
      `${this.basePath}/companies/${companyId}/calculate`,
      data
    );
  }

  /**
   * Create PPPDV report
   */
  async create(companyId: string, data: CreatePPPDVData) {
    return apiClient.post<PPPDVReport>(
      `${this.basePath}/companies/${companyId}/reports`,
      data
    );
  }

  /**
   * Recalculate existing report
   */
  async recalculate(companyId: string, reportId: string) {
    return apiClient.post<PPPDVReport>(
      `${this.basePath}/companies/${companyId}/reports/${reportId}/recalculate`
    );
  }

  /**
   * Generate XML for ePorezi submission
   */
  async generateXML(companyId: string, reportId: string) {
    return apiClient.post<{ xml: string; filename: string }>(
      `${this.basePath}/companies/${companyId}/reports/${reportId}/xml`
    );
  }

  /**
   * Submit to ePorezi
   */
  async submit(companyId: string, reportId: string) {
    return apiClient.post<PPPDVReport>(
      `${this.basePath}/companies/${companyId}/reports/${reportId}/submit`
    );
  }

  /**
   * Delete draft report
   */
  async delete(companyId: string, reportId: string) {
    return apiClient.delete<void>(
      `${this.basePath}/companies/${companyId}/reports/${reportId}`
    );
  }
}

export const pppdvService = new PPPDVService();
export default pppdvService;
