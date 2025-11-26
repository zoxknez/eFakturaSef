/**
 * Quick Stats Widget Component
 * Reusable dashboard stat card with animations and interactions
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface QuickStatProps {
  title: string;
  value: number | string;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  link?: string;
  loading?: boolean;
  subtitle?: string;
  sparkline?: number[];
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/25',
  },
  green: {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    gradient: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/25',
  },
  red: {
    bg: 'bg-red-500',
    light: 'bg-red-50',
    text: 'text-red-600',
    gradient: 'from-red-500 to-red-600',
    shadow: 'shadow-red-500/25',
  },
  yellow: {
    bg: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    gradient: 'from-amber-500 to-amber-600',
    shadow: 'shadow-amber-500/25',
  },
  purple: {
    bg: 'bg-violet-500',
    light: 'bg-violet-50',
    text: 'text-violet-600',
    gradient: 'from-violet-500 to-violet-600',
    shadow: 'shadow-violet-500/25',
  },
  cyan: {
    bg: 'bg-cyan-500',
    light: 'bg-cyan-50',
    text: 'text-cyan-600',
    gradient: 'from-cyan-500 to-cyan-600',
    shadow: 'shadow-cyan-500/25',
  },
};

// Animated number component
const AnimatedNumber: React.FC<{ 
  value: number; 
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
}> = ({ value, format = 'number', currency = 'RSD' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (value - startValue) * easeOut;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('sr-RS', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(displayValue));
      case 'percent':
        return `${displayValue.toFixed(1)}%`;
      default:
        return Math.round(displayValue).toLocaleString('sr-RS');
    }
  }, [displayValue, format, currency]);

  return <span>{formattedValue}</span>;
};

// Mini sparkline chart
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 30;
  const width = 80;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const QuickStat: React.FC<QuickStatProps> = ({
  title,
  value,
  previousValue,
  format = 'number',
  currency = 'RSD',
  icon,
  color,
  trend,
  trendLabel,
  link,
  loading = false,
  subtitle,
  sparkline,
}) => {
  const colors = colorClasses[color];
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));

  // Calculate trend if not provided
  const calculatedTrend = useMemo(() => {
    if (trend) return trend;
    if (previousValue !== undefined && typeof numericValue === 'number') {
      const diff = numericValue - previousValue;
      if (diff > 0) return 'up';
      if (diff < 0) return 'down';
    }
    return 'neutral';
  }, [trend, previousValue, numericValue]);

  const trendPercentage = useMemo(() => {
    if (trendLabel) return trendLabel;
    if (previousValue !== undefined && previousValue !== 0 && typeof numericValue === 'number') {
      const percent = ((numericValue - previousValue) / previousValue) * 100;
      return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
    }
    return null;
  }, [trendLabel, previousValue, numericValue]);

  const content = (
    <div className={`
      group relative bg-white rounded-2xl p-5 border border-gray-100 
      shadow-sm hover:shadow-xl ${colors.shadow} 
      transition-all duration-300 hover:-translate-y-1
      ${link ? 'cursor-pointer' : ''}
    `}>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? (
              <AnimatedNumber value={value} format={format} currency={currency} />
            ) : (
              value
            )}
          </p>
          
          {/* Trend indicator */}
          {(trendPercentage || subtitle) && (
            <div className="flex items-center gap-2 mt-2">
              {trendPercentage && (
                <span className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                  ${calculatedTrend === 'up' ? 'bg-emerald-100 text-emerald-700' : ''}
                  ${calculatedTrend === 'down' ? 'bg-red-100 text-red-700' : ''}
                  ${calculatedTrend === 'neutral' ? 'bg-gray-100 text-gray-600' : ''}
                `}>
                  {calculatedTrend === 'up' && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                  {calculatedTrend === 'down' && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {trendPercentage}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-gray-400">{subtitle}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} 
          flex items-center justify-center text-white text-xl
          shadow-lg ${colors.shadow}
          group-hover:scale-110 transition-transform duration-300
        `}>
          {icon}
        </div>
      </div>

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <Sparkline data={sparkline} color={colors.bg.replace('bg-', '#').replace('-500', '')} />
        </div>
      )}

      {/* Hover indicator for clickable cards */}
      {link && (
        <div className={`
          absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}
          opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl
        `} />
      )}
    </div>
  );

  if (link) {
    return <Link to={link} className="block">{content}</Link>;
  }

  return content;
};

export default QuickStat;
