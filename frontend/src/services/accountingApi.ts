import axios from 'axios';
import { API_URL, API_TIMEOUT, API_DEFAULT_HEADERS } from '../config/api';

// Create API instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: API_DEFAULT_HEADERS,
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types for Accounting Module
export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normalSide: 'DEBIT' | 'CREDIT';
  parentId: string | null;
  level: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  children?: Account[];
  parent?: Account;
}

export interface CreateAccountDto {
  code: string;
  name: string;
  type: Account['type'];
  normalSide?: Account['normalSide'];
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

export interface FiscalYear {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  type: 'MANUAL' | 'INVOICE' | 'PAYMENT' | 'ADJUSTMENT' | 'CLOSING' | 'OPENING';
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  totalDebit: number;
  totalCredit: number;
  fiscalYearId: string;
  companyId: string;
  invoiceId?: string;
  paymentId?: string;
  createdById: string;
  postedById?: string;
  postedAt?: string;
  lines: JournalLine[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  account?: Account;
  debit: number;
  credit: number;
  description?: string;
  partnerId?: string;
  documentRef?: string;
  lineNumber: number;
}

export interface CreateJournalEntryDto {
  date: string;
  description: string;
  reference?: string;
  type?: JournalEntry['type'];
  fiscalYearId: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    partnerId?: string;
    documentRef?: string;
  }>;
}

export interface VATRecord {
  id: string;
  recordType: 'KPO' | 'KPR';
  documentNumber: string;
  documentDate: string;
  partnerName: string;
  partnerPib: string;
  baseAmount10: number;
  vatAmount10: number;
  baseAmount20: number;
  vatAmount20: number;
  exemptAmount: number;
  totalAmount: number;
  vatPeriod: string;
  invoiceId?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVATRecordDto {
  recordType: 'KPO' | 'KPR';
  documentNumber: string;
  documentDate: string;
  partnerName: string;
  partnerPib: string;
  baseAmount10?: number;
  vatAmount10?: number;
  baseAmount20?: number;
  vatAmount20?: number;
  exemptAmount?: number;
  invoiceId?: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  issueDate: string;
  dueDate: string;
  reason: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  originalInvoiceId: string;
  originalInvoice?: {
    invoiceNumber: string;
    totalAmount: number;
  };
  partnerId: string;
  partner?: {
    name: string;
    pib: string;
  };
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  sefId?: string;
  sefStatus?: string;
  lines: CreditNoteLine[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditNoteLine {
  id: string;
  creditNoteId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  productId?: string;
}

export interface CreateCreditNoteDto {
  originalInvoiceId: string;
  reason: string;
  issueDate?: string;
  dueDate?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    productId?: string;
  }>;
}

export interface TrialBalance {
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  }>;
  totals: {
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface BalanceSheet {
  assets: {
    current: Record<string, number>;
    nonCurrent: Record<string, number>;
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  liabilities: {
    current: Record<string, number>;
    nonCurrent: Record<string, number>;
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  equity: {
    items: Record<string, number>;
    total: number;
  };
  asOfDate: string;
}

export interface IncomeStatement {
  revenue: {
    items: Record<string, number>;
    total: number;
  };
  expenses: {
    items: Record<string, number>;
    total: number;
  };
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

// === ACCOUNTS API ===

export const accountsApi = {
  getAll: async (params?: { type?: string; isActive?: boolean; parentId?: string }) => {
    const response = await api.get<Account[]>('/accounting/accounts', { params });
    return response.data;
  },

  getTree: async () => {
    const response = await api.get<Account[]>('/accounting/accounts/tree');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Account>(`/accounting/accounts/${id}`);
    return response.data;
  },

  create: async (data: CreateAccountDto) => {
    const response = await api.post<Account>('/accounting/accounts', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateAccountDto>) => {
    const response = await api.put<Account>(`/accounting/accounts/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/accounting/accounts/${id}`);
  },

  getBalance: async (id: string, startDate?: string, endDate?: string) => {
    const response = await api.get<{ debit: number; credit: number; balance: number }>(
      `/accounting/accounts/${id}/balance`,
      { params: { startDate, endDate } }
    );
    return response.data;
  },
};

// === FISCAL YEARS API ===

export const fiscalYearsApi = {
  getAll: async () => {
    const response = await api.get<FiscalYear[]>('/accounting/fiscal-years');
    return response.data;
  },

  getActive: async () => {
    const response = await api.get<FiscalYear>('/accounting/fiscal-years/active');
    return response.data;
  },

  create: async (year: number) => {
    const response = await api.post<FiscalYear>('/accounting/fiscal-years', { year });
    return response.data;
  },

  close: async (id: string) => {
    const response = await api.post<FiscalYear>(`/accounting/fiscal-years/${id}/close`);
    return response.data;
  },
};

// === JOURNAL ENTRIES API ===

export const journalEntriesApi = {
  getAll: async (params?: { 
    fiscalYearId?: string; 
    status?: string; 
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<{ data: JournalEntry[]; total: number; page: number; limit: number }>(
      '/accounting/journal-entries', 
      { params }
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<JournalEntry>(`/accounting/journal-entries/${id}`);
    return response.data;
  },

  create: async (data: CreateJournalEntryDto) => {
    const response = await api.post<JournalEntry>('/accounting/journal-entries', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateJournalEntryDto>) => {
    const response = await api.put<JournalEntry>(`/accounting/journal-entries/${id}`, data);
    return response.data;
  },

  post: async (id: string) => {
    const response = await api.post<JournalEntry>(`/accounting/journal-entries/${id}/post`);
    return response.data;
  },

  reverse: async (id: string, reason: string) => {
    const response = await api.post<JournalEntry>(`/accounting/journal-entries/${id}/reverse`, { reason });
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/accounting/journal-entries/${id}`);
  },
};

// === REPORTS API ===

export const reportsApi = {
  getTrialBalance: async (params: { startDate: string; endDate: string; fiscalYearId?: string }) => {
    const response = await api.get<TrialBalance>('/accounting/reports/trial-balance', { params });
    return response.data;
  },

  getBalanceSheet: async (params: { asOfDate: string; fiscalYearId?: string }) => {
    const response = await api.get<BalanceSheet>('/accounting/reports/balance-sheet', { params });
    return response.data;
  },

  getIncomeStatement: async (params: { startDate: string; endDate: string; fiscalYearId?: string }) => {
    const response = await api.get<IncomeStatement>('/accounting/reports/income-statement', { params });
    return response.data;
  },

  getGeneralLedger: async (params: { 
    accountId: string; 
    startDate: string; 
    endDate: string 
  }) => {
    const response = await api.get<{
      account: Account;
      entries: Array<{
        date: string;
        entryNumber: string;
        description: string;
        debit: number;
        credit: number;
        balance: number;
      }>;
      openingBalance: number;
      closingBalance: number;
    }>('/accounting/reports/general-ledger', { params });
    return response.data;
  },

  getAgingReport: async (params: { asOfDate: string; type: 'receivable' | 'payable' }) => {
    const response = await api.get<{
      partners: Array<{
        partnerId: string;
        partnerName: string;
        current: number;
        days30: number;
        days60: number;
        days90: number;
        over90: number;
        total: number;
      }>;
      totals: {
        current: number;
        days30: number;
        days60: number;
        days90: number;
        over90: number;
        total: number;
      };
    }>('/accounting/reports/aging', { params });
    return response.data;
  },

  exportToPdf: async (reportType: string, params: Record<string, string>) => {
    const response = await api.get(`/accounting/reports/${reportType}/pdf`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportToExcel: async (reportType: string, params: Record<string, string>) => {
    const response = await api.get(`/accounting/reports/${reportType}/excel`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

// === VAT RECORDS API ===

export const vatApi = {
  getAll: async (params?: { 
    recordType?: 'KPO' | 'KPR'; 
    vatPeriod?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<{ data: VATRecord[]; total: number }>('/vat/records', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<VATRecord>(`/vat/records/${id}`);
    return response.data;
  },

  create: async (data: CreateVATRecordDto) => {
    const response = await api.post<VATRecord>('/vat/records', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateVATRecordDto>) => {
    const response = await api.put<VATRecord>(`/vat/records/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/vat/records/${id}`);
  },

  getPPPDVPreview: async (vatPeriod: string) => {
    const response = await api.get<{
      period: string;
      kpoSummary: {
        baseAmount10: number;
        vatAmount10: number;
        baseAmount20: number;
        vatAmount20: number;
        exemptAmount: number;
        totalVat: number;
      };
      kprSummary: {
        baseAmount10: number;
        vatAmount10: number;
        baseAmount20: number;
        vatAmount20: number;
        exemptAmount: number;
        totalVat: number;
      };
      vatDue: number;
    }>(`/vat/pppdv/preview`, { params: { vatPeriod } });
    return response.data;
  },

  generatePPPDV: async (vatPeriod: string) => {
    const response = await api.post<Blob>('/vat/pppdv/generate', { vatPeriod }, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportKPO: async (vatPeriod: string, format: 'pdf' | 'excel' = 'excel') => {
    const response = await api.get(`/vat/kpo/export`, {
      params: { vatPeriod, format },
      responseType: 'blob',
    });
    return response.data;
  },

  exportKPR: async (vatPeriod: string, format: 'pdf' | 'excel' = 'excel') => {
    const response = await api.get(`/vat/kpr/export`, {
      params: { vatPeriod, format },
      responseType: 'blob',
    });
    return response.data;
  },
};

// === CREDIT NOTES API ===

export const creditNotesApi = {
  getAll: async (params?: { 
    status?: string;
    partnerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<{ data: CreditNote[]; total: number }>('/credit-notes', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<CreditNote>(`/credit-notes/${id}`);
    return response.data;
  },

  create: async (data: CreateCreditNoteDto) => {
    const response = await api.post<CreditNote>('/credit-notes', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateCreditNoteDto>) => {
    const response = await api.put<CreditNote>(`/credit-notes/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/credit-notes/${id}`);
  },

  sendToSef: async (id: string) => {
    const response = await api.post<CreditNote>(`/credit-notes/${id}/send-to-sef`);
    return response.data;
  },

  cancel: async (id: string, reason: string) => {
    const response = await api.post<CreditNote>(`/credit-notes/${id}/cancel`, { reason });
    return response.data;
  },

  getPdf: async (id: string) => {
    const response = await api.get(`/credit-notes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getUblXml: async (id: string) => {
    const response = await api.get<string>(`/credit-notes/${id}/ubl`);
    return response.data;
  },
};

// Helper function to download blob as file
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
