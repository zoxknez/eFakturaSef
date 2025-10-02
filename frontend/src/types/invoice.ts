// API types for invoices
export interface InvoiceLine {
  id?: string;
  lineNumber: number;
  itemName: string;
  itemDescription?: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  vatRate: number;
  vatCategory: string;
  lineTotal: number;
  vatAmount: number;
  lineTotalWithVat: number;
}

export interface Company {
  id: string;
  name: string;
  pib: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
}

export interface Invoice {
  id: string;
  sefId?: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  direction: 'OUTGOING' | 'INCOMING';
  status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'STORNO' | 'EXPIRED';
  documentType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  supplierId: string;
  buyerId: string;
  subtotal: number;
  totalVat: number;
  totalAmount: number;
  currency: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  supplier: Company;
  buyer: Company;
  lines: InvoiceLine[];
}

export interface CreateInvoiceRequest {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  buyerPib: string;
  buyerName: string;
  buyerAddress: string;
  buyerCity: string;
  buyerPostalCode: string;
  lines: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}