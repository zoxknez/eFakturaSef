import { captureException as sentryCaptureException } from './sentry';

/**
 * Centralized logging utility for the frontend application.
 * In development: logs to console
 * In production: only errors go to Sentry, no console output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log informational messages (only in development)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warning messages (only in development)
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  /**
   * Log error messages
   * In development: logs to console
   * In production: sends to Sentry
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context || '');
    }

    // Always send errors to Sentry (if configured)
    if (error instanceof Error) {
      sentryCaptureException(error, {
        ...context,
        message,
      });
    } else if (error) {
      // If error is not an Error instance, create one
      const err = new Error(message);
      sentryCaptureException(err, {
        ...context,
        originalError: error,
      });
    }
  }

  /**
   * Log API request/response for debugging
   */
  apiLog(method: string, url: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`[API] ${method.toUpperCase()} ${url}`, data || '');
    }
  }

  /**
   * Log performance metrics
   */
  performance(label: string, duration: number): void {
    if (this.isDevelopment) {
      console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Create a scoped logger with a specific context
   */
  createScoped(scope: string) {
    return {
      debug: (message: string, context?: LogContext) =>
        this.debug(`[${scope}] ${message}`, context),
      info: (message: string, context?: LogContext) =>
        this.info(`[${scope}] ${message}`, context),
      warn: (message: string, context?: LogContext) =>
        this.warn(`[${scope}] ${message}`, context),
      error: (message: string, error?: Error | unknown, context?: LogContext) =>
        this.error(`[${scope}] ${message}`, error, context),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience method for creating scoped loggers
export const createLogger = (scope: string) => logger.createScoped(scope);

// Default export
export default logger;
