// Cursor-based pagination utilities
import { Prisma } from '@prisma/client';
import { RawPaginationParams } from '../types/common';

// Type for Prisma where conditions
type WhereCondition = Prisma.JsonObject | Record<string, unknown> | undefined;

// Type for order direction
type OrderDirection = 'asc' | 'desc';

/**
 * Allowed sort fields for different models
 * This prevents property injection attacks
 */
export const ALLOWED_SORT_FIELDS = {
  invoice: ['id', 'invoiceNumber', 'issueDate', 'dueDate', 'totalAmount', 'taxAmount', 'status', 'paymentStatus', 'createdAt', 'updatedAt', 'sentAt'],
  partner: ['id', 'name', 'pib', 'type', 'isActive', 'createdAt', 'updatedAt'],
  product: ['id', 'code', 'name', 'unitPrice', 'category', 'isActive', 'currentStock', 'createdAt', 'updatedAt'],
  payment: ['id', 'amount', 'paymentDate', 'status', 'method', 'createdAt', 'updatedAt'],
  user: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt'],
  auditLog: ['id', 'entityType', 'action', 'createdAt'],
  default: ['id', 'createdAt', 'updatedAt'],
} as const;

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  cursor?: string; // ID of the last item from previous page
  limit?: number; // Number of items per page (default: 20, max: 100)
  orderBy?: 'asc' | 'desc'; // Sort direction (default: desc)
  orderField?: string; // Field to order by (default: createdAt)
}

/**
 * Cursor-based pagination result
 */
export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
    count: number;
  };
}

/**
 * Validate orderField against allowed fields
 * @param orderField - Field to validate
 * @param allowedFields - List of allowed fields
 * @returns Validated field or default 'createdAt'
 */
function validateOrderField(orderField: string | undefined, allowedFields: readonly string[]): string {
  if (!orderField) {
    return 'createdAt';
  }

  // Check if field is in whitelist
  if (allowedFields.includes(orderField)) {
    return orderField;
  }

  // If not allowed, log warning and return default
  console.warn(`Invalid orderField attempted: ${orderField}. Using default 'createdAt'.`);
  return 'createdAt';
}

/**
 * Parse and validate cursor pagination parameters
 * @param params - Raw parameters from request
 * @param modelType - Model type for field validation (e.g., 'invoice', 'partner')
 */
export function parseCursorPagination(
  params: RawPaginationParams, 
  modelType: keyof typeof ALLOWED_SORT_FIELDS = 'default'
): CursorPaginationParams {
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20') || 20));
  const orderBy: OrderDirection = params.orderBy === 'asc' ? 'asc' : 'desc';
  const allowedFields = ALLOWED_SORT_FIELDS[modelType] || ALLOWED_SORT_FIELDS.default;
  const orderField = validateOrderField(params.orderField, allowedFields);
  const cursor = params.cursor || undefined;

  return { cursor, limit, orderBy, orderField };
}

/**
 * Build Prisma cursor pagination query
 */
export function buildCursorQuery<_T>(
  params: CursorPaginationParams,
  where?: WhereCondition
): {
  where?: WhereCondition;
  take: number;
  skip?: number;
  cursor?: { id: string };
  orderBy: Record<string, OrderDirection>;
} {
  const { cursor, limit = 20, orderBy = 'desc', orderField = 'createdAt' } = params;

  // Take one more than limit to check if there are more results
  const take = limit + 1;

  // Base query
  const query: {
    where?: WhereCondition;
    take: number;
    skip?: number;
    cursor?: { id: string };
    orderBy: Record<string, OrderDirection>;
  } = {
    where,
    take,
    orderBy: { [orderField]: orderBy },
  };

  // If cursor is provided, start from that cursor
  if (cursor) {
    query.cursor = { id: cursor };
    query.skip = 1; // Skip the cursor itself
  }

  return query;
}

/**
 * Process cursor pagination results
 */
export function processCursorResults<T extends { id: string }>(
  results: T[],
  limit: number
): CursorPaginationResult<T> {
  // Check if there are more results
  const hasMore = results.length > limit;

  // Remove the extra item if it exists
  const data = hasMore ? results.slice(0, limit) : results;

  // Get next cursor (ID of the last item)
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.id : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
      limit,
      count: data.length,
    },
  };
}

/**
 * Offset-based pagination parameters (traditional)
 */
export interface OffsetPaginationParams {
  page?: number;
  limit?: number;
  orderBy?: 'asc' | 'desc';
  orderField?: string;
}

/**
 * Offset-based pagination result
 */
export interface OffsetPaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parse offset pagination parameters
 * @param params - Raw parameters from request
 * @param modelType - Model type for field validation (e.g., 'invoice', 'partner')
 */
