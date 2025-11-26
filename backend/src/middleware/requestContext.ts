// Request context and tracing middleware
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { requestContextMiddleware as asyncContextMiddleware } from '../utils/requestContext';

// Extend Express Request to include context
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

export interface RequestContext {
  requestId: string;
  correlationId: string;
  startTime: number;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  path: string;
  method: string;
}

/**
 * Generate or extract request ID
 */
function getRequestId(req: Request): string {
  // Check for existing request ID from headers
  const headerRequestId = req.get('X-Request-ID') || req.get('x-request-id');
  
  if (headerRequestId && isValidUuid(headerRequestId)) {
    return headerRequestId;
  }
  
  // Generate new UUID
  return uuidv4();
}

/**
 * Generate or extract correlation ID
 */
function getCorrelationId(req: Request): string {
  // Check for existing correlation ID from headers
  const headerCorrelationId = req.get('X-Correlation-ID') || req.get('x-correlation-id');
  
  if (headerCorrelationId && isValidUuid(headerCorrelationId)) {
    return headerCorrelationId;
  }
  
  // Use request ID as correlation ID if not provided
  return getRequestId(req);
}

/**
 * Validate UUID format
 */
function isValidUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Request context middleware
 * Adds request ID and correlation ID to every request for tracing
 * Also initializes AsyncLocalStorage context for distributed tracing
 */
export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  // First, initialize AsyncLocalStorage context
  asyncContextMiddleware(req, res, () => {
    const requestId = getRequestId(req);
    const correlationId = getCorrelationId(req);
    const startTime = Date.now();
    
    // Create context object
    const context: RequestContext = {
      requestId,
      correlationId,
      startTime,
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      path: req.path,
      method: req.method,
    };
    
    // Attach context to request
    req.context = context;
    
    // Add headers to response (already done in asyncContextMiddleware, but ensure consistency)
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Log request start
    logger.info('Request started', {
      requestId,
      correlationId,
      method: req.method,
      path: req.path,
      ip: context.ipAddress,
      userAgent: context.userAgent,
    });
    
    // Capture response finish
    const originalSend = res.send;
    res.send = function (data: any): Response {
      res.send = originalSend;
      
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log request completion
      logger.info('Request completed', {
        requestId,
        correlationId,
        method: req.method,
        path: req.path,
        statusCode,
        duration,
        success: statusCode >= 200 && statusCode < 400,
      });
      
      // Add duration header
      res.setHeader('X-Response-Time', `${duration}ms`);
      
      return originalSend.call(this, data);
    };
    
    // Handle errors
    res.on('finish', () => {
      if (res.statusCode >= 400) {
        const duration = Date.now() - startTime;
        logger.warn(`Request failed: ${req.method} ${req.path} ${res.statusCode}`, {
          requestId,
          correlationId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        });
      }
    });
    
    next();
  });
};

/**
 * Get context from request
 */
export function getContext(req: Request): RequestContext | null {
  return req.context || null;
}

/**
 * Create child logger with context
 */
export function getContextLogger(req: Request) {
  const context = getContext(req);
  
  if (!context) {
    return logger;
  }
  
  // Return logger with default metadata
  return {
    info: (message: string, meta?: any) => 
      logger.info(message, { ...meta, requestId: context.requestId, correlationId: context.correlationId }),
    
    error: (message: string, meta?: any) => 
      logger.error(message, { ...meta, requestId: context.requestId, correlationId: context.correlationId }),
    
    warn: (message: string, meta?: any) => 
      logger.warn(message, { ...meta, requestId: context.requestId, correlationId: context.correlationId }),
    
    debug: (message: string, meta?: any) => 
      logger.debug(message, { ...meta, requestId: context.requestId, correlationId: context.correlationId }),
  };
}

/**
 * Middleware to measure operation duration
 */
export function measureDuration(operationName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = getContext(req);
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.debug(`Operation completed: ${operationName}`, {
        requestId: context?.requestId,
        correlationId: context?.correlationId,
        operation: operationName,
        duration,
      });
    });
    
    next();
  };
}

/**
 * Enhanced error handler with context
 */
export function contextualErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const context = getContext(req);
  
  logger.error('Request error', {
    requestId: context?.requestId,
    correlationId: context?.correlationId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // Add context to error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    requestId: context?.requestId,
    timestamp: new Date().toISOString(),
  });
}

