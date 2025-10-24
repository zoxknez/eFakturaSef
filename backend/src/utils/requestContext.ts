import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request Context for Distributed Tracing
 * 
 * Uses AsyncLocalStorage to maintain request context across async operations
 * Enables correlation IDs, trace IDs, and contextual logging
 */

export interface RequestContext {
  requestId: string;
  traceId: string;
  userId?: string;
  companyId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  path: string;
  startTime: number;
}

// Create async local storage instance
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Middleware to initialize request context
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate or extract trace ID
  const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  // Extract user info if authenticated
  const user = (req as any).user;

  const context: RequestContext = {
    requestId,
    traceId,
    userId: user?.id,
    companyId: user?.companyId,
    role: user?.role,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.path,
    startTime: Date.now(),
  };

  // Set response headers for tracing
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Trace-ID', traceId);

  // Run the rest of the middleware chain with this context
  asyncLocalStorage.run(context, () => {
    next();
  });
}

/**
 * Get current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get current trace ID
 */
export function getTraceId(): string | undefined {
  return asyncLocalStorage.getStore()?.traceId;
}

/**
 * Get current request ID
 */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}

/**
 * Get current user ID
 */
export function getUserId(): string | undefined {
  return asyncLocalStorage.getStore()?.userId;
}

/**
 * Get current company ID
 */
export function getCompanyId(): string | undefined {
  return asyncLocalStorage.getStore()?.companyId;
}

/**
 * Add context to object for logging
 */
export function addContextToLog(data: Record<string, any> = {}): Record<string, any> {
  const context = getRequestContext();
  if (!context) return data;

  return {
    ...data,
    requestId: context.requestId,
    traceId: context.traceId,
    userId: context.userId,
    companyId: context.companyId,
  };
}

/**
 * Get request duration in milliseconds
 */
export function getRequestDuration(): number | undefined {
  const context = getRequestContext();
  if (!context) return undefined;
  
  return Date.now() - context.startTime;
}

/**
 * Create child context (for background jobs spawned from request)
 */
export function createChildContext(parentContext?: RequestContext): RequestContext {
  const parent = parentContext || getRequestContext();
  
  return {
    requestId: randomUUID(),
    traceId: parent?.traceId || randomUUID(),
    userId: parent?.userId,
    companyId: parent?.companyId,
    role: parent?.role,
    method: 'BACKGROUND',
    path: '/background-job',
    startTime: Date.now(),
  };
}

/**
 * Run function with specific context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}
