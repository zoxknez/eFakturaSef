// Sentry configuration for backend
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';
import { config } from '../config';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry(app: Express): void {
  // Only initialize if DSN is configured
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.NODE_ENV,
    
    // Set sample rate for performance monitoring
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Enable profiling (CPU/memory)
    profilesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // HTTP integration for tracing
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Express integration
      new Sentry.Integrations.Express({ app }),
      
      // Profiling integration
      new ProfilingIntegration(),
      
      // Prisma integration (if available)
      new Sentry.Integrations.Prisma(),
    ],

    // Before send hook to filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive query params
      if (event.request?.query_string) {
        const sensitiveParams = ['password', 'token', 'api_key', 'secret'];
        const queryString = event.request.query_string;
        
        // Handle both string and tuple array formats
        if (typeof queryString === 'string') {
          sensitiveParams.forEach((param) => {
            if (queryString.includes(param)) {
              event.request!.query_string = queryString.replace(
                new RegExp(`${param}=[^&]*`, 'gi'),
                `${param}=[REDACTED]`
              );
            }
          });
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser/Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      
      // Common validation errors
      'ValidationError',
      
      // Rate limiting
      'Too many requests',
    ],
  });

  console.log('✅ Sentry initialized for error tracking');
}

/**
 * Capture exception with context
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
  });
}

export { Sentry };
export default {
  init: initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  Sentry,
};

