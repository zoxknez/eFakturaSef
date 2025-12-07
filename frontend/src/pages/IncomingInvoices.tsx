import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfYear } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useDebounce } from '../hooks/useDebounce';
import { logger } from '../utils/logger';
import { 
  RefreshCw, Plus, Search, Download, FileText, FileSpreadsheet,
  ChevronLeft, ChevronRight, Check, X, Clock, CreditCard
} from 'lucide-react';
import type { 
  IncomingInvoiceListItem, 
  IncomingInvoiceFilterParams,
  IncomingInvoiceStatusCounts,
  IncomingInvoicePaymentCounts
} from '@sef-app/shared';

// Date range presets
type DateRangePreset = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisYear';

const getDateRange = (preset: DateRangePreset): { dateFrom: string; dateTo: string } => {
  const now = new Date();
  switch (preset) {
    case 'today':
      const today = format(now, 'yyyy-MM-dd');
      return { dateFrom: today, dateTo: today };
    case 'thisWeek':
      return { 
        dateFrom: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        dateTo: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      };
    case 'thisMonth':
      return { 
        dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(now), 'yyyy-MM-dd')
      };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { 
        dateFrom: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      };
    case 'thisYear':
      return { 
        dateFrom: format(startOfYear(now), 'yyyy-MM-dd'),
        dateTo: format(now, 'yyyy-MM-dd')
      };
    default:
      return { dateFrom: '', dateTo: '' };
  }
};

// Sort options
interface SortOption {
  label: string;
  value: string;
  sortBy: IncomingInvoiceFilterParams['sortBy'];
  sortOrder: 'asc' | 'desc';
}

const sortOptions: SortOption[] = [
  { label: 'Najnovije', value: 'date-desc', sortBy: 'issueDate', sortOrder: 'desc' },
  { label: 'Najstarije', value: 'date-asc', sortBy: 'issueDate', sortOrder: 'asc' },
  { label: 'Iznos ↓', value: 'amount-desc', sortBy: 'totalAmount', sortOrder: 'desc' },
  { label: 'Iznos ↑', value: 'amount-asc', sortBy: 'totalAmount', sortOrder: 'asc' },
  { label: 'Rok plaćanja ↑', value: 'due-asc', sortBy: 'dueDate', sortOrder: 'asc' },
  { label: 'Broj fakture', value: 'number-asc', sortBy: 'invoiceNumber', sortOrder: 'asc' },
];

