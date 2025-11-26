import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recurringInvoiceService, RecurringInvoice, RecurringFrequency, RecurringInvoiceStatus } from '../services/recurringInvoiceService';
import { format } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export const RecurringInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await recurringInvoiceService.getAll();
      if (response.success && response.data) {
        setInvoices(response.data);
      } else {
        toast.error('Neuspešno učitavanje periodičnih faktura');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom učitavanja');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Da li ste sigurni da želite da otkažete ovo periodično fakturisanje?')) {
      return;
    }

    try {
      const response = await recurringInvoiceService.delete(id);
      if (response.success) {
        toast.success('Uspešno otkazano');
        loadInvoices();
      } else {
        toast.error('Neuspešno otkazivanje');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom brisanja');
    }
  };

  const getFrequencyLabel = (freq: RecurringFrequency) => {
    switch (freq) {
      case RecurringFrequency.WEEKLY: return 'Nedeljno';
      case RecurringFrequency.MONTHLY: return 'Mesečno';
      case RecurringFrequency.QUARTERLY: return 'Kvartalno';
      case RecurringFrequency.YEARLY: return 'Godišnje';
      default: return freq;
    }
  };

  const getStatusBadge = (status: RecurringInvoiceStatus) => {
    switch (status) {
      case RecurringInvoiceStatus.ACTIVE:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktivno</span>;
      case RecurringInvoiceStatus.PAUSED:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pauzirano</span>;
      case RecurringInvoiceStatus.COMPLETED:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Završeno</span>;
      case RecurringInvoiceStatus.CANCELLED:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Otkazano</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Učitavanje...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Periodične Fakture</h1>
          <p className="text-gray-500">Automatizovano kreiranje faktura</p>
        </div>
        <Link
          to="/recurring-invoices/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Periodična Faktura
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Partner</th>
                <th className="px-6 py-3 font-medium text-gray-500">Frekvencija</th>
                <th className="px-6 py-3 font-medium text-gray-500">Sledeće slanje</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nema definisanih periodičnih faktura
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {invoice.partner?.name || 'Nepoznat partner'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {getFrequencyLabel(invoice.frequency)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {format(new Date(invoice.nextRunAt), 'dd. MMM yyyy.', { locale: srLatn })}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                        disabled={invoice.status === RecurringInvoiceStatus.CANCELLED}
                      >
                        Otkaži
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecurringInvoices;
