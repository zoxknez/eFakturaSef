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
  .regex(/^\d{9}$/, 'PIB mora imati tačno 9 cifara')
  .refine((pib) => {
    // Additional checksum validation if needed
    return pib.length === 9;
  }, 'Neispravan format PIB-a');

/**
 * Currency code validation (ISO 4217)
 */
export const CurrencyCodeSchema = z.string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Šifra valute mora imati 3 velika slova (ISO 4217)')
  .default('RSD');

/**
 * Date validation - must not be in the future
 */
export const PastOrPresentDateSchema = z.coerce.date()
  .refine((date) => date <= new Date(), {
    message: 'Datum ne može biti u budućnosti',
  });

/**
 * Future date validation
 */
export const FutureDateSchema = z.coerce.date()
  .refine((date) => date >= new Date(), {
    message: 'Datum mora biti u budućnosti',
  });

/**
 * Positive amount validation
 */
export const PositiveAmountSchema = z.number()
  .nonnegative('Iznos ne može biti negativan')
  .finite('Iznos mora biti konačan broj');

/**
 * Quantity validation
 */
export const QuantitySchema = z.number()
  .positive('Količina mora biti veća od nule')
  .finite('Količina mora biti konačan broj');

/**
 * Tax rate validation (0-100%)
 */
export const TaxRateSchema = z.number()
  .min(0, 'Poreska stopa ne može biti negativna')
  .max(100, 'Poreska stopa ne može biti veća od 100%')
  .refine((rate) => SERBIAN_VAT_RATES.includes(rate as any), {
    message: `Poreska stopa mora biti jedna od: ${SERBIAN_VAT_RATES.join(', ')}%`,
  });

/**
 * Invoice number validation
 */
export const InvoiceNumberSchema = z.string()
  .min(1, 'Broj fakture je obavezan')
  .max(50, 'Broj fakture je predugačak')
  .regex(/^[A-Za-z0-9\-\/]+$/, 'Broj fakture može sadržati samo slova, brojeve, crtice i kose crte');

/**
 * Company/Party schema
 */
export const PartySchema = z.object({
  name: z.string().min(1, 'Naziv je obavezan').max(200, 'Naziv je predugačak'),
  pib: PIBSchema,
  address: z.string().min(1, 'Adresa je obavezna').max(200, 'Adresa je predugačka'),
  city: z.string().min(1, 'Grad je obavezan').max(100, 'Grad je predugačak'),
  postalCode: z.string().min(1, 'Poštanski broj je obavezan').max(20, 'Poštanski broj je predugačak'),
  country: z.string().length(2, 'Oznaka države mora imati 2 slova (ISO 3166-1)').default('RS'),
});

/**
 * Invoice line item schema
 */
export const InvoiceLineItemSchema = z.object({
  id: z.number().int().positive('ID stavke mora biti pozitivan ceo broj'),
  name: z.string().min(1, 'Naziv stavke je obavezan').max(200, 'Naziv stavke je predugačak'),
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