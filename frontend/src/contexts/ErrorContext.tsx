import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

export interface AppError {
  id: string;
  message: string;
  code?: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'fatal';
  details?: Record<string, unknown>;
  recoverable?: boolean;
}

interface ErrorContextType {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  handleApiError: (error: unknown, context?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<AppError[]>([]);
  const { toast } = useToast();

  const addError = useCallback((error: Omit<AppError, 'id' | 'timestamp'>) => {
    const newError: AppError = {
      ...error,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    setErrors((prev) => [...prev, newError]);

    // Show toast notification
    toast({
      variant: error.severity === 'error' || error.severity === 'fatal' ? 'destructive' : 'default',
      title: getErrorTitle(error.severity),
      description: error.message,
      duration: error.severity === 'fatal' ? undefined : 5000,
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorContext]', newError);
    }

    // Auto-clear recoverable errors after 10 seconds
    if (error.recoverable !== false && error.severity !== 'fatal') {
      setTimeout(() => {
        clearError(newError.id);
      }, 10000);
    }
  }, [toast]);

  const clearError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((err) => err.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const handleApiError = useCallback((error: unknown, context?: string) => {
    // Parse API error response
    let message = 'An unexpected error occurred';
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;
    let severity: AppError['severity'] = 'error';

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const data = error.response.data as Record<string, unknown>;
        message = (data?.message as string) || (data?.error as string) || message;
        code = (data?.code as string) || `HTTP_${error.response.status}`;
        details = {
          status: error.response.status,
          statusText: error.response.statusText,
          endpoint: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          ...(data?.details as Record<string, unknown>),
        };

        // Determine severity based on status code
        if (error.response.status >= 500) {
          severity = 'fatal';
        } else if (error.response.status === 429) {
          severity = 'warning';
          message = 'Too many requests. Please try again later.';
        } else if (error.response.status === 401) {
          severity = 'warning';
          message = 'Session expired. Please log in again.';
        } else if (error.response.status === 403) {
          severity = 'error';
          message = 'You do not have permission to perform this action.';
        }
      } else if (error.request) {
        // Request made but no response received
        severity = 'fatal';
        message = 'Network error. Please check your internet connection.';
        code = 'NETWORK_ERROR';
        details = {
          url: error.config?.url,
        };
      } else {
        // Something else happened
        message = error.message || message;
        code = 'UNKNOWN_ERROR';
      }
    } else if (error instanceof Error) {
      message = error.message;
      code = 'APP_ERROR';
    }

    // Add context if provided
    if (context) {
      message = `${context}: ${message}`;
    }

    addError({
      message,
      code,
      severity,
      details,
      recoverable: severity !== 'fatal',
    });
  }, [addError]);

  return (
    <ErrorContext.Provider value={{ errors, addError, clearError, clearAllErrors, handleApiError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
}

function getErrorTitle(severity: AppError['severity']): string {
  switch (severity) {
    case 'info':
      return 'Information';
    case 'warning':
      return 'Warning';
    case 'error':
      return 'Error';
    case 'fatal':
      return 'Critical Error';
    default:
      return 'Notification';
  }
}
