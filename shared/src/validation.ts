import { z } from 'zod';

/**
 * UBL XML validation utilities and Zod schemas for SEF
 */

// Serbian VAT rates
export const SERBIAN_VAT_RATES = [0, 10, 20] as const;

/**
 * PIB (Poreski Identifikacioni Broj) validation
 * Must be exactly 9 digits
 */
export const PIBSchema = z.string()
  .regex(/^\d{9}$/, 'PIB must be exactly 9 digits')
  .refine((pib) => {
    // Additional checksum validation if needed
    return pib.length === 9;
  }, 'Invalid PIB format');

/**
 * Currency code validation (ISO 4217)
 */
export const CurrencyCodeSchema = z.string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Currency code must be 3 uppercase letters (ISO 4217)')
  .default('RSD');

/**
 * Date validation - must not be in the future
 */
export const PastOrPresentDateSchema = z.coerce.date()
  .refine((date) => date <= new Date(), {
    message: 'Date cannot be in the future',
  });

/**
 * Future date validation
 */
export const FutureDateSchema = z.coerce.date()
  .refine((date) => date >= new Date(), {
    message: 'Date must be in the future',
  });

/**
 * Positive amount validation
 */
export const PositiveAmountSchema = z.number()
  .nonnegative('Amount cannot be negative')
  .finite('Amount must be a finite number');

/**
 * Quantity validation
 */
export const QuantitySchema = z.number()
  .positive('Quantity must be greater than zero')
  .finite('Quantity must be a finite number');

/**
 * Tax rate validation (0-100%)
 */
export const TaxRateSchema = z.number()
  .min(0, 'Tax rate cannot be negative')
  .max(100, 'Tax rate cannot exceed 100%')
  .refine((rate) => SERBIAN_VAT_RATES.includes(rate as any), {
    message: `Tax rate must be one of: ${SERBIAN_VAT_RATES.join(', ')}%`,
  });

/**
 * Invoice number validation
 */
export const InvoiceNumberSchema = z.string()
  .min(1, 'Invoice number is required')
  .max(50, 'Invoice number too long')
  .regex(/^[A-Za-z0-9\-\/]+$/, 'Invoice number can only contain letters, numbers, hyphens and slashes');

/**
 * Company/Party schema
 */
export const PartySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  pib: PIBSchema,
  address: z.string().min(1, 'Address is required').max(200, 'Address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City too long'),
  postalCode: z.string().min(1, 'Postal code is required').max(20, 'Postal code too long'),
  country: z.string().length(2, 'Country code must be 2 letters (ISO 3166-1)').default('RS'),
});

/**
 * Invoice line item schema
 */
export const InvoiceLineItemSchema = z.object({
  id: z.number().int().positive('Line ID must be a positive integer'),
  name: z.string().min(1, 'Item name is required').max(200, 'Item name too long'),
  quantity: QuantitySchema,
  unitCode: z.string().default('C62'), // C62 = piece (UNE/CEFACT)
  unitPrice: PositiveAmountSchema,
  taxRate: TaxRateSchema,
  taxAmount: PositiveAmountSchema,
  lineAmount: PositiveAmountSchema,
});

/**
 * Invoice totals schema
 */
export const InvoiceTotalsSchema = z.object({
  taxExclusiveAmount: PositiveAmountSchema,
  taxInclusiveAmount: PositiveAmountSchema,
  taxAmount: PositiveAmountSchema,
  payableAmount: PositiveAmountSchema,
}).refine((totals) => {
  // Validate that taxInclusive = taxExclusive + tax (with small tolerance)
  const calculated = totals.taxExclusiveAmount + totals.taxAmount;
  const diff = Math.abs(totals.taxInclusiveAmount - calculated);
  return diff <= 0.01;
}, {
  message: 'Tax inclusive amount must equal tax exclusive + tax amount',
});

/**
 * Complete UBL Invoice schema
 */
export const UBLInvoiceSchema = z.object({
  invoiceNumber: InvoiceNumberSchema,
  issueDate: PastOrPresentDateSchema,
  dueDate: z.coerce.date().optional(),
  currency: CurrencyCodeSchema,
  supplier: PartySchema,
  buyer: PartySchema,
  lines: z.array(InvoiceLineItemSchema).min(1, 'At least one line item is required'),
  totals: InvoiceTotalsSchema,
}).refine((invoice) => {
  // Validate due date is after issue date
  if (invoice.dueDate && invoice.dueDate <= invoice.issueDate) {
    return false;
  }
  return true;
}, {
  message: 'Due date must be after issue date',
  path: ['dueDate'],
});

