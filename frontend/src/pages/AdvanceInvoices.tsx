/**
 * Advance Invoices Page - Avansne Fakture
 * Upravljanje avansnim fakturama i njihovom upotrebom
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
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
  AlertCircle,
  CreditCard,
  Link2,
  Search,
  Filter,
  MoreVertical,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import advanceInvoiceService, { AdvanceInvoice, CreateAdvanceInvoiceData } from '../services/advanceInvoiceService';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Nacrt', color: 'bg-gray-100 text-gray-700', icon: Receipt },
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

export const AdvanceInvoices: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company?.id || '';

  // State
  const [invoices, setInvoices] = useState<AdvanceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<AdvanceInvoice | null>(null);
  const [formData, setFormData] = useState<CreateAdvanceInvoiceData>({
    partnerName: '',
    partnerPIB: '',
    partnerAddress: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    netAmount: 0,
    vatRate: 20,
    currency: 'RSD',
    description: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Use modal
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceInvoice | null>(null);
  const [useData, setUseData] = useState({ invoiceId: '', amount: 0, notes: '' });

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<AdvanceInvoice | null>(null);

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

  const handleCreate = async () => {
    try {
      setSaving(true);
      const response = editingInvoice
        ? await advanceInvoiceService.update(companyId, editingInvoice.id, formData)
        : await advanceInvoiceService.create(companyId, formData);
      
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

  const handleMarkPaid = async (invoice: AdvanceInvoice) => {
    const paymentDate = prompt('Unesite datum plaćanja (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!paymentDate) return;
    
    try {
      const response = await advanceInvoiceService.markPaid(companyId, invoice.id, {
        paymentDate,
        amount: invoice.totalAmount,
      });
      if (response.success) {
        toast.success('Avansna faktura označena kao plaćena');
        fetchInvoices();
      }
    } catch (error) {
      toast.error('Greška pri označavanju plaćanja');
    }
  };

  const handleUseAdvance = async () => {
    if (!selectedAdvance) return;
    
    try {
      setSaving(true);
      const response = await advanceInvoiceService.useAdvance(companyId, selectedAdvance.id, {
        invoiceId: useData.invoiceId,
        amount: useData.amount,
        notes: useData.notes,
      });
      
      if (response.success) {
        toast.success('Avans iskorišćen');
        setShowUseModal(false);
        setSelectedAdvance(null);
        setUseData({ invoiceId: '', amount: 0, notes: '' });
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

  const handleSendToSEF = async (invoice: AdvanceInvoice) => {
    if (!confirm('Poslati avansnu fakturu na SEF?')) return;
    
    try {
      const response = await advanceInvoiceService.sendToSEF(companyId, invoice.id);
      if (response.success) {
        toast.success('Avansna faktura poslata na SEF');
        fetchInvoices();
      }
    } catch (error) {
      toast.error('Greška pri slanju na SEF');
    }
  };

  const handleCancel = async (invoice: AdvanceInvoice) => {
    const reason = prompt('Unesite razlog storniranja:');
    if (!reason) return;
    
    try {
      const response = await advanceInvoiceService.cancel(companyId, invoice.id, reason);
      if (response.success) {
        toast.success('Avansna faktura stornirana');
        fetchInvoices();
      }
    } catch (error) {
      toast.error('Greška pri storniranju');
    }
  };

  const handleDelete = async (invoice: AdvanceInvoice) => {
    if (!confirm('Obrisati avansnu fakturu?')) return;
    
    try {
      const response = await advanceInvoiceService.delete(companyId, invoice.id);
      if (response.success) {
        toast.success('Avansna faktura obrisana');
        fetchInvoices();
      }
    } catch (error) {
      toast.error('Greška pri brisanju');
    }
  };

  const handleDownloadPDF = async (invoice: AdvanceInvoice) => {
    try {
      const response = await advanceInvoiceService.generatePDF(companyId, invoice.id);
      if (response.success && response.data) {
        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avans-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('Greška pri preuzimanju PDF-a');
    }
  };

  const resetForm = () => {
    setFormData({
      partnerName: '',
      partnerPIB: '',
      partnerAddress: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      netAmount: 0,
      vatRate: 20,
      currency: 'RSD',
      description: '',
      notes: '',
    });
    setEditingInvoice(null);
  };

  const openEditModal = (invoice: AdvanceInvoice) => {
    setEditingInvoice(invoice);
    setFormData({
      partnerName: invoice.partnerName,
      partnerPIB: invoice.partnerPIB,
      partnerAddress: invoice.partnerAddress || '',
      issueDate: invoice.issueDate.split('T')[0],
      dueDate: invoice.dueDate?.split('T')[0] || '',
      netAmount: invoice.netAmount,
      vatRate: invoice.vatRate,
      currency: invoice.currency,
      description: invoice.description || '',
      notes: invoice.notes || '',
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
    const net = formData.netAmount || 0;
    const vat = net * (formData.vatRate / 100);
    return net + vat;
  };

  const filteredInvoices = invoices.filter(inv => 
    searchTerm === '' ||
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.partnerPIB.includes(searchTerm)
  );

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
              <p className="text-xl font-bold">{invoices.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Plaćene</p>
              <p className="text-xl font-bold">
                {invoices.filter(i => i.status === 'PAID').length}
              </p>
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
              <p className="text-xl font-bold">
                {formatCurrency(
                  invoices.reduce((sum, i) => sum + i.remainingAmount, 0)
                )}
              </p>
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
              <p className="text-xl font-bold">
                {formatCurrency(
                  invoices.reduce((sum, i) => sum + i.usedAmount, 0)
                )}
              </p>
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
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{invoice.partnerName}</p>
                          <p className="text-sm text-gray-500">{invoice.partnerPIB}</p>
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
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[invoice.status]?.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_CONFIG[invoice.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
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
                          
                          {invoice.status === 'ISSUED' && (
                            <button
                              onClick={() => handleMarkPaid(invoice)}
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
                                setUseData({ invoiceId: '', amount: invoice.remainingAmount, notes: '' });
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
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Preuzmi PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          
                          {!['CANCELLED', 'FULLY_USED'].includes(invoice.status) && (
                            <button
                              onClick={() => handleCancel(invoice)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Storniraj"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
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
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                {editingInvoice ? 'Izmeni Avansnu Fakturu' : 'Nova Avansna Faktura'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Naziv partnera *</label>
                  <input
                    type="text"
                    value={formData.partnerName}
                    onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIB *</label>
                  <input
                    type="text"
                    value={formData.partnerPIB}
                    onChange={(e) => setFormData({ ...formData, partnerPIB: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
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
                    value={formData.netAmount}
                    onChange={(e) => setFormData({ ...formData, netAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stopa PDV *</label>
                  <select
                    value={formData.vatRate}
                    onChange={(e) => setFormData({ ...formData, vatRate: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {VAT_RATES.map((rate) => (
                      <option key={rate.value} value={rate.value}>{rate.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>

              {/* Calculated amounts */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Neto iznos:</span>
                  <span>{formatCurrency(formData.netAmount)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>PDV ({formData.vatRate}%):</span>
                  <span>{formatCurrency(formData.netAmount * (formData.vatRate / 100))}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Ukupno:</span>
                  <span>{formatCurrency(calculateTotalAmount())}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Odustani
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.partnerName || !formData.partnerPIB || !formData.netAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Čuvanje...' : editingInvoice ? 'Sačuvaj' : 'Kreiraj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Use Advance Modal */}
      {showUseModal && selectedAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Iskoristi Avans</h2>
              <p className="text-gray-500 mt-1">
                Avans {selectedAdvance.invoiceNumber} - preostalo {formatCurrency(selectedAdvance.remainingAmount)}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID fakture za umanjenje *</label>
                <input
                  type="text"
                  value={useData.invoiceId}
                  onChange={(e) => setUseData({ ...useData, invoiceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Unesite ID izlazne fakture"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Iznos za iskorišćenje *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedAdvance.remainingAmount}
                  value={useData.amount}
                  onChange={(e) => setUseData({ ...useData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUseModal(false);
                  setSelectedAdvance(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Odustani
              </button>
              <button
                onClick={handleUseAdvance}
                disabled={saving || !useData.invoiceId || !useData.amount}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Čuvanje...' : 'Iskoristi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">Avansna Faktura {detailInvoice.invoiceNumber}</h2>
                <span className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs rounded-full ${STATUS_CONFIG[detailInvoice.status]?.color}`}>
                  {STATUS_CONFIG[detailInvoice.status]?.label}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Partner</p>
                  <p className="font-medium">{detailInvoice.partnerName}</p>
                  <p className="text-gray-600">{detailInvoice.partnerPIB}</p>
                </div>
                <div>
                  <p className="text-gray-500">Datum izdavanja</p>
                  <p className="font-medium">{formatDate(detailInvoice.issueDate)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Neto iznos:</span>
                  <span>{formatCurrency(detailInvoice.netAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PDV ({detailInvoice.vatRate}%):</span>
                  <span>{formatCurrency(detailInvoice.vatAmount)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Ukupno:</span>
                  <span>{formatCurrency(detailInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Plaćeno:</span>
                  <span>{formatCurrency(detailInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Iskorišćeno:</span>
                  <span>{formatCurrency(detailInvoice.usedAmount)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Preostalo:</span>
                  <span className={detailInvoice.remainingAmount > 0 ? 'text-green-600' : ''}>
                    {formatCurrency(detailInvoice.remainingAmount)}
                  </span>
                </div>
              </div>

              {detailInvoice.linkedInvoices && detailInvoice.linkedInvoices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Povezane fakture:</h4>
                  <div className="space-y-2">
                    {detailInvoice.linkedInvoices.map((linked) => (
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

              {detailInvoice.sefId && (
                <div className="text-sm">
                  <p className="text-gray-500">SEF ID:</p>
                  <p className="font-mono">{detailInvoice.sefId}</p>
                </div>
              )}

              {detailInvoice.description && (
                <div className="text-sm">
                  <p className="text-gray-500">Opis:</p>
                  <p>{detailInvoice.description}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvanceInvoices;
