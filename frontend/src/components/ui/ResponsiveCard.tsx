import React from 'react';

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'glass' | 'outline';
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
  variant = 'default',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-100 shadow-soft',
    gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-soft',
    glass: 'glass-card',
    outline: 'bg-transparent border-2 border-gray-200',
  };

  const hoverClass = hover 
    ? 'cursor-pointer hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300' 
    : '';

  return (
    <div
      className={`
        rounded-2xl
        ${paddingClasses[padding]}
        ${variantClasses[variant]}
        ${hoverClass}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

// Card with header
interface CardWithHeaderProps extends ResponsiveCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  headerGradient?: string;
}

export const CardWithHeader: React.FC<CardWithHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  headerGradient,
  children,
  ...props
}) => {
  return (
    <ResponsiveCard {...props} padding="none">
      <div className={`
        px-4 sm:px-6 py-4 border-b border-gray-100
        ${headerGradient ? `bg-gradient-to-r ${headerGradient}` : ''}
      `}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${headerGradient ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className={`font-semibold truncate ${headerGradient ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h3>
              {subtitle && (
                <p className={`text-sm truncate ${headerGradient ? 'text-white/80' : 'text-gray-500'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </ResponsiveCard>
  );
};

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  trend?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  trend,
  className = '',
}) => {
  const changeColors = {
    increase: 'text-green-600 bg-green-50',
    decrease: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  return (
    <ResponsiveCard className={className} hover>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 truncate">{value}</p>
          
          {change && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`
                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                ${changeColors[change.type]}
              `}>
                {change.type === 'increase' && '↑'}
                {change.type === 'decrease' && '↓'}
                {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-gray-500">vs prošli mesec</span>
            </div>
          )}
          
          {trend && <div className="mt-3">{trend}</div>}
        </div>
        
        {icon && (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </ResponsiveCard>
  );
};

// Empty State Card
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`text-center py-12 sm:py-16 ${className}`}>
      {icon && (
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
      )}
      {action}
    </div>
  );
};

// Loading Card Skeleton
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <ResponsiveCard>
      <div className="animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${100 - i * 15}%` }} />
        ))}
      </div>
    </ResponsiveCard>
  );
};

export default ResponsiveCard;
