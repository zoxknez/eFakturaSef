// Responsive container components
import React, { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

// Main container with max-width
export function Container({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn('container mx-auto px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}

// Responsive grid
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4,
  className,
}: ResponsiveGridProps) {
  const gridClasses = cn(
    'grid',
    `gap-${gap}`,
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  );

  return <div className={gridClasses}>{children}</div>;
}

// Mobile drawer/sidebar
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function MobileDrawer({ isOpen, onClose, children, title }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-xl',
          'transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Zatvori"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-full">{children}</div>
      </div>
    </>
  );
}

// Responsive table wrapper
export function ResponsiveTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized card
export function MobileCard({ children, className }: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm',
        'p-4 sm:p-6',
        'border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {children}
    </div>
  );
}

// Stack layout (vertical on mobile, horizontal on desktop)
interface StackProps {
  children: ReactNode;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  gap?: number;
  className?: string;
}

export function Stack({
  children,
  direction = 'responsive',
  gap = 4,
  className,
}: StackProps) {
  const directionClasses = {
    vertical: 'flex-col',
    horizontal: 'flex-row',
    responsive: 'flex-col md:flex-row',
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        `gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
}



