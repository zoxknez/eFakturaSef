/**
 * Exchange Rate Service
 * Frontend API za kursnu listu NBS
 */

import apiClient from './api';

export interface ExchangeRate {
  id: string;
  date: string;
  currencyCode: string;
  currencyName: string;
  country: string;
  unit: number;
  buyingRate: number;
  middleRate: number;
  sellingRate: number;
  source: 'NBS' | 'MANUAL';
  createdAt: string;
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  date: string;
}

class ExchangeRateService {
  private basePath = '/exchange-rates';

  /**
   * Get rates for specific date
   */
  async getRatesForDate(date: string) {
    return apiClient.get<ExchangeRate[]>(`${this.basePath}?date=${date}`);
  }

  /**
   * Get today's rates
   */
  async getTodayRates() {
    return apiClient.get<ExchangeRate[]>(`${this.basePath}/today`);
  }

  /**
   * Sync rates from NBS
   */
  async syncFromNBS(date?: string) {
    return apiClient.post<ExchangeRate[]>(
      `${this.basePath}/sync`,
      date ? { date } : {}
    );
  }

  /**
   * Convert currency
   */
  async convert(data: {
    fromCurrency: string;
    toCurrency: string;
    amount: number;
    date?: string;
  }) {
    return apiClient.post<CurrencyConversion>(`${this.basePath}/convert`, data);
  }

  /**
   * Get historical rates for currency
   */
  async getHistory(currencyCode: string, params?: {
    fromDate?: string;
    toDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    queryParams.append('currency', currencyCode);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    
    return apiClient.get<ExchangeRate[]>(`${this.basePath}/history?${queryParams}`);
  }
}

export const exchangeRateService = new ExchangeRateService();
export default exchangeRateService;