export const IncomingInvoices: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [invoices, setInvoices] = useState<IncomingInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkRejectDialog, setBulkRejectDialog] = useState<{ open: boolean; reason: string }>({ open: false, reason: '' });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Counts
  const [statusCounts, setStatusCounts] = useState<IncomingInvoiceStatusCounts>({
    all: 0, received: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0
  });
  const [paymentCounts, setPaymentCounts] = useState<IncomingInvoicePaymentCounts>({
    all: 0, unpaid: 0, partiallyPaid: 0, paid: 0, overdue: 0
  });
  
  // Filters
  const [filters, setFilters] = useState<IncomingInvoiceFilterParams>({
    page: 1,
    limit: 20,
    search: '',
    status: undefined,
    paymentStatus: undefined,
    dateFrom: '',
    dateTo: '',
    sortBy: 'issueDate',
    sortOrder: 'desc'
  });
  
  const [searchInput, setSearchInput] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [activeTab, setActiveTab] = useState<'status' | 'payment'>('status');
  
  // Debounce search
  const debouncedSearch = useDebounce(searchInput, 300);
  
  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);
  
  // Load invoices
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getIncomingInvoices(filters);
      
      if (response.success && response.data) {
        setInvoices(response.data.data);
        setPagination(response.data.pagination);
        
        if (response.data.statusCounts) {
          setStatusCounts(response.data.statusCounts);
        }
        if (response.data.paymentCounts) {
          setPaymentCounts(response.data.paymentCounts);
        }
      } else {
        toast.error(response.error || 'Neuspešno učitavanje ulaznih faktura');
      }
    } catch (error) {
      logger.error('Error loading invoices', error);
      toast.error('Greška prilikom učitavanja');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load status counts separately for accurate tab counts
  const loadCounts = useCallback(async () => {
    try {
      const [statusRes, paymentRes] = await Promise.all([
        api.getIncomingInvoiceStatusCounts(),
        api.getIncomingInvoicePaymentCounts()
      ]);
      
      if (statusRes.success && statusRes.data) {
        setStatusCounts(statusRes.data);
      }
      if (paymentRes.success && paymentRes.data) {
        setPaymentCounts(paymentRes.data);
      }
    } catch (error) {
      logger.error('Error loading counts', error);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Handle sync from SEF
  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await api.syncIncomingInvoices();
      
      if (response.success && response.data) {
        toast.success(`Sinhronizacija uspešna: ${response.data.synced} novih, ${response.data.errors} grešaka`);
        loadInvoices();
        loadCounts();
      } else {
        toast.error(response.error || 'Sinhronizacija nije uspela');
      }
    } catch (error) {
      logger.error('Sync error', error);
      toast.error('Greška prilikom sinhronizacije');
    } finally {
      setSyncing(false);
    }
  };

  // Handle date range preset change
  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    const { dateFrom, dateTo } = getDateRange(preset);
    setFilters(prev => ({ ...prev, dateFrom, dateTo, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (sortValue: string) => {
    const option = sortOptions.find(o => o.value === sortValue);
    if (option) {
      setFilters(prev => ({ 
        ...prev, 
        sortBy: option.sortBy, 
        sortOrder: option.sortOrder,
        page: 1 
      }));
    }
  };

  // Handle status filter from tabs
  const handleStatusFilter = (status: string | undefined) => {
    setFilters(prev => ({ ...prev, status, paymentStatus: undefined, page: 1 }));
  };

  // Handle payment status filter
  const handlePaymentFilter = (paymentStatus: string | undefined) => {
    setFilters(prev => ({ ...prev, paymentStatus, status: undefined, page: 1 }));
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setFilters(prev => ({ ...prev, page }));
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map(inv => inv.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Bulk actions
  const handleBulkAccept = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      setBulkProcessing(true);
      const response = await api.bulkUpdateIncomingInvoiceStatus(
        Array.from(selectedIds),
        'ACCEPTED'
      );
      
      if (response.success && response.data) {
        toast.success(`Odobreno ${response.data.processed} faktura`);
        setSelectedIds(new Set());
        loadInvoices();
        loadCounts();
      } else {
        toast.error(response.error || 'Greška pri odobravanju');
      }
    } catch (error) {
      logger.error('Bulk accept error', error);
      toast.error('Greška pri odobravanju faktura');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkReject = async (reason?: string) => {
    if (selectedIds.size === 0) return;
    
    if (reason === undefined) {
      setBulkRejectDialog({ open: true, reason: '' });
      return;
    }
    
    try {
      setBulkProcessing(true);
      const response = await api.bulkUpdateIncomingInvoiceStatus(
        Array.from(selectedIds),
        'REJECTED',
        reason || undefined
      );
      
      if (response.success && response.data) {
        toast.success(`Odbijeno ${response.data.processed} faktura`);
        setSelectedIds(new Set());
        loadInvoices();
        loadCounts();
      } else {
        toast.error(response.error || 'Greška pri odbijanju');
      }
    } catch (error) {
      logger.error('Bulk reject error', error);
      toast.error('Greška pri odbijanju faktura');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Export handlers
  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      await api.exportIncomingInvoices({ ...filters, format });
      toast.success(`Export u ${format.toUpperCase()} uspešan`);
    } catch (error) {
      logger.error('Export error', error);
      toast.error('Greška pri exportu');
    } finally {
      setExporting(false);
    }
  };

  // Status badge component
  const getStatusBadge = (status: string) => {
    const normalizedStatus = status?.toUpperCase() || '';
    
    const config: Record<string, { bg: string; text: string; label: string }> = {
      RECEIVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Primljena' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Na čekanju' },
      ACCEPTED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Odobrena' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Odbijena' },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Otkazana' }
    };
    
    const style = config[normalizedStatus] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Payment status badge
  const getPaymentBadge = (status: string) => {
    const normalizedStatus = status?.toUpperCase() || '';
    
    const config: Record<string, { bg: string; text: string; label: string }> = {
      UNPAID: { bg: 'bg-red-100', text: 'text-red-800', label: 'Neplaćeno' },
      PARTIALLY_PAID: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Delimično' },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Plaćeno' },
      OVERDUE: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Prekoračeno' }
    };
    
    const style = config[normalizedStatus] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Format date safely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy');
    } catch {
      return dateString;
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'RSD') => {
    return new Intl.NumberFormat('sr-RS', { 
      style: 'currency', 
      currency 
    }).format(amount);
  };

  // Current sort value
  const currentSortValue = useMemo(() => {
    const option = sortOptions.find(
      o => o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder
    );
    return option?.value || 'date-desc';
  }, [filters.sortBy, filters.sortOrder]);

  // Loading skeleton
  if (loading && invoices.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ulazne Fakture</h1>
          <p className="text-gray-500">Pregled i upravljanje primljenim fakturama</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('xlsx')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> CSV
              </button>
            </div>
          </div>
          
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

      {/* Status/Payment Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'status' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            Po statusu
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'payment' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-1" />
            Po plaćanju
          </button>
        </div>
        
        {activeTab === 'status' ? (
          <div className="flex flex-wrap gap-1">
            {[
              { key: undefined, label: 'Sve', count: statusCounts.all },
              { key: 'RECEIVED', label: 'Primljene', count: statusCounts.received },
              { key: 'PENDING', label: 'Na čekanju', count: statusCounts.pending },
              { key: 'ACCEPTED', label: 'Odobrene', count: statusCounts.accepted },
              { key: 'REJECTED', label: 'Odbijene', count: statusCounts.rejected },
            ].map(tab => (
              <button
                key={tab.key || 'all'}
                onClick={() => handleStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filters.status === tab.key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {[
              { key: undefined, label: 'Sve', count: paymentCounts.all },
              { key: 'UNPAID', label: 'Neplaćene', count: paymentCounts.unpaid },
              { key: 'PARTIALLY_PAID', label: 'Delimično', count: paymentCounts.partiallyPaid },
              { key: 'PAID', label: 'Plaćene', count: paymentCounts.paid },
              { key: 'OVERDUE', label: 'Prekoračene', count: paymentCounts.overdue },
            ].map(tab => (
              <button
                key={tab.key || 'all'}
                onClick={() => handlePaymentFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filters.paymentStatus === tab.key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pretraži po broju, dobavljaču, PIB-u..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* Date Range Preset */}
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={dateRangePreset}
          onChange={(e) => handleDateRangeChange(e.target.value as DateRangePreset)}
        >
          <option value="all">Svi datumi</option>
          <option value="today">Danas</option>
          <option value="thisWeek">Ova nedelja</option>
          <option value="thisMonth">Ovaj mesec</option>
          <option value="lastMonth">Prethodni mesec</option>
          <option value="thisYear">Ova godina</option>
        </select>

        {/* Sort */}
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={currentSortValue}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-700 font-medium">
            Izabrano: {selectedIds.size} faktura
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkAccept}
              disabled={bulkProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Odobri sve
            </button>
            <button
              onClick={() => handleBulkReject()}
              disabled={bulkProcessing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Odbij sve
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Poništi
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === invoices.length && invoices.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">Broj Fakture</th>
                <th className="px-4 py-3 font-medium text-gray-500">Dobavljač</th>
                <th className="px-4 py-3 font-medium text-gray-500">Datum</th>
                <th className="px-4 py-3 font-medium text-gray-500">Rok plaćanja</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Iznos</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Plaćanje</th>
                <th className="px-4 py-3 font-medium text-gray-500 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
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
                  <tr 
                    key={invoice.id} 
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedIds.has(invoice.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => navigate(`/incoming-invoices/${invoice.id}`)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(invoice.id)}
                        onChange={() => toggleSelect(invoice.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      {invoice.sefId && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded border border-blue-100">
                          SEF
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{invoice.supplierName}</div>
                      <div className="text-xs text-gray-500">PIB: {invoice.supplierPIB}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        PDV: {formatCurrency(Number(invoice.taxAmount), invoice.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-4 py-4">
                      {getPaymentBadge(invoice.paymentStatus)}
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => api.downloadIncomingInvoicePDF(invoice.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Preuzmi PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/incoming-invoices/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Detalji
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden bg-gray-50 p-4 space-y-4">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <Download className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nema ulaznih faktura</h3>
              <p className="max-w-sm text-gray-500 text-sm">
                Trenutno nemate učitanih ulaznih faktura.
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
              >
                {syncing ? 'Sinhronizacija...' : 'Sinhronizuj'}
              </button>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div 
                key={invoice.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/incoming-invoices/${invoice.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(invoice.id)}
                      onChange={() => toggleSelect(invoice.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span>
                        {invoice.sefId && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded border border-blue-100">
                            SEF
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(invoice.issueDate)}</span>
                    </div>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[60%]">{invoice.supplierName}</span>
                    <span className="text-xs text-gray-500">PIB: {invoice.supplierPIB}</span>
                  </div>
                </div>
                
                <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                  <div>
                    {getPaymentBadge(invoice.paymentStatus)}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(Number(invoice.totalAmount), invoice.currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      PDV: {formatCurrency(Number(invoice.taxAmount), invoice.currency)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-end gap-3 pt-2 border-t border-gray-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      api.downloadIncomingInvoicePDF(invoice.id);
                    }}
                    className="text-sm text-gray-600 font-medium flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                  <Link
                    to={`/incoming-invoices/${invoice.id}`}
                    className="text-sm text-blue-600 font-medium flex items-center gap-1"
                  >
                    Detalji
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Prikazano {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} od {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Reject Dialog */}
      {bulkRejectDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Odbijanje faktura</h3>
            <p className="text-gray-600 mb-4">Odbijate {selectedIds.size} faktura</p>
            <textarea
              value={bulkRejectDialog.reason}
              onChange={(e) => setBulkRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Unesite razlog odbijanja (opcionalno)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setBulkRejectDialog({ open: false, reason: '' })}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Odustani
              </button>
              <button
                onClick={() => {
                  const reason = bulkRejectDialog.reason;
                  setBulkRejectDialog({ open: false, reason: '' });
                  handleBulkReject(reason);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Odbij fakture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingInvoices;
