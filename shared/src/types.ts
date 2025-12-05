import { z } from 'zod';

// SEF Environment Configuration
export enum SEFEnvironment {
  DEMO = 'demo',
  PRODUCTION = 'production'
}

export const SEF_BASE_URLS = {
  [SEFEnvironment.DEMO]: 'https://demoefaktura.mfin.gov.rs',
  [SEFEnvironment.PRODUCTION]: 'https://efaktura.mfin.gov.rs'
} as const;

// User Roles
export enum UserRole {
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  AUDITOR = 'auditor', 
  OPERATOR = 'operator'
}

// Invoice Status (SEF)
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  STORNO = 'STORNO',
  EXPIRED = 'EXPIRED'
}

// Invoice Direction / Type
export enum InvoiceType {
  OUTGOING = 'OUTGOING',
  INCOMING = 'INCOMING'
}

// Partner Types
export enum PartnerType {
  BUYER = 'BUYER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH'
}

// UBL Document Types
export enum UBLDocumentType {
  INVOICE = 'Invoice',
  CREDIT_NOTE = 'CreditNote',
  DEBIT_NOTE = 'DebitNote'
}

// VAT Categories
export enum VATCategory {
  STANDARD = 'S',
  ZERO_RATED = 'Z',
  EXEMPT = 'E',
  REVERSE_CHARGE = 'AE',
  NOT_SUBJECT = 'O'
}

// Company Schema
export const CompanySchema = z.object({
  id: z.string().uuid(),
  pib: z.string().length(9),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default('RS'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bankAccount: z.string().optional(),
  vatNumber: z.string().optional(),
  sefApiKey: z.string().optional(),
  sefEnvironment: z.string().optional(),
  autoStockDeduction: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Partner Schema
export const PartnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  pib: z.string().length(9),
  type: z.nativeEnum(PartnerType),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('RS'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  bankAccount: z.string().optional(),
  vatNumber: z.string().optional(),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Product Schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative(),
  unit: z.string().default('kom'),
  currentStock: z.number().nonnegative().default(0),
  trackStock: z.boolean().default(false),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Invoice Line Item Schema
export const InvoiceLineSchema = z.object({
  id: z.string().uuid(),
  lineNumber: z.number().min(1),
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxRate: z.number().nonnegative(),
  amount: z.number().nonnegative()
});

// Invoice Schema
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  sefId: z.string().optional(), // SEF assigned ID
  invoiceNumber: z.string().min(1),
  issueDate: z.date(),
  dueDate: z.date().optional(),
  status: z.nativeEnum(InvoiceStatus),
  type: z.nativeEnum(InvoiceType),
  
  buyerName: z.string().min(1),
  buyerPIB: z.string().length(9),
  buyerAddress: z.string().optional(),
  buyerCity: z.string().optional(),
  buyerPostalCode: z.string().optional(),
  
  // Amounts
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3).default('RSD'),
  taxAmount: z.number().nonnegative(),
  
  // Line items
  lines: z.array(InvoiceLineSchema),
  
  // UBL XML
  ublXml: z.string().optional(),
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  sentAt: z.date().optional(),
  
  // Notes
  note: z.string().optional()
});

// API Response Schemas
export const SEFResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  errors: z.array(z.string()).optional()
});

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Calculation Status
export enum CalculationStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED'
}

// Calculation Type
export enum CalculationType {
  WHOLESALE = 'WHOLESALE',
  RETAIL = 'RETAIL',
  IMPORT = 'IMPORT'
}

// Calculation Item Schema
export const CalculationItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  purchasePrice: z.number().nonnegative(), // Nabavna cena
  expenseAmount: z.number().nonnegative().default(0), // Zavisni troškovi po jedinici
  costPrice: z.number().nonnegative(), // Cena koštanja (nabavna + troškovi)
  marginPercentage: z.number().default(0), // Marža %
  marginAmount: z.number().default(0), // Marža iznos
  sellingPriceNoVat: z.number().nonnegative(), // Prodajna bez PDV
  taxRate: z.number().nonnegative(), // PDV stopa
  taxAmount: z.number().nonnegative(), // PDV iznos
  sellingPrice: z.number().nonnegative() // Prodajna sa PDV
});