export type UBLInvoice = z.infer<typeof UBLInvoiceSchema>;

// UBL 2.1 namespace
export const UBL_NAMESPACES = {
  CAC: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  CBC: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  INVOICE: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'
} as const;

/**
 * Validate UBL XML structure
 */
export const validateUBLStructure = (xml: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic XML structure validation
  if (!xml.trim()) {
    errors.push('XML content is empty');
    return { isValid: false, errors };
  }
  
  // Check for required namespaces
  Object.entries(UBL_NAMESPACES).forEach(([prefix, namespace]) => {
    if (!xml.includes(namespace)) {
      errors.push(`Missing required namespace: ${prefix} (${namespace})`);
    }
  });
  
  // Check for required elements
  const requiredElements = [
    'cbc:ID',
    'cbc:IssueDate',
    'cac:AccountingSupplierParty',
    'cac:AccountingCustomerParty',
    'cac:LegalMonetaryTotal'
  ];
  
  requiredElements.forEach(element => {
    if (!xml.includes(element)) {
      errors.push(`Missing required element: ${element}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate invoice totals
 */
export const validateInvoiceTotals = (
  lines: Array<{ quantity: number; unitPrice: number; vatRate: number }>,
  declaredSubtotal: number,
  declaredVatTotal: number,
  declaredTotal: number
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Calculate expected totals
  let calculatedSubtotal = 0;
  let calculatedVatTotal = 0;
  
  lines.forEach(line => {
    const lineTotal = line.quantity * line.unitPrice;
    const vatAmount = lineTotal * line.vatRate / 100;
    
    calculatedSubtotal += lineTotal;
    calculatedVatTotal += vatAmount;
  });
  
  const calculatedTotal = calculatedSubtotal + calculatedVatTotal;
  
  // Round to 2 decimal places for comparison
  calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
  calculatedVatTotal = Math.round(calculatedVatTotal * 100) / 100;
  const calculatedTotalRounded = Math.round(calculatedTotal * 100) / 100;
  
  // Validate totals with small tolerance for rounding
  const tolerance = 0.01;
  
  if (Math.abs(declaredSubtotal - calculatedSubtotal) > tolerance) {
    errors.push(`Subtotal mismatch: declared ${declaredSubtotal}, calculated ${calculatedSubtotal}`);
  }
  
  if (Math.abs(declaredVatTotal - calculatedVatTotal) > tolerance) {
    errors.push(`VAT total mismatch: declared ${declaredVatTotal}, calculated ${calculatedVatTotal}`);
  }
  
  if (Math.abs(declaredTotal - calculatedTotalRounded) > tolerance) {
    errors.push(`Total mismatch: declared ${declaredTotal}, calculated ${calculatedTotalRounded}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate Serbian business rules
 */
export const validateSerbianBusinessRules = (invoice: {
  issueDate: Date;
  dueDate?: Date;
  supplierPIB: string;
  buyerPIB?: string;
  currency: string;
  lines: Array<{ vatRate: number }>;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Currency must be RSD for domestic invoices
  if (invoice.currency !== 'RSD') {
    errors.push('Currency must be RSD for domestic invoices');
  }
  
  // Issue date cannot be in the future
  if (invoice.issueDate > new Date()) {
    errors.push('Issue date cannot be in the future');
  }
  
  // Due date must be after issue date
  if (invoice.dueDate && invoice.dueDate <= invoice.issueDate) {
    errors.push('Due date must be after issue date');
  }
  
  // Validate VAT rates
  invoice.lines.forEach((line, index) => {
    if (!SERBIAN_VAT_RATES.includes(line.vatRate as any)) {
      errors.push(`Invalid VAT rate ${line.vatRate}% on line ${index + 1}. Valid rates: ${SERBIAN_VAT_RATES.join(', ')}%`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * SEF API response validation schema
 */
export const SEFErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.string()).optional()
  })
});

export const SEFSuccessResponseSchema = z.object({
  data: z.any(),
  status: z.string(),
  message: z.string().optional()
});

/**
 * Webhook payload validation
 */
export const WebhookPayloadSchema = z.object({
  eventType: z.enum(['invoice.sent', 'invoice.delivered', 'invoice.accepted', 'invoice.rejected', 'invoice.cancelled']),
  invoiceId: z.string(),
  sefId: z.string(),
  timestamp: z.string().datetime(),
  data: z.any().optional(),
  signature: z.string()
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;