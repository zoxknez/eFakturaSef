import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { logger } from '../utils/logger';
import ExportModal from '../components/ExportModal';

interface Partner {
  id: string;
  name: string;
  pib: string;
  type: 'pravno_lice' | 'fizicko_lice' | 'preduzetnik';
  address?: string;
  city?: string;
  email?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  
  // Partner integration (NEW)
  partnerId?: string;
  partner?: Partner;
  
  // Legacy buyer fields (backward compatibility)
  buyerName?: string;
  buyerPIB?: string;
  
  totalAmount: number;
  taxAmount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  type: 'OUTGOING' | 'INCOMING';
  
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  
  createdAt: string;
  updatedAt: string;
  
  // Computed fields for display
  isCorrection?: boolean;
  isStorno?: boolean;
  hasReverseCharge?: boolean;
}

interface InvoiceQueryParams {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  search?: string;
}

const StatusBadge = ({ status }: { status: Invoice['status'] }) => {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800'
  };

  const labels: Record<string, string> = {
    DRAFT: 'Nacrt',
    SENT: 'Poslato',
    ACCEPTED: 'Prihvaćeno',
    REJECTED: 'Odbijeno',
    CANCELLED: 'Stornirano',
    PAID: 'Plaćeno',
    OVERDUE: 'Kasni',
    PARTIALLY_PAID: 'Delimično plaćeno',
    UNKNOWN: 'Nepoznato'
  };

  const normalizedStatus = status ? status.toUpperCase() : 'UNKNOWN';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus] || 'bg-gray-100 text-gray-800'}`}>
      {labels[normalizedStatus] || status}
    </span>
  );
};

const TypeBadge = ({ type }: { type: Invoice['type'] }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
    type === 'OUTGOING' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }`}>
    {type === 'OUTGOING' ? '📤 Izlazna' : '📥 Ulazna'}
  </span>
);

const PartnerBadge = ({ invoice }: { invoice: Invoice }) => {
  if (invoice.partnerId && invoice.partner) {
    return (
      <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        ✅ Šifarnik
      </span>
    );
  }
  return (
    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
      📝 Ručno
    </span>
  );
};

const SpecialBadge = ({ invoice }: { invoice: Invoice }) => {
  if (invoice.isCorrection) {
    return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">ISPRAVKA</span>;
  }
  if (invoice.isStorno) {
    return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">STORNO</span>;
  }
  if (invoice.hasReverseCharge) {
    return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">RC</span>;
  }
  return null;
};