// Calculation Schema
export const CalculationSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  date: z.string().or(z.date()), // Frontend might send string
  type: z.nativeEnum(CalculationType),
  status: z.nativeEnum(CalculationStatus),
  partnerId: z.string().uuid().optional().nullable(),
  incomingInvoiceId: z.string().uuid().optional().nullable(),
  
  // Totals
  totalPurchaseValue: z.number().nonnegative(),
  totalExpenses: z.number().nonnegative(),
  totalCostValue: z.number().nonnegative(),
  totalMargin: z.number().nonnegative(),
  totalTax: z.number().nonnegative(),
  totalSellingValue: z.number().nonnegative(),
  
  items: z.array(CalculationItemSchema),
  
  companyId: z.string().uuid(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Export all types
export type Company = z.infer<typeof CompanySchema>;
export type Partner = z.infer<typeof PartnerSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type SEFResponse = z.infer<typeof SEFResponseSchema>;
export type User = z.infer<typeof UserSchema>;
export type Calculation = z.infer<typeof CalculationSchema>;
export type CalculationItem = z.infer<typeof CalculationItemSchema>;

// Fixed Asset Status
export enum FixedAssetStatus {
  ACTIVE = 'ACTIVE',
  WRITTEN_OFF = 'WRITTEN_OFF',
  SOLD = 'SOLD'
}

// Fixed Asset Schema
export const FixedAssetSchema = z.object({
  id: z.string().uuid(),
  inventoryNumber: z.string().min(1),
  name: z.string().min(1),
  purchaseDate: z.string().or(z.date()),
  purchaseValue: z.number().nonnegative(),
  supplierId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  amortizationRate: z.number().nonnegative(),
  currentValue: z.number().nonnegative(),
  accumulatedAmortization: z.number().nonnegative().default(0),
  status: z.nativeEnum(FixedAssetStatus),
  location: z.string().optional().nullable(),
  employee: z.string().optional().nullable(),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type FixedAsset = z.infer<typeof FixedAssetSchema>;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  
  // Invoices
  INVOICES: '/api/invoices',
  INVOICE_BY_ID: (id: string) => `/api/invoices/${id}`,
  SEND_INVOICE: (id: string) => `/api/invoices/${id}/send`,
  CANCEL_INVOICE: (id: string) => `/api/invoices/${id}/cancel`,
  
  // SEF Integration
  SEF_STATUS: '/api/sef/status',
  SEF_WEBHOOK: '/api/sef/webhook',
  
  // Companies
  COMPANIES: '/api/companies',
  COMPANY_BY_ID: (id: string) => `/api/companies/${id}`,
  
  // Users
  USERS: '/api/users',
  USER_BY_ID: (id: string) => `/api/users/${id}`,

  // Calculations
  CALCULATIONS: '/api/calculations',
  CALCULATION_BY_ID: (id: string) => `/api/calculations/${id}`,

  // Fixed Assets
  FIXED_ASSETS: '/api/fixed-assets',
  FIXED_ASSET_BY_ID: (id: string) => `/api/fixed-assets/${id}`,
  CALCULATE_AMORTIZATION: '/api/fixed-assets/calculate-amortization',

  // Petty Cash
  PETTY_CASH_ACCOUNTS: '/api/petty-cash/accounts',
  PETTY_CASH_ACCOUNT_BY_ID: (id: string) => `/api/petty-cash/accounts/${id}`,
  PETTY_CASH_ENTRIES: '/api/petty-cash/entries',

  // Travel Orders
  TRAVEL_ORDERS: '/api/travel-orders',
  TRAVEL_ORDER_BY_ID: (id: string) => `/api/travel-orders/${id}`,
} as const;

// Petty Cash Types
export enum PettyCashType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL'
}

export const PettyCashAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  currency: z.string().default('RSD'),
  balance: z.number().default(0),
  companyId: z.string().uuid(),
  createdAt: z.date().optional(), // Optional on create
  updatedAt: z.date().optional()
});

export const PettyCashEntrySchema = z.object({
  id: z.string().uuid().optional(),
  accountId: z.string().uuid(),
  entryNumber: z.string().min(1),
  date: z.string().or(z.date()),
  type: z.nativeEnum(PettyCashType),
  amount: z.number().positive(),
  description: z.string().min(1),
  partnerId: z.string().uuid().optional().nullable(),
  partnerName: z.string().optional().nullable(),
  expenseCategory: z.string().optional().nullable(),
  companyId: z.string().uuid().optional(), // Usually inferred from user
  createdBy: z.string().optional(),
  createdAt: z.date().optional(),
  balanceAfter: z.number().optional()
});

