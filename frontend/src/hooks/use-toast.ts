import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

let toastCounter = 0;
const listeners = new Set<(toast: Toast) => void>();

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = { id, title, description, variant, duration };

    // Notify all listeners
    listeners.forEach((listener) => listener(newToast));

    // Auto-dismiss after duration
    if (duration !== undefined) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return { id };
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  return { toast, dismiss, toasts };
}

// Global toast function that can be called from anywhere
export function showToast(options: Omit<Toast, 'id'>) {
  const id = `toast-${++toastCounter}`;
  const newToast: Toast = { id, ...options };
  
  listeners.forEach((listener) => listener(newToast));
  
  if (options.duration !== undefined) {
    setTimeout(() => {
      // Notify listeners to dismiss
      listeners.forEach((listener) => listener({ ...newToast, duration: 0 }));
    }, options.duration);
  }
  
  return { id };
}
