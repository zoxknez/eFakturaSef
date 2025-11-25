import { format, parseISO, isValid } from 'date-fns';

/**
 * Format date for display in Serbian locale
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    return 'Nevaljan datum';
  }
  return format(dateObj, 'dd.MM.yyyy');
};

/**
 * Format datetime for display
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    return 'Nevaljan datum';
  }
  return format(dateObj, 'dd.MM.yyyy HH:mm');
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency = 'RSD'): string => {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Validate Serbian PIB (Personal Identification Number)
 */
export const validatePIB = (pib: string): boolean => {
  if (!pib || pib.length !== 9) {
    return false;
  }

  // Check if all characters are digits
  if (!/^\d{9}$/.test(pib)) {
    return false;
  }

  const digits = pib.split('').map(Number);
  let sum = 10;

  for (let i = 0; i < 8; i++) {
    // Safe access since we verified length is 9
    const digit = digits[i] as number;
    sum = (sum + digit) % 10;
    if (sum === 0) sum = 10;
    sum = (sum * 2) % 11;
  }

  const checkDigit = (11 - sum) % 10;
  return checkDigit === digits[8];
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = (prefix = 'INV', sequence: number): string => {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `${prefix}-${year}-${paddedSequence}`;
};

/**
 * Calculate VAT amount
 */
export const calculateVAT = (amount: number, vatRate: number): number => {
  return Math.round((amount * vatRate / 100) * 100) / 100;
};

/**
 * Calculate total with VAT
 */
export const calculateTotalWithVAT = (amount: number, vatAmount: number): number => {
  return Math.round((amount + vatAmount) * 100) / 100;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate UUID v4
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Delay function for retry logic
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Exponential backoff for retry attempts
 */
export const exponentialBackoff = (attempt: number, baseDelay = 1000, maxDelay = 30000): number => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};

/**
 * Check if SEF is in night pause (maintenance window)
 */
export const isSEFNightPause = (): boolean => {
  const now = new Date();
  const hours = now.getHours();
  // Assume night pause from 01:00 to 06:00
  return hours >= 1 && hours < 6;
};

/**
 * Get next SEF available time after night pause
 */
export const getNextSEFAvailableTime = (): Date => {
  const now = new Date();
  const nextAvailable = new Date(now);
  
  if (isSEFNightPause()) {
    nextAvailable.setHours(6, 0, 0, 0);
    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }
  }
  
  return nextAvailable;
};