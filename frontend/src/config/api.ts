/**
 * Centralized API configuration
 * All API clients should import these constants instead of hardcoding URLs
 */

// Base API URL - reads from environment variable, defaults to localhost for development
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  .replace(/\/$/, '')  // Remove trailing slash
  .replace(/\/api$/, '');  // Remove /api suffix to prevent double /api/api issues

// Full API URL with /api suffix
export const API_URL = `${API_BASE_URL}/api`;

// Timeout configuration (in milliseconds)
export const API_TIMEOUT = 30000;

// Default headers for API requests
export const API_DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const;