export type PettyCashAccount = z.infer<typeof PettyCashAccountSchema>;
export type PettyCashEntry = z.infer<typeof PettyCashEntrySchema>;

// Travel Order Status
export enum TravelOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID'
}

// Travel Order Expense Type
export enum TravelOrderExpenseType {
  DAILY_ALLOWANCE = 'DAILY_ALLOWANCE', // Dnevnica
  TOLL = 'TOLL', // Putarina
  FUEL = 'FUEL', // Gorivo
  ACCOMMODATION = 'ACCOMMODATION', // Smeštaj
  TRANSPORT = 'TRANSPORT', // Prevoz (bus, voz, avion)
  OTHER = 'OTHER'
}

export const TravelOrderExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.nativeEnum(TravelOrderExpenseType),
  date: z.string().or(z.date()),
  amount: z.number().nonnegative(),
  currency: z.string().default('RSD'),
  description: z.string().optional(),
  attachmentUrl: z.string().optional()
});

export const TravelOrderSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  employeeName: z.string().min(1),
  employeeId: z.string().uuid().optional().nullable(), // Link to partner/user if exists
  
  destination: z.string().min(1),
  country: z.string().default('RS'),
  
  departureDate: z.string().or(z.date()),
  returnDate: z.string().or(z.date()),
  
  vehicle: z.string().optional(), // e.g. "BG-123-XX" or "Personal"
  
  advanceAmount: z.number().nonnegative().default(0), // Akontacija
  
  status: z.nativeEnum(TravelOrderStatus),
  
  expenses: z.array(TravelOrderExpenseSchema).default([]),
  
  // Calculated totals
  totalExpenses: z.number().default(0),
  totalPayout: z.number().default(0), // Total - Advance
  
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type TravelOrder = z.infer<typeof TravelOrderSchema>;
export type TravelOrderExpense = z.infer<typeof TravelOrderExpenseSchema>;

// =====================================================
// DASHBOARD TYPES
// =====================================================

// Dashboard Overview Statistics
export interface DashboardOverview {
  totalInvoices: number;
  acceptedInvoices: number;
  pendingInvoices: number;
  rejectedInvoices: number;
  totalRevenue: number;
  acceptanceRate: number;
  trends: {
    invoices: { value: number; positive: boolean };
    revenue: { value: number; positive: boolean };
  };
}

// Dashboard Charts Data
export interface DashboardCharts {
  revenueByMonth: Array<{ month: string; revenue: number }>;
  invoicesByStatus: Array<{ status: string; count: number; color: string }>;
}

// Recent Invoice for Dashboard
export interface DashboardInvoice {
  id: string;
  invoiceNumber: string;
  type: 'OUTGOING' | 'INCOMING';
  hasPartner: boolean;
  partnerName: string;
  partnerPIB: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  issueDate: string;
  status: string;
}

// Dashboard Alerts
export interface DashboardAlerts {
  overdueInvoices: {
    count: number;
    totalAmount: number;
    items: Array<{
      id: string;
      invoiceNumber: string;
      partnerName: string;
      totalAmount: number;
      dueDate: string;
      daysOverdue: number;
    }>;
  };
  lowStockProducts: {
    count: number;
    items: Array<{
      id: string;
      name: string;
      sku: string;
      currentStock: number;
      minStock: number;
      unit: string;
    }>;
  };
  deadlines: {
    critical: number;
    warning: number;
    aging: number;
  };
}

// SEF Health Status
export interface SEFHealthStatus {
  isOnline: boolean;
  lastPingAt: string | null;
  lastPingLatencyMs: number | null;
  queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  errors24h: number;
  successRate24h: number;
  retryTrend: {
    value: number;
    positive: boolean;
  };
  environment: 'demo' | 'production';
  lastSuccessfulSync: string | null;
}

// Saved Search
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  createdAt: string;
  usageCount: number;
}

