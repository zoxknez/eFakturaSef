import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { config } from '../config';
import { logger } from '../utils/logger';
import { recordSefApiCall } from '../utils/businessMetrics';

export interface SEFConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface SEFInvoiceData {
  invoiceId: string;
  buyerPIB: string;
  supplierPIB: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  lines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
}

export interface SEFInvoiceResponse {
  id: string;
  status: string;
  message?: string;
  invoiceId?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Custom error classes for SEF operations
 */
export class SEFError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public sefResponse?: any
  ) {
    super(message);
    this.name = 'SEFError';
  }
}

export class SEFValidationError extends SEFError {
  constructor(message: string, sefResponse?: any) {
    super(message, 400, sefResponse);
    this.name = 'SEFValidationError';
  }
}

export class SEFNetworkError extends SEFError {
  constructor(message: string, originalError?: any) {
    super(message, undefined, originalError);
    this.name = 'SEFNetworkError';
  }
}

export class SEFRateLimitError extends SEFError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429);
    this.name = 'SEFRateLimitError';
  }
}

export class SEFServerError extends SEFError {
  constructor(message: string, statusCode: number, sefResponse?: any) {
    super(message, statusCode, sefResponse);
    this.name = 'SEFServerError';
  }
}

export class SEFService {
  private client: AxiosInstance;
  private config: SEFConfig;

  constructor(customConfig?: Partial<SEFConfig>) {
    this.config = {
      baseUrl: config.SEF_BASE_URL || 'https://demoefaktura.mfin.gov.rs',
      apiKey: config.SEF_API_KEY || '',
      timeout: 30000,
      ...customConfig,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    // Configure axios-retry with exponential backoff
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000;
        logger.info(`SEF API retry attempt ${retryCount} after ${delay}ms`, {
          error: error.message,
          url: error.config?.url,
        });
        return delay;
      },
      retryCondition: (error: AxiosError) => {
        // Retry on network errors or idempotent requests
        if (isNetworkOrIdempotentRequestError(error)) {
          return true;
        }
        
        // Retry on specific HTTP status codes
        const status = error.response?.status;
        if (status === 429) {
          // Too Many Requests - respect Retry-After header
          const retryAfter = error.response?.headers['retry-after'];
          if (retryAfter) {
            logger.warn(`SEF API rate limited, retry after ${retryAfter}s`);
          }
          return true;
        }
        
        // Retry on server errors (5xx)
        if (status && status >= 500 && status < 600) {
          logger.warn(`SEF API server error ${status}, will retry`);
          return true;
        }
        
        // Don't retry on client errors (4xx) except 429
        return false;
      },
      onRetry: (retryCount, error, requestConfig) => {
        logger.warn(`Retrying SEF API call (attempt ${retryCount})`, {
          method: requestConfig.method?.toUpperCase(),
          url: requestConfig.url,
          error: error.message,
          status: error.response?.status,
        });
      },
    });

    // Request interceptor for logging and timing
    this.client.interceptors.request.use(
      (config) => {
        // Add request timestamp for performance tracking
        (config as any).metadata = { startTime: Date.now() };
        logger.info(`SEF API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('SEF API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and timing
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || Date.now());
        logger.info(`SEF API Response: ${response.status} ${response.config.url}`, {
          duration: `${duration}ms`,
          status: response.status,
        });
        return response;
      },
      (error) => {
        const duration = Date.now() - ((error.config as any)?.metadata?.startTime || Date.now());
        logger.error('SEF API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          duration: `${duration}ms`,
          code: error.code, // Network error code (ECONNRESET, ETIMEDOUT, etc.)
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send invoice to SEF system
   */
  /**
   * Send invoice to SEF (Submit UBL XML)
   */
  async sendInvoice(ublXml: string, apiKey: string, environment: 'demo' | 'production' = 'demo'): Promise<SEFInvoiceResponse> {
    const startTime = Date.now();
    try {
      const response = await this.client.post(
        '/api/publicapi/sales-invoice', 
        ublXml,
        {
          headers: {
            'Content-Type': 'application/xml',
            'ApiKey': apiKey,
          },
        }
      );
      
      // Record success metric
      const duration = (Date.now() - startTime) / 1000;
      recordSefApiCall('/api/publicapi/sales-invoice', 'POST', response.status, environment, duration);
      
      return response.data;
    } catch (error: any) {
      // Record error metric
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = error.response?.status || 0;
      recordSefApiCall('/api/publicapi/sales-invoice', 'POST', statusCode, environment, duration);
      
      logger.error('Failed to send invoice to SEF:', error);
      this.handleSEFError(error, 'send invoice');
      throw error; // TypeScript guard
    }
  }

  /**
   * Get invoice status from SEF
   */
  async getInvoiceStatus(sefId: string): Promise<SEFInvoiceResponse> {
    try {
      const response = await this.client.get(`/api/publicapi/sales-invoice/${sefId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get invoice status from SEF:', error);
      this.handleSEFError(error, 'get invoice status');
    }
  }

  /**
   * Cancel invoice in SEF system
   */
  async cancelInvoice(sefId: string, reason?: string): Promise<SEFInvoiceResponse> {
    try {
      const response = await this.client.post(`/api/publicapi/sales-invoice/${sefId}/cancel`, {
        reason: reason || 'Cancelled by user',
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to cancel invoice in SEF:', error);
      this.handleSEFError(error, 'cancel invoice');
    }
  }

  /**
   * Get purchase invoices (incoming)
   */
  async getPurchaseInvoices(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      const response = await this.client.get('/api/publicapi/purchase-invoice', {
        params: filters,
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get purchase invoices from SEF:', error);
      this.handleSEFError(error, 'get purchase invoices');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      logger.error('SEF health check failed:', error);
      return false;
    }
  }

  /**
   * Centralized error handling for SEF API calls
   */
  private handleSEFError(error: any, operation: string): never {
    // Network errors (connection refused, timeout, etc.)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      throw new SEFNetworkError(
        `Network error during ${operation}: ${error.message}`,
        error
      );
    }

    // HTTP errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Validation errors (400, 422)
      if (status === 400 || status === 422) {
        const errorMessage = data?.message || data?.error || 'Validation error';
        throw new SEFValidationError(
          `Validation error during ${operation}: ${errorMessage}`,
          data
        );
      }

      // Rate limiting (429)
      if (status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
        throw new SEFRateLimitError(
          `Rate limit exceeded during ${operation}. Retry after ${retryAfter}s`,
          retryAfter
        );
      }

      // Server errors (5xx)
      if (status >= 500) {
        throw new SEFServerError(
          `SEF server error during ${operation}: ${status} ${error.response.statusText}`,
          status,
          data
        );
      }

      // Other client errors (401, 403, 404, etc.)
      throw new SEFError(
        `SEF API error during ${operation}: ${status} ${data?.message || error.message}`,
        status,
        data
      );
    }

    // Unknown error
    throw new SEFError(
      `Unknown error during ${operation}: ${error.message}`,
      undefined,
      error
    );
  }
}

// Singleton instance
export const sefService = new SEFService();
