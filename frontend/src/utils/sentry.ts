// Sentry configuration for frontend
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialize Sentry for frontend error tracking
 */
export function initSentry(): void {
  // Only initialize if DSN is configured
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    // Keep console.warn here as this runs before logger is available
    if (import.meta.env.DEV) {
      console.warn('⚠️  Sentry DSN not configured, error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    
    // Set sample rate for performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    integrations: [
      new BrowserTracing({
        // Track React Router navigation
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
    ],

    // Before send hook to filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from forms
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
        sensitiveFields.forEach((field) => {
          if (event.request?.data && typeof event.request.data === 'object') {
            if (field in event.request.data) {
              event.request.data[field] = '[REDACTED]';
            }
          }
        });
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      
      // Random plugins/extensions
      'atomicFindClose',
      'fb_xd_fragment',
    ],

    // Don't send in development
    enabled: import.meta.env.PROD,
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
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

// Re-export Sentry for direct access
export { Sentry };

// Import React hooks for router integration
import React from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

