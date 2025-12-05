/**
 * Validation utilities for common data types
 */

/**
 * Validate Serbian PIB (Poreski Identifikacioni Broj)
 * PIB must be exactly 9 digits
 */
export function validatePIB(pib: string): boolean {
  if (!pib || typeof pib !== 'string') return false;
  const cleaned = pib.trim().replace(/\s+/g, '');
  
  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(cleaned)) return false;
  
  // Additional checksum validation (simplified)
  // Real PIB validation would check the checksum digit
  return true;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize search query to prevent injection
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  
  // Remove potentially dangerous characters but keep basic search chars
  return query
    .trim()
    .replace(/[<>{}[\]\\]/g, '') // Remove dangerous chars
    .slice(0, 100); // Limit length
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  if (!startDate || !endDate) return false;
  return startDate <= endDate;
}

/**
 * Validate that date is not in the future (for invoices)
 */
export function validateDateNotFuture(date: Date, allowToday = true): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  if (allowToday) {
    return date <= today;
  }
  
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Validate invoice number format
 */
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') return false;
  const cleaned = invoiceNumber.trim();
  
  // Allow alphanumeric, dashes, slashes, dots
  // Length between 1 and 50 characters
  return /^[A-Za-z0-9\-/.\s]{1,50}$/.test(cleaned);
}

/**
 * Validate phone number (basic validation)
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');
  
  // Allow digits, +, and spaces/dashes/parentheses
  // Length between 6 and 20 characters
  return /^[\d+\s\-()]{6,20}$/.test(phone.trim());
}

/**
 * Validate postal code (basic validation)
 */
export function validatePostalCode(postalCode: string): boolean {
  if (!postalCode || typeof postalCode !== 'string') return false;
  const cleaned = postalCode.trim();
  
  // Allow digits and dashes, length 4-10
  return /^[\d\-]{4,10}$/.test(cleaned);
}

/**
 * Validate currency code (ISO 4217)
 */
export function validateCurrencyCode(currency: string): boolean {
  if (!currency || typeof currency !== 'string') return false;
  return /^[A-Z]{3}$/.test(currency.trim().toUpperCase());
}

/**
 * Validate percentage value (0-100)
 */
export function validatePercentage(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0 && isFinite(value);
}

/**
 * Validate non-negative number
 */
export function validateNonNegativeNumber(value: number): boolean {
  return typeof value === 'number' && value >= 0 && isFinite(value);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid.trim());
}

/**
 * Validate and normalize PIB
 */
export function normalizePIB(pib: string): string | null {
  if (!validatePIB(pib)) return null;
  return pib.trim().replace(/\s+/g, '');
}

/**
 * Validate and normalize email
 */
export function normalizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return validateEmail(trimmed) ? trimmed : null;
}

