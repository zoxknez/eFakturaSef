/**
 * SEF (Sistem Elektronskih Faktura) API Service
 * 
 * Complete implementation based on official API documentation
 * @see https://efaktura.gov.rs
 * 
 * Base URLs:
 * - Demo: https://demoefaktura.mfin.gov.rs
 * - Production: https://efaktura.mfin.gov.rs
 * 
 * Authentication: ApiKey header
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import { recordSefApiCall } from '../utils/businessMetrics';

// =====================================================
// CONFIGURATION
// =====================================================

export interface SEFConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  environment?: 'demo' | 'production';
}

export const SEF_ENDPOINTS = {
  // Demo environment
  DEMO: 'https://demoefaktura.mfin.gov.rs',
  // Production environment
  PRODUCTION: 'https://efaktura.mfin.gov.rs',
  // EPP (VAT Deduction) - separate endpoint
  EPP: 'https://ppppdv.mfin.gov.rs',
} as const;

// =====================================================
// ENUMS
// =====================================================

export enum SEFInvoiceStatus {
  Draft = 'Draft',
  New = 'New',
  Sent = 'Sent',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  Storno = 'Storno',
  Sending = 'Sending',
  Mistake = 'Mistake',
}

export enum SEFCirStatus {
  None = 'None',
  Registered = 'Registered',
  Paid = 'Paid',
  PartiallyPaid = 'PartiallyPaid',
  Cancelled = 'Cancelled',
}

export enum SEFVatRecordingStatus {
  Recorded = 'Recorded',
  Cancelled = 'Cancelled',
}

export enum SEFVatPeriod {
  January = 'January',
  February = 'February',
  March = 'March',
  April = 'April',
  May = 'May',
  June = 'June',
  July = 'July',
  August = 'August',
  September = 'September',
  October = 'October',
  November = 'November',
  December = 'December',
  FirstQuarter = 'FirstQuarter',
  SecondQuarter = 'SecondQuarter',
  ThirdQuarter = 'ThirdQuarter',
  FourthQuarter = 'FourthQuarter',
}

export enum SEFVatPeriodRange {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
}

export enum SEFDocumentType {
  Invoice = 'Invoice',
  PrepaymentInvoice = 'PrepaymentInvoice',
  DebitNote = 'DebitNote',
  CreditNote = 'CreditNote',
  InternalInvoiceForeignPerson = 'InternalInvoiceForeignPerson',
  InternalInvoiceVatPayer = 'InternalInvoiceVatPayer',
}

export enum SEFDocumentDirection {
  Inbound = 'Inbound',
  Outbound = 'Outbound',
}

export enum SEFSendToCir {
  Yes = 'Yes',
  No = 'No',
}

export enum SEFVatCategoryCode {
  S = 'S',
  Z = 'Z',
  E = 'E',
  AE = 'AE',
  O = 'O',
}

// =====================================================
// INTERFACES
// =====================================================

export interface SEFMiniInvoiceDto {
  InvoiceId: number;
  PurchaseInvoiceId: number;
  SalesInvoiceId: number;
}

export interface SEFSimpleSalesInvoiceDto {
  Status: SEFInvoiceStatus;
  InvoiceId: number;
  GlobUniqId: string;
  Comment?: string;
  CirStatus: SEFCirStatus;
  CirInvoiceId?: number;
  Version: number;
  LastModifiedUtc: string;
  CirSettledAmount: number;
  VatNumberFactoringCompany?: string;
  FactoringContractNumber?: string;
  CancelComment?: string;
  StornoComment?: string;
}

export interface SEFInvoiceRow {
  RowId?: number;
  InvoiceId?: number;
  OrderNo: number;
  Code: string;
  Description: string;
  Unit: string;
  UnitPrice: number;
  Quantity: number;
  DiscountPercentage: number;
  DiscountAmount: number;
  SumWithoutVat: number;
  VatRate: number;
  VatSum: number;
  SumWithVat: number;
  VatNotCalculated: boolean;
  VatCategoryCode: SEFVatCategoryCode;
}

export interface SEFInvoiceDto {
  InvoiceId: number;
  SenderId: number;
  Sender: string;
  ReceiverId: number;
  Receiver: string;
  InvoiceNumber: string;
  AccountingDateUtc: string;
  PaymentDateUtc: string;
  InvoiceDateUtc: string;
  InvoiceSentDateUtc?: string;
  ReferenceNumber?: string;
  FineRatePerDay: number;
  Description?: string;
  Note?: string;
  OrderNumber?: string;
  Currency: string;
  DiscountPercentage: number;
  DiscountAmount: number;
  SumWithoutVat: number;
  VatRate: number;
  VatSum: number;
  SumWithVat: number;
  Status: SEFInvoiceStatus;
  TotalToPay: number;
  CirStatus: SEFCirStatus;
  CirInvoiceId?: number;
  CirSettledAmount: number;
  GlobUniqId: string;
  Rows: SEFInvoiceRow[];
  Attachments: unknown[];
  IsCreditInvoice: boolean;
  IsDebitNote: boolean;
  IsPrepaymentInvoice: boolean;
  IsProFormaInvoice: boolean;
  VatNotCalculated: boolean;
  Version: number;
  CreatedUtc: string;
  LastModifiedUtc: string;
}

export interface SEFCancelInvoiceRequest {
  invoiceId: number;
  cancelComments: string;
}

export interface SEFStornoInvoiceRequest {
  invoiceId: number;
  stornoNumber?: string;
  stornoComment: string;
}

export interface SEFSalesInvoiceIdListDto {
  InvoiceId: number;
  LastModifiedUtc: string;
  Status: SEFInvoiceStatus;
}

export interface SEFSimplePurchaseInvoiceDto {
  Status: SEFInvoiceStatus;
  InvoiceId: number;
  GlobUniqId: string;
  Comment?: string;
  Version: number;
  LastModifiedUtc: string;
}

export interface SEFAcceptRejectRequest {
  invoiceId: number;
  comment?: string;
}

export interface SEFUnitMeasure {
  Code: string;
  Symbol?: string;
  NameEng: string;
  NameSrbLtn: string;
  NameSrbCyr: string;
  IsOnShortList: boolean;
}

export interface SEFExemptionReason {
  Id: number;
  Key: string;
  NameEng: string;
  NameSrbLtn: string;
  NameSrbCyr: string;
}

export interface SEFCompanyCheckResult {
  exists: boolean;
  companyName?: string;
  vatNumber?: string;
  registrationCode?: string;
  isBudgetUser: boolean;
}

// VAT Recording types
export interface SEFVatTurnoverDto {
  VatTurnoverId?: number;
  TaxableAmount20: number;
  TaxAmount20: number;
  TotalAmount20: number;
  TaxableAmount10: number;
  TaxAmount10: number;
  TotalAmount10: number;
  TurnoverDescription10?: string;
  TurnoverDescription20?: string;
}

export interface SEFGroupVatDto {
  GroupVatId?: number;
  CompanyId?: number;
  Year: number;
  VatPeriod: SEFVatPeriod;
  VatRecordingStatus?: SEFVatRecordingStatus;
  TurnoverWithFee?: SEFVatTurnoverDto;
  TurnoverWithoutFee?: SEFVatTurnoverDto;
  FutureTurnover?: SEFVatTurnoverDto;
  VatReductionFromPreviousPeriodAmount: number;
  VatIncreaseFromPreviousPeriodAmount: number;
  SendDate?: string;
  CalculationNumber: string;
  CreatedDateUtc?: string;
  StatusChangeDateUtc?: string;
}

export interface SEFGroupVatListDto {
  GroupVatId: number;
  CompanyId: number;
  Year: number;
  VatPeriod: SEFVatPeriod;
  VatRecordingStatus: SEFVatRecordingStatus;
  SendDate?: string;
  CalculationNumber: string;
  CreatedUtc: string;
  StatusChangeDate: string;
}

export interface SEFIndividualVatDto {
  IndividualVatId?: number;
  CompanyId?: number;
  Year: number;
  DocumentNumber?: string;
  VatRecordingStatus?: SEFVatRecordingStatus;
  TurnoverDate?: string;
  PaymentDate?: string;
  DocumentType: SEFDocumentType | string;
  TurnoverDescription?: string;
  TurnoverAmount: number;
  VatBaseAmount20: number;
  VatBaseAmount10: number;
  VatAmount: number;
  VatAmount10: number;
  VatAmount20: number;
  TotalAmount: number;
  DocumentDirection: SEFDocumentDirection | string;
  RelatedPartyIdentifier?: string;
  ForeignDocument: boolean;
  VatPeriod: SEFVatPeriod | string;
  CalculationNumber: string;
  CreatedDateUtc?: string;
  StatusChangeDateUtc?: string;
}

export interface SEFIndividualVatListDto {
  IndividualVatId: number;
  Year: number;
  DocumentNumber?: string;
  VatRecordingStatus: SEFVatRecordingStatus;
  DocumentType: SEFDocumentType;
  TurnoverAmount: number;
  VatAmount: number;
  DocumentDirection: SEFDocumentDirection;
  VatPeriod: SEFVatPeriod;
  CreatedUtc: string;
  StatusChangeDate: string;
}

// EPP (VAT Deduction) types
export interface SEFVatRateAmounts {
  Invoice_Base: number;
  Invoice_Vat: number;
  FiscalInvoice_Base?: number;
  FiscalInvoice_Vat?: number;
  OtherInvoice_Base?: number;
  OtherInvoice_Vat?: number;
  Total_Base: number;
  Total_Vat: number;
  Deduction_Vat?: number;
}

export interface SEFVatTurnoverCategory {
  TurnoverAtRateOf20Percent: SEFVatRateAmounts;
  TurnoverAtRateOf10Percent: SEFVatRateAmounts;
}

export interface SEFTurnoverAsSupplier {
  FirstTransferOfTheRightToDispose: SEFVatTurnoverCategory;
  TurnoverExceptForTransferOfTheRight: SEFVatTurnoverCategory;
  IncreaseOfBaseIeVat: SEFVatTurnoverCategory;
  DecreaseOfBaseIeVat: SEFVatTurnoverCategory;
  FeePaidBeforeTurnoverIePrepayment: SEFVatTurnoverCategory;
  DecreaseOfPrepayment: SEFVatTurnoverCategory;
}

export interface SEFVatDeductionRecordRequest {
  VatDeductionRecordNumber: string;
  TaxId: string;
  Year: number;
  VatPeriodRange: SEFVatPeriodRange | string;
  VatPeriod: SEFVatPeriod | string;
  GetAnalyticalBreakdown?: boolean;
  TurnoverAsSupplier?: Partial<SEFTurnoverAsSupplier>;
}

export interface SEFVatDeductionRecordResponse extends SEFVatDeductionRecordRequest {
  Id: number;
  Status: 'Draft' | 'Recorded' | 'Corrected';
  StatusChangeDate: string;
  RecordingDate: string;
  CreatedUtc: string;
  ParentId?: number;
}

export interface SEFSystemCalculationResponse {
  TaxId: string;
  Year: number;
  VatPeriodRange: SEFVatPeriodRange;
  VatPeriod: SEFVatPeriod;
  DataCollectionDate: string;
  TurnoverAsSupplier?: Partial<SEFTurnoverAsSupplier>;
}

// =====================================================
// ERROR CLASSES
// =====================================================

export class SEFError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public sefResponse?: unknown,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'SEFError';
  }
}

export class SEFValidationError extends SEFError {
  constructor(message: string, sefResponse?: unknown, errorCode?: string) {
    super(message, 400, sefResponse, errorCode);
    this.name = 'SEFValidationError';
  }
}

export class SEFNetworkError extends SEFError {
  constructor(message: string, originalError?: unknown) {
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
  constructor(message: string, statusCode: number, sefResponse?: unknown) {
    super(message, statusCode, sefResponse);
    this.name = 'SEFServerError';
  }
}

export class SEFAuthenticationError extends SEFError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'SEFAuthenticationError';
  }
}

// =====================================================
// NIGHT PAUSE UTILITY
// =====================================================

/**
 * Check if current time is within SEF night pause window (00:00 - 06:00)
 */
