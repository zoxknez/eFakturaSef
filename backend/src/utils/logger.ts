import winston from 'winston';
import { config } from '../config';
import { getRequestContext } from './requestContext';

// Define structured log format (JSON)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json({
    space: config.NODE_ENV === 'production' ? 0 : 2, // Pretty print in dev
  }),
  // Add request context (trace ID, request ID, user ID)
  winston.format((info) => {
    const context = getRequestContext();
    if (context) {
      info.traceId = context.traceId;
      info.requestId = context.requestId;
      info.userId = context.userId;
      info.companyId = context.companyId;
    }
    return info;
  })()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, metadata }) => {
    const metaStr = metadata && Object.keys(metadata).length > 0 
      ? `\n${JSON.stringify(metadata, null, 2)}` 
      : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  })
);

// Create logger instance with structured logging
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { 
    service: 'sef-efakture-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    hostname: process.env.HOSTNAME || 'unknown',
    pid: process.pid,
  },
  transports: [
    // Write to all logs file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Separate audit log
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console transport in development
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add production logging (e.g., to external service)
if (config.NODE_ENV === 'production') {
  // Here you can add external logging services like CloudWatch, LogDNA, etc.
  // Example:
  // logger.add(new winston.transports.Http({
  //   host: 'logs.example.com',
  //   port: 80,
  //   path: '/logs'
  // }));
}

// Enhanced logging methods
export const auditLogger = {
  userAction: (userId: string, action: string, details: Record<string, unknown> = {}) => {
    logger.info('User action', {
      type: 'audit',
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },

  invoiceAction: (invoiceId: string, action: string, userId: string, details: Record<string, unknown> = {}) => {
    logger.info('Invoice action', {
      type: 'audit',
      invoiceId,
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  },

  sefAction: (action: string, details: Record<string, unknown> = {}) => {
    logger.info('SEF action', {
      type: 'audit',
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },

  securityEvent: (event: string, details: Record<string, unknown> = {}) => {
    logger.warn('Security event', {
      type: 'security',
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance logging
export const performanceLogger = {
  apiCall: (method: string, url: string, duration: number, statusCode: number) => {
    logger.info('API call', {
      type: 'performance',
      method,
      url,
      duration,
      statusCode,
      timestamp: new Date().toISOString()
    });
  },

  databaseQuery: (query: string, duration: number, rowsAffected?: number) => {
    logger.info('Database query', {
      type: 'performance',
      query: query.substring(0, 100), // Truncate long queries
      duration,
      rowsAffected,
      timestamp: new Date().toISOString()
    });
  },

  sefApiCall: (endpoint: string, duration: number, statusCode: number) => {
    logger.info('SEF API call', {
      type: 'performance',
      endpoint,
      duration,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }
};

// Error tracking
export const errorTracker = {
  trackError: (error: Error, context: Record<string, unknown> = {}) => {
    logger.error('Application error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  trackSEFError: (error: Error, sefId?: string, context: Record<string, unknown> = {}) => {
    logger.error('SEF integration error', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      sefId,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

export default logger;