export function parseOffsetPagination(
  params: RawPaginationParams,
  modelType: keyof typeof ALLOWED_SORT_FIELDS = 'default'
): OffsetPaginationParams {
  const page = Math.max(1, parseInt(params.page || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20') || 20));
  const orderBy: OrderDirection = params.orderBy === 'asc' ? 'asc' : 'desc';
  const allowedFields = ALLOWED_SORT_FIELDS[modelType] || ALLOWED_SORT_FIELDS.default;
  const orderField = validateOrderField(params.orderField, allowedFields);

  return { page, limit, orderBy, orderField };
}

/**
 * Build Prisma offset pagination query
 */
export function buildOffsetQuery(
  params: OffsetPaginationParams,
  where?: WhereCondition
): {
  where?: WhereCondition;
  take: number;
  skip: number;
  orderBy: Record<string, OrderDirection>;
} {
  const { page = 1, limit = 20, orderBy = 'desc', orderField = 'createdAt' } = params;
  const skip = (page - 1) * limit;

  return {
    where,
    take: limit,
    skip,
    orderBy: { [orderField]: orderBy },
  };
}

/**
 * Process offset pagination results
 */
export function processOffsetResults<T>(
  results: T[],
  total: number,
  params: OffsetPaginationParams
): OffsetPaginationResult<T> {
  const { page = 1, limit = 20 } = params;
  const pages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < pages;
  const hasPrev = page > 1;

  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext,
      hasPrev,
    },
  };
}

/**
 * Create search filter for full-text search
 */
export function createSearchFilter(
  searchTerm: string | undefined,
  fields: string[]
): Record<string, unknown> | undefined {
  if (!searchTerm || !searchTerm.trim()) {
    return undefined;
  }

  const search = searchTerm.trim();

  if (fields.length === 1 && fields[0]) {
    return { [fields[0]]: { contains: search, mode: 'insensitive' } };
  }

  return {
    OR: fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
  };
}

/**
 * Combine multiple filters with AND
 */
export function combineFilters(...filters: (Record<string, unknown> | undefined)[]): Record<string, unknown> | undefined {
  const validFilters = filters.filter((f): f is Record<string, unknown> => f !== undefined && f !== null);

  if (validFilters.length === 0) return undefined;
  if (validFilters.length === 1) return validFilters[0];

  return { AND: validFilters };
}

/**
 * Create date range filter
 */
export function createDateRangeFilter(
  field: string,
  dateFrom?: string,
  dateTo?: string
): Record<string, unknown> | undefined {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const filter: { gte?: Date; lte?: Date } = {};

  if (dateFrom) {
    filter.gte = new Date(dateFrom);
  }

  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999); // End of day
    filter.lte = endDate;
  }

  return { [field]: filter };
}

/**
 * Create amount range filter
 */
export function createAmountRangeFilter(
  field: string,
  min?: number,
  max?: number
): Record<string, unknown> | undefined {
  if (min === undefined && max === undefined) {
    return undefined;
  }

  const filter: { gte?: number; lte?: number } = {};

  if (min !== undefined) {
    filter.gte = min;
  }

  if (max !== undefined) {
    filter.lte = max;
  }

  return { [field]: filter };
}

/**
 * Create array inclusion filter (in operator)
 */
export function createInFilter(field: string, values?: string[] | string): Record<string, unknown> | undefined {
  if (!values || (Array.isArray(values) && values.length === 0)) {
    return undefined;
  }

  const valueArray = Array.isArray(values) ? values : [values];
  
  return { [field]: { in: valueArray } };
}

/**
 * Advanced invoice filters builder
 */
export interface AdvancedInvoiceFilters {
  status?: string | string[];
  type?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  buyerPIB?: string;
  sefStatus?: string;
  hasSefId?: boolean;
}

export function buildAdvancedInvoiceFilters(
  filters: AdvancedInvoiceFilters,
  companyId: string
): Record<string, unknown> {
  const conditions: Record<string, unknown>[] = [
    { companyId }, // Always filter by company
  ];

  // Status filter (can be multiple)
  const statusFilter = createInFilter('status', filters.status);
  if (statusFilter) conditions.push(statusFilter);

  // Type filter
  const typeFilter = createInFilter('type', filters.type);
  if (typeFilter) conditions.push(typeFilter);

  // Date range filter
  const dateFilter = createDateRangeFilter('issueDate', filters.dateFrom, filters.dateTo);
  if (dateFilter) conditions.push(dateFilter);

  // Amount range filter
  const amountFilter = createAmountRangeFilter('totalAmount', filters.amountMin, filters.amountMax);
  if (amountFilter) conditions.push(amountFilter);

  // Search filter
  const searchFilter = createSearchFilter(filters.search, [
    'invoiceNumber',
    'buyerName',
    'buyerPIB',
  ]);
  if (searchFilter) conditions.push(searchFilter);

  // Buyer PIB exact match
  if (filters.buyerPIB) {
    conditions.push({ buyerPIB: filters.buyerPIB });
  }

  // SEF status filter
  if (filters.sefStatus) {
    conditions.push({ sefStatus: filters.sefStatus });
  }

  // Has SEF ID filter
  if (filters.hasSefId !== undefined) {
    if (filters.hasSefId) {
      conditions.push({ sefId: { not: null } });
    } else {
      conditions.push({ sefId: null });
    }
  }

  return combineFilters(...conditions) || { companyId };
}

// =====================================================
// QUERY PARAMETER PARSING UTILITIES
// =====================================================

/**
 * Parse a query parameter as integer with default value
 */
export function parseIntParam(value: unknown, defaultValue: number): number {
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  if (typeof value === 'number') {
    return value;
  }
  return defaultValue;
}

/**
 * Parse a query parameter as boolean
 */
export function parseBoolParam(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  return defaultValue;
}

/**
 * Parse a query parameter as date
 */
export function parseDateParam(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

/**
 * Parse a query parameter as string with optional trim
 */
export function parseStringParam(value: unknown, defaultValue?: string): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : defaultValue;
  }
  return defaultValue;
}
