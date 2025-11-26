/**
 * Cash Flow Forecast Service
 * Frontend API za projekcije novčanih tokova
 */

import apiClient from './api';

export interface CashFlowForecast {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  
  // Current state
  openingBalance: number;
  
  // Forecasted
  forecastedInflows: number;
  forecastedOutflows: number;
  forecastedBalance: number;
  
  // Actual (for comparison)
  actualInflows: number;
  actualOutflows: number;
  actualBalance: number;
  
  // Variance
  variance: number;
  variancePercent: number;
  
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CashFlowPeriod {
  date: string;
  
  // Inflows
  invoiceCollections: number;
  otherInflows: number;
  totalInflows: number;
  
  // Outflows
  supplierPayments: number;
  salaries: number;
  taxes: number;
  otherOutflows: number;
  totalOutflows: number;
  
  // Balance
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  
  // Status
  isProjection: boolean;
}

export interface CashFlowProjection {
  periods: CashFlowPeriod[];
  summary: {
    totalInflows: number;
    totalOutflows: number;
    netChange: number;
    openingBalance: number;
    closingBalance: number;
    lowestBalance: number;
    lowestBalanceDate: string;
  };
  alerts: {
    type: 'WARNING' | 'CRITICAL';
    date: string;
    message: string;
    projectedBalance: number;
  }[];
}

class CashFlowService {
  private basePath = '/cash-flow';

  /**
   * Get all forecasts
   */
  async getForecasts(companyId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiClient.get<{ data: CashFlowForecast[]; pagination: any }>(
      `${this.basePath}/companies/${companyId}/forecasts${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get cash flow projection
   */
  async getProjection(companyId: string, params: {
    startDate: string;
    endDate: string;
    granularity?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.granularity) queryParams.append('granularity', params.granularity);
    
    return apiClient.get<CashFlowProjection>(
      `${this.basePath}/companies/${companyId}/projection?${queryParams}`
    );
  }

  /**
   * Get current cash position
   */
  async getCurrentPosition(companyId: string) {
    return apiClient.get<{
      currentBalance: number;
      receivables: number;
      payables: number;
      overdueReceivables: number;
      overduePayables: number;
      netPosition: number;
    }>(`${this.basePath}/companies/${companyId}/position`);
  }

  /**
   * Create forecast
   */
  async createForecast(companyId: string, data: {
    name: string;
    startDate: string;
    endDate: string;
    openingBalance: number;
    notes?: string;
  }) {
    return apiClient.post<CashFlowForecast>(
      `${this.basePath}/companies/${companyId}/forecasts`,
      data
    );
  }

  /**
   * Update forecast
   */
  async updateForecast(companyId: string, forecastId: string, data: Partial<{
    name: string;
    openingBalance: number;
    notes?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  }>) {
    return apiClient.put<CashFlowForecast>(
      `${this.basePath}/companies/${companyId}/forecasts/${forecastId}`,
      data
    );
  }

  /**
   * Recalculate forecast with actual data
   */
  async recalculateForecast(companyId: string, forecastId: string) {
    return apiClient.post<CashFlowForecast>(
      `${this.basePath}/companies/${companyId}/forecasts/${forecastId}/recalculate`
    );
  }

  /**
   * Get aging report (receivables/payables breakdown)
   */
  async getAgingReport(companyId: string, type: 'receivables' | 'payables') {
    return apiClient.get<{
      current: number;
      days1to30: number;
      days31to60: number;
      days61to90: number;
      over90: number;
      total: number;
      byPartner: {
        partnerId: string;
        partnerName: string;
        current: number;
        overdue: number;
        total: number;
      }[];
    }>(`${this.basePath}/companies/${companyId}/aging/${type}`);
  }

  /**
   * Export projection to Excel
   */
  async exportProjection(companyId: string, params: {
    startDate: string;
    endDate: string;
    granularity?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.granularity) queryParams.append('granularity', params.granularity);
    
    return apiClient.get<Blob>(
      `${this.basePath}/companies/${companyId}/projection/export?${queryParams}`,
      { responseType: 'blob' } as any
    );
  }
}

export const cashFlowService = new CashFlowService();
export default cashFlowService;