// Dashboard Settings
export interface DashboardSettings {
  autoRefreshInterval: number; // seconds, 0 = disabled
  showSEFHealth: boolean;
  showAlerts: boolean;
  showRecentInvoices: boolean;
  showCharts: boolean;
  defaultDateRange: 'week' | 'month' | 'quarter' | 'year';
}

// ================== INVOICE LIST TYPES ==================

// Invoice List Item (for table display)
export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  type: InvoiceType;
  buyerName: string;
  buyerPIB: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  sefId: string | null;
  sefStatus: string | null;
  createdAt: string;
  updatedAt: string;
  partner: {
    id: string;
    name: string;
    pib: string;
    type: 'SUPPLIER' | 'CUSTOMER' | 'BOTH';
  } | null;
  company: {
    id: string;
    name: string;
    pib: string;
  } | null;
  lines: {
    id: string;
    lineNumber: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }[];
}

// Invoice Status Counts (for tabs/filters)
export interface InvoiceStatusCounts {
  all: number;
  draft: number;
  sent: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

// Invoice List Response (paginated)
export interface InvoiceListResponse {
  data: InvoiceListItem[];
  pagination: {
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
    total?: number;
  };
  counts: InvoiceStatusCounts;
}

// Invoice Filter Params
export interface InvoiceFilterParams {
  status?: string;
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'issueDate' | 'dueDate' | 'totalAmount' | 'invoiceNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
  direction?: 'next' | 'prev';
}

// Bulk Operation Result
export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
  jobIds?: string[];
}

// Invoice Saved View
export interface InvoiceSavedView {
  id: string;
  name: string;
  icon: string;
  filters: Partial<InvoiceFilterParams>;
  isDefault?: boolean;
  createdAt: string;
}

// ================== INCOMING INVOICE TYPES ==================

// Incoming Invoice Status (matches Prisma enum)
export enum IncomingInvoiceStatus {
  RECEIVED = 'RECEIVED',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Payment Status (matches Prisma enum)
export enum InvoicePaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

// Incoming Invoice Line Item
export interface IncomingInvoiceLineItem {
  id: string;
  lineNumber: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
  productId: string | null;
  product: {
    id: string;
    name: string;
    code: string;
    unit: string;
  } | null;
}

// Incoming Invoice List Item (for table display)
export interface IncomingInvoiceListItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  receivedDate: string;
  status: IncomingInvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  supplierName: string;
  supplierPIB: string;
  supplierAddress: string | null;
  totalAmount: number;
  taxAmount: number;
  paidAmount: number;
  currency: string;
  sefId: string | null;
  sefStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

// Incoming Invoice Detail (full data)
export interface IncomingInvoiceDetail extends IncomingInvoiceListItem {
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  partnerId: string | null;
  lines: IncomingInvoiceLineItem[];
}

// Incoming Invoice Status Counts
export interface IncomingInvoiceStatusCounts {
  all: number;
  received: number;
  pending: number;
  accepted: number;
  rejected: number;
  cancelled: number;
}

// Incoming Invoice Payment Status Counts
export interface IncomingInvoicePaymentCounts {
  all: number;
  unpaid: number;
  partiallyPaid: number;
  paid: number;
  overdue: number;
}

// Incoming Invoice List Response
export interface IncomingInvoiceListResponse {
  data: IncomingInvoiceListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  statusCounts?: IncomingInvoiceStatusCounts;
  paymentCounts?: IncomingInvoicePaymentCounts;
}

// Incoming Invoice Filter Params
export interface IncomingInvoiceFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: IncomingInvoiceStatus | string;
  paymentStatus?: InvoicePaymentStatus | string;
  dateFrom?: string;
  dateTo?: string;
  supplierPIB?: string;
  sortBy?: 'issueDate' | 'receivedDate' | 'totalAmount' | 'invoiceNumber' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
}

// Create Incoming Invoice DTO
export interface CreateIncomingInvoiceDTO {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  supplierName: string;
  supplierPIB: string;
  supplierAddress?: string;
  totalAmount: number;
  taxAmount: number;
  currency?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  paymentStatus?: InvoicePaymentStatus;
}

// Sync Result
export interface IncomingInvoiceSyncResult {
  synced: number;
  errors: number;
  details?: Array<{
    sefId: string;
    status: 'created' | 'updated' | 'error';
    error?: string;
  }>;
}

