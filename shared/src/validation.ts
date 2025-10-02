import { z } from 'zod';

/**
 * UBL XML validation utilities
 */

// Serbian VAT rates
export const SERBIAN_VAT_RATES = [0, 10, 20] as const;

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