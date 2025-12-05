/**
 * Formatters - Centralized formatting utilities for the frontend
 * Re-exports from @sef-app/shared and adds frontend-specific formatters
 */

// Re-export from shared
export { formatDate, formatDateTime, formatCurrency } from '@sef-app/shared';

/**
 * Format number as currency with RSD default
 * Wrapper for consistency across the app
 */
export const formatAmount = (amount: number, currency = 'RSD'): string => {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format number with Serbian locale
 */
export const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Format percentage
 */
export const formatPercent = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('sr-RS', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Format date for display (short format)
 */
export const formatDateShort = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('sr-RS');
  } catch {
    return String(dateStr);
  }
};

/**
 * Format date and time for display
 */
export const formatDateTimeShort = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Format relative time (e.g., "pre 2 dana")
 */
export const formatRelativeTime = (dateStr: string | Date): string => {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'upravo sada';
  if (diffMinutes < 60) return `pre ${diffMinutes} min`;
  if (diffHours < 24) return `pre ${diffHours}h`;
  if (diffDays === 1) return 'juče';
  if (diffDays < 7) return `pre ${diffDays} dana`;
  if (diffDays < 30) return `pre ${Math.floor(diffDays / 7)} nedelje`;
  if (diffDays < 365) return `pre ${Math.floor(diffDays / 30)} meseci`;
  return `pre ${Math.floor(diffDays / 365)} godina`;
};
