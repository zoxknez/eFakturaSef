import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
  bankAccount?: string;
  reference?: string;
  status: string;
  note?: string;
  createdAt: string;
}

interface PaymentHistoryProps {
  invoiceId: string;
  onPaymentCancelled?: () => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ invoiceId, onPaymentCancelled }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, [invoiceId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.getInvoicePayments(invoiceId);
      
      if (response.success && response.data) {
        setPayments(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    if (!confirm('Da li ste sigurni da želite da stornirate ovo plaćanje?')) {
      return;
    }

    try {
      const response = await api.cancelPayment(paymentId);
      
      if (response.success) {
        alert('Plaćanje uspešno stornirano!');
        fetchPayments();
        if (onPaymentCancelled) {
          onPaymentCancelled();
        }
      } else {
        alert(response.error || 'Greška pri storniranju plaćanja');
      }
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      alert('Greška pri storniranju plaćanja');
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return '💵 Gotovina';
      case 'BANK_TRANSFER': return '🏦 Virman';
      case 'CARD': return '💳 Kartica';
      case 'CHECK': return '📝 Ček';
      case 'COMPENSATION': return '🔄 Kompenzacija';
      case 'OTHER': return '📋 Ostalo';
      default: return method;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLEARED':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✅ Proknjiženo</span>;
      case 'PENDING':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">⏳ Na čekanju</span>;
      case 'CANCELLED':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">❌ Stornirano</span>;
      case 'BOUNCED':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">🔙 Vraćeno</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500 mt-2">Učitavanje istorije plaćanja...</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Nema evidentiranih plaćanja</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className={`bg-white border rounded-lg p-4 ${
            payment.status === 'CANCELLED' ? 'opacity-60 border-red-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-bold text-gray-900">
                  {payment.amount.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {payment.currency}
                </span>
                {getStatusBadge(payment.status)}
                <span className="text-sm text-gray-500">{getPaymentMethodLabel(payment.method)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Datum plaćanja:</span>
                  <span className="ml-2 text-gray-900 font-medium">{formatDate(payment.paymentDate)}</span>
                </div>
                
                {payment.reference && (
                  <div>
                    <span className="text-gray-500">Referenca:</span>
                    <span className="ml-2 text-gray-900">{payment.reference}</span>
                  </div>
                )}

                {payment.bankAccount && (
                  <div>
                    <span className="text-gray-500">Račun:</span>
                    <span className="ml-2 text-gray-900 font-mono text-xs">{payment.bankAccount}</span>
                  </div>
                )}

                <div>
                  <span className="text-gray-500">Evidentirano:</span>
                  <span className="ml-2 text-gray-900">{formatDate(payment.createdAt)}</span>
                </div>
              </div>

              {payment.note && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-500">Napomena:</span>
                  <span className="ml-2 text-gray-700 italic">{payment.note}</span>
                </div>
              )}
            </div>

            {payment.status !== 'CANCELLED' && (
              <button
                onClick={() => handleCancelPayment(payment.id)}
                className="ml-4 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded"
              >
                ❌ Storniraj
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaymentHistory;
