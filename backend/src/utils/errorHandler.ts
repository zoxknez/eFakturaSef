/**
 * Centralized Error Handler Utility
 * Provides consistent error handling across all controllers
 */

import { Response } from 'express';
import { logger } from './logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Application Error class for controlled errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error types
 */
export const Errors = {
  notFound: (resource: string) => 
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  
  badRequest: (message: string, details?: unknown) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message: string = 'Access denied') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  conflict: (message: string) => 
    new AppError(message, 409, 'CONFLICT'),
  
  validationError: (errors: unknown) => 
    new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors),
  
  rateLimitExceeded: () => 
    new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED'),
  
  serviceUnavailable: (service: string) => 
    new AppError(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE'),
  
  internalError: (message: string = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
};

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
  stack?: string;
}

/**
 * Map known error patterns to appropriate HTTP responses
 */
function mapErrorToResponse(error: unknown): { statusCode: number; response: ErrorResponse } {
  // Handle AppError
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      response: {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      response: {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    };
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaError(error);
  }

  // Handle standard Error
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();

    if (message.includes('not found')) {
      return {
        statusCode: 404,
        response: {
          success: false,
          error: error.message,
          code: 'NOT_FOUND',
        },
      };
    }

    if (message.includes('already exists') || message.includes('duplicate')) {
      return {
        statusCode: 409,
        response: {
          success: false,
          error: error.message,
          code: 'CONFLICT',
        },
      };
    }

    if (message.includes('invalid') || message.includes('required') || message.includes('must be')) {
      return {
        statusCode: 400,
        response: {
          success: false,
          error: error.message,
          code: 'BAD_REQUEST',
        },
      };
    }

    if (message.includes('unauthorized') || message.includes('not authenticated')) {
      return {
        statusCode: 401,
        response: {
          success: false,
          error: error.message,
          code: 'UNAUTHORIZED',
        },
      };
    }

    if (message.includes('forbidden') || message.includes('permission') || message.includes('access denied')) {
      return {
        statusCode: 403,
        response: {
          success: false,
          error: error.message,
          code: 'FORBIDDEN',
        },
      };
    }

    // Generic error
    return {
      statusCode: 500,
      response: {
        success: false,
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    };
  }

  // Unknown error type
  return {
    statusCode: 500,
    response: {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
  };
}

/**
 * Map Prisma errors to appropriate HTTP responses
 */
function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): { statusCode: number; response: ErrorResponse } {
  switch (error.code) {
    case 'P2002': // Unique constraint violation
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      return {
        statusCode: 409,
        response: {
          success: false,
          error: `A record with this ${target} already exists`,
          code: 'DUPLICATE_ENTRY',
          details: { field: target },
        },
      };

    case 'P2025': // Record not found
      return {
        statusCode: 404,
        response: {
          success: false,
          error: 'Record not found',
          code: 'NOT_FOUND',
        },
      };

    case 'P2003': // Foreign key constraint failed
      return {
        statusCode: 400,
        response: {
          success: false,
          error: 'Referenced record does not exist',
          code: 'FOREIGN_KEY_ERROR',
        },
      };

    case 'P2014': // Required relation violation
      return {
        statusCode: 400,
        response: {
          success: false,
          error: 'Required relation is missing',
          code: 'RELATION_ERROR',
        },
      };

    default:
      return {
        statusCode: 500,
        response: {
          success: false,
          error: 'Database error occurred',
          code: 'DATABASE_ERROR',
        },
      };
  }
}

/**
 * Controller error handler wrapper
 * Wraps async controller methods with consistent error handling
 */
export function handleControllerError(
  context: string,
  error: unknown,
  res: Response
): Response {
  const { statusCode, response } = mapErrorToResponse(error);

  // Log error
  if (statusCode >= 500) {
    logger.error(`[${context}] Server Error:`, error);
  } else if (statusCode >= 400) {
    logger.warn(`[${context}] Client Error:`, { 
      error: error instanceof Error ? error.message : 'Unknown error',
      statusCode 
    });
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
}

/**
 * Async handler wrapper for Express routes
 * Automatically catches errors and passes them to error handler
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    const [, res] = args;
    try {
      return await fn(...args);
    } catch (error) {
      return handleControllerError(context, error, res);
    }
  }) as T;
}

/**
 * Service error handler
 * For throwing appropriate errors from service layer
 */
export function assertExists<T>(value: T | null | undefined, resource: string): asserts value is T {
  if (value === null || value === undefined) {
    throw Errors.notFound(resource);
  }
}

export function assertCondition(condition: boolean, message: string, statusCode: number = 400): void {
  if (!condition) {
    throw new AppError(message, statusCode);
  }
}

/**
 * Validation helper
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw Errors.badRequest(`${fieldName} is required`);
  }
}

/**
 * Assert companyId exists and return it as string
 * Used in controllers to validate authenticated requests
 */
export function assertCompanyId(companyId: string | undefined): string {
  if (!companyId) {
    throw Errors.unauthorized('Company context required');
  }
  return companyId;
}

/**
 * Assert authenticated user with company
 * Returns validated companyId
 */
export function getAuthenticatedCompanyId(user: { companyId?: string } | undefined): string {
  if (!user?.companyId) {
    throw Errors.unauthorized('Authentication with company context required');
  }
  return user.companyId;
}

export default {
  AppError,
  Errors,
  handleControllerError,
  asyncHandler,
  assertExists,
  assertCondition,
  validateRequired,
  assertCompanyId,
  getAuthenticatedCompanyId,
};
