import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';
import {
  Check, Send, FileEdit, Clock, X, Ban, HelpCircle,
  Calendar, Eye, FileText, Mail, ChevronRight,
  Upload, Download, Plus, CheckCircle, DollarSign,
  Search, LayoutGrid, List, ChevronLeft
} from 'lucide-react';
import type { InvoiceFilterParams } from '@sef-app/shared';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  vatAmount: number;
  status: string;
  direction: string;
  partner?: {
    name: string;
    pib: string;
  };
  sefStatus?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'ACCEPTED':
      case 'PRIHVACENA':
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          text: 'text-white',
          label: 'Prihvaćena',
          icon: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        };
      case 'SENT':
      case 'POSLATA':
        return { 
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          text: 'text-white',
          label: 'Poslata',
          icon: <Send className="w-3.5 h-3.5" />
        };
      case 'DRAFT':
      case 'NACRT':
        return { 
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          label: 'Nacrt',
          icon: <FileEdit className="w-3.5 h-3.5" />
        };
      case 'PENDING':
      case 'NA ČEKANJU':
        return { 
          bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
          text: 'text-white',
          label: 'Na čekanju',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case 'REJECTED':
      case 'ODBIJENA':
        return { 
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          text: 'text-white',
          label: 'Odbijena',
          icon: <X className="w-3.5 h-3.5" />
        };
      case 'CANCELLED':
      case 'STORNIRANA':
        return { 
          bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
          text: 'text-white',
          label: 'Stornirana',
          icon: <Ban className="w-3.5 h-3.5" />
        };
      default:
        return { 
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          label: status || 'Nepoznato',
          icon: <HelpCircle className="w-3.5 h-3.5" />
        };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const InvoiceCard = ({ invoice, onPreview, onPDF, onEmail, isDownloading }: { 
  invoice: Invoice; 
  onPreview: () => void; 
  onPDF: () => void;
  onEmail: () => void;
  isDownloading: boolean;
}) => {
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'APPROVED';
  
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {invoice.invoiceNumber}
              </h3>
              {invoice.direction === 'OUTGOING' ? (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">Izlazna</span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded">Ulazna</span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-700">{invoice.partner?.name || 'N/A'}</p>
            <p className="text-xs text-gray-400 mt-0.5">PIB: {invoice.partner?.pib || 'N/A'}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-gray-100/50 border-t border-b border-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Ukupan iznos</p>
            <p className="text-2xl font-bold text-gray-900">
              {Number(invoice.totalAmount || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
              <span className="text-sm font-medium text-gray-500 ml-1">RSD</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">PDV</p>
            <p className="text-sm font-semibold text-gray-700">
              {Number(invoice.vatAmount || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{new Date(invoice.issueDate).toLocaleDateString('sr-RS')}</span>
            </div>
            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
              <Clock className="w-4 h-4" />
              <span className={isOverdue ? 'font-medium' : ''}>
                {new Date(invoice.dueDate).toLocaleDateString('sr-RS')}
              </span>
              {isOverdue && <span className="text-xs">(Istekao)</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button 
              onClick={onPreview}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Pregled"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button 
              onClick={onPDF}
              disabled={isDownloading}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Preuzmi PDF"
            >
              {isDownloading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </button>
            <button 
              onClick={onEmail}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Pošalji email"
            >
              <Mail className="w-5 h-5" />
            </button>
          </div>
          <Link
            to={`/invoices/${invoice.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            Detalji
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

interface InvoiceListParams {
  page?: number;
  limit?: number;
  direction?: string;
  status?: string;
}

export const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [dateFilter, setDateFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Handle invoice preview - navigate to invoice detail page
  const handlePreview = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  // Handle PDF download
  const handlePDFDownload = async (invoice: Invoice) => {
    try {
      setDownloadingPdf(invoice.id);
      
      // Call the PDF export endpoint using apiClient
      const blob = await api.downloadInvoicePDF(invoice.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `faktura-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF uspešno preuzet');
    } catch (error) {
      logger.error('PDF download error', error);
      toast.error('Greška pri preuzimanju PDF-a');
    } finally {
      setDownloadingPdf(null);
    }
  };

  // Handle email send
  const handleSendEmail = async (invoice: Invoice) => {
    // TODO: Implement email modal for recipient selection
    toast('Slanje email-a će biti implementirano', { icon: '📧' });
  };

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, activeTab, directionFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params: InvoiceListParams = { page: currentPage, limit: 12 };
      
      if (directionFilter) {
        params.direction = directionFilter;
      }
      if (activeTab !== 'all') {
        const statusMap: Record<string, string> = {
          sent: 'SENT',
          accepted: 'APPROVED',
          pending: 'PENDING',
          draft: 'DRAFT'
        };
        if (statusMap[activeTab]) params.status = statusMap[activeTab];
      }
      
      const response = await api.getInvoices(params as InvoiceFilterParams);
      if (response.success && response.data) {
        // Map the response data to our local Invoice type
        const invoiceData = response.data.data.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate || inv.issueDate,
          totalAmount: inv.totalAmount,
          vatAmount: inv.taxAmount || 0,
          status: inv.status,
          direction: inv.type === 'OUTGOING' ? 'outgoing' : 'incoming',
          partner: inv.partner ? { name: inv.partner.name, pib: inv.partner.pib } : undefined,
          sefStatus: inv.sefStatus || undefined,
        }));
        setInvoices(invoiceData);
        setTotalPages(response.data.pagination?.hasNext ? currentPage + 1 : currentPage);
        setTotalCount(response.data.pagination?.total || invoiceData.length);
      }
    } catch (error) {
      logger.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = {
    total: totalCount,
    sent: invoices.filter(i => i.status === 'SENT').length,
    accepted: invoices.filter(i => i.status === 'APPROVED').length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    totalAmount: invoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0)
  };

  const tabs = [
    { id: 'all', name: 'Sve fakture', count: stats.total, color: 'gray' },
    { id: 'draft', name: 'Nacrti', count: invoices.filter(i => i.status === 'DRAFT').length, color: 'gray' },
    { id: 'sent', name: 'Poslate', count: stats.sent, color: 'blue' },
    { id: 'accepted', name: 'Prihvaćene', count: stats.accepted, color: 'green' },
    { id: 'pending', name: 'Na čekanju', count: stats.pending, color: 'amber' },
  ];

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(term) ||
      invoice.partner?.name?.toLowerCase().includes(term) ||
      invoice.partner?.pib?.includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-2xl rotate-12 floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-xl -rotate-12 floating" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-20 right-1/3 w-8 h-8 bg-white/10 rounded-lg rotate-45 floating" style={{ animationDelay: '4s' }}></div>
          
          {/* Document icons pattern */}
          <div className="absolute top-8 right-16 opacity-10">
            <FileText className="w-24 h-24" />
          </div>
          <div className="absolute bottom-8 right-32 opacity-10">
            <FileText className="w-16 h-16" />
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <FileText className="w-4 h-4" />
              Elektronske fakture • SEF Portal
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Fakture
            </h1>
            <p className="text-xl text-blue-100 max-w-xl">
              Upravljajte izlaznim i ulaznim fakturama, pratite statuse i automatizujte slanje.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all">
              <Upload className="w-5 h-5" />
              Uvoz
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all">
              <Download className="w-5 h-5" />
              Izvoz
            </button>
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              Nova faktura
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ukupno faktura</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Prihvaćene</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.accepted}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Na čekanju</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ukupan iznos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalAmount.toLocaleString('sr-RS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-sm font-medium text-gray-500 ml-1">RSD</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži po broju fakture, partneru..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Direction Filter */}
          <select
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white min-w-[140px]"
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Sve fakture</option>
            <option value="OUTGOING">Izlazne</option>
            <option value="INCOMING">Ulazne</option>
          </select>

          {/* Date Filter */}
          <input
            type="month"
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <nav className="flex overflow-x-auto px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`relative py-4 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-bold ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <LoadingSpinner />
                <p className="mt-4 text-gray-500">Učitavanje faktura...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nema faktura za prikaz</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Pokušajte sa drugačijom pretragom.' : 'Počnite kreiranjem vaše prve fakture.'}
              </p>
              {!searchTerm && (
                <Link
                  to="/invoices/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Kreiraj prvu fakturu
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredInvoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  onPreview={() => handlePreview(invoice)}
                  onPDF={() => handlePDFDownload(invoice)}
                  onEmail={() => handleSendEmail(invoice)}
                  isDownloading={downloadingPdf === invoice.id}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Faktura</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Iznos</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
                          {invoice.direction === 'OUTGOING' ? (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">Izl.</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded">Ul.</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{invoice.partner?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">PIB: {invoice.partner?.pib || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <p>{new Date(invoice.issueDate).toLocaleDateString('sr-RS')}</p>
                        <p className="text-xs text-gray-400">Rok: {new Date(invoice.dueDate).toLocaleDateString('sr-RS')}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-bold text-gray-900">{Number(invoice.totalAmount || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD</p>
                        <p className="text-xs text-gray-500">PDV: {Number(invoice.vatAmount || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link 
                            to={`/invoices/${invoice.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredInvoices.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Prikazano <span className="font-semibold text-gray-900">{filteredInvoices.length}</span> od <span className="font-semibold text-gray-900">{totalCount}</span> faktura
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prethodna
                </button>
                <span className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sledeća →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};