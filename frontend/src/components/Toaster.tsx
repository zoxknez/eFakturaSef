import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Toast, useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [visibleToasts, setVisibleToasts] = React.useState<Toast[]>([]);

  useEffect(() => {
    setVisibleToasts(toasts);
  }, [toasts]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            animate-in slide-in-from-top-full duration-300
            flex items-start gap-3 rounded-lg shadow-lg p-4
            ${toast.variant === 'destructive' 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-white border border-gray-200'
            }
          `}
        >
          <div className="flex-1">
            {toast.title && (
              <h4 className={`
                font-semibold text-sm mb-1
                ${toast.variant === 'destructive' ? 'text-red-900' : 'text-gray-900'}
              `}>
                {toast.title}
              </h4>
            )}
            <p className={`
              text-sm
              ${toast.variant === 'destructive' ? 'text-red-700' : 'text-gray-600'}
            `}>
              {toast.description}
            </p>
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className={`
              flex-shrink-0 rounded-md p-1 transition-colors
              ${toast.variant === 'destructive'
                ? 'text-red-500 hover:bg-red-100'
                : 'text-gray-400 hover:bg-gray-100'
              }
            `}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