export const AdvancedInvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState('svi');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSideDrawer, setShowSideDrawer] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  
  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Fetch invoices on mount and when filters change
  useEffect(() => {
    fetchInvoices();
  }, [currentPage, statusFilter, typeFilter, searchQuery]);
  
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: InvoiceQueryParams = {
        page: currentPage,
        limit: pageSize
      };
      
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (typeFilter && typeFilter !== 'all') {
        params.type = typeFilter;
      }
      
      // TODO: Backend doesn't support search yet, will need to add
      // if (searchQuery) {
      //   params.search = searchQuery;
      // }
      
      const response = await api.getInvoices(params);
      
      if (response.success && response.data) {
        setInvoices(response.data.data || []);
        setTotalCount(response.data.pagination.total || 0);
        setTotalPages(response.data.pagination.pages || 1);
      } else {
        setError(response.error || 'Greška pri učitavanju faktura');
      }
    } catch (err: unknown) {
      logger.error('Error fetching invoices', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Greška pri učitavanju faktura');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const views = [
    { id: 'svi', label: 'Svi', count: totalCount },
    { id: 'izlazne', label: 'Izlazne', count: invoices.filter(i => i.type === 'OUTGOING').length },
    { id: 'ulazne', label: 'Ulazne', count: invoices.filter(i => i.type === 'INCOMING').length },
    { id: 'nacrti', label: 'Nacrti', count: invoices.filter(i => i.status === 'DRAFT').length },
    { id: 'odbijene', label: 'Odbijene', count: invoices.filter(i => i.status === 'REJECTED').length }
  ];

  const savedViews = [
    'Visoki iznosi > 100k',
    'Prosečni mesec',
    'Kritični rokovi',
    'Spremno za izvoz'
  ];

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAll = () => {
    setSelectedInvoices(
      selectedInvoices.length === invoices.length ? [] : invoices.map(i => i.id)
    );
  };

  const handleRowClick = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
    setShowSideDrawer(true);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: currency === 'RSD' ? 'RSD' : 'EUR'
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS');
  };
  
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS');
  };
  
  // Get display name for partner (Partner name if exists, fallback to buyerName)
  const getPartnerName = (invoice: Invoice): string => {
    return invoice.partner?.name || invoice.buyerName || 'N/A';
  };
  
  // Get display PIB for partner
  const getPartnerPIB = (invoice: Invoice): string => {
    return invoice.partner?.pib || invoice.buyerPIB || 'N/A';
  };
  
  // Calculate VAT base (totalAmount - taxAmount)
  const getVatBase = (invoice: Invoice): number => {
    return invoice.totalAmount - invoice.taxAmount;
  };
  
  // Calculate VAT rate percentage
  const getVatRate = (invoice: Invoice): number => {
    const base = getVatBase(invoice);
    if (base === 0) return 0;
    return Math.round((invoice.taxAmount / base) * 100);
  };

  const selectedInvoice = selectedInvoiceId ? invoices.find(i => i.id === selectedInvoiceId) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-2xl rotate-12 floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-xl -rotate-12 floating" style={{ animationDelay: '2s' }}></div>
          
          {/* Document icons */}
          <div className="absolute top-8 right-16 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Napredna lista • SEF integracija
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Fakture
            </h1>
            <p className="text-xl text-blue-100 max-w-xl">
              Upravljanje izlaznim i ulaznim fakturama sa naprednim filterima i pretragom.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              📊 Export
            </button>
            <Link 
              to="/invoices/create" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              📄 Nova faktura
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži po broju, partneru, PIB-u, statusu..."
                className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select 
              value={statusFilter || 'all'}
              onChange={(e) => setStatusFilter(e.target.value === 'all' ? undefined : e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Svi statusi</option>
              <option value="DRAFT">Nacrt</option>
              <option value="SENT">Poslato</option>
              <option value="ACCEPTED">Prihvaćeno</option>
              <option value="REJECTED">Odbijeno</option>
              <option value="CANCELLED">Stornirano</option>
            </select>
            
            <select 
              value={typeFilter || 'all'}
              onChange={(e) => setTypeFilter(e.target.value === 'all' ? undefined : e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Svi tipovi</option>
              <option value="OUTGOING">Izlazne</option>
              <option value="INCOMING">Ulazne</option>
            </select>
            
            <select className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
              <option>Ovaj mesec</option>
              <option>Prošli mesec</option>
              <option>Ovaj kvartal</option>
              <option>Ova godina</option>
            </select>
          </div>
        </div>

        {/* Saved Views */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-600">Sačuvani pregledi:</span>
          {savedViews.map((view, index) => (
            <button
              key={index}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
            >
              {view}
            </button>
          ))}
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors">
            + Sačuvaj pregled
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setCurrentView(view.id)}
              className={`px-6 py-4 font-medium transition-colors ${
                currentView === view.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {view.label}
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                {view.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.length > 0 && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedInvoices.length} dokumenata izabrano
              </span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                  ✅ Prihvati
                </button>
                <button className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                  ❌ Odbij
                </button>
                <button className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">
                  🔄 Ponovo pošalji
                </button>
                <button className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">
                  📄 Export
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Učitavanje faktura...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-12 text-center">
            <div className="text-red-600 text-lg mb-2">⚠️ Greška</div>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={fetchInvoices}
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
                      checked={selectedInvoices.length === invoices.length}
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
                          onClick={(e) => { e.stopPropagation(); }}
                          className="text-green-600 hover:text-green-900"
                          title="PDF"
                        >
                          📄
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); }}
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
        {!loading && !error && invoices.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Prikazano {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} od {totalCount}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prethodna
              </button>
              <span className="px-3 py-1 border border-blue-500 bg-blue-50 text-blue-600 rounded">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Link 
                    to={`/invoices/${selectedInvoice.id}`}
                    className="flex-1 btn-primary bg-blue-500 hover:bg-blue-600 text-center"
                  >
                    📄 Detaljan pregled
                  </Link>
                </div>
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
    </div>
  );
};
