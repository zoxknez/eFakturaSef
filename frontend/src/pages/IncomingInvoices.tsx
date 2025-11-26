import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { RefreshCw, Plus, Filter, Search, Download } from 'lucide-react';

export const IncomingInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadInvoices();
  }, [filters]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.getIncomingInvoices(filters);
      if (response.success && response.data) {
        setInvoices(response.data.data);
      } else {
        toast.error('Neuspešno učitavanje ulaznih faktura');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom učitavanja');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await api.syncIncomingInvoices();
      if (response.success) {
        toast.success(`Sinhronizacija uspešna: ${response.data.synced} novih, ${response.data.errors} grešaka`);
        loadInvoices();
      } else {
        toast.error('Sinhronizacija nije uspela');
      }
    } catch (error) {
      console.error(error);
      toast.error('Greška prilikom sinhronizacije');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status ? status.toUpperCase() : '';
    
    const styles: Record<string, string> = {
      RECEIVED: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800'
    };
    
    const labels: Record<string, string> = {
      RECEIVED: 'Primljena',
      PENDING: 'Na čekanju',
      ACCEPTED: 'Odobrena',
      REJECTED: 'Odbijena',
      CANCELLED: 'Otkazana'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[normalizedStatus] || 'bg-gray-100'}`}>
        {labels[normalizedStatus] || status}
      </span>
    );
  };

  const formatDateSafe = (dateString: string) => {
    try {
      if (!dateString) return '-';
      return format(new Date(dateString), 'dd.MM.yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ulazne Fakture</h1>
          <p className="text-gray-500">Pregled i upravljanje primljenim fakturama</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sinhronizacija...' : 'Sinhronizuj sa SEF-a'}
          </button>
          <Link
            to="/incoming-invoices/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ručni Unos
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pretraži po broju, dobavljaču..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Svi statusi</option>
          <option value="RECEIVED">Primljene</option>
          <option value="PENDING">Na čekanju</option>
          <option value="ACCEPTED">Odobrene</option>
          <option value="REJECTED">Odbijene</option>
        </select>
        <input
          type="date"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
        />
        <input
          type="date"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Broj Fakture</th>
                <th className="px-6 py-3 font-medium text-gray-500">Dobavljač</th>
                <th className="px-6 py-3 font-medium text-gray-500">Datum Izdavanja</th>
                <th className="px-6 py-3 font-medium text-gray-500">Iznos</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-gray-100 rounded-full">
                        <Download className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Nema ulaznih faktura</h3>
                      <p className="max-w-sm text-gray-500">
                        Trenutno nemate učitanih ulaznih faktura. Kliknite na dugme "Sinhronizuj sa SEF-a" da biste preuzeli fakture.
                      </p>
                      <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                        {syncing ? 'Sinhronizacija u toku...' : 'Pokreni sinhronizaciju'}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {invoice.invoiceNumber}
                      {invoice.sefId && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded border border-blue-100">SEF</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="font-medium text-gray-900">{invoice.supplierName}</div>
                      <div className="text-xs text-gray-500">PIB: {invoice.supplierPIB}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDateSafe(invoice.issueDate)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {new Intl.NumberFormat('sr-RS', { style: 'currency', currency: invoice.currency }).format(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/incoming-invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Detalji
                      </Link>
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

export default IncomingInvoices;