// =====================================================
// PARTNER & PRODUCT AUTOCOMPLETE TYPES
// =====================================================

// Partner autocomplete result
export interface PartnerAutocompleteItem {
  id: string;
  name: string;
  pib: string;
  type?: PartnerType;
  city?: string;
  address?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  defaultPaymentTerms?: number;
  vatPayer?: boolean;
}

// Partner list item (full details for list view)
export interface PartnerListItem {
  id: string;
  companyId: string;
  type: PartnerType | 'BUYER' | 'SUPPLIER' | 'BOTH';
  pib: string;
  name: string;
  shortName?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  fax?: string;
  website?: string;
  contactPerson?: string;
  vatPayer: boolean;
  vatNumber?: string;
  defaultPaymentTerms: number;
  creditLimit?: number;
  discount?: number;
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoices: number;
    incomingInvoices?: number;
  };
}

// Create/Update Partner DTO
export interface CreatePartnerDTO {
  type: PartnerType | 'BUYER' | 'SUPPLIER' | 'BOTH';
  pib: string;
  name: string;
  shortName?: string;
  address: string;
  city: string;
  postalCode: string;
  country?: string;
  email?: string;
  phone?: string;
  fax?: string;
  website?: string;
  contactPerson?: string;
  vatPayer?: boolean;
  vatNumber?: string;
  defaultPaymentTerms?: number;
  creditLimit?: number;
  discount?: number;
  note?: string;
}

export type UpdatePartnerDTO = Partial<CreatePartnerDTO>;

// Partner Summary (for stats)
export interface PartnerSummary {
  total: number;
  buyers: number;
  suppliers: number;
  both: number;
  active: number;
  inactive: number;
}

// Product autocomplete result
export interface ProductAutocompleteItem {
  id: string;
  name: string;
  sku?: string;
  unitPrice: number;
  taxRate: number;
  unit: string;
  currentStock?: number;
  trackInventory?: boolean;
}

// =====================================================
// CREATE INVOICE TYPES
// =====================================================

// Unit of measure options
export type UnitOfMeasure = 'kom' | 'kg' | 'l' | 'm' | 'm2' | 'm3' | 'h' | 'dan' | 'mes' | 'god' | 'pkt' | 'set';

// Invoice payment method
export type PaymentMethod = 'TRANSFER' | 'CASH' | 'CARD' | 'COMPENSATION';

// Create invoice line item
export interface CreateInvoiceLineDTO {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount?: number;
  unit?: UnitOfMeasure | string;
  productId?: string;
}

// Create invoice DTO (outgoing)
export interface CreateInvoiceDTO {
  companyId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  paymentMethod?: PaymentMethod;
  note?: string;
  status?: InvoiceStatus;
  
  // Partner (if from database)
  partnerId?: string;
  
  // Or manual buyer info
  buyerName?: string;
  buyerPIB?: string;
  buyerAddress?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  
  // Invoice lines
  lines: CreateInvoiceLineDTO[];
}

// Invoice totals calculation
export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  tax: number;
  total: number;
}

// =====================================================
// ADVANCE INVOICE TYPES
// =====================================================

// Advance Invoice Status (matches Prisma enum)
export enum AdvanceInvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ISSUED = 'ISSUED',      // Alias for compatibility
  PAID = 'PAID',          // After payment received
  PARTIALLY_USED = 'PARTIALLY_USED',
  FULLY_USED = 'FULLY_USED',
  CANCELLED = 'CANCELLED'
}

// Advance Invoice List Item
export interface AdvanceInvoiceListItem {
  id: string;
  companyId: string;
  invoiceNumber: string;
  
  // Partner
  partnerId: string;
  partner?: {
    id: string;
    name: string;
    pib: string;
  };
  
  // Dates
  issueDate: string;
  sentAt?: string;
  
  // Amounts (advanceAmount = netAmount = base before VAT)
  advanceAmount: number;  // Backend field name
  netAmount?: number;     // Alias for advanceAmount (compatibility)
  taxAmount: number;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  
  currency: string;
  
  // Status
  status: AdvanceInvoiceStatus | string;
  
  // SEF
  sefId?: string;
  sefStatus?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Advance Invoice Detail
export interface AdvanceInvoiceDetail extends AdvanceInvoiceListItem {
  // Additional relations
  company?: {
    id: string;
    name: string;
    pib: string;
  };
  closedByInvoices?: string[];
  linkedInvoices?: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
  }>;
}

