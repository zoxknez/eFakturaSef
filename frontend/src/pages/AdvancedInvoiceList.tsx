import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { logger } from '../utils/logger';
import ExportModal from '../components/ExportModal';
import { useDebounce } from '../hooks/useDebounce';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { 
  InvoiceListItem, 
  InvoiceStatusCounts, 
  InvoiceFilterParams,
  InvoiceSavedView
} from '@sef-app/shared';

// ================== BADGE COMPONENTS ==================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  };

  const labels: Record<string, string> = {
    DRAFT: 'Nacrt',
    SENT: 'Poslato',
    APPROVED: 'Odobreno',
    ACCEPTED: 'Prihvaćeno',
    REJECTED: 'Odbijeno',
    CANCELLED: 'Stornirano'
  };

  const normalizedStatus = status?.toUpperCase() || 'DRAFT';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus] || 'bg-gray-100 text-gray-800'}`}>
      {labels[normalizedStatus] || status}
    </span>
  );
};

const TypeBadge: React.FC<{ type: string }> = ({ type }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
    type === 'OUTGOING' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }`}>
    {type === 'OUTGOING' ? '📤 Izlazna' : '📥 Ulazna'}
  </span>
);

const PartnerBadge: React.FC<{ invoice: InvoiceListItem }> = ({ invoice }) => {
  if (invoice.partner) {
    return (
      <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        ✅ Šifarnik
      </span>
    );
  }
  return null;
};

const SpecialBadge: React.FC<{ invoice: InvoiceListItem }> = ({ invoice }) => {
  if (invoice.sefId) {
    return (
      <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs" title={`SEF ID: ${invoice.sefId}`}>
        SEF
      </span>
    );
  }
  return null;
};

// ================== HELPER FUNCTIONS ==================

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('sr-RS');
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const formatAmount = (amount: number | undefined, currency = 'RSD'): string => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: currency || 'RSD',
    minimumFractionDigits: 2
  }).format(amount);
};

const getPartnerName = (invoice: InvoiceListItem): string => {
  if (invoice.partner?.name) return invoice.partner.name;
  return invoice.buyerName || 'Nepoznat kupac';
};

const getPartnerPIB = (invoice: InvoiceListItem): string => {
  if (invoice.partner?.pib) return invoice.partner.pib;
  return invoice.buyerPIB || '-';
};

const getVatRate = (invoice: InvoiceListItem): number => {
  if (!invoice.lines || invoice.lines.length === 0) return 20;
  return invoice.lines[0]?.taxRate || 20;
};

const getVatBase = (invoice: InvoiceListItem): number => {
  return invoice.totalAmount - invoice.taxAmount;
};

// ================== SAVED VIEWS PERSISTENCE ==================

const SAVED_VIEWS_KEY = 'invoice-saved-views';

const getDefaultViews = (): InvoiceSavedView[] => [
  { id: 'unpaid', name: 'Neplaćene', icon: '💰', filters: { status: 'SENT' }, createdAt: new Date().toISOString() },
  { id: 'this-month', name: 'Ovaj mesec', icon: '📅', filters: { dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] }, createdAt: new Date().toISOString() },
  { id: 'drafts', name: 'Nacrti', icon: '📝', filters: { status: 'DRAFT' }, createdAt: new Date().toISOString() },
];

const loadSavedViews = (): InvoiceSavedView[] => {
  try {
    const stored = localStorage.getItem(SAVED_VIEWS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.error('Failed to load saved views', e);
  }
  return getDefaultViews();
};

const saveSavedViews = (views: InvoiceSavedView[]) => {
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  } catch (e) {
    logger.error('Failed to save views', e);
  }
};

// ================== DATE RANGE OPTIONS ==================

interface DateRangeOption {
  label: string;
  value: string;
  getRange: () => { dateFrom?: string; dateTo?: string };
}

const dateRangeOptions: DateRangeOption[] = [
  { label: 'Sve fakture', value: 'all', getRange: () => ({}) },
  { 
    label: 'Danas', 
    value: 'today', 
    getRange: () => {
      const today = new Date().toISOString().split('T')[0];
      return { dateFrom: today, dateTo: today };
    }
  },
  { 
    label: 'Ova nedelja', 
    value: 'this-week', 
    getRange: () => {
      const now = new Date();
      const dayOfWeek = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      return { dateFrom: monday.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] };
    }
  },
  { 
    label: 'Ovaj mesec', 
    value: 'this-month', 
    getRange: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: firstDay.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] };
    }
  },
  { 
    label: 'Prošli mesec', 
    value: 'last-month', 
    getRange: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: firstDay.toISOString().split('T')[0], dateTo: lastDay.toISOString().split('T')[0] };
    }
  },
  { 
    label: 'Ova godina', 
    value: 'this-year', 
    getRange: () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), 0, 1);
      return { dateFrom: firstDay.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] };
    }
  },
];

