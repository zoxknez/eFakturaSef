import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as https from 'https';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SEFApiConfig {
  baseURL: string;
  apiKey: string;
  environment: 'demo' | 'production';
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface SEFInvoiceRequest {
  invoiceXML: string;
  companyPIB: string;
  documentType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
}

export interface SEFInvoiceResponse {
  sefId: string;
  status: string;
  statusMessage?: string;
  errors?: string[];
  warnings?: string[];
}

export interface SEFInvoiceStatus {
  sefId: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  statusDate: string;
  buyer?: {
    pib: string;
    name: string;
  };
  deliveryDate?: string;
  acceptanceDate?: string;
  rejectionReason?: string;
}

export interface SEFWebhookPayload {
  sefId: string;
  invoiceId: string;
  status: string;
  statusDate: string;
  companyPIB: string;
  buyerPIB?: string;
  eventType: 'STATUS_CHANGE' | 'DELIVERY_CONFIRMATION' | 'ACCEPTANCE' | 'REJECTION';
  data?: any;
}

export class SEFApiClient {
  private client: AxiosInstance;
  private config: SEFApiConfig;

  constructor(config: SEFApiConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    // Create HTTPS agent for production environment
    const httpsAgent = new https.Agent({
      rejectUnauthorized: config.environment === 'production',
      keepAlive: true,
      timeout: this.config.timeout
    });

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': 'SEF-eFakture-App/1.0.0',
        'Accept': 'application/json'
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use((config) => {
      console.log(`[SEF API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor for error handling and retries
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle rate limiting (429) and server errors (5xx)
        if ((error.response?.status === 429 || error.response?.status >= 500) && 
            !originalRequest._retry) {
          
          originalRequest._retry = true;
          const delay = this.calculateRetryDelay(originalRequest._retryCount || 0);
          
          console.warn(`[SEF API] Retrying request after ${delay}ms...`);
          await this.sleep(delay);
          
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          if (originalRequest._retryCount <= this.config.retryAttempts!) {
            return this.client(originalRequest);
          }
        }

        // Handle "noćna pauza" (night pause) - Serbian government systems
        if (error.response?.status === 503 && 
            error.response?.data?.message?.includes('noćna pauza')) {
          console.warn('[SEF API] Night pause detected, will retry later');
          throw new Error('SEF sistem je u noćnoj pauzi. Pokušajte ponovo ujutru.');
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Send invoice to SEF system
   */
  async sendInvoice(request: SEFInvoiceRequest): Promise<SEFInvoiceResponse> {
    try {
      const response = await this.client.post('/api/v1/invoices', {
        xml: request.invoiceXML,
        pib: request.companyPIB,
        documentType: request.documentType,
        environment: this.config.environment
      });

      return {
        sefId: response.data.sefId,
        status: response.data.status,
        statusMessage: response.data.message,
        errors: response.data.errors,
        warnings: response.data.warnings
      };

    } catch (error: any) {
      console.error('[SEF API] Send invoice error:', error.response?.data || error.message);
      throw new Error(`Failed to send invoice to SEF: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get invoice status from SEF
   */
  async getInvoiceStatus(sefId: string): Promise<SEFInvoiceStatus> {
    try {
      const response = await this.client.get(`/api/v1/invoices/${sefId}/status`);

      return {
        sefId: response.data.sefId,
        status: response.data.status,
        statusDate: response.data.statusDate,
        buyer: response.data.buyer,
        deliveryDate: response.data.deliveryDate,
        acceptanceDate: response.data.acceptanceDate,
        rejectionReason: response.data.rejectionReason
      };

    } catch (error: any) {
      console.error('[SEF API] Get status error:', error.response?.data || error.message);
      throw new Error(`Failed to get invoice status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get list of received invoices
   */
  async getReceivedInvoices(companyPIB: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      const params: any = { pib: companyPIB };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await this.client.get('/api/v1/invoices/received', { params });
      return response.data.invoices || [];

    } catch (error: any) {
      console.error('[SEF API] Get received invoices error:', error.response?.data || error.message);
      throw new Error(`Failed to get received invoices: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Download invoice XML
   */
  async downloadInvoiceXML(sefId: string): Promise<string> {
    try {
      const response = await this.client.get(`/api/v1/invoices/${sefId}/xml`, {
        headers: { 'Accept': 'application/xml' }
      });

      return response.data;

    } catch (error: any) {
      console.error('[SEF API] Download XML error:', error.response?.data || error.message);
      throw new Error(`Failed to download invoice XML: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(sefId: string, reason: string): Promise<boolean> {
    try {
      await this.client.post(`/api/v1/invoices/${sefId}/cancel`, {
        reason
      });

      return true;

    } catch (error: any) {
      console.error('[SEF API] Cancel invoice error:', error.response?.data || error.message);
      throw new Error(`Failed to cancel invoice: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify webhook signature (security)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: SEFWebhookPayload): Promise<void> {
    try {
      console.log(`[SEF Webhook] Processing ${payload.eventType} for invoice ${payload.sefId}`);

      // Update invoice status in database
      await prisma.invoice.updateMany({
        where: { sefId: payload.sefId },
        data: { 
          status: payload.status,
          updatedAt: new Date()
        }
      });

      // Create audit log entry
      const invoice = await prisma.invoice.findFirst({
        where: { sefId: payload.sefId }
      });

      if (invoice) {
        await prisma.auditLog.create({
          data: {
            entityType: 'invoice',
            entityId: invoice.id,
            action: `SEF_${payload.eventType}`,
            newData: JSON.stringify(payload),
            userId: null
          }
        });
      }

      console.log(`[SEF Webhook] Successfully processed ${payload.eventType}`);

    } catch (error) {
      console.error('[SEF Webhook] Processing error:', error);
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay || 1000;
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/v1/health');
      return true;
    } catch (error) {
      console.error('[SEF API] Health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create SEF API client for a company
 */
export async function createSEFClient(companyId: string): Promise<SEFApiClient> {
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new Error('Company not found');
  }

  if (!company.sefApiKey || !company.sefEnvironment) {
    throw new Error('SEF API configuration missing for company');
  }

  const baseURL = company.sefEnvironment === 'production' 
    ? 'https://efaktura.mfin.gov.rs'
    : 'https://demoefaktura.mfin.gov.rs';

  return new SEFApiClient({
    baseURL,
    apiKey: company.sefApiKey,
    environment: company.sefEnvironment as 'demo' | 'production'
  });
}

export default SEFApiClient;