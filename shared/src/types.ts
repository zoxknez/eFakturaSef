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

// Export all types
export type Company = z.infer<typeof CompanySchema>;
export type Partner = z.infer<typeof PartnerSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type SEFResponse = z.infer<typeof SEFResponseSchema>;
export type User = z.infer<typeof UserSchema>;

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
  USER_BY_ID: (id: string) => `/api/users/${id}`
} as const;