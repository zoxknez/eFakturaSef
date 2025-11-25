// Audit logging middleware
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Extract user information from authenticated request
 */
function getUserInfo(req: Request): { userId: string | null; ipAddress: string; userAgent: string } {
  const userId = (req as any).user?.id || null;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';

  return { userId, ipAddress, userAgent };
}

/**
 * Determine if the request should be audited
 */
function shouldAudit(req: Request): boolean {
  // Audit important operations
  const auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  // Skip health checks and non-critical endpoints
  const skipPaths = [
    '/health',
    '/api/auth/login',
    '/api/auth/refresh',
    '/metrics',
  ];

  if (skipPaths.some(path => req.path.startsWith(path))) {
    return false;
  }

  return auditMethods.includes(req.method);
}

/**
 * Extract entity information from request
 */
function extractEntityInfo(req: Request): { entityType: string; entityId: string | null } {
  const pathParts = req.path.split('/').filter(Boolean);
  
  // Try to determine entity type from path
  // e.g., /api/invoices/123 -> entityType: 'invoice', entityId: '123'
  let entityType = 'unknown';
  let entityId: string | null = null;

  if (pathParts.length >= 2) {
    if (pathParts[1]) {
      entityType = pathParts[1].replace(/s$/, ''); // Remove plural 's'
    }
    
    // If there's an ID in the path
    if (pathParts.length >= 3 && pathParts[2]) {
      // UUID pattern or numeric ID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathParts[2]) || /^\d+$/.test(pathParts[2])) {
        entityId = pathParts[2];
      }
    }
  }

  // Try to get entity ID from body
  if (!entityId && req.body) {
    entityId = req.body.id || req.body.invoiceId || req.body.companyId || null;
  }

  return { entityType, entityId };
}

/**
 * Map HTTP method to action
 */
function getAction(method: string, path: string): string {
  const actionMap: Record<string, string> = {
    POST: 'created',
    PUT: 'updated',
    PATCH: 'updated',
    DELETE: 'deleted',
  };

  // Special cases
  if (path.includes('/send')) return 'sent';
  if (path.includes('/cancel')) return 'cancelled';
  if (path.includes('/approve')) return 'approved';
  if (path.includes('/reject')) return 'rejected';

  return actionMap[method] || method.toLowerCase();
}

/**
 * Sanitize data for logging (remove sensitive fields)
 */
function sanitizeData(data: any): any {
  if (!data) return null;

  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'sefApiKey'];
  
  if (typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Middleware to automatically log important operations
 */
export const auditLog = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!shouldAudit(req)) {
    return next();
  }

  const { userId, ipAddress, userAgent } = getUserInfo(req);
  const { entityType, entityId } = extractEntityInfo(req);
  const action = getAction(req.method, req.path);

  // Capture request data
  // const requestData = sanitizeData(req.body);

  // Store original send function
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (data: any): Response {
    // Restore original send
    res.send = originalSend;

    // Only log successful operations (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Parse response data
      let responseData;
      try {
        responseData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch {
        responseData = null;
      }

      // Log asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              entityType,
              entityId: entityId || 'system',
              action,
              oldData: Prisma.JsonNull, // Prisma.JsonNull for null values in Json fields
              newData: sanitizeData(responseData),
              userId,
              ipAddress,
              userAgent,
            },
          });

          logger.debug('Audit log created', {
            entityType,
            entityId,
            action,
            userId,
          });
        } catch (error: any) {
          // Don't fail the request if audit logging fails
          logger.error('Failed to create audit log', {
            error: error.message,
            entityType,
            action,
          });
        }
      });
    }

    // Send the response
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Manual audit log function for specific operations
 */
export async function createAuditLog(params: {
  entityType: string;
  entityId: string;
  action: string;
  oldData?: any;
  newData?: any;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        oldData: sanitizeData(params.oldData) || null,
        newData: sanitizeData(params.newData) || null,
        userId: params.userId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });

    logger.debug('Manual audit log created', {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
    });
  } catch (error: any) {
    logger.error('Failed to create manual audit log', {
      error: error.message,
      entityType: params.entityType,
      action: params.action,
    });
  }
}

/**
 * Audit log query helpers
 */
export const auditLogQueries = {
  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entityType: string, entityId: string, limit = 100) {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: string, limit = 100) {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit = 100) {
    return await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Search audit logs by action
   */
  async getLogsByAction(action: string, limit = 100) {
    return await prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get audit logs in date range
   */
  async getLogsInRange(startDate: Date, endDate: Date, limit = 1000) {
    return await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