// Create Advance Invoice DTO
export interface CreateAdvanceInvoiceDTO {
  partnerId: string;
  issueDate: string;
  advanceAmount: number;  // Base amount before VAT
  taxRate: number;        // VAT rate (20, 10, 0)
  currency?: string;
  note?: string;
}

// Use Advance DTO (for linking to final invoice)
export interface UseAdvanceDTO {
  amount: number;
  finalInvoiceId: string;
  notes?: string;
}

// Advance Invoice Summary (for dashboard/reports)
export interface AdvanceInvoiceSummary {
  totalCount: number;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
}

// Advance Invoice List Response
export interface AdvanceInvoiceListResponse {
  data: AdvanceInvoiceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: AdvanceInvoiceSummary;
}

// Advance Invoice Filter Params
export interface AdvanceInvoiceFilterParams {
  status?: AdvanceInvoiceStatus | string;
  partnerId?: string;
  fromDate?: string;
  toDate?: string;
  hasRemaining?: boolean;
  page?: number;
  limit?: number;
}

// =====================
// RECURRING INVOICE TYPES
// =====================

export enum RecurringFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export enum RecurringInvoiceStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Recurring Invoice Item (template)
export interface RecurringInvoiceItem {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  price?: number; // Alias for unitPrice
  vatRate?: number;
  taxRate?: number; // Alias for vatRate (either vatRate or taxRate should be set)
  totalAmount?: number;
}

// Recurring Invoice List Item
export interface RecurringInvoiceListItem {
  id: string;
  companyId: string;
  
  // Schedule
  frequency: RecurringFrequency | string;
  startDate: string;
  endDate?: string;
  nextRunAt: string;
  lastRunAt?: string;
  
  // Status
  status: RecurringInvoiceStatus | string;
  
  // Partner
  partnerId: string;
  partner?: {
    id: string;
    name: string;
    pib: string;
    email?: string;
  };
  
  // Template data
  currency: string;
  items: RecurringInvoiceItem[];
  note?: string;
  
  // Stats (from backend aggregation)
  generatedCount?: number;
  
  // Audit
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Create Recurring Invoice DTO
export interface CreateRecurringInvoiceDTO {
  partnerId: string;
  frequency: RecurringFrequency | string;
  startDate: string;
  endDate?: string;
  currency?: string;
  items: RecurringInvoiceItem[];
  note?: string;
}

// Update Recurring Invoice DTO
export interface UpdateRecurringInvoiceDTO {
  frequency?: RecurringFrequency | string;
  endDate?: string | null;
  status?: RecurringInvoiceStatus | string;
  items?: RecurringInvoiceItem[];
  note?: string;
}

// Recurring Invoice Summary
export interface RecurringInvoiceSummary {
  total: number;
  active: number;
  paused: number;
  completed: number;
  cancelled: number;
}

// =====================
// PRODUCT PAGE TYPES
// =====================

// Product list item (matching backend response)
export interface ProductListItem {
  id: string;
  code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  unitPrice: number;
  costPrice?: number | null;
  vatRate: number;
  unit: string;
  trackInventory: boolean;
  currentStock: number;
  minStock?: number | null;
  maxStock?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoiceLines: number;
  };
}

// Create Product DTO
export interface CreateProductDTO {
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  unitPrice: number;
  costPrice?: number;
  vatRate?: number;
  unit?: string;
  trackInventory?: boolean;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  manufacturer?: string;
  isActive?: boolean;
  note?: string;
}

// Update Product DTO (all optional)
export type UpdateProductDTO = Partial<CreateProductDTO>;

// Product Summary (for stats cards)
export interface ProductSummary {
  total: number;
  withInventory: number;
  lowStock: number;
  active: number;
}

// Product paginated response
export interface ProductPaginatedResponse {
  success: boolean;
  data: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: ProductSummary;
}

// Stock adjustment request
export interface StockAdjustmentRequest {
  adjustment: number;
  note?: string;
}

// Inventory transaction (for history)
export interface InventoryTransaction {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'INITIAL' | 'SALE' | 'PURCHASE' | 'RETURN';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdBy?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}