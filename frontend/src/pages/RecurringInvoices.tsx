/**
 * Recurring Invoices Page - Periodične Fakture
 * Upravljanje automatskim generisanjem faktura
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  recurringInvoiceService, 
  RecurringFrequency, 
  RecurringInvoiceStatus,
  type RecurringInvoiceListItem 
} from '../services/recurringInvoiceService';
import { format } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useDebounce } from '../hooks/useDebounce';
import { logger } from '../utils/logger';
import {
  Plus,
  Calendar,
  RefreshCw,
  Pause,
  Play,
  XCircle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  CalendarDays
} from 'lucide-react';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE: { label: 'Aktivno', color: 'bg-green-100 text-green-700', icon: Play },
  PAUSED: { label: 'Pauzirano', color: 'bg-yellow-100 text-yellow-700', icon: Pause },
  COMPLETED: { label: 'Završeno', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  CANCELLED: { label: 'Otkazano', color: 'bg-red-100 text-red-700', icon: XCircle },
};

// Frequency configuration
const FREQUENCY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  WEEKLY: { label: 'Nedeljno', icon: Calendar },
  MONTHLY: { label: 'Mesečno', icon: CalendarDays },
  QUARTERLY: { label: 'Kvartalno', icon: CalendarDays },
  YEARLY: { label: 'Godišnje', icon: CalendarDays },
};

export const RecurringInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<RecurringInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: () => {},
  });

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await recurringInvoiceService.getAll();
      if (response.success && response.data) {
        setInvoices(response.data);
      } else {
        toast.error(response.error || 'Neuspešno učitavanje periodičnih faktura');
      }
    } catch (error) {
      logger.error('Error loading recurring invoices:', error);
      toast.error('Greška prilikom učitavanja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Search filter
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        const matchesPartner = invoice.partner?.name?.toLowerCase().includes(search);
        const matchesPib = invoice.partner?.pib?.includes(search);
        if (!matchesPartner && !matchesPib) return false;
      }
      
      // Status filter
      if (statusFilter && invoice.status !== statusFilter) {
        return false;
      }
      
      return true;
    });
  }, [invoices, debouncedSearch, statusFilter]);

  // Summary counts
  const summary = useMemo(() => {
    return {
      total: invoices.length,
      active: invoices.filter(i => i.status === RecurringInvoiceStatus.ACTIVE).length,
      paused: invoices.filter(i => i.status === RecurringInvoiceStatus.PAUSED).length,
      completed: invoices.filter(i => i.status === RecurringInvoiceStatus.COMPLETED).length,
      cancelled: invoices.filter(i => i.status === RecurringInvoiceStatus.CANCELLED).length,
    };
  }, [invoices]);

  const setInvoiceActionLoading = (id: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [id]: loading }));
  };

  const handleCancel = async (invoice: RecurringInvoiceListItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Otkaži periodičnu fakturu',
      message: `Da li ste sigurni da želite da otkažete periodično fakturisanje za partnera "${invoice.partner?.name || 'Nepoznat'}"? Ova akcija se ne može poništiti.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          setInvoiceActionLoading(invoice.id, true);
          const response = await recurringInvoiceService.cancel(invoice.id);
          if (response.success) {
            toast.success('Periodična faktura je otkazana');
            loadInvoices();
          } else {
            toast.error(response.error || 'Neuspešno otkazivanje');
          }
        } catch (error) {
          logger.error('Error cancelling recurring invoice:', error);
          toast.error('Greška prilikom otkazivanja');
        } finally {
          setInvoiceActionLoading(invoice.id, false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handlePause = async (invoice: RecurringInvoiceListItem) => {
    try {
      setInvoiceActionLoading(invoice.id, true);
      const response = await recurringInvoiceService.pause(invoice.id);
      if (response.success) {
        toast.success('Periodična faktura je pauzirana');
        loadInvoices();
      } else {
        toast.error(response.error || 'Neuspešno pauziranje');
      }
    } catch (error) {
      logger.error('Error pausing recurring invoice:', error);
      toast.error('Greška prilikom pauziranja');
    } finally {
      setInvoiceActionLoading(invoice.id, false);
    }
  };

  const handleResume = async (invoice: RecurringInvoiceListItem) => {
    try {
      setInvoiceActionLoading(invoice.id, true);
      const response = await recurringInvoiceService.resume(invoice.id);
      if (response.success) {
        toast.success('Periodična faktura je nastavljena');
        loadInvoices();
      } else {
        toast.error(response.error || 'Neuspešno nastavljanje');
      }
    } catch (error) {
      logger.error('Error resuming recurring invoice:', error);
      toast.error('Greška prilikom nastavljanja');
    } finally {
      setInvoiceActionLoading(invoice.id, false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    return FREQUENCY_CONFIG[freq]?.label || freq;
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd. MMM yyyy.', { locale: srLatn });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Periodične Fakture</h1>
          <p className="text-gray-500">Automatizovano kreiranje faktura</p>
        </div>
        <Link
          to="/recurring-invoices/new"
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-5 h-5" />
          Nova Periodična Faktura
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => setStatusFilter('')}
          className={`p-4 rounded-xl border transition-all ${
            statusFilter === '' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-sm text-gray-500">Ukupno</p>
        </button>
        <button
          onClick={() => setStatusFilter(RecurringInvoiceStatus.ACTIVE)}
          className={`p-4 rounded-xl border transition-all ${
            statusFilter === RecurringInvoiceStatus.ACTIVE ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-green-600">{summary.active}</p>
          <p className="text-sm text-gray-500">Aktivno</p>
        </button>
        <button
          onClick={() => setStatusFilter(RecurringInvoiceStatus.PAUSED)}
          className={`p-4 rounded-xl border transition-all ${
            statusFilter === RecurringInvoiceStatus.PAUSED ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-yellow-600">{summary.paused}</p>
          <p className="text-sm text-gray-500">Pauzirano</p>
        </button>
        <button
          onClick={() => setStatusFilter(RecurringInvoiceStatus.COMPLETED)}
          className={`p-4 rounded-xl border transition-all ${
            statusFilter === RecurringInvoiceStatus.COMPLETED ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-blue-600">{summary.completed}</p>
          <p className="text-sm text-gray-500">Završeno</p>
        </button>
        <button
          onClick={() => setStatusFilter(RecurringInvoiceStatus.CANCELLED)}
          className={`p-4 rounded-xl border transition-all ${
            statusFilter === RecurringInvoiceStatus.CANCELLED ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-red-600">{summary.cancelled}</p>
          <p className="text-sm text-gray-500">Otkazano</p>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pretraži po partneru ili PIB-u..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Poništi filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Partner</th>
                <th className="px-6 py-3 font-medium text-gray-500">Frekvencija</th>
                <th className="px-6 py-3 font-medium text-gray-500">Sledeće slanje</th>
                <th className="px-6 py-3 font-medium text-gray-500">Poslednje slanje</th>
                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">Nema periodičnih faktura</p>
                        <p className="text-gray-500 text-sm">
                          {searchTerm || statusFilter 
                            ? 'Promenite kriterijume pretrage'
                            : 'Kreirajte prvu periodičnu fakturu'}
                        </p>
                      </div>
                      {!searchTerm && !statusFilter && (
                        <Link
                          to="/recurring-invoices/new"
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Nova Periodična Faktura
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {invoice.partner?.name || 'Nepoznat partner'}
                        </p>
                        <p className="text-xs text-gray-500">
                          PIB: {invoice.partner?.pib || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {getFrequencyLabel(invoice.frequency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {invoice.status === RecurringInvoiceStatus.ACTIVE || invoice.status === RecurringInvoiceStatus.PAUSED ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          {formatDate(invoice.nextRunAt)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {invoice.lastRunAt ? formatDate(invoice.lastRunAt) : (
                        <span className="text-gray-400">Nikad</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {actionLoading[invoice.id] ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            {invoice.status === RecurringInvoiceStatus.ACTIVE && (
                              <button
                                onClick={() => handlePause(invoice)}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Pauziraj"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )}
                            {invoice.status === RecurringInvoiceStatus.PAUSED && (
                              <button
                                onClick={() => handleResume(invoice)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Nastavi"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {(invoice.status === RecurringInvoiceStatus.ACTIVE || 
                              invoice.status === RecurringInvoiceStatus.PAUSED) && (
                              <button
                                onClick={() => handleCancel(invoice)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Otkaži"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  );
};

export default RecurringInvoices;
