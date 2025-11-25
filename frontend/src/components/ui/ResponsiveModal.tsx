import React, { useEffect, useRef } from 'react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  gradient?: string;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
  gradient = 'from-blue-600 to-cyan-500',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-[95vw] sm:max-h-[95vh]',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-white rounded-t-3xl sm:rounded-2xl
          shadow-2xl
          max-h-[90vh] sm:max-h-[85vh]
          flex flex-col
          animate-slide-up sm:animate-scale-in
          overflow-hidden
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r ${gradient}`}>
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  {icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-white truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-white/80 truncate">{subtitle}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
                  aria-label="Zatvori"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-100 px-4 sm:px-6 py-4 bg-gray-50/50 safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Convenience component for modal footer with action buttons
interface ModalFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  confirmVariant?: 'primary' | 'danger' | 'success';
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onConfirm,
  cancelText = 'Otkaži',
  confirmText = 'Potvrdi',
  isLoading = false,
  confirmDisabled = false,
  confirmVariant = 'primary',
}) => {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600',
    success: 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600',
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors touch-manipulation min-h-touch"
        >
          {cancelText}
        </button>
      )}
      {onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading || confirmDisabled}
          className={`
            w-full sm:w-auto px-6 py-3 sm:py-2.5 text-white rounded-xl font-medium 
            transition-all shadow-lg touch-manipulation min-h-touch
            disabled:opacity-50 disabled:cursor-not-allowed
            ${variantClasses[confirmVariant]}
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Učitavanje...
            </span>
          ) : confirmText}
        </button>
      )}
    </div>
  );
};

export default ResponsiveModal;
