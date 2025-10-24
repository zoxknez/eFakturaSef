// Loading spinner component
import React from 'react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-blue-600 border-t-transparent',
          sizeClasses[size]
        )}
      />
      {text && <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>}
    </div>
  );
}

// Full page loading
export function FullPageLoading({ text = 'Učitavanje...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Inline loading
export function InlineLoading({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <LoadingSpinner size="sm" />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}

// Button loading state
export function ButtonLoading() {
  return (
    <div className="flex items-center gap-2">
      <LoadingSpinner size="sm" />
      <span>Procesiranje...</span>
    </div>
  );
}