// ================== MAIN COMPONENT ==================

export const AdvancedInvoiceList: React.FC = () => {
  const navigate = useNavigate();
  
  // Data state
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<InvoiceStatusCounts>({
    all: 0, draft: 0, sent: 0, approved: 0, rejected: 0, cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  
  // Filter state
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState<InvoiceFilterParams['sortBy']>('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI state
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [showSideDrawer, setShowSideDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [savedViews, setSavedViews] = useState<InvoiceSavedView[]>(loadSavedViews);
  
  // Bulk operation state
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  
  // Dialog states
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; count: number; ids: string[] | null }>({ open: false, count: 0, ids: null });
  const [saveViewDialog, setSaveViewDialog] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
  
  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Views for tabs
  const views = useMemo(() => [
    { id: 'all', label: 'Sve', count: statusCounts.all },
    { id: 'draft', label: 'Nacrti', count: statusCounts.draft },
    { id: 'sent', label: 'Poslato', count: statusCounts.sent },
    { id: 'approved', label: 'Odobreno', count: statusCounts.approved },
    { id: 'rejected', label: 'Odbijeno', count: statusCounts.rejected },
    { id: 'cancelled', label: 'Stornirano', count: statusCounts.cancelled },
  ], [statusCounts]);

  // ================== DATA FETCHING ==================
  
  const fetchStatusCounts = useCallback(async () => {
    try {
      const response = await api.getInvoiceStatusCounts();
      if (response.success && response.data) {
        setStatusCounts(response.data);
      }
    } catch (err) {
      logger.error('Failed to fetch status counts', err);
    }
  }, []);
  
  const fetchInvoices = useCallback(async (cursor?: string, direction?: 'next' | 'prev') => {
    setLoading(true);
    setError(null);
    
    try {
      const dateRangeOption = dateRangeOptions.find(o => o.value === dateRange);
      const dateFilters = dateRangeOption?.getRange() || {};
      
      const params: InvoiceFilterParams = {
        status: activeTab !== 'all' ? activeTab.toUpperCase() : undefined,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        limit: pageSize,
        cursor: cursor || undefined,
        direction: direction || undefined,
        ...dateFilters,
      };
      
      const response = await api.getInvoices(params);
      
      if (response.success && response.data) {
        setInvoices(response.data.data);
        setHasNext(response.data.pagination.hasNext);
        setHasPrev(response.data.pagination.hasPrev);
        setNextCursor(response.data.pagination.nextCursor);
        setPrevCursor(response.data.pagination.prevCursor);
        if (response.data.pagination.total !== undefined) {
          setTotalCount(response.data.pagination.total);
        }
        if (response.data.counts) {
          setStatusCounts(response.data.counts);
        }
      } else {
        setError(response.error || 'Failed to load invoices');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Neuspešno učitavanje faktura';
      setError(message);
      logger.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, dateRange, sortBy, sortOrder, pageSize]);

  // Initial load
  useEffect(() => {
    fetchInvoices();
    fetchStatusCounts();
  }, [fetchInvoices, fetchStatusCounts]);

  // ================== SELECTION HANDLERS ==================
  
  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleRowClick = (invoice: InvoiceListItem) => {
    setSelectedInvoice(invoice);
    setShowSideDrawer(true);
  };

  // ================== BULK OPERATIONS ==================
  
  const handleBulkSend = async () => {
    if (selectedInvoices.length === 0) return;
    
    const draftIds = invoices
      .filter(inv => selectedInvoices.includes(inv.id) && inv.status === 'DRAFT')
      .map(inv => inv.id);
    
    if (draftIds.length === 0) {
      setBulkError('Nema nacrta za slanje. Samo nacrti mogu biti poslati na SEF.');
      return;
    }
    
    setBulkLoading(true);
    setBulkError(null);
    
    try {
      const response = await api.bulkSendInvoices(draftIds);
      if (response.success) {
        await fetchInvoices();
        await fetchStatusCounts();
        setSelectedInvoices([]);
        toast.success(`Uspešno poslato ${response.data?.processed || draftIds.length} faktura na SEF.`);
      } else {
        setBulkError(response.error || 'Greška pri slanju faktura');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Neuspešno slanje faktura';
      setBulkError(message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    
    const draftIds = invoices
      .filter(inv => selectedInvoices.includes(inv.id) && inv.status === 'DRAFT')
      .map(inv => inv.id);
    
    if (draftIds.length === 0) {
      setBulkError('Nema nacrta za brisanje. Samo nacrti mogu biti obrisani.');
      return;
    }
    
    setDeleteConfirm({ open: true, count: draftIds.length, ids: draftIds });
  };

  const handleConfirmBulkDelete = async () => {
    if (!deleteConfirm.ids) return;
    const draftIds = deleteConfirm.ids;
    setDeleteConfirm({ open: false, count: 0, ids: null });
    
    setBulkLoading(true);
    setBulkError(null);
    
    try {
      const response = await api.bulkDeleteInvoices(draftIds);
      if (response.success) {
        await fetchInvoices();
        await fetchStatusCounts();
        setSelectedInvoices([]);
        toast.success(`Uspešno obrisano ${response.data?.processed || draftIds.length} faktura.`);
      } else {
        setBulkError(response.error || 'Greška pri brisanju faktura');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Neuspešno brisanje faktura';
      setBulkError(message);
    } finally {
      setBulkLoading(false);
    }
  };

  // ================== DOWNLOAD HANDLERS ==================
  
  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const blob = await api.downloadInvoicePDF(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faktura-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      logger.error('Failed to download PDF', err);
      toast.error('Greška pri preuzimanju PDF-a');
    }
  };

  const handleDownloadXML = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const blob = await api.downloadInvoiceXML(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faktura-${invoiceNumber}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      logger.error('Failed to download XML', err);
      toast.error('Greška pri preuzimanju XML-a');
    }
  };

  // ================== SAVED VIEWS ==================
  
  const handleSaveViewClick = () => {
    setSaveViewDialog({ open: true, name: '' });
  };

  const handleSaveViewConfirm = () => {
    const name = saveViewDialog.name.trim();
    if (!name) {
      toast.error('Unesite naziv za pogled');
      return;
    }
    setSaveViewDialog({ open: false, name: '' });
    
    const newView: InvoiceSavedView = {
      id: `custom-${Date.now()}`,
      name,
      icon: '📌',
      filters: {
        status: activeTab !== 'all' ? activeTab.toUpperCase() : undefined,
        search: debouncedSearch || undefined,
        ...(dateRangeOptions.find(o => o.value === dateRange)?.getRange() || {}),
      },
      createdAt: new Date().toISOString(),
    };
    
    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    saveSavedViews(updatedViews);
  };

  const handleApplyView = (view: InvoiceSavedView) => {
    if (view.filters.status) {
      setActiveTab(view.filters.status.toLowerCase());
    } else {
      setActiveTab('all');
    }
    if (view.filters.search) {
      setSearchQuery(view.filters.search);
    }
    // Apply date filter if present
    if (view.filters.dateFrom) {
      // Find matching preset or set to custom
      const matchingOption = dateRangeOptions.find(opt => {
        const range = opt.getRange();
        return range.dateFrom === view.filters.dateFrom;
      });
      if (matchingOption) {
        setDateRange(matchingOption.value);
      }
    }
  };

  const handleRemoveView = (viewId: string) => {
    const updatedViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(updatedViews);
    saveSavedViews(updatedViews);
  };

  // ================== RENDER ==================
  
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Fakture</h1>
            <p className="text-blue-100">
              Ukupno {statusCounts.all} faktura • {statusCounts.draft} nacrta čeka slanje
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
            >
              📊 Izveštaj
            </button>
            <Link
              to="/invoices/create"
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              ➕ Nova faktura
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pretraži po broju, partneru, PIB-u..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="text-sm border-gray-300 rounded-lg border px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {dateRangeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        
        {/* Sort */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortBy(field as InvoiceFilterParams['sortBy']);
            setSortOrder(order as 'asc' | 'desc');
          }}
          className="text-sm border-gray-300 rounded-lg border px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="issueDate-desc">Datum (najnovije)</option>
          <option value="issueDate-asc">Datum (najstarije)</option>
          <option value="totalAmount-desc">Iznos (najviše)</option>
          <option value="totalAmount-asc">Iznos (najmanje)</option>
          <option value="invoiceNumber-asc">Broj fakture (A-Z)</option>
          <option value="invoiceNumber-desc">Broj fakture (Z-A)</option>
        </select>
        
        {/* Save View Button */}
        <button
          onClick={handleSaveViewClick}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          title="Sačuvaj trenutni pogled"
        >
          💾 Sačuvaj pogled
        </button>
      </div>

      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Brzi pogledi:</span>
          {savedViews.map(view => (
            <div key={view.id} className="flex items-center gap-1">
              <button
                onClick={() => handleApplyView(view)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {view.icon} {view.name}
              </button>
              {view.id.startsWith('custom-') && (
                <button
                  onClick={() => handleRemoveView(view.id)}
                  className="text-gray-400 hover:text-red-500"
                  title="Ukloni"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveTab(view.id)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === view.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {view.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === view.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {view.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-700 font-medium">
            Izabrano {selectedInvoices.length} faktura
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkSend}
              disabled={bulkLoading}
              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {bulkLoading ? '⏳' : '📤'} Pošalji na SEF ({selectedInvoices.length})
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {bulkLoading ? '⏳' : '🗑️'} Obriši
            </button>
            <button
              onClick={() => setSelectedInvoices([])}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕ Poništi izbor
            </button>
          </div>
        </div>
      )}
      
      {bulkError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ⚠️ {bulkError}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Učitavanje faktura...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-12 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => fetchInvoices()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Pokušaj ponovo
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && invoices.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nema faktura</h3>
            <p className="text-gray-600 mb-4">Kreirajte prvu fakturu da biste počeli.</p>
            <Link 
              to="/invoices/create"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              📄 Nova faktura
            </Link>
          </div>
        )}

        {/* Table */}
        {!loading && !error && invoices.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broj/Datum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner/PIB
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Iznos/PDV
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status/Tip
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rok/Izmena
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Akcije
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr 
                    key={invoice.id}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(invoice)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</span>
                          <SpecialBadge invoice={invoice} />
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(invoice.issueDate)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">{getPartnerName(invoice)}</span>
                          <PartnerBadge invoice={invoice} />
                        </div>
                        <div className="text-sm text-gray-500">PIB: {getPartnerPIB(invoice)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatAmount(invoice.totalAmount, invoice.currency)}
                        </div>
                        <div className="text-sm text-gray-500">
                          PDV: {formatAmount(invoice.taxAmount, invoice.currency)} ({getVatRate(invoice)}%)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={invoice.status} />
                        <TypeBadge type={invoice.type} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {invoice.dueDate && (
                          <div className="text-sm text-gray-900">Rok: {formatDate(invoice.dueDate)}</div>
                        )}
                        <div className="text-sm text-gray-500">Izmena: {formatDateTime(invoice.updatedAt)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-900"
                          title="Pregled"
                        >
                          👁️
                        </Link>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDownloadPDF(invoice.id, invoice.invoiceNumber);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="PDF"
                        >
                          📄
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDownloadXML(invoice.id, invoice.invoiceNumber);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="XML"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && !error && invoices.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Prikazano {invoices.length} faktura {totalCount > 0 && `od ${totalCount}`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchInvoices(prevCursor || undefined, 'prev')}
                disabled={!hasPrev}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prethodna
              </button>
              <button
                onClick={() => fetchInvoices(nextCursor || undefined, 'next')}
                disabled={!hasNext}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sledeća →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Drawer */}
      {showSideDrawer && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSideDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Faktura {selectedInvoice.invoiceNumber}
                  </h3>
                  <button 
                    onClick={() => setShowSideDrawer(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Partner</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-900">{getPartnerName(selectedInvoice)}</p>
                      <PartnerBadge invoice={selectedInvoice} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">PIB</label>
                    <p className="text-sm text-gray-900">{getPartnerPIB(selectedInvoice)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Iznos</label>
                    <p className="text-sm text-gray-900">
                      {formatAmount(selectedInvoice.totalAmount, selectedInvoice.currency)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <StatusBadge status={selectedInvoice.status} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tip</label>
                    <div className="mt-1">
                      <TypeBadge type={selectedInvoice.type} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">PDV detalji</label>
                    <div className="text-sm text-gray-900 space-y-1">
                      <p>Osnovica: {formatAmount(getVatBase(selectedInvoice), selectedInvoice.currency)}</p>
                      <p>Stopa: {getVatRate(selectedInvoice)}%</p>
                      <p>PDV: {formatAmount(selectedInvoice.taxAmount, selectedInvoice.currency)}</p>
                    </div>
                  </div>
                  
                  {selectedInvoice.dueDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Rok plaćanja</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedInvoice.dueDate)}</p>
                    </div>
                  )}
                  
                  {selectedInvoice.sefId && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">SEF ID</label>
                      <p className="text-sm text-gray-900">{selectedInvoice.sefId}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                    className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={() => handleDownloadXML(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                    className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
                  >
                    📋 XML
                  </button>
                </div>
                <Link 
                  to={`/invoices/${selectedInvoice.id}`}
                  className="block w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm text-center"
                >
                  📄 Detaljan pregled
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="invoices"
        title="Export faktura"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, count: 0, ids: null })}
        onConfirm={handleConfirmBulkDelete}
        title="Brisanje faktura"
        message={`Da li ste sigurni da želite da obrišete ${deleteConfirm.count} faktura?`}
        confirmText="Obriši"
        variant="danger"
      />

      {/* Save View Dialog */}
      {saveViewDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Sačuvaj pogled</h3>
            <input
              type="text"
              value={saveViewDialog.name}
              onChange={(e) => setSaveViewDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Unesite naziv za sačuvani pogled"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSaveViewDialog({ open: false, name: '' })}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Odustani
              </button>
              <button
                onClick={handleSaveViewConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedInvoiceList;
