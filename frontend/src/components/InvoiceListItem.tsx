import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date | string;
  buyerName: string;
  totalAmount: number;
  currency: string;
  status: string;
}

interface InvoiceListItemProps {
  invoice: Invoice;
}

const getStatusColor = (status: string): string => {
  const s = status.toUpperCase();
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    NEW: 'bg-blue-50 text-blue-600',
    SENT: 'bg-blue-100 text-blue-700',
    SENDING: 'bg-blue-50 text-blue-600 animate-pulse',
    APPROVED: 'bg-green-100 text-green-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    STORNO: 'bg-orange-100 text-orange-700',
    MISTAKE: 'bg-red-50 text-red-600',
    DELIVERED: 'bg-cyan-100 text-cyan-700',
  };
  return colors[s] || 'bg-gray-100 text-gray-700';
};

const getStatusLabel = (status: string): string => {
  const s = status.toUpperCase();
  const labels: Record<string, string> = {
    DRAFT: 'Nacrt',
    NEW: 'Novo',
    SENT: 'Poslato',
    SENDING: 'Slanje u toku',
    APPROVED: 'Odobreno',
    ACCEPTED: 'Odobreno',
    REJECTED: 'Odbijeno',
    CANCELLED: 'Otkazano',
    STORNO: 'Stornirano',
    MISTAKE: 'Greška',
    DELIVERED: 'Dostavljeno',
  };
  return labels[s] || status;
};

/**
 * Memoized Invoice List Item component
 * Prevents unnecessary re-renders when parent updates
 */
export const InvoiceListItem = React.memo<InvoiceListItemProps>(({ invoice }) => {
  const issueDate = typeof invoice.issueDate === 'string' 
    ? new Date(invoice.issueDate) 
    : invoice.issueDate;

  return (
    <Link
      to={`/invoices/${invoice.id}`}
      className="block bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {invoice.invoiceNumber}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
              {getStatusLabel(invoice.status)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            {invoice.buyerName}
          </p>
          <p className="text-xs text-gray-500">
            {format(issueDate, 'dd.MM.yyyy')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {invoice.totalAmount.toLocaleString('sr-RS', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-sm text-gray-500">{invoice.currency}</p>
        </div>
      </div>
    </Link>
  );
});

InvoiceListItem.displayName = 'InvoiceListItem';
