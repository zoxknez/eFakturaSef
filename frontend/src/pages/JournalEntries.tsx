/**
 * Journal Entries Page (Dnevnik Knjiženja)
 * Double-entry bookkeeping journal management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import api from '../services/api';
import {
  BookOpen,
  Plus,
  Filter,
  RotateCcw,
  Check,
  X,
  Undo2,
  Trash2,
  Calendar,
  AlertCircle,
  FileText,
  Loader2
} from 'lucide-react';

const JOURNAL_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  POSTED: 'bg-green-100 text-green-700',
  REVERSED: 'bg-red-100 text-red-700',
};

const JOURNAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nacrt',
  POSTED: 'Proknjiženo',
  REVERSED: 'Stornirano',
};

const JOURNAL_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'Opšti nalog',
  SALES: 'Prodaja',
  PURCHASE: 'Nabavka',
  CASH: 'Blagajna',
  BANK: 'Banka',
  ADJUSTMENT: 'Korekcija',
  CLOSING: 'Zaključak',
};

interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  type: string;
  status: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
  createdAt: string;
  postedAt?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

interface LineFormData {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export const JournalEntries: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialog states
  const [postDialog, setPostDialog] = useState<{ isOpen: boolean; entry: JournalEntry | null }>({
    isOpen: false,
    entry: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; entry: JournalEntry | null }>({
    isOpen: false,
    entry: null,
  });
  const [reverseDialog, setReverseDialog] = useState<{ isOpen: boolean; entry: JournalEntry | null; reason: string }>({
    isOpen: false,
    entry: null,
    reason: '',
  });

  // New entry form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'GENERAL',
    description: '',
  });
  const [lines, setLines] = useState<LineFormData[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' },
  ]);

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, [filterStatus, filterType, dateFrom, dateTo]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('type', filterType);
      if (dateFrom) params.append('fromDate', dateFrom);
      if (dateTo) params.append('toDate', dateTo);

      const response = await api.getJournalEntries({
        status: filterStatus,
        type: filterType,
        fromDate: dateFrom,
        toDate: dateTo
      });

      if (response.success && response.data) {
        setEntries(response.data.data || []);
      } else {
        throw new Error(response.error || 'Failed to fetch entries');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri učitavanju';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.getAccounts({ flat: true, isActive: true });
      if (response.success && response.data) {
        setAccounts(response.data as Account[]);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate lines
    const validLines = lines.filter(l => l.accountId && (l.debit || l.credit));
    if (validLines.length < 2) {
      setError('Nalog mora imati najmanje 2 stavke');
      return;
    }

    const totalDebit = validLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const totalCredit = validLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError('Duguje i potražuje moraju biti jednaki');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.createJournalEntry({
        ...formData,
        lines: validLines.map(l => ({
          accountId: l.accountId,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description,
        })),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create entry');
      }

      toast.success('Nalog za knjiženje uspešno kreiran');
      setShowModal(false);
      resetForm();
      await fetchEntries();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri kreiranju';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostClick = (entry: JournalEntry) => {
    setPostDialog({ isOpen: true, entry });
  };

  const handlePostConfirm = async () => {
    const entry = postDialog.entry;
    if (!entry) return;

    try {
      setIsSubmitting(true);
      const response = await api.postJournalEntry(entry.id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to post entry');
      }

      toast.success(`Nalog ${entry.entryNumber} uspešno proknjižen`);
      setPostDialog({ isOpen: false, entry: null });
      await fetchEntries();
      setSelectedEntry(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri knjiženju';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseClick = (entry: JournalEntry) => {
    setReverseDialog({ isOpen: true, entry, reason: '' });
  };

  const handleReverseConfirm = async () => {
    const entry = reverseDialog.entry;
    if (!entry || !reverseDialog.reason.trim()) {
      toast.error('Morate uneti razlog storniranja');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.reverseJournalEntry(entry.id, reverseDialog.reason);

      if (!response.success) {
        throw new Error(response.error || 'Failed to reverse entry');
      }

      toast.success(`Nalog ${entry.entryNumber} uspešno storniran`);
      setReverseDialog({ isOpen: false, entry: null, reason: '' });
      await fetchEntries();
      setSelectedEntry(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri storniranju';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (entry: JournalEntry) => {
    setDeleteDialog({ isOpen: true, entry });
  };

  const handleDeleteConfirm = async () => {
    const entry = deleteDialog.entry;
    if (!entry) return;

    try {
      setIsSubmitting(true);
      const response = await api.deleteJournalEntry(entry.id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete entry');
      }

      toast.success(`Nalog ${entry.entryNumber} uspešno obrisan`);
      setDeleteDialog({ isOpen: false, entry: null });
      await fetchEntries();
      setSelectedEntry(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri brisanju';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'GENERAL',
      description: '',
    });
    setLines([
      { accountId: '', debit: '', credit: '', description: '' },
      { accountId: '', debit: '', credit: '', description: '' },
    ]);
  };

  const addLine = () => {
    setLines([...lines, { accountId: '', debit: '', credit: '', description: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineFormData, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-clear the other side when entering amount
    if (field === 'debit' && value) {
      newLines[index].credit = '';
    } else if (field === 'credit' && value) {
      newLines[index].debit = '';
    }
    
    setLines(newLines);
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

  // Calculate totals for form
  const formTotals = lines.reduce(
    (acc, line) => ({
      debit: acc.debit + (parseFloat(line.debit) || 0),
      credit: acc.credit + (parseFloat(line.credit) || 0),
    }),
    { debit: 0, credit: 0 }
  );

  if (loading && entries.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dnevnik Knjiženja</h1>
                <p className="text-white/70 mt-1">Evidencija svih naloga za knjiženje (double-entry)</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-900 rounded-xl hover:bg-white/90 transition-all duration-200 shadow-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Novi nalog</span>
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

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filteri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            >
              <option value="">Svi statusi</option>
              {Object.entries(JOURNAL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tip</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            >
              <option value="">Svi tipovi</option>
              {Object.entries(JOURNAL_TYPE_LABELS).map(([value, label]) => (
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
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterType('');
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resetuj</span>
            </button>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Broj naloga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duguje
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Potražuje
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-medium text-blue-600">{entry.entryNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {JOURNAL_TYPE_LABELS[entry.type] || entry.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {entry.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                    {formatCurrency(entry.totalDebit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                    {formatCurrency(entry.totalCredit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${JOURNAL_STATUS_COLORS[entry.status]}`}>
                      {JOURNAL_STATUS_LABELS[entry.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {entry.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => handlePostClick(entry)}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                            title="Proknjiži"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(entry)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Obriši"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {entry.status === 'POSTED' && (
                        <button
                          onClick={() => handleReverseClick(entry)}
                          className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Storniraj"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Nema naloga za knjiženje
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedEntry(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Nalog br. {selectedEntry.entryNumber}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(selectedEntry.date)} • {JOURNAL_TYPE_LABELS[selectedEntry.type]}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${JOURNAL_STATUS_COLORS[selectedEntry.status]}`}>
                  {JOURNAL_STATUS_LABELS[selectedEntry.status]}
                </span>
              </div>

              {selectedEntry.description && (
                <p className="text-gray-700 mb-4 p-3 bg-gray-50 rounded-lg">
                  {selectedEntry.description}
                </p>
              )}

              <table className="min-w-full divide-y divide-gray-200 mb-6">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Konto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Duguje</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Potražuje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEntry.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2">
                        <code className="text-sm bg-gray-100 px-1 rounded">{line.accountCode}</code>
                        <span className="ml-2 text-sm text-gray-700">{line.accountName}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{line.description || '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-sm">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="px-4 py-2 text-right">Ukupno:</td>
                    <td className="px-4 py-2 text-right font-mono">{formatCurrency(selectedEntry.totalDebit)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatCurrency(selectedEntry.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Zatvori
                </button>
                {selectedEntry.status === 'DRAFT' && (
                  <button
                    onClick={() => handlePostClick(selectedEntry)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Proknjiži
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Novi nalog za knjiženje</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tip naloga</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(JOURNAL_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Opis naloga..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Lines */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700">Stavke knjiženja</label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Dodaj stavku
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Konto</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Duguje</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Potražuje</th>
                          <th className="px-4 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lines.map((line, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">
                              <select
                                value={line.accountId}
                                onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">Izaberi konto...</option>
                                {accounts.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.code} - {acc.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                placeholder="Opis stavke"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.debit}
                                onChange={(e) => updateLine(index, 'debit', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm text-right font-mono"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.credit}
                                onChange={(e) => updateLine(index, 'credit', e.target.value)}
                                placeholder="0.00"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm text-right font-mono"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              {lines.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeLine(index)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-4 py-2 text-right">Ukupno:</td>
                          <td className={`px-4 py-2 text-right font-mono ${formTotals.debit !== formTotals.credit ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(formTotals.debit)}
                          </td>
                          <td className={`px-4 py-2 text-right font-mono ${formTotals.debit !== formTotals.credit ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(formTotals.credit)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {formTotals.debit !== formTotals.credit && formTotals.debit > 0 && (
                    <p className="mt-2 text-sm text-red-600">
                      ⚠️ Razlika: {formatCurrency(Math.abs(formTotals.debit - formTotals.credit))}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    disabled={formTotals.debit !== formTotals.credit || formTotals.debit === 0 || isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Čuvanje...
                      </>
                    ) : (
                      'Sačuvaj nalog'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Post Confirmation Dialog */}
      <ConfirmDialog
        isOpen={postDialog.isOpen}
        onClose={() => setPostDialog({ isOpen: false, entry: null })}
        onConfirm={handlePostConfirm}
        title="Proknjiženje naloga"
        message={
          postDialog.entry ? (
            <span>
              Da li ste sigurni da želite da proknjižite nalog{' '}
              <strong>{postDialog.entry.entryNumber}</strong>?
              <br />
              <span className="text-sm text-gray-500">
                Nakon proknjiženja nalog se ne može menjati.
              </span>
            </span>
          ) : 'Da li ste sigurni?'
        }
        confirmText="Proknjiži"
        variant="success"
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, entry: null })}
        onConfirm={handleDeleteConfirm}
        title="Brisanje naloga"
        message={
          deleteDialog.entry ? (
            <span>
              Da li ste sigurni da želite da obrišete nalog{' '}
              <strong>{deleteDialog.entry.entryNumber}</strong>?
              Ova akcija je nepovratna.
            </span>
          ) : 'Da li ste sigurni?'
        }
        confirmText="Obriši"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Reverse Dialog with Reason Input */}
      {reverseDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setReverseDialog({ isOpen: false, entry: null, reason: '' })} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Undo2 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Storniranje naloga</h3>
                  <p className="text-sm text-gray-500">Nalog: {reverseDialog.entry?.entryNumber}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razlog storniranja <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reverseDialog.reason}
                  onChange={(e) => setReverseDialog(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  placeholder="Unesite razlog storniranja..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setReverseDialog({ isOpen: false, entry: null, reason: '' })}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleReverseConfirm}
                  disabled={!reverseDialog.reason.trim() || isSubmitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Storniranje...
                    </>
                  ) : (
                    <>
                      <Undo2 className="w-4 h-4" />
                      Storniraj
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntries;
