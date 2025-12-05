/**
 * StatusBadge Component - Centralized status badge for all entity types
 * Supports invoices, calculations, fixed assets, orders, compensations, etc.
 */

import React from 'react';
import {
  Check,
  FileEdit,
  X,
  Clock,
  Send,
  Ban,
  HelpCircle,
  DollarSign,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Receipt,
  CreditCard
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Status type definitions
export type StatusType = 
  | 'invoice' 
  | 'calculation' 
  | 'fixedAsset' 
  | 'recurringInvoice'
  | 'compensation'
  | 'advanceInvoice'
  | 'travelOrder'
  | 'bankStatement'
  | 'generic';

export interface StatusConfig {
  bg: string;
  text: string;
  label: string;
  icon: React.ReactNode;
}

// Invoice statuses
const INVOICE_STATUS_CONFIG: Record<string, StatusConfig> = {
  APPROVED: { 
    bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    text: 'text-white',
    label: 'Prihvaćena',
    icon: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
  },
  ACCEPTED: { 
    bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    text: 'text-white',
    label: 'Prihvaćena',
    icon: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
  },
  SENT: { 
    bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    text: 'text-white',
    label: 'Poslata',
    icon: <Send className="w-3.5 h-3.5" />
  },
  DRAFT: { 
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Nacrt',
    icon: <FileEdit className="w-3.5 h-3.5" />
  },
  PENDING: { 
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-white',
    label: 'Na čekanju',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  REJECTED: { 
    bg: 'bg-gradient-to-r from-red-500 to-rose-500',
    text: 'text-white',
    label: 'Odbijena',
    icon: <X className="w-3.5 h-3.5" />
  },
  CANCELLED: { 
    bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
    text: 'text-white',
    label: 'Stornirana',
    icon: <Ban className="w-3.5 h-3.5" />
  },
  STORNO: { 
    bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
    text: 'text-white',
    label: 'Stornirana',
    icon: <Ban className="w-3.5 h-3.5" />
  },
};

// Calculation statuses
const CALCULATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  POSTED: { 
    bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    text: 'text-white',
    label: 'Proknjiženo',
    icon: <Check className="w-3.5 h-3.5" />
  },
  DRAFT: { 
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Nacrt',
    icon: <FileEdit className="w-3.5 h-3.5" />
  },
  CANCELLED: { 
    bg: 'bg-gradient-to-r from-red-500 to-rose-500',
    text: 'text-white',
    label: 'Stornirano',
    icon: <X className="w-3.5 h-3.5" />
  },
};

// Fixed Asset statuses
const FIXED_ASSET_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { 
    bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    text: 'text-white',
    label: 'Aktivno',
    icon: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
  },
  WRITTEN_OFF: { 
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Otpisano',
    icon: <X className="w-3.5 h-3.5" />
  },
  SOLD: { 
    bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    text: 'text-white',
    label: 'Prodato',
    icon: <DollarSign className="w-3.5 h-3.5" />
  },
};

// Recurring Invoice statuses
const RECURRING_INVOICE_STATUS_CONFIG: Record<string, StatusConfig> = {
  ACTIVE: { 
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Aktivno',
    icon: <Play className="w-3.5 h-3.5" />
  },
  PAUSED: { 
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: 'Pauzirano',
    icon: <Pause className="w-3.5 h-3.5" />
  },
  COMPLETED: { 
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Završeno',
    icon: <CheckCircle className="w-3.5 h-3.5" />
  },
  CANCELLED: { 
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Otkazano',
    icon: <XCircle className="w-3.5 h-3.5" />
  },
};

// Compensation statuses
const COMPENSATION_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: { 
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Nacrt',
    icon: <FileEdit className="w-3.5 h-3.5" />
  },
  PENDING: { 
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: 'Na čekanju',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  APPROVED: { 
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Odobreno',
    icon: <Check className="w-3.5 h-3.5" />
  },
  REJECTED: { 
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Odbijeno',
    icon: <X className="w-3.5 h-3.5" />
  },
  COMPLETED: { 
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Završeno',
    icon: <CheckCircle className="w-3.5 h-3.5" />
  },
};

// Advance Invoice statuses
const ADVANCE_INVOICE_STATUS_CONFIG: Record<string, StatusConfig> = {
  DRAFT: { 
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Nacrt',
    icon: <Receipt className="w-3.5 h-3.5" />
  },
  SENT: { 
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Poslata',
    icon: <Send className="w-3.5 h-3.5" />
  },
  ISSUED: { 
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Izdata',
    icon: <Send className="w-3.5 h-3.5" />
  },
  PAID: { 
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Plaćena',
    icon: <CheckCircle className="w-3.5 h-3.5" />
  },
  PARTIALLY_USED: { 
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: 'Delimično iskorišćena',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  FULLY_USED: { 
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'Potpuno iskorišćena',
    icon: <CheckCircle className="w-3.5 h-3.5" />
  },
  CANCELLED: { 
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Stornirana',
    icon: <XCircle className="w-3.5 h-3.5" />
  },
};

// Bank Statement statuses
const BANK_STATEMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: { 
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: 'Na čekanju',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  MATCHED: { 
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Upareno',
    icon: <Check className="w-3.5 h-3.5" />
  },
  UNMATCHED: { 
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Neupareno',
    icon: <AlertTriangle className="w-3.5 h-3.5" />
  },
  PARTIAL: { 
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Delimično',
    icon: <CreditCard className="w-3.5 h-3.5" />
  },
};

// Get config map based on status type
const getConfigMap = (type: StatusType): Record<string, StatusConfig> => {
  switch (type) {
    case 'invoice':
      return INVOICE_STATUS_CONFIG;
    case 'calculation':
      return CALCULATION_STATUS_CONFIG;
    case 'fixedAsset':
      return FIXED_ASSET_STATUS_CONFIG;
    case 'recurringInvoice':
      return RECURRING_INVOICE_STATUS_CONFIG;
    case 'compensation':
      return COMPENSATION_STATUS_CONFIG;
    case 'advanceInvoice':
      return ADVANCE_INVOICE_STATUS_CONFIG;
    case 'bankStatement':
      return BANK_STATEMENT_STATUS_CONFIG;
    default:
      return INVOICE_STATUS_CONFIG;
  }
};

// Default config for unknown statuses
const getDefaultConfig = (status: string): StatusConfig => ({
  bg: 'bg-gray-100',
  text: 'text-gray-700',
  label: status || 'Nepoznato',
  icon: <HelpCircle className="w-3.5 h-3.5" />
});

export interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'generic',
  size = 'md',
  className,
  showIcon = true
}) => {
  const normalizedStatus = status?.toUpperCase() || '';
  const configMap = getConfigMap(type);
  const config = configMap[normalizedStatus] || getDefaultConfig(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm'
  };

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-bold',
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};

// Simple version for backwards compatibility
export const SimpleStatusBadge: React.FC<{ status: string; className?: string }> = ({ 
  status, 
  className 
}) => {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  const labels: Record<string, string> = {
    DRAFT: 'Nacrt',
    SENT: 'Poslato',
    APPROVED: 'Odobreno',
    ACCEPTED: 'Prihvaćeno',
    REJECTED: 'Odbijeno',
    CANCELLED: 'Stornirano',
  };

  const normalizedStatus = status?.toUpperCase() || 'DRAFT';

  return (
    <span className={cn(
      'px-2 py-1 rounded-full text-xs font-medium',
      styles[normalizedStatus] || 'bg-gray-100 text-gray-800',
      className
    )}>
      {labels[normalizedStatus] || status}
    </span>
  );
};

export default StatusBadge;
