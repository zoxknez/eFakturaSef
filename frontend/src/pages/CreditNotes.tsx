/**
 * Credit Notes Page (Knjižna Odobrenja)
 * Management of credit notes / refunds
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { logger } from '../utils/logger';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Send,
  X,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
  Trash2,
  Ban
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nacrt',
  SENT: 'Poslato',
  APPROVED: 'Odobreno',
  REJECTED: 'Odbijeno',
  CANCELLED: 'Otkazano',
};

interface CreditNoteLine {
  id: string;
  lineNumber: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  originalInvoiceNumber: string;
  originalInvoiceId: string;
  partnerName: string;
  partnerPIB: string;
  issueDate: string;
  reason: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  sefId?: string;
  sefStatus?: string;
  lines: CreditNoteLine[];
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  total: number;
  issueDate: string;
}

interface LineFormData {
  itemName: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export const CreditNotes: React.FC = () => {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    originalInvoiceId: '',
    reason: '',
  });
  const [lines, setLines] = useState<LineFormData[]>([
    { itemName: '', quantity: '1', unitPrice: '', taxRate: '20' },
  ]);

  // Dialog states
  const [sendConfirm, setSendConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: string | null; reason: string }>({ open: false, id: null, reason: '' });

  useEffect(() => {
    fetchCreditNotes();
    fetchInvoices();
  }, [filterStatus, dateFrom, dateTo, searchTerm]);

  const fetchCreditNotes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getCreditNotes({
        status: filterStatus || undefined,
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
        search: searchTerm || undefined
      });

      if (response.success && response.data) {
        setCreditNotes((response.data.data as CreditNote[]) || []);
      } else {
        setError(response.error || 'Greška pri učitavanju');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, dateFrom, dateTo, searchTerm]);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.getInvoices({ status: 'APPROVED', limit: 100 });

      if (response.success && response.data) {
        setInvoices(response.data.data?.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          partnerName: inv.partner?.name || 'N/A',
          total: Number(inv.totalAmount) || 0,
          issueDate: inv.issueDate
        })) || []);
      }
    } catch (err) {
      logger.error('Error fetching invoices', err);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.originalInvoiceId) {
      setError('Morate izabrati originalnu fakturu');
      return;
    }

    if (!formData.reason) {
      setError('Morate uneti razlog za knjižno odobrenje');
      return;
    }

    const validLines = lines.filter(l => l.itemName && l.unitPrice);
    if (validLines.length === 0) {
      setError('Morate uneti bar jednu stavku');
      return;
    }

    try {
      const response = await api.createCreditNote({
        ...formData,
        lines: validLines.map((l, i) => ({
          lineNumber: i + 1,
          itemName: l.itemName,
          quantity: parseFloat(l.quantity) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
          taxRate: parseFloat(l.taxRate) || 20,
        })),
      });

      if (response.success) {
        setShowModal(false);
        resetForm();
        await fetchCreditNotes();
        toast.success('Knjižno odobrenje kreirano');
      } else {
        setError(response.error || 'Greška pri kreiranju');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri kreiranju');
    }
  };

  const handleSendToSEF = async (id: string) => {
    setSendConfirm({ open: false, id: null });

    try {
      toast.loading('Slanje na SEF...', { id: 'send-sef' });
      const response = await api.sendCreditNoteToSEF(id);

      if (response.success) {
        await fetchCreditNotes();
        setSelectedNote(null);
        toast.success('Knjižno odobrenje poslato na SEF', { id: 'send-sef' });
      } else {
        toast.error(response.error || 'Greška pri slanju na SEF', { id: 'send-sef' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri slanju na SEF', { id: 'send-sef' });
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog.id || !cancelDialog.reason.trim()) return;
    const id = cancelDialog.id;
    const reason = cancelDialog.reason;
    setCancelDialog({ open: false, id: null, reason: '' });

    try {
      toast.loading('Otkazivanje...', { id: 'cancel-cn' });
      const response = await api.cancelCreditNote(id, reason);

      if (response.success) {
        await fetchCreditNotes();
        setSelectedNote(null);
        toast.success('Knjižno odobrenje otkazano', { id: 'cancel-cn' });
      } else {
        toast.error(response.error || 'Greška pri otkazivanju', { id: 'cancel-cn' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri otkazivanju', { id: 'cancel-cn' });
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ open: false, id: null });

    try {
      toast.loading('Brisanje...', { id: 'delete-cn' });
      const response = await api.deleteCreditNote(id);

      if (response.success) {
        await fetchCreditNotes();
        toast.success('Knjižno odobrenje obrisano', { id: 'delete-cn' });
      } else {
        toast.error(response.error || 'Greška pri brisanju', { id: 'delete-cn' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri brisanju', { id: 'delete-cn' });
    }
  };

  const downloadPDF = async (id: string, number: string) => {
    try {
      toast.loading('Preuzimanje PDF-a...', { id: 'pdf-download' });
      const blob = await api.downloadCreditNotePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knjizno-odobrenje-${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF preuzet', { id: 'pdf-download' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri preuzimanju PDF-a', { id: 'pdf-download' });
    }
  };

  const resetForm = () => {
    setFormData({ originalInvoiceId: '', reason: '' });
    setLines([{ itemName: '', quantity: '1', unitPrice: '', taxRate: '20' }]);
  };

  const addLine = () => {
    setLines([...lines, { itemName: '', quantity: '1', unitPrice: '', taxRate: '20' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineFormData, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  // Auto-fill lines when invoice is selected
  const handleInvoiceSelect = (invoiceId: string) => {
    setFormData({ ...formData, originalInvoiceId: invoiceId });
    // In real app, would fetch invoice details and pre-fill lines
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sr-RS');
  };

  // Calculate totals
  const formTotals = lines.reduce(
    (acc, line) => {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unitPrice) || 0;
      const rate = parseFloat(line.taxRate) || 0;
      const subtotal = qty * price;
      const tax = subtotal * (rate / 100);
      return {
        subtotal: acc.subtotal + subtotal,
        tax: acc.tax + tax,
        total: acc.total + subtotal + tax,
      };
    },
    { subtotal: 0, tax: 0, total: 0 }
  );

  if (loading && creditNotes.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-900 via-pink-900 to-fuchsia-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Knjižna Odobrenja</h1>
                <p className="text-white/70 mt-1">Upravljanje knjižnim odobrenjima i povratima</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-rose-900 rounded-xl hover:bg-white/90 transition-all duration-200 shadow-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Novo odobrenje</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-slideIn">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_LABELS).map(([status, label]) => {
          const count = creditNotes.filter(cn => cn.status === status).length;
          const total = creditNotes.filter(cn => cn.status === status).reduce((sum, cn) => sum + cn.total, 0);
          return (
            <div key={status} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
              <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                {label}
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-500">{formatCurrency(total)}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filteri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pretraga</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Broj ili partner..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-200"
            >
              <option value="">Svi statusi</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Od datuma</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-200"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus('');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              Resetuj
            </button>
          </div>
        </div>
      </div>

      {/* Credit Notes List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Broj
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Orig. faktura
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Razlog
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Iznos
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {creditNotes.map((note) => (
                <tr
                  key={note.id}
                  className="hover:bg-rose-50/50 cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedNote(note)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-semibold text-rose-600">{note.creditNoteNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {note.originalInvoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    <div className="font-medium">{note.partnerName}</div>
                    <div className="text-xs text-gray-500">{note.partnerPIB}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(note.issueDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {note.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold text-red-600">
                    -{formatCurrency(note.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[note.status]}`}>
                      {STATUS_LABELS[note.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => downloadPDF(note.id, note.creditNoteNumber)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200"
                        title="PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {note.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => setSendConfirm({ open: true, id: note.id })}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Pošalji na SEF"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, id: note.id })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Obriši"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {note.status === 'SENT' && (
                        <button
                          onClick={() => setCancelDialog({ open: true, id: note.id, reason: '' })}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200"
                          title="Otkaži"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {creditNotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <FileCheck className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Nema knjižnih odobrenja</p>
                      <button
                        onClick={() => {
                          resetForm();
                          setShowModal(true);
                        }}
                        className="mt-2 flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200"
                      >
                        <Plus className="w-4 h-4" />
                        Kreirajte prvo odobrenje
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedNote(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Knjižno odobrenje {selectedNote.creditNoteNumber}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Za fakturu: {selectedNote.originalInvoiceNumber}
                  </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[selectedNote.status]}`}>
                  {STATUS_LABELS[selectedNote.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">Partner</div>
                  <div className="font-semibold text-gray-900">{selectedNote.partnerName}</div>
                  <div className="text-sm text-gray-500">{selectedNote.partnerPIB}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">Datum izdavanja</div>
                  <div className="font-semibold text-gray-900">{formatDate(selectedNote.issueDate)}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Razlog</div>
                <p className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-gray-700">{selectedNote.reason}</p>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">R.br.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Naziv</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Kol.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cena</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">PDV</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Iznos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedNote.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{line.lineNumber}</td>
                        <td className="px-4 py-3 text-sm font-medium">{line.itemName}</td>
                        <td className="px-4 py-3 text-sm text-right">{line.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(line.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm text-right">{line.taxRate}%</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-2.5 text-right font-medium text-gray-600">Osnovica:</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(selectedNote.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-2.5 text-right font-medium text-gray-600">PDV:</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(selectedNote.taxAmount)}</td>
                    </tr>
                    <tr className="text-lg font-bold bg-rose-50">
                      <td colSpan={5} className="px-4 py-3 text-right">UKUPNO:</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">-{formatCurrency(selectedNote.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedNote.sefId && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="text-sm text-blue-700">
                    <strong>SEF ID:</strong> {selectedNote.sefId}
                  </div>
                  {selectedNote.sefStatus && (
                    <div className="text-sm text-blue-700 mt-1">
                      <strong>SEF Status:</strong> {selectedNote.sefStatus}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedNote(null)}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  Zatvori
                </button>
                <button
                  onClick={() => downloadPDF(selectedNote.id, selectedNote.creditNoteNumber)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  <Eye className="w-4 h-4" />
                  PDF
                </button>
                {selectedNote.status === 'DRAFT' && (
                  <button
                    onClick={() => setSendConfirm({ open: true, id: selectedNote.id })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:opacity-90 transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                    Pošalji na SEF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <Plus className="w-5 h-5 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Novo knjižno odobrenje</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Originalna faktura *</label>
                    <select
                      value={formData.originalInvoiceId}
                      onChange={(e) => handleInvoiceSelect(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-200"
                    >
                      <option value="">Izaberite fakturu...</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - {inv.partnerName} ({formatCurrency(inv.total)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Razlog *</label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      placeholder="npr. Reklamacija, povrat robe..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Lines */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-gray-700">Stavke</label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Dodaj stavku
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Naziv</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-24">Količina</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-32">Cena</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase w-24">PDV %</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lines.map((line, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={line.itemName}
                                onChange={(e) => updateLine(index, 'itemName', e.target.value)}
                                placeholder="Naziv stavke"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.quantity}
                                onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm text-right"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.unitPrice}
                                onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm text-right font-mono"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={line.taxRate}
                                onChange={(e) => updateLine(index, 'taxRate', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                              >
                                <option value="20">20%</option>
                                <option value="10">10%</option>
                                <option value="0">0%</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {lines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(index)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-4 py-3 text-right text-gray-600">Osnovica:</td>
                          <td className="px-4 py-3 text-right font-mono" colSpan={2}>{formatCurrency(formTotals.subtotal)}</td>
                          <td></td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-4 py-3 text-right text-gray-600">PDV:</td>
                          <td className="px-4 py-3 text-right font-mono" colSpan={2}>{formatCurrency(formTotals.tax)}</td>
                          <td></td>
                        </tr>
                        <tr className="bg-rose-50 font-bold text-lg">
                          <td colSpan={2} className="px-4 py-4 text-right">UKUPNO:</td>
                          <td className="px-4 py-4 text-right font-mono text-red-600" colSpan={2}>-{formatCurrency(formTotals.total)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    disabled={formTotals.total === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-rose-500/25"
                  >
                    Kreiraj knjižno odobrenje
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      <ConfirmDialog
        isOpen={sendConfirm.open}
        onClose={() => setSendConfirm({ open: false, id: null })}
        onConfirm={() => sendConfirm.id && handleSendToSEF(sendConfirm.id)}
        title="Slanje na SEF"
        message="Da li ste sigurni da želite da pošaljete knjižno odobrenje na SEF?"
        confirmText="Pošalji"
        cancelText="Odustani"
        variant="info"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => deleteConfirm.id && handleDelete(deleteConfirm.id)}
        title="Brisanje knjižnog odobrenja"
        message="Da li ste sigurni da želite da obrišete ovo knjižno odobrenje?"
        confirmText="Obriši"
        cancelText="Odustani"
        variant="danger"
      />

      {/* Cancel Dialog with Reason Input */}
      {cancelDialog.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Otkazivanje knjižnog odobrenja</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razlog otkazivanja
              </label>
              <textarea
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                rows={4}
                placeholder="Unesite razlog otkazivanja..."
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setCancelDialog({ open: false, id: null, reason: '' })}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
              >
                Odustani
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelDialog.reason.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditNotes;
