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