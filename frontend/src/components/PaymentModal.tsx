import React, { useState } from 'react';
import api from '../services/api';
import { logger } from '../utils/logger';

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHECK' | 'COMPENSATION' | 'OTHER';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount?: number;
    paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
    currency?: string;
  };
  onPaymentRecorded: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    method: 'BANK_TRANSFER' as PaymentMethod,
    paymentDate: new Date().toISOString().split('T')[0],
    bankAccount: '',
    reference: '',
    note: '',
  });

  if (!isOpen) return null;

  const totalAmount = Number(invoice.totalAmount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const remainingAmount = totalAmount - paidAmount;
  const currency = invoice.currency || 'RSD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(formData.amount);
    
    if (paymentAmount <= 0) {
      alert('Iznos plaćanja mora biti veći od 0');
      return;
    }

    if (paymentAmount > remainingAmount) {
      alert(`Iznos plaćanja (${paymentAmount.toFixed(2)}) ne može biti veći od preostalog iznosa (${remainingAmount.toFixed(2)})`);
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.createPayment({
        invoiceId: invoice.id,
        amount: paymentAmount,
        currency,
        method: formData.method,
        paymentDate: new Date(formData.paymentDate).toISOString(),
        bankAccount: formData.bankAccount || undefined,
        reference: formData.reference || undefined,
        note: formData.note || undefined,
      });

      if (response.success) {
        alert('Plaćanje uspešno evidentirano!');
        onPaymentRecorded();
        onClose();
        // Reset form
        setFormData({
          amount: '',
          method: 'BANK_TRANSFER',
          paymentDate: new Date().toISOString().split('T')[0],
          bankAccount: '',
          reference: '',
          note: '',
        });
      } else {
        alert(response.error || 'Greška pri evidentiranju plaćanja');
      }
    } catch (error) {
      logger.error('Failed to record payment', error);
      alert('Greška pri evidentiranju plaćanja');
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">💰 Evidentiraj Plaćanje</h2>
          <p className="text-sm text-green-100 mt-1">Faktura: {invoice.invoiceNumber}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ukupan Iznos</p>
                <p className="text-lg font-bold text-gray-900">
                  {totalAmount.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Plaćeno</p>
                <p className="text-lg font-bold text-green-600">
                  {paidAmount.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Preostalo</p>
                <p className="text-lg font-bold text-orange-600">
                  {remainingAmount.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} {currency}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Iznos Plaćanja * ({currency})
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0.01"
                  max={remainingAmount}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-24"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: remainingAmount.toFixed(2) })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Ceo iznos
                </button>
              </div>
              {formData.amount && parseFloat(formData.amount) > remainingAmount && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Iznos prelazi preostali dug!
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Način Plaćanja *
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
              >
                <option value="BANK_TRANSFER">{getPaymentMethodLabel('BANK_TRANSFER')}</option>
                <option value="CASH">{getPaymentMethodLabel('CASH')}</option>
                <option value="CARD">{getPaymentMethodLabel('CARD')}</option>
                <option value="CHECK">{getPaymentMethodLabel('CHECK')}</option>
                <option value="COMPENSATION">{getPaymentMethodLabel('COMPENSATION')}</option>
                <option value="OTHER">{getPaymentMethodLabel('OTHER')}</option>
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum Plaćanja *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
            </div>

            {/* Bank Account (optional) */}
            {formData.method === 'BANK_TRANSFER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Broj Računa
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  placeholder="npr. 160-0000000000000-00"
                />
              </div>
            )}

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referenca / Broj Naloga
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="npr. 00001234"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Napomena
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Dodatne informacije o plaćanju..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Evidentiranje...
                  </>
                ) : (
                  <>
                    💰 Evidentiraj Plaćanje
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
