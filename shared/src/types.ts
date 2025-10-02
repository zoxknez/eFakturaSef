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
  DRAFT = 'draft',
  SENT = 'sent',
  DELIVERED = 'delivered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  STORNO = 'storno',
  EXPIRED = 'expired'
}

// Invoice Direction
export enum InvoiceDirection {
  OUTGOING = 'outgoing', // Izlazne
  INCOMING = 'incoming'  // Ulazne
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
  createdAt: z.date(),
  updatedAt: z.date()
});

// Invoice Line Item Schema
export const InvoiceLineSchema = z.object({
  id: z.string().uuid(),
  lineNumber: z.number().min(1),
  itemName: z.string().min(1),
  itemDescription: z.string().optional(),
  quantity: z.number().positive(),
  unitOfMeasure: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().nonnegative(),
  vatCategory: z.nativeEnum(VATCategory),
  lineTotal: z.number().nonnegative(),
  vatAmount: z.number().nonnegative(),
  lineTotalWithVat: z.number().nonnegative()
});

// Invoice Schema
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  sefId: z.string().optional(), // SEF assigned ID
  invoiceNumber: z.string().min(1),
  issueDate: z.date(),
  dueDate: z.date().optional(),
  direction: z.nativeEnum(InvoiceDirection),
  status: z.nativeEnum(InvoiceStatus),
  documentType: z.nativeEnum(UBLDocumentType),
  
  // Supplier/Buyer
  supplierId: z.string().uuid(),
  buyerId: z.string().uuid(),
  
  // Amounts
  subtotal: z.number().nonnegative(),
  totalVat: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3).default('RSD'),
  
  // Line items
  lines: z.array(InvoiceLineSchema),
  
  // UBL XML
  ublXml: z.string().optional(),
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  sentAt: z.date().optional(),
  
  // Notes
  note: z.string().optional(),
  
  // Reference documents
  referenceInvoiceId: z.string().uuid().optional()
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