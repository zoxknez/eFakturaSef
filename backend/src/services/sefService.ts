import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';

interface SEFConfig {
  baseUrl: string;
  apiKey: string;
}

interface SEFInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  sefId?: string;
  status?: string;
  message?: string;
  errors?: string[];
}

interface SEFInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  supplier: {
    pib: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
  };
  buyer: {
    pib: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
  };
  lines: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  totalVat: number;
  subtotal: number;
  currency: string;
  ublXml?: string;
}

export class SEFService {
  private config: SEFConfig;

  constructor(config: SEFConfig) {
    this.config = config;
  }

  /**
   * Pošalji fakturu u SEF sistem
   */
  async sendInvoice(invoiceData: SEFInvoiceData): Promise<SEFInvoiceResponse> {
    try {
      logger.info('Šalje se faktura u SEF:', { invoiceNumber: invoiceData.invoiceNumber });

      const response: AxiosResponse = await axios.post(
        `${this.config.baseUrl}/api/v1/invoices`,
        {
          invoice: invoiceData,
          format: 'UBL',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info('SEF odgovor:', { status: response.status, data: response.data });

      return {
        success: true,
        sefId: response.data.invoiceId,
        status: response.data.status || 'SENT',
        message: 'Faktura je uspešno poslata u SEF sistem',
      };

    } catch (error: any) {
      logger.error('Greška pri slanju fakture u SEF:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Greška pri komunikaciji sa SEF sistemom',
        errors: error.response?.data?.errors || [error.message],
      };
    }
  }

  /**
   * Proveri status fakture u SEF sistemu
   */
  async getInvoiceStatus(sefId: string): Promise<SEFInvoiceResponse> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.config.baseUrl}/api/v1/invoices/${sefId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        sefId,
        status: response.data.status,
        message: 'Status uspešno dobijen',
      };

    } catch (error: any) {
      logger.error('Greška pri dobijanju statusa iz SEF-a:', {
        sefId,
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        message: 'Greška pri dobijanju statusa fakture',
        errors: [error.message],
      };
    }
  }

  /**
   * Storniraj fakturu u SEF sistemu
   */
  async cancelInvoice(sefId: string, reason?: string): Promise<SEFInvoiceResponse> {
    try {
      const response: AxiosResponse = await axios.post(
        `${this.config.baseUrl}/api/v1/invoices/${sefId}/cancel`,
        {
          reason: reason || 'Stornirana na zahtev korisnika',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        sefId,
        status: 'CANCELLED',
        message: 'Faktura je uspešno stornirana',
      };

    } catch (error: any) {
      logger.error('Greška pri stornu fakture u SEF-u:', {
        sefId,
        error: error.message,
      });

      return {
        success: false,
        message: 'Greška pri stornu fakture',
        errors: [error.message],
      };
    }
  }

  /**
   * Testiraj konekciju sa SEF API-jem
   */
  async testConnection(): Promise<SEFInvoiceResponse> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.config.baseUrl}/api/v1/health`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        message: 'Konekcija sa SEF API-jem je uspešna',
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Greška u konekciji sa SEF API-jem',
        errors: [error.message],
      };
    }
  }

  /**
   * Sinhronizuj sve fakture sa SEF sistemom
   */
  async syncAllInvoices(): Promise<SEFInvoiceResponse> {
    try {
      logger.info('Pokretanje sinhronizacije sa SEF sistemom');

      const response: AxiosResponse = await axios.get(
        `${this.config.baseUrl}/api/v1/invoices/sync`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'application/json',
          },
          timeout: 60000, // 60 seconds for sync
        }
      );

      logger.info('SEF sinhronizacija uspešna:', { data: response.data });

      return {
        success: true,
        message: 'Sinhronizacija sa SEF sistemom je uspešno završena',
      };

    } catch (error: any) {
      logger.error('Greška pri sinhronizaciji sa SEF-om:', {
        error: error.message,
        response: error.response?.data,
      });

      return {
        success: false,
        message: 'Greška pri sinhronizaciji sa SEF sistemom',
        errors: [error.message],
      };
    }
  }

  /**
   * Dobij status svih faktura iz SEF sistema
   */
  async getAllInvoicesStatus(): Promise<SEFInvoiceResponse> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.config.baseUrl}/api/v1/invoices`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Accept': 'application/json',
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        message: 'Status faktura uspešno dobijen',
        // data: response.data
      };

    } catch (error: any) {
      logger.error('Greška pri dobijanju statusa faktura:', {
        error: error.message,
      });

      return {
        success: false,
        message: 'Greška pri dobijanju statusa faktura',
        errors: [error.message],
      };
    }
  }
}

// Factory funkcija za kreiranje SEF servisa
export const createSEFService = (apiKey: string): SEFService => {
  const config: SEFConfig = {
    baseUrl: process.env.SEF_API_BASE_URL || 'https://efaktura.mfin.gov.rs',
    apiKey,
  };

  return new SEFService(config);
};

export default SEFService;
