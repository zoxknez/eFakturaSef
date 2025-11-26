// Sentry configuration for frontend
// NOTE: Install @sentry/react and @sentry/tracing packages to enable error tracking
// npm install @sentry/react @sentry/tracing

/**
 * Initialize Sentry for frontend error tracking
 * Currently disabled - install Sentry packages to enable
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

  // TODO: Uncomment when Sentry packages are installed
  /*
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      
      // Set sample rate for performance monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      
      integrations: [
        new Sentry.BrowserTracing(),
      ],

      // Before send hook to filter sensitive data
      beforeSend(event: any, hint: any) {
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
  });
  */
}

/**
 * Capture exception with context
 * Currently disabled - install Sentry packages to enable
 */
export function captureException(error: Error, context?: Record<string, unknown>): string {
  console.error('Error captured (Sentry disabled):', error, context);
  return '';
}

/**
 * Set user context
 * Currently disabled - install Sentry packages to enable
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  // Sentry.setUser would go here
  console.debug('User context set (Sentry disabled):', user?.id);
}

