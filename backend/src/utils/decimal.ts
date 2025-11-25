import Decimal from 'decimal.js';

/**
 * Decimal utility functions for precise financial calculations
 * 
 * Uses decimal.js to avoid floating point arithmetic errors
 * All financial amounts should use these functions
 */

// Configure Decimal globally for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 9,
  minE: -9,
  maxE: 9,
});

/**
 * Convert any value to Decimal (safe parsing)
 */
export function toDecimal(value: unknown, fallback: number = 0): Decimal {
  if (value === null || value === undefined) {
    return new Decimal(fallback);
  }
  
  if (value instanceof Decimal) {
    return value;
  }
  
  try {
    // Handle string with comma as decimal separator
    const normalized = typeof value === 'string' 
      ? value.trim().replace(/\s+/g, '').replace(',', '.') 
      : String(value);
    
    const decimal = new Decimal(normalized);
    
    // Validate result
    if (!decimal.isFinite()) {
      return new Decimal(fallback);
    }
    
    return decimal;
  } catch {
    return new Decimal(fallback);
  }
}

/**
 * Round to 2 decimal places (standard for currency)
 */
export function toTwo(value: Decimal | number | string): Decimal {
  return toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Calculate line total without tax
 */
export function calculateLineBase(quantity: Decimal | number, unitPrice: Decimal | number): Decimal {
  return toTwo(toDecimal(quantity).times(toDecimal(unitPrice)));
}

/**
 * Calculate tax amount
 */
export function calculateTaxAmount(baseAmount: Decimal | number, taxRate: Decimal | number): Decimal {
  return toTwo(toDecimal(baseAmount).times(toDecimal(taxRate)).dividedBy(100));
}

/**
 * Calculate line total with tax
 */
export function calculateLineTotal(
  quantity: Decimal | number, 
  unitPrice: Decimal | number, 
  taxRate: Decimal | number
): {
  baseAmount: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
} {
  const baseAmount = calculateLineBase(quantity, unitPrice);
  const taxAmount = calculateTaxAmount(baseAmount, taxRate);
  const totalAmount = toTwo(baseAmount.plus(taxAmount));
  
  return { baseAmount, taxAmount, totalAmount };
}

/**
 * Sum multiple Decimal values
 */
export function sumDecimals(...values: (Decimal | number | string)[]): Decimal {
  return values.reduce<Decimal>((sum, val) => sum.plus(toDecimal(val)), new Decimal(0));
}

/**
 * Calculate invoice totals from lines
 */
export function calculateInvoiceTotals(
  lines: Array<{ quantity: Decimal | number; unitPrice: Decimal | number; taxRate: Decimal | number }>
): {
  taxExclusiveAmount: Decimal;
  taxAmount: Decimal;
  taxInclusiveAmount: Decimal;
} {
  let taxExclusiveAmount = new Decimal(0);
  let taxAmount = new Decimal(0);
  
  for (const line of lines) {
    const lineTotals = calculateLineTotal(line.quantity, line.unitPrice, line.taxRate);
    taxExclusiveAmount = taxExclusiveAmount.plus(lineTotals.baseAmount);
    taxAmount = taxAmount.plus(lineTotals.taxAmount);
  }
  
  return {
    taxExclusiveAmount: toTwo(taxExclusiveAmount),
    taxAmount: toTwo(taxAmount),
    taxInclusiveAmount: toTwo(taxExclusiveAmount.plus(taxAmount)),
  };
}

/**
 * Validate amount is positive
 */
export function isPositive(value: Decimal | number | string): boolean {
  return toDecimal(value).greaterThan(0);
}

/**
 * Validate amount is non-negative
 */
export function isNonNegative(value: Decimal | number | string): boolean {
  return toDecimal(value).greaterThanOrEqualTo(0);
}

/**
 * Compare two decimal values with tolerance
 */
export function isEqual(
  a: Decimal | number | string, 
  b: Decimal | number | string, 
  tolerance: number = 0.01
): boolean {
  const diff = toDecimal(a).minus(toDecimal(b)).abs();
  return diff.lessThanOrEqualTo(tolerance);
}

/**
 * Format decimal as currency string (Serbian format)
 */
export function formatCurrency(
  value: Decimal | number | string, 
  currency: string = 'RSD'
): string {
  const decimal = toDecimal(value);
  const formatted = decimal.toFixed(2);
  
  // Serbian format: 1.234,56
  const parts = formatted.split('.');
  if (parts[0]) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const serbianFormat = parts.join(',');
  
  return `${serbianFormat} ${currency}`;
}

/**
 * Convert Decimal to number (use only for database storage)
 */
export function toNumber(value: Decimal | number | string): number {
  return toDecimal(value).toNumber();
}

/**
 * Convert Decimal to string (for API responses)
 */
export function toString(value: Decimal | number | string, decimalPlaces: number = 2): string {
  return toDecimal(value).toFixed(decimalPlaces);
}

/**
 * Validate tax rate is within acceptable range (0-100%)
 */
export function isValidTaxRate(rate: Decimal | number | string): boolean {
  const decimal = toDecimal(rate);
  return decimal.greaterThanOrEqualTo(0) && decimal.lessThanOrEqualTo(100);
}

/**
 * Validate totals match with tolerance
 */
export function validateTotals(
  calculated: { taxExclusive: Decimal; tax: Decimal; taxInclusive: Decimal },
  declared: { taxExclusive: number; tax: number; taxInclusive: number },
  tolerance: number = 0.01
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isEqual(calculated.taxExclusive, declared.taxExclusive, tolerance)) {
    errors.push(
      `Tax exclusive amount mismatch: calculated ${toString(calculated.taxExclusive)}, ` +
      `declared ${declared.taxExclusive.toFixed(2)}`
    );
  }
  
  if (!isEqual(calculated.tax, declared.tax, tolerance)) {
    errors.push(
      `Tax amount mismatch: calculated ${toString(calculated.tax)}, ` +
      `declared ${declared.tax.toFixed(2)}`
    );
  }
  
  if (!isEqual(calculated.taxInclusive, declared.taxInclusive, tolerance)) {
    errors.push(
      `Tax inclusive amount mismatch: calculated ${toString(calculated.taxInclusive)}, ` +
      `declared ${declared.taxInclusive.toFixed(2)}`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  toDecimal,
  toTwo,
  calculateLineBase,
  calculateTaxAmount,
  calculateLineTotal,
  calculateInvoiceTotals,
  sumDecimals,
  isPositive,
  isNonNegative,
  isEqual,
  isValidTaxRate,
  validateTotals,
  formatCurrency,
  toNumber,
  toString,
};
