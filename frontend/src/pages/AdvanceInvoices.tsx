/**
 * Advance Invoices Page - Avansne Fakture
 * Upravljanje avansnim fakturama i njihovom upotrebom
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Autocomplete, type AutocompleteOption } from '../components/Autocomplete';
import { ResponsiveModal, ModalFooter } from '../components/ui';
import {
  Receipt,
  Plus,
  Send,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Link2,
  Search,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import advanceInvoiceService from '../services/advanceInvoiceService';
import type { AdvanceInvoiceListItem, AdvanceInvoiceDetail, CreateAdvanceInvoiceDTO, PartnerAutocompleteItem } from '@sef-app/shared';
import apiClient from '../services/api';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Nacrt', color: 'bg-gray-100 text-gray-700', icon: Receipt },
  SENT: { label: 'Poslata', color: 'bg-blue-100 text-blue-700', icon: Send },
  ISSUED: { label: 'Izdata', color: 'bg-blue-100 text-blue-700', icon: Send },
  PAID: { label: 'Plaćena', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PARTIALLY_USED: { label: 'Delimično iskorišćena', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  FULLY_USED: { label: 'Potpuno iskorišćena', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  CANCELLED: { label: 'Stornirana', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const VAT_RATES = [
  { value: 20, label: '20% - Opšta stopa' },
  { value: 10, label: '10% - Posebna stopa' },
  { value: 0, label: '0% - Oslobođeno' },
];

// Helper to get partner display info from invoice
const getPartnerInfo = (invoice: AdvanceInvoiceListItem) => ({
  name: invoice.partner?.name || 'N/A',
  pib: invoice.partner?.pib || 'N/A',
});

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const AdvanceInvoices: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company?.id || '';

  // State
  const [invoices, setInvoices] = useState<AdvanceInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<AdvanceInvoiceListItem | null>(null);
  const [formData, setFormData] = useState<{
    partnerId: string;
    partnerDisplay: string;
    issueDate: string;
    advanceAmount: number;
    taxRate: number;
    currency: string;
    note: string;
  }>({
    partnerId: '',
    partnerDisplay: '',
    issueDate: new Date().toISOString().split('T')[0],
    advanceAmount: 0,
    taxRate: 20,
    currency: 'RSD',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  // Use advance modal
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceInvoiceListItem | null>(null);
  const [useData, setUseData] = useState({ finalInvoiceId: '', amount: 0, notes: '' });

  // Mark paid modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState<AdvanceInvoiceListItem | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInvoice, setCancelInvoice] = useState<AdvanceInvoiceListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' });

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<AdvanceInvoiceDetail | null>(null);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Fetch invoices
  useEffect(() => {
    if (companyId) {
      fetchInvoices();
    }
  }, [companyId, statusFilter, page]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await advanceInvoiceService.getAll(companyId, {
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      if (response.success && response.data) {
        setInvoices(response.data.data);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching advance invoices:', error);
      toast.error('Greška pri učitavanju avansnih faktura');
    } finally {
      setLoading(false);
    }
  };

  // Partner search for autocomplete
  const searchPartners = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    if (!companyId || query.length < 2) return [];
    
    try {
      const response = await apiClient.get<PartnerAutocompleteItem[]>(
        `/partners/companies/${companyId}/autocomplete?q=${encodeURIComponent(query)}`
      );
      
      if (response.success && response.data) {
        return response.data.map(p => ({
          id: p.id,
          label: p.name,
          sublabel: `PIB: ${p.pib}`,
          data: p,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error searching partners:', error);
      return [];
    }
  }, [companyId]);

  const handleCreate = async () => {
    if (!formData.partnerId) {
      toast.error('Molimo izaberite partnera');
      return;
    }

    try {
      setSaving(true);
      
      const createData: CreateAdvanceInvoiceDTO = {
        partnerId: formData.partnerId,
        issueDate: formData.issueDate,
        advanceAmount: formData.advanceAmount,
        taxRate: formData.taxRate,
        currency: formData.currency,
        note: formData.note || undefined,
      };
      
      const response = editingInvoice
        ? await advanceInvoiceService.update(companyId, editingInvoice.id, createData)
        : await advanceInvoiceService.create(companyId, createData);
      
      if (response.success) {
        toast.success(editingInvoice ? 'Avansna faktura ažurirana' : 'Avansna faktura kreirana');
        setShowModal(false);
        resetForm();
        fetchInvoices();
      } else {
        toast.error(response.error || 'Greška pri čuvanju');
      }
    } catch (error) {
      toast.error('Greška pri čuvanju avansne fakture');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payInvoice) return;
    
    try {
      setActionLoading(prev => ({ ...prev, [payInvoice.id]: true }));
      const response = await advanceInvoiceService.markPaid(companyId, payInvoice.id, {
        paymentDate,
        amount: payInvoice.totalAmount,
      });
      if (response.success) {
        toast.success('Avansna faktura označena kao plaćena');
        setShowPayModal(false);
        setPayInvoice(null);
        fetchInvoices();
      } else {
        toast.error(response.error || 'Greška pri označavanju plaćanja');
      }
    } catch (error) {
      toast.error('Greška pri označavanju plaćanja');
    } finally {
      if (payInvoice) {
        setActionLoading(prev => ({ ...prev, [payInvoice.id]: false }));
      }
    }
  };

  const handleUseAdvance = async () => {
    if (!selectedAdvance) return;
    
    try {
      setSaving(true);
      const response = await advanceInvoiceService.useAdvance(companyId, selectedAdvance.id, {
        finalInvoiceId: useData.finalInvoiceId,
        amount: useData.amount,
        notes: useData.notes || undefined,
      });
      
      if (response.success) {
        toast.success('Avans iskorišćen');
        setShowUseModal(false);
        setSelectedAdvance(null);
        setUseData({ finalInvoiceId: '', amount: 0, notes: '' });
        fetchInvoices();
      } else {
        toast.error(response.error || 'Greška pri korišćenju avansa');
      }
    } catch (error) {
      toast.error('Greška pri korišćenju avansa');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToSEF = (invoice: AdvanceInvoiceListItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Slanje na SEF',
      message: `Da li želite da pošaljete avansnu fakturu ${invoice.invoiceNumber} na SEF?`,
      variant: 'info',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(prev => ({ ...prev, [invoice.id]: true }));
          const response = await advanceInvoiceService.sendToSEF(companyId, invoice.id);
          if (response.success) {
            toast.success('Avansna faktura poslata na SEF');
            fetchInvoices();
          } else {
            toast.error(response.error || 'Greška pri slanju na SEF');
          }
        } catch (error) {
          toast.error('Greška pri slanju na SEF');
        } finally {
          setActionLoading(prev => ({ ...prev, [invoice.id]: false }));
        }
      },
    });
  };

  const handleCancelSubmit = async () => {
    if (!cancelInvoice) return;
    
    try {
      setActionLoading(prev => ({ ...prev, [cancelInvoice.id]: true }));
      const response = await advanceInvoiceService.cancel(companyId, cancelInvoice.id, cancelReason);
      if (response.success) {
        toast.success('Avansna faktura stornirana');
        setShowCancelModal(false);
        setCancelInvoice(null);
        setCancelReason('');
        fetchInvoices();
      } else {
        toast.error(response.error || 'Greška pri storniranju');
      }
    } catch (error) {
      toast.error('Greška pri storniranju');
    } finally {
      if (cancelInvoice) {
        setActionLoading(prev => ({ ...prev, [cancelInvoice.id]: false }));
      }
    }
  };

  const handleDelete = (invoice: AdvanceInvoiceListItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Brisanje avansne fakture',
      message: `Da li ste sigurni da želite da obrišete avansnu fakturu ${invoice.invoiceNumber}? Ova akcija se ne može poništiti.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(prev => ({ ...prev, [invoice.id]: true }));
          const response = await advanceInvoiceService.delete(companyId, invoice.id);
          if (response.success) {
            toast.success('Avansna faktura obrisana');
            fetchInvoices();
          } else {
            toast.error(response.error || 'Greška pri brisanju');
          }
        } catch (error) {
          toast.error('Greška pri brisanju');
        } finally {
          setActionLoading(prev => ({ ...prev, [invoice.id]: false }));
        }
      },
    });
  };

  const handleDownloadPDF = async (invoice: AdvanceInvoiceListItem) => {
    try {
      setActionLoading(prev => ({ ...prev, [`pdf-${invoice.id}`]: true }));
      const blob = await advanceInvoiceService.generatePDF(companyId, invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avans-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Greška pri preuzimanju PDF-a');
    } finally {
      setActionLoading(prev => ({ ...prev, [`pdf-${invoice.id}`]: false }));
    }
  };

  const resetForm = () => {
    setFormData({
      partnerId: '',
      partnerDisplay: '',
      issueDate: new Date().toISOString().split('T')[0],
      advanceAmount: 0,
      taxRate: 20,
      currency: 'RSD',
      note: '',
    });
    setEditingInvoice(null);
  };

  const openEditModal = (invoice: AdvanceInvoiceListItem) => {
    const partnerInfo = getPartnerInfo(invoice);
    setEditingInvoice(invoice);
    setFormData({
      partnerId: invoice.partnerId,
      partnerDisplay: partnerInfo.name,
      issueDate: invoice.issueDate.split('T')[0],
      advanceAmount: invoice.advanceAmount,
      taxRate: 20,
      currency: invoice.currency,
      note: '',
    });
    setShowModal(true);
  };

  const formatCurrency = (amount: number, currency = 'RSD') => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-Latn-RS');
  };

  const calculateTotalAmount = () => {
    const net = formData.advanceAmount || 0;
    const vat = net * (formData.taxRate / 100);
    return net + vat;
  };

  // Filtered invoices with debounced search
  const filteredInvoices = useMemo(() => {
    if (!debouncedSearch) return invoices;
    const term = debouncedSearch.toLowerCase();
    return invoices.filter(inv => {
      const partnerInfo = getPartnerInfo(inv);
      return (
        inv.invoiceNumber.toLowerCase().includes(term) ||
        partnerInfo.name.toLowerCase().includes(term) ||
        partnerInfo.pib.includes(debouncedSearch)
      );
    });
  }, [invoices, debouncedSearch]);

  // Summary calculations
  const summary = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'PAID' || i.status === 'SENT').length,
    remaining: invoices.reduce((sum, i) => sum + i.remainingAmount, 0),
    used: invoices.reduce((sum, i) => sum + i.usedAmount, 0),
  }), [invoices]);

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avansne Fakture</h1>
          <p className="text-gray-500 mt-1">Upravljanje avansnim fakturama i njihovom upotrebom</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Avansna Faktura
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ukupno</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Plaćene/Poslate</p>
              <p className="text-xl font-bold">{summary.paid}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Neiskorišćeno</p>
              <p className="text-xl font-bold">{formatCurrency(summary.remaining)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Link2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Iskorišćeno</p>
              <p className="text-xl font-bold">{formatCurrency(summary.used)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pretraži po broju, partneru, PIB-u..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Svi statusi</option>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Broj</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Partner</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Datum</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Iznos</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Preostalo</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Nema avansnih faktura</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const StatusIcon = STATUS_CONFIG[invoice.status]?.icon || Receipt;
                  const partnerInfo = getPartnerInfo(invoice);
                  const isLoading = actionLoading[invoice.id];
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{partnerInfo.name}</p>
                          <p className="text-sm text-gray-500">{partnerInfo.pib}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={invoice.remainingAmount > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {formatCurrency(invoice.remainingAmount, invoice.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[invoice.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_CONFIG[invoice.status]?.label || invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {isLoading ? (
                            <LoadingSpinner />
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setDetailInvoice(invoice);
                                  setShowDetailModal(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Detalji"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              {invoice.status === 'DRAFT' && (
                                <>
                                  <button
                                    onClick={() => openEditModal(invoice)}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    title="Izmeni"
                                  >
                                    <Receipt className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSendToSEF(invoice)}
                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                    title="Pošalji na SEF"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(invoice)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Obriši"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              
                              {(invoice.status === 'SENT' || invoice.status === 'ISSUED') && (
                                <button
                                  onClick={() => {
                                    setPayInvoice(invoice);
                                    setPaymentDate(new Date().toISOString().split('T')[0]);
                                    setShowPayModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                  title="Označi kao plaćeno"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}
                              
                              {['PAID', 'PARTIALLY_USED'].includes(invoice.status) && invoice.remainingAmount > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedAdvance(invoice);
                                    setUseData({ finalInvoiceId: '', amount: invoice.remainingAmount, notes: '' });
                                    setShowUseModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                  title="Iskoristi avans"
                                >
                                  <Link2 className="w-4 h-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDownloadPDF(invoice)}
                                disabled={actionLoading[`pdf-${invoice.id}`]}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                                title="Preuzmi PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              
                              {!['CANCELLED', 'FULLY_USED'].includes(invoice.status) && (
                                <button
                                  onClick={() => {
                                    setCancelInvoice(invoice);
                                    setCancelReason('');
                                    setShowCancelModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Storniraj"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Prethodna
            </button>
            <span className="text-sm text-gray-600">
              Strana {page} od {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Sledeća
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <ResponsiveModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingInvoice ? 'Izmeni Avansnu Fakturu' : 'Nova Avansna Faktura'}
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <Autocomplete
                label="Partner"
                placeholder="Počnite da kucate naziv partnera..."
                required
                value={formData.partnerDisplay}
                onSearch={searchPartners}
                onSelect={(option) => {
                  if (option) {
                    const partner = option.data as PartnerAutocompleteItem;
                    setFormData(prev => ({
                      ...prev,
                      partnerId: partner.id,
                      partnerDisplay: partner.name,
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      partnerId: '',
                      partnerDisplay: '',
                    }));
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum izdavanja *</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neto iznos *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.advanceAmount}
                onChange={(e) => setFormData({ ...formData, advanceAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stopa PDV *</label>
              <select
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {VAT_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>{rate.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valuta</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="RSD">RSD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>

          {/* Calculated amounts */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Neto iznos:</span>
              <span>{formatCurrency(formData.advanceAmount, formData.currency)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>PDV ({formData.taxRate}%):</span>
              <span>{formatCurrency(formData.advanceAmount * (formData.taxRate / 100), formData.currency)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Ukupno:</span>
              <span>{formatCurrency(calculateTotalAmount(), formData.currency)}</span>
            </div>
          </div>
        </div>

        <ModalFooter
          onCancel={() => {
            setShowModal(false);
            resetForm();
          }}
          onConfirm={handleCreate}
          confirmText={saving ? 'Čuvanje...' : editingInvoice ? 'Sačuvaj' : 'Kreiraj'}
          confirmDisabled={saving || !formData.partnerId || !formData.advanceAmount}
        />
      </ResponsiveModal>

      {/* Mark Paid Modal */}
      <ResponsiveModal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setPayInvoice(null);
        }}
        title="Označi kao plaćeno"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Avansna faktura: <strong>{payInvoice?.invoiceNumber}</strong>
          </p>
          <p className="text-gray-600">
            Iznos: <strong>{payInvoice ? formatCurrency(payInvoice.totalAmount, payInvoice.currency) : ''}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum plaćanja *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        <ModalFooter
          onCancel={() => {
            setShowPayModal(false);
            setPayInvoice(null);
          }}
          onConfirm={handleMarkPaid}
          confirmText={actionLoading[payInvoice?.id || ''] ? 'Čuvanje...' : 'Potvrdi'}
          confirmDisabled={!paymentDate || actionLoading[payInvoice?.id || '']}
        />
      </ResponsiveModal>

      {/* Cancel Modal */}
      <ResponsiveModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancelInvoice(null);
          setCancelReason('');
        }}
        title="Storniraj avansnu fakturu"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Da li ste sigurni da želite da stornirate fakturu <strong>{cancelInvoice?.invoiceNumber}</strong>?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razlog storniranja *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Unesite razlog storniranja..."
              required
            />
          </div>
        </div>
        <ModalFooter
          onCancel={() => {
            setShowCancelModal(false);
            setCancelInvoice(null);
            setCancelReason('');
          }}
          onConfirm={handleCancelSubmit}
          confirmText={actionLoading[cancelInvoice?.id || ''] ? 'Storniranje...' : 'Storniraj'}
          confirmDisabled={!cancelReason.trim() || actionLoading[cancelInvoice?.id || '']}
          confirmVariant="danger"
        />
      </ResponsiveModal>

      {/* Use Advance Modal */}
      <ResponsiveModal
        isOpen={showUseModal}
        onClose={() => {
          setShowUseModal(false);
          setSelectedAdvance(null);
        }}
        title="Iskoristi Avans"
        size="md"
      >
        {selectedAdvance && (
          <>
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Avans <strong>{selectedAdvance.invoiceNumber}</strong> - preostalo{' '}
                <strong className="text-green-600">{formatCurrency(selectedAdvance.remainingAmount)}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID fakture za umanjenje *</label>
                <input
                  type="text"
                  value={useData.finalInvoiceId}
                  onChange={(e) => setUseData({ ...useData, finalInvoiceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Unesite ID izlazne fakture"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Iznos za iskorišćenje *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedAdvance.remainingAmount}
                  value={useData.amount}
                  onChange={(e) => setUseData({ ...useData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {useData.amount > selectedAdvance.remainingAmount && (
                  <p className="text-red-500 text-sm mt-1">Iznos ne može biti veći od preostalog</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
                <textarea
                  value={useData.notes}
                  onChange={(e) => setUseData({ ...useData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            </div>

            <ModalFooter
              onCancel={() => {
                setShowUseModal(false);
                setSelectedAdvance(null);
              }}
              onConfirm={handleUseAdvance}
              confirmText={saving ? 'Čuvanje...' : 'Iskoristi'}
              confirmDisabled={
                saving ||
                !useData.finalInvoiceId ||
                !useData.amount ||
                useData.amount > selectedAdvance.remainingAmount
              }
            />
          </>
        )}
      </ResponsiveModal>

      {/* Detail Modal */}
      <ResponsiveModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Avansna Faktura ${detailInvoice?.invoiceNumber || ''}`}
        size="lg"
      >
        {detailInvoice && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[detailInvoice.status]?.color || 'bg-gray-100'}`}>
                {STATUS_CONFIG[detailInvoice.status]?.label || detailInvoice.status}
              </span>
              {detailInvoice.sefId && (
                <span className="text-xs text-gray-500">SEF ID: {detailInvoice.sefId}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Partner</p>
                <p className="font-medium">{getPartnerInfo(detailInvoice).name}</p>
                <p className="text-gray-600">PIB: {getPartnerInfo(detailInvoice).pib}</p>
              </div>
              <div>
                <p className="text-gray-500">Datum izdavanja</p>
                <p className="font-medium">{formatDate(detailInvoice.issueDate)}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Osnovica:</span>
                <span>{formatCurrency(detailInvoice.advanceAmount, detailInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>PDV:</span>
                <span>{formatCurrency(detailInvoice.taxAmount, detailInvoice.currency)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Ukupno:</span>
                <span>{formatCurrency(detailInvoice.totalAmount, detailInvoice.currency)}</span>
              </div>
              <div className="flex justify-between text-purple-600">
                <span>Iskorišćeno:</span>
                <span>{formatCurrency(detailInvoice.usedAmount, detailInvoice.currency)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Preostalo:</span>
                <span className={detailInvoice.remainingAmount > 0 ? 'text-green-600' : ''}>
                  {formatCurrency(detailInvoice.remainingAmount, detailInvoice.currency)}
                </span>
              </div>
            </div>

            {detailInvoice.linkedInvoices && detailInvoice.linkedInvoices.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Povezane fakture:</h4>
                <div className="space-y-2">
                  {detailInvoice.linkedInvoices.map((linked: { id: string; invoiceNumber: string; amount: number }) => (
                    <div key={linked.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span>{linked.invoiceNumber}</span>
                      </div>
                      <span className="text-purple-600">{formatCurrency(linked.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => setShowDetailModal(false)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Zatvori
          </button>
        </div>
      </ResponsiveModal>

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

export default AdvanceInvoices;
