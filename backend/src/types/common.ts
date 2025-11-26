/**
 * Common type definitions for the backend
 */

import { Prisma } from '@prisma/client';

/**
 * Standard error with message property
 * Used instead of `error: any` in catch blocks
 */
export interface AppError extends Error {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Check if an error has a message property
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error ||
    (typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as AppError).message === 'string')
  );
}

/**
 * Get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Prisma query parameters with proper typing
 */
export interface PrismaQueryParams {
  where?: Prisma.JsonObject;
  take?: number;
  skip?: number;
  cursor?: { id: string };
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Generic pagination parameters from query string
 */
export interface RawPaginationParams {
  page?: string;
  limit?: string;
  cursor?: string;
  orderBy?: string;
  orderField?: string;
  search?: string;
  direction?: 'next' | 'prev';
}

/**
 * Validated pagination parameters
 */
export interface ValidatedPaginationParams {
  page: number;
  limit: number;
  orderBy: 'asc' | 'desc';
  orderField: string;
  search?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Cursor pagination metadata
 */
export interface CursorPaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  count: number;
}

/**
 * Cursor paginated response
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: CursorPaginationMeta;
}

/**
 * Import error type
 */
export interface ImportError {
  row: number;
  field: string;
  message: string;
}

/**
 * Import result type
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: ImportError[];
  message?: string;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  gte?: Date;
  lte?: Date;
}

/**
 * Amount range filter
 */
export interface AmountRangeFilter {
  gte?: number;
  lte?: number;
}