export function isNightPause(): boolean {
  const now = new Date();
  const hours = now.getHours();
  return hours >= 0 && hours < 6;
}

/**
 * Get minutes until night pause ends
 */
export function getMinutesUntilNightPauseEnds(): number {
  const now = new Date();
  const hours = now.getHours();
  if (hours >= 6) return 0;
  return (6 - hours) * 60 - now.getMinutes();
}

// =====================================================
// SEF SERVICE CLASS
// =====================================================

export class SEFService {
  private client: AxiosInstance;
  private eppClient: AxiosInstance;
  private config: SEFConfig;

  constructor(customConfig: SEFConfig) {
    this.config = {
      timeout: 30000,
      environment: customConfig.baseUrl.includes('demo') ? 'demo' : 'production',
      ...customConfig,
    };

    // Main SEF client
    this.client = this.createAxiosClient(this.config.baseUrl);
    
    // EPP client for VAT deduction (separate endpoint)
    this.eppClient = this.createAxiosClient(SEF_ENDPOINTS.EPP);
  }

  private createAxiosClient(baseURL: string): AxiosInstance {
    const client = axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': this.config.apiKey,
      },
    });

    // Configure axios-retry with exponential backoff
    axiosRetry(client, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        const delay = Math.pow(2, retryCount) * 1000;
        logger.info(`SEF API retry attempt ${retryCount} after ${delay}ms`, {
          error: error.message,
          url: error.config?.url,
        });
        return delay;
      },
      retryCondition: (error: AxiosError) => {
        if (isNetworkOrIdempotentRequestError(error)) return true;
        
        const status = error.response?.status;
        if (status === 429) {
          const retryAfter = error.response?.headers['retry-after'];
          if (retryAfter) {
            logger.warn(`SEF API rate limited, retry after ${retryAfter}s`);
          }
          return true;
        }
        
        if (status && status >= 500 && status < 600) {
          logger.warn(`SEF API server error ${status}, will retry`);
          return true;
        }
        
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

    // Request interceptor
    client.interceptors.request.use(
      (config) => {
        (config as unknown as Record<string, unknown>).metadata = { startTime: Date.now() };
        logger.info(`SEF API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('SEF API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    client.interceptors.response.use(
      (response) => {
        const metadata = (response.config as unknown as Record<string, unknown>).metadata as { startTime: number } | undefined;
        const duration = Date.now() - (metadata?.startTime || Date.now());
        logger.info(`SEF API Response: ${response.status} ${response.config.url}`, {
          duration: `${duration}ms`,
          status: response.status,
        });
        return response;
      },
      (error) => {
        const metadata = (error.config as unknown as Record<string, unknown>)?.metadata as { startTime: number } | undefined;
        const duration = Date.now() - (metadata?.startTime || Date.now());
        logger.error('SEF API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          duration: `${duration}ms`,
          code: error.code,
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  // =====================================================
  // UNIT MEASURES
  // =====================================================

  /**
   * GET /api/publicApi/get-unit-measures
   */
  async getUnitMeasures(): Promise<SEFUnitMeasure[]> {
    try {
      const response = await this.client.get<SEFUnitMeasure[]>('/api/publicApi/get-unit-measures');
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get unit measures');
    }
  }

  // =====================================================
  // SALES INVOICE OPERATIONS
  // =====================================================

  /**
   * POST /api/publicApi/sales-invoice/ubl/upload
   * Import sales invoice by uploading UBL file
   */
  async uploadSalesInvoiceUBL(
    ublFile: Buffer | string,
    requestId: string,
    options?: {
      sendToCir?: SEFSendToCir;
      executeValidation?: boolean;
      fileName?: string;
    }
  ): Promise<SEFMiniInvoiceDto> {
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      formData.append('ublFile', 
        Buffer.isBuffer(ublFile) ? ublFile : Buffer.from(ublFile, 'utf-8'),
        { filename: options?.fileName || 'invoice.xml', contentType: 'text/xml' }
      );

      const params = new URLSearchParams();
      params.append('requestId', requestId);
      if (options?.sendToCir) params.append('sendToCir', options.sendToCir);
      if (options?.executeValidation !== undefined) {
        params.append('executeValidation', String(options.executeValidation));
      }

      const response = await this.client.post<SEFMiniInvoiceDto>(
        `/api/publicApi/sales-invoice/ubl/upload?${params.toString()}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'ApiKey': this.config.apiKey,
          },
        }
      );

      this.recordMetric('/api/publicApi/sales-invoice/ubl/upload', 'POST', response.status, startTime);
      return response.data;
    } catch (error) {
      this.recordMetric('/api/publicApi/sales-invoice/ubl/upload', 'POST', 
        (error as AxiosError).response?.status || 0, startTime);
      this.handleSEFError(error, 'upload sales invoice UBL');
    }
  }

  /**
   * POST /api/publicApi/sales-invoice/ubl
   * Import sales UBL document (XML as string body)
   */
  async sendSalesInvoiceUBL(
    ublXml: string,
    requestId: string,
    options?: {
      sendToCir?: SEFSendToCir;
      executeValidation?: boolean;
    }
  ): Promise<SEFMiniInvoiceDto> {
    const startTime = Date.now();

    try {
      const params = new URLSearchParams();
      params.append('requestId', requestId);
      if (options?.sendToCir) params.append('sendToCir', options.sendToCir);
      if (options?.executeValidation !== undefined) {
        params.append('executeValidation', String(options.executeValidation));
      }

      const response = await this.client.post<SEFMiniInvoiceDto>(
        `/api/publicApi/sales-invoice/ubl?${params.toString()}`,
        ublXml,
        {
          headers: {
            'Content-Type': 'application/xml',
            'ApiKey': this.config.apiKey,
          },
        }
      );

      this.recordMetric('/api/publicApi/sales-invoice/ubl', 'POST', response.status, startTime);
      return response.data;
    } catch (error) {
      this.recordMetric('/api/publicApi/sales-invoice/ubl', 'POST',
        (error as AxiosError).response?.status || 0, startTime);
      this.handleSEFError(error, 'send sales invoice UBL');
    }
  }

  /**
   * GET /api/publicApi/sales-invoice
   */
  async getSalesInvoice(invoiceId: number): Promise<SEFSimpleSalesInvoiceDto> {
    try {
      const response = await this.client.get<SEFSimpleSalesInvoiceDto>(
        '/api/publicApi/sales-invoice',
        { params: { invoiceId } }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get sales invoice');
    }
  }

  /**
   * DELETE /api/publicApi/sales-invoice
   */
  async deleteSalesInvoices(invoiceIds: number[]): Promise<number[]> {
    try {
      const response = await this.client.delete<number[]>(
        '/api/publicApi/sales-invoice',
        { data: invoiceIds }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'delete sales invoices');
    }
  }

  /**
   * DELETE /api/publicApi/sales-invoice/{invoiceId}
   */
  async deleteSalesInvoice(invoiceId: number): Promise<void> {
    try {
      await this.client.delete(`/api/publicApi/sales-invoice/${invoiceId}`);
    } catch (error) {
      this.handleSEFError(error, 'delete sales invoice');
    }
  }

  /**
   * GET /api/publicApi/sales-invoice/signature
   */
  async getSalesInvoiceSignature(invoiceId: number): Promise<Buffer> {
    try {
      const response = await this.client.get('/api/publicApi/sales-invoice/signature', {
        params: { invoiceId },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.handleSEFError(error, 'get sales invoice signature');
    }
  }

  /**
   * POST /api/publicApi/sales-invoice/cancel
   */
  async cancelSalesInvoice(request: SEFCancelInvoiceRequest): Promise<SEFInvoiceDto> {
    try {
      const response = await this.client.post<SEFInvoiceDto>(
        '/api/publicApi/sales-invoice/cancel',
        request
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'cancel sales invoice');
    }
  }

  /**
   * POST /api/publicApi/sales-invoice/storno
   */
  async stornoSalesInvoice(request: SEFStornoInvoiceRequest): Promise<SEFInvoiceDto> {
    try {
      const response = await this.client.post<SEFInvoiceDto>(
        '/api/publicApi/sales-invoice/storno',
        request
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'storno sales invoice');
    }
  }

  /**
   * GET /api/publicApi/sales-invoice/changes
   */
  async getSalesInvoiceChanges(date: string): Promise<SEFSalesInvoiceIdListDto[]> {
    try {
      const response = await this.client.get<SEFSalesInvoiceIdListDto[]>(
        '/api/publicApi/sales-invoice/changes',
        { params: { date } }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get sales invoice changes');
    }
  }

  /**
   * GET /api/publicApi/sales-invoice/ids
   */
  async getSalesInvoiceIds(params: {
    dateFrom?: string;
    dateTo?: string;
    status?: SEFInvoiceStatus;
  }): Promise<SEFSalesInvoiceIdListDto[]> {
    try {
      const response = await this.client.get<SEFSalesInvoiceIdListDto[]>(
        '/api/publicApi/sales-invoice/ids',
        { params }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get sales invoice ids');
    }
  }

  /**
   * GET /api/publicApi/sales-invoice/xml
   */
  async getSalesInvoiceXml(invoiceId: number): Promise<string> {
    try {
      const response = await this.client.get('/api/publicApi/sales-invoice/xml', {
        params: { invoiceId },
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get sales invoice xml');
    }
  }

  /**
   * GET /api/publicApi/sales-invoice/pdf
   */
  async getSalesInvoicePdf(invoiceId: number): Promise<Buffer> {
    try {
      const response = await this.client.get('/api/publicApi/sales-invoice/pdf', {
        params: { invoiceId },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.handleSEFError(error, 'get sales invoice pdf');
    }
  }

  // =====================================================
  // PURCHASE INVOICE OPERATIONS
  // =====================================================

  /**
   * GET /api/publicApi/purchase-invoice
   */
  async getPurchaseInvoice(invoiceId: number): Promise<SEFSimplePurchaseInvoiceDto> {
    try {
      const response = await this.client.get<SEFSimplePurchaseInvoiceDto>(
        '/api/publicApi/purchase-invoice',
        { params: { invoiceId } }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get purchase invoice');
    }
  }

  /**
   * GET /api/publicApi/purchase-invoice/signature
   */
  async getPurchaseInvoiceSignature(invoiceId: number): Promise<Buffer> {
    try {
      const response = await this.client.get('/api/publicApi/purchase-invoice/signature', {
        params: { invoiceId },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.handleSEFError(error, 'get purchase invoice signature');
    }
  }

  /**
   * GET /api/publicApi/purchase-invoice/xml
   */
  async getPurchaseInvoiceXml(invoiceId: number): Promise<string> {
    try {
      const response = await this.client.get('/api/publicApi/purchase-invoice/xml', {
        params: { invoiceId },
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get purchase invoice xml');
    }
  }

  /**
   * GET /api/publicApi/purchase-invoice/changes
   */
  async getPurchaseInvoiceChanges(date: string): Promise<SEFSalesInvoiceIdListDto[]> {
    try {
      const response = await this.client.get<SEFSalesInvoiceIdListDto[]>(
        '/api/publicApi/purchase-invoice/changes',
        { params: { date } }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get purchase invoice changes');
    }
  }

  /**
   * POST /api/publicApi/purchase-invoice/accept
   */
  async acceptPurchaseInvoice(request: SEFAcceptRejectRequest): Promise<SEFInvoiceDto> {
    try {
      const response = await this.client.post<SEFInvoiceDto>(
        '/api/publicApi/purchase-invoice/accept',
        request
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'accept purchase invoice');
    }
  }

  /**
   * POST /api/publicApi/purchase-invoice/reject
   */
  async rejectPurchaseInvoice(request: SEFAcceptRejectRequest): Promise<SEFInvoiceDto> {
    try {
      const response = await this.client.post<SEFInvoiceDto>(
        '/api/publicApi/purchase-invoice/reject',
        request
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'reject purchase invoice');
    }
  }

  /**
   * GET /api/publicApi/purchase-invoice/ids
   */
  async getPurchaseInvoiceIds(params: {
    dateFrom?: string;
    dateTo?: string;
    status?: SEFInvoiceStatus;
  }): Promise<SEFSalesInvoiceIdListDto[]> {
    try {
      const response = await this.client.get<SEFSalesInvoiceIdListDto[]>(
        '/api/publicApi/purchase-invoice/ids',
        { params }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get purchase invoice ids');
    }
  }

  /**
   * GET /api/publicApi/purchase-invoice/pdf
   */
  async getPurchaseInvoicePdf(invoiceId: number): Promise<Buffer> {
    try {
      const response = await this.client.get('/api/publicApi/purchase-invoice/pdf', {
        params: { invoiceId },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.handleSEFError(error, 'get purchase invoice pdf');
    }
  }

  // =====================================================
  // VAT EXEMPTION REASONS
  // =====================================================

  /**
   * GET /api/publicApi/get-vat-exemption-reasons
   */
  async getVatExemptionReasons(): Promise<SEFExemptionReason[]> {
    try {
      const response = await this.client.get<SEFExemptionReason[]>(
        '/api/publicApi/get-vat-exemption-reasons'
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get vat exemption reasons');
    }
  }

  // =====================================================
  // GROUP VAT RECORDING (Zbirna evidencija PDV)
  // =====================================================

  /**
   * POST /api/publicApi/vat-recording/group
   */
  async createGroupVatRecording(data: SEFGroupVatDto): Promise<SEFGroupVatDto> {
    try {
      const response = await this.client.post<SEFGroupVatDto>(
        '/api/publicApi/vat-recording/group',
        data
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'create group vat recording');
    }
  }

  /**
   * GET /api/publicApi/vat-recording/group
   */
  async getGroupVatRecordings(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<SEFGroupVatListDto[]> {
    try {
      const response = await this.client.get<SEFGroupVatListDto[]>(
        '/api/publicApi/vat-recording/group',
        { params }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get group vat recordings');
    }
  }

  /**
   * GET /api/publicApi/vat-recording/group/{groupVatId}
   */
  async getGroupVatRecording(groupVatId: number): Promise<SEFGroupVatDto> {
    try {
      const response = await this.client.get<SEFGroupVatDto>(
        `/api/publicApi/vat-recording/group/${groupVatId}`
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get group vat recording');
    }
  }

  /**
   * POST /api/publicApi/vat-recording/group/cancel/{groupVatId}
   */
  async cancelGroupVatRecording(groupVatId: number): Promise<void> {
    try {
      await this.client.post(`/api/publicApi/vat-recording/group/cancel/${groupVatId}`);
    } catch (error) {
      this.handleSEFError(error, 'cancel group vat recording');
    }
  }

  // =====================================================
  // INDIVIDUAL VAT RECORDING (Pojedinačna evidencija PDV)
  // =====================================================

  /**
   * POST /api/publicApi/vat-recording/individual
   */
  async createIndividualVatRecording(data: SEFIndividualVatDto): Promise<SEFIndividualVatDto> {
    try {
      const response = await this.client.post<SEFIndividualVatDto>(
        '/api/publicApi/vat-recording/individual',
        data
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'create individual vat recording');
    }
  }

  /**
   * GET /api/publicApi/vat-recording/individual
   */
  async getIndividualVatRecordings(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<SEFIndividualVatListDto[]> {
    try {
      const response = await this.client.get<SEFIndividualVatListDto[]>(
        '/api/publicApi/vat-recording/individual',
        { params }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get individual vat recordings');
    }
  }

  /**
   * GET /api/publicApi/vat-recording/individual/{individualVatId}
   */
  async getIndividualVatRecording(individualVatId: number): Promise<SEFIndividualVatDto> {
    try {
      const response = await this.client.get<SEFIndividualVatDto>(
        `/api/publicApi/vat-recording/individual/${individualVatId}`
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get individual vat recording');
    }
  }

  /**
   * POST /api/publicApi/vat-recording/individual/cancel/{individualVatId}
   */
  async cancelIndividualVatRecording(individualVatId: number): Promise<void> {
    try {
      await this.client.post(`/api/publicApi/vat-recording/individual/cancel/${individualVatId}`);
    } catch (error) {
      this.handleSEFError(error, 'cancel individual vat recording');
    }
  }

  // =====================================================
  // EPP - VAT DEDUCTION RECORD (Evidencija Prethodnog Poreza)
  // Uses separate endpoint: ppppdv.mfin.gov.rs
  // =====================================================

  /**
   * POST /api/v1/public-api/vat-deduction-record
   */
  async createVatDeductionRecord(
    data: SEFVatDeductionRecordRequest
  ): Promise<SEFVatDeductionRecordResponse> {
    try {
      const response = await this.eppClient.post<SEFVatDeductionRecordResponse>(
        '/api/v1/public-api/vat-deduction-record',
        data
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'create vat deduction record');
    }
  }

  /**
   * PUT /api/v1/public-api/vat-deduction-record
   */
  async correctVatDeductionRecord(
    id: number,
    data: SEFVatDeductionRecordRequest
  ): Promise<SEFVatDeductionRecordResponse> {
    try {
      const response = await this.eppClient.put<SEFVatDeductionRecordResponse>(
        '/api/v1/public-api/vat-deduction-record',
        data,
        { params: { id } }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'correct vat deduction record');
    }
  }

  /**
   * GET /api/v1/public-api/vat-deduction-record
   */
  async getVatDeductionRecord(id: number): Promise<SEFVatDeductionRecordResponse> {
    try {
      const response = await this.eppClient.get<SEFVatDeductionRecordResponse>(
        '/api/v1/public-api/vat-deduction-record',
        { params: { id } }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get vat deduction record');
    }
  }

  /**
   * GET /api/v1/public-api/vat-deduction-record/list
   */
  async getVatDeductionRecords(params: {
    TaxId?: string;
    Year?: number;
    VatPeriodRange?: SEFVatPeriodRange;
    VatPeriod?: SEFVatPeriod;
    VatDeductionRecordNumber?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<SEFVatDeductionRecordResponse[]> {
    try {
      const response = await this.eppClient.get<SEFVatDeductionRecordResponse[]>(
        '/api/v1/public-api/vat-deduction-record/list',
        { params }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get vat deduction records');
    }
  }

  /**
   * DELETE /api/v1/public-api/vat-deduction-record
   */
  async deleteVatDeductionRecord(id: number): Promise<void> {
    try {
      await this.eppClient.delete('/api/v1/public-api/vat-deduction-record', {
        params: { id },
      });
    } catch (error) {
      this.handleSEFError(error, 'delete vat deduction record');
    }
  }

  /**
   * GET /api/v1/public-api/vat-deduction-record/analytics
   */
  async getVatDeductionRecordAnalytics(id: number): Promise<string> {
    try {
      const response = await this.eppClient.get('/api/v1/public-api/vat-deduction-record/analytics', {
        params: { id },
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get vat deduction record analytics');
    }
  }

  /**
   * GET /api/v1/public-api/input-vat/system-calculation
   */
  async getSystemVatCalculation(params: {
    TaxId: string;
    Year: number;
    VatPeriodRange: SEFVatPeriodRange | string;
    VatPeriod: SEFVatPeriod | string;
  }): Promise<SEFSystemCalculationResponse> {
    try {
      const response = await this.eppClient.get<SEFSystemCalculationResponse>(
        '/api/v1/public-api/input-vat/system-calculation',
        { params }
      );
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get system vat calculation');
    }
  }

  /**
   * GET /api/v1/public-api/input-vat/analytics
   */
  async getSystemVatAnalytics(params: {
    TaxId: string;
    Year: number;
    VatPeriodRange: SEFVatPeriodRange | string;
    VatPeriod: SEFVatPeriod | string;
  }): Promise<string> {
    try {
      const response = await this.eppClient.get('/api/v1/public-api/input-vat/analytics', {
        params,
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get system vat analytics');
    }
  }

  // =====================================================
  // COMPANY VERIFICATION
  // =====================================================

  /**
   * GET /api/publicApi/company/check
   */
  async checkCompanyExists(vatNumber: string): Promise<SEFCompanyCheckResult> {
    try {
      const response = await this.client.get('/api/publicApi/company/check', {
        params: { vatNumber },
      });
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return { exists: false, isBudgetUser: false };
      }
      this.handleSEFError(error, 'check company exists');
    }
  }

  /**
   * POST /api/publicApi/company/refresh
   */
  async refreshCompanyData(): Promise<void> {
    try {
      await this.client.post('/api/publicApi/company/refresh');
    } catch (error) {
      this.handleSEFError(error, 'refresh company data');
    }
  }

  // =====================================================
  // SYSTEM INFO
  // =====================================================

  /**
   * GET /api/publicApi/version
   */
  async getVersion(): Promise<string> {
    try {
      const response = await this.client.get<string>('/api/publicApi/version');
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get version');
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

  // =====================================================
  // NOTIFICATION SUBSCRIPTION
  // =====================================================

  /**
   * POST /api/publicApi/notification/subscribe
   */
  async subscribeNotifications(notificationUrl: string, authKey?: string): Promise<void> {
    try {
      await this.client.post('/api/publicApi/notification/subscribe', {
        notificationUrl,
        authKey,
      });
    } catch (error) {
      this.handleSEFError(error, 'subscribe notifications');
    }
  }

  /**
   * DELETE /api/publicApi/notification/unsubscribe
   */
  async unsubscribeNotifications(): Promise<void> {
    try {
      await this.client.delete('/api/publicApi/notification/unsubscribe');
    } catch (error) {
      this.handleSEFError(error, 'unsubscribe notifications');
    }
  }

  // =====================================================
  // CIR (Central Invoice Registry) OPERATIONS
  // =====================================================

  /**
   * POST /api/publicApi/cir/assign
   */
  async assignToCir(invoiceId: number, factorVatNumber: string): Promise<unknown> {
    try {
      const response = await this.client.post('/api/publicApi/cir/assign', {
        invoiceId,
        factorVatNumber,
      });
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'assign to cir');
    }
  }

  /**
   * POST /api/publicApi/cir/cancel-assign
   */
  async cancelCirAssignment(invoiceId: number): Promise<void> {
    try {
      await this.client.post('/api/publicApi/cir/cancel-assign', { invoiceId });
    } catch (error) {
      this.handleSEFError(error, 'cancel cir assignment');
    }
  }

  /**
   * GET /api/publicApi/cir/history/{cirInvoiceId}
   */
  async getCirHistory(cirInvoiceId: number): Promise<unknown[]> {
    try {
      const response = await this.client.get(`/api/publicApi/cir/history/${cirInvoiceId}`);
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get cir history');
    }
  }

  // =====================================================
  // CUSTOMS DECLARATIONS
  // =====================================================

  /**
   * GET /api/publicApi/customs-declaration
   */
  async getCustomsDeclarations(params: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<unknown[]> {
    try {
      const response = await this.client.get('/api/publicApi/customs-declaration', { params });
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get customs declarations');
    }
  }

  /**
   * GET /api/publicApi/customs-declaration/{id}
   */
  async getCustomsDeclaration(id: number): Promise<unknown> {
    try {
      const response = await this.client.get(`/api/publicApi/customs-declaration/${id}`);
      return response.data;
    } catch (error) {
      this.handleSEFError(error, 'get customs declaration');
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private recordMetric(endpoint: string, method: string, status: number, startTime: number): void {
    const duration = (Date.now() - startTime) / 1000;
    recordSefApiCall(endpoint, method, status, this.config.environment || 'production', duration);
  }

  private handleSEFError(error: unknown, operation: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network errors
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ENOTFOUND') {
        throw new SEFNetworkError(`Network error during ${operation}: ${axiosError.message}`, axiosError);
      }

      // HTTP errors
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as Record<string, unknown>;

        // Authentication error
        if (status === 401) {
          throw new SEFAuthenticationError(`Authentication failed during ${operation}: Invalid API key`);
        }

        // Validation errors (400, 422)
        if (status === 400 || status === 422) {
          const errorMessage = (data?.message as string) || (data?.error as string) || 'Validation error';
          const errorCode = data?.Code as string || data?.code as string;
          throw new SEFValidationError(
            `Validation error during ${operation}: ${errorMessage}`,
            data,
            errorCode
          );
        }

        // Rate limiting (429)
        if (status === 429) {
          const retryAfter = parseInt(axiosError.response.headers['retry-after'] || '60');
          throw new SEFRateLimitError(
            `Rate limit exceeded during ${operation}. Retry after ${retryAfter}s`,
            retryAfter
          );
        }

        // Server errors (5xx)
        if (status >= 500) {
          throw new SEFServerError(
            `SEF server error during ${operation}: ${status} ${axiosError.response.statusText}`,
            status,
            data
          );
        }

        // Other client errors
        throw new SEFError(
          `SEF API error during ${operation}: ${status} ${(data?.message as string) || axiosError.message}`,
          status,
          data
        );
      }
    }

    // Unknown error
    throw new SEFError(
      `Unknown error during ${operation}: ${(error as Error).message}`,
      undefined,
      error
    );
  }
}

// =====================================================
// FACTORY FUNCTIONS
// =====================================================

/**
 * Create SEF Service instance with configuration
 */
export function createSEFService(config: SEFConfig): SEFService {
  return new SEFService(config);
}

/**
 * Create SEF Service for demo environment
 */
export function createDemoSEFService(apiKey: string): SEFService {
  return new SEFService({
    baseUrl: SEF_ENDPOINTS.DEMO,
    apiKey,
    environment: 'demo',
  });
}

/**
 * Create SEF Service for production environment
 */
export function createProductionSEFService(apiKey: string): SEFService {
  return new SEFService({
    baseUrl: SEF_ENDPOINTS.PRODUCTION,
    apiKey,
    environment: 'production',
  });
}
