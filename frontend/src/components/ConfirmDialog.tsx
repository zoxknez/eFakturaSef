/**
 * ConfirmDialog Component - Modal za potvrdu destruktivnih akcija
 * Sprečava slučajno brisanje ili storniranje
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  isLoading?: boolean;
  requireConfirmation?: boolean;
  confirmationText?: string;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    title: 'text-red-900 dark:text-red-100'
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    title: 'text-amber-900 dark:text-amber-100'
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    title: 'text-blue-900 dark:text-blue-100'
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    title: 'text-green-900 dark:text-green-100'
  }
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Potvrdi',
  cancelText = 'Otkaži',
  variant = 'danger',
  isLoading = false,
  requireConfirmation = false,
  confirmationText = 'OBRIŠI'
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = React.useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const config = variantConfig[variant];
  const Icon = config.icon;

  const canConfirm = !requireConfirmation || inputValue === confirmationText;

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      // Fokusiraj cancel dugme ili input
      if (requireConfirmation && inputRef.current) {
        inputRef.current.focus();
      } else if (cancelButtonRef.current) {
        cancelButtonRef.current.focus();
      }

      // Spreči scroll na body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, requireConfirmation]);

  // Zatvori na Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isLoading, onClose]);

  // Reset input kada se dijalog zatvori
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (canConfirm && !isLoading) {
      onConfirm();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          className={cn(
            'relative w-full max-w-md transform overflow-hidden rounded-2xl',
            'bg-white dark:bg-gray-800 shadow-2xl transition-all',
            'animate-scaleIn'
          )}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'absolute top-4 right-4 p-1 rounded-lg',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'transition-colors disabled:opacity-50'
            )}
            aria-label="Zatvori"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            {/* Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className={cn('p-3 rounded-full', config.iconBg)}>
                <Icon className={cn('w-8 h-8', config.iconColor)} />
              </div>
            </div>

            {/* Title */}
            <h3
              id="modal-title"
              className={cn(
                'text-xl font-bold text-center mb-2',
                config.title
              )}
            >
              {title}
            </h3>

            {/* Message */}
            <div className="text-center text-gray-600 dark:text-gray-300 mb-6">
              {message}
            </div>

            {/* Confirmation input */}
            {requireConfirmation && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unesite <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-red-600 dark:text-red-400 font-mono">{confirmationText}</code> za potvrdu:
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={confirmationText}
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border-2 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-offset-0',
                    inputValue === confirmationText
                      ? 'border-green-500 focus:ring-green-200'
                      : 'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200',
                    'dark:bg-gray-700 dark:text-white'
                  )}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors',
                  'border-2 border-gray-200 dark:border-gray-600',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {cancelText}
              </button>

              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isLoading}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  config.buttonBg
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Učitavanje...
                  </span>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook za lakše korišćenje
interface UseConfirmDialogOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  requireConfirmation?: boolean;
  confirmationText?: string;
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [options, setOptions] = React.useState<UseConfirmDialogOptions | null>(null);

  const confirm = (opts: UseConfirmDialogOptions) => {
    setOptions(opts);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false);
      setOptions(null);
    }
  };

  const handleConfirm = async () => {
    if (!options) return;
    
    setIsLoading(true);
    try {
      await options.onConfirm();
      setIsOpen(false);
      setOptions(null);
    } finally {
      setIsLoading(false);
    }
  };

  const ConfirmDialogComponent = options ? (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      isLoading={isLoading}
      requireConfirmation={options.requireConfirmation}
      confirmationText={options.confirmationText}
    />
  ) : null;

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}

export default ConfirmDialog;
