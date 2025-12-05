/**
 * Compensations - Kompenzacije
 * Multilateralno prebijanje potraživanja i obaveza
 */

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { apiClient } from '../services/api';
import { logger } from '../utils/logger';
import toast from 'react-hot-toast';
import { 
  ArrowLeftRight, 
  Plus, 
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Building2,
  Users,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface CompensationItem {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  documentNumber: string;
  documentDate: string;
  originalAmount: number;
  remainingAmount: number;
  compensatedAmount: number;
  partnerId: string;
  partnerName?: string;
}

interface Compensation {
  id: string;
  compensationNumber: string;
  compensationDate: string;
  status: 'DRAFT' | 'SIGNED' | 'CANCELLED';
  totalAmount: number;
  items: CompensationItem[];
  notes?: string;
  signedAt?: string;
  createdAt: string;
}

interface OpenItem {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  documentNumber: string;
  documentDate: string;
  dueDate: string;
  originalAmount: number;
  remainingAmount: number;
  partnerId: string;
  partnerName: string;
  selected?: boolean;
}

const CompensationsPage: React.FC = () => {
  const [compensations, setCompensations] = useState<Compensation[]>([]);
  const [openItems, setOpenItems] = useState<OpenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'list' | 'create'>('list');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<Compensation | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  useEffect(() => {
    fetchCompensations();
  }, []);

  const fetchCompensations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/compensations');
      if (response.data.success) {
        setCompensations(response.data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch compensations', error);
      toast.error('Greška pri učitavanju kompenzacija');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenItems = async () => {
    try {
      const response = await apiClient.get('/compensations/open-items');
      if (response.data.success) {
        setOpenItems(response.data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch open items', error);
      toast.error('Greška pri učitavanju otvorenih stavki');
    }
  };

  useEffect(() => {
    if (selectedTab === 'create') {
      fetchOpenItems();
    }
  }, [selectedTab]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleCreateCompensation = async () => {
    if (selectedItems.length < 2) {
      toast.error('Morate izabrati najmanje 2 stavke za kompenzaciju');
      return;
    }

    try {
      const response = await apiClient.post('/compensations', {
        itemIds: selectedItems
      });

      if (response.data.success) {
        setSelectedItems([]);
        setSelectedTab('list');
        fetchCompensations();
        toast.success('Kompenzacija je uspešno kreirana');
      }
    } catch (error) {
      logger.error('Failed to create compensation', error);
      toast.error('Greška pri kreiranju kompenzacije');
    }
  };

  const handleSign = async (id: string) => {
    try {
      const response = await apiClient.post(`/compensations/${id}/sign`);
      if (response.data.success) {
        fetchCompensations();
        toast.success('Kompenzacija je uspešno potpisana');
      }
    } catch (error) {
      logger.error('Failed to sign compensation', error);
      toast.error('Greška pri potpisivanju kompenzacije');
    }
  };

  const handleCancelClick = (id: string) => {
    setCancelConfirm({ open: true, id });
  };

  const handleCancelConfirm = async () => {
    if (!cancelConfirm.id) return;
    const id = cancelConfirm.id;
    setCancelConfirm({ open: false, id: null });

    try {
      const response = await apiClient.post(`/compensations/${id}/cancel`);
      if (response.data.success) {
        fetchCompensations();
        toast.success('Kompenzacija je uspešno stornirana');
      }
    } catch (error) {
      logger.error('Failed to cancel compensation', error);
      toast.error('Greška pri storniranju kompenzacije');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sr-RS');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Nacrt
          </span>
        );
      case 'SIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Potpisano
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            Stornirano
          </span>
        );
      default:
        return null;
    }
  };

  // Calculate balances for open items
  const receivablesTotal = openItems
    .filter(i => i.type === 'RECEIVABLE')
    .reduce((sum, i) => sum + i.remainingAmount, 0);
  const payablesTotal = openItems
    .filter(i => i.type === 'PAYABLE')
    .reduce((sum, i) => sum + i.remainingAmount, 0);
  const selectedTotal = openItems
    .filter(i => selectedItems.includes(i.id))
    .reduce((sum, i) => sum + (i.type === 'RECEIVABLE' ? i.remainingAmount : -i.remainingAmount), 0);

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <ArrowLeftRight className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Kompenzacije</h1>
                <p className="text-white/70 mt-1">Multilateralno prebijanje potraživanja i obaveza</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-2 flex gap-2">
        <button
          onClick={() => setSelectedTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            selectedTab === 'list'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-5 h-5" />
          Lista kompenzacija
        </button>
        <button
          onClick={() => setSelectedTab('create')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            selectedTab === 'create'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Plus className="w-5 h-5" />
          Nova kompenzacija
        </button>
      </div>

      {/* Content */}
      {selectedTab === 'list' ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Kompenzacije</h2>
            <button
              onClick={fetchCompensations}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : compensations.length === 0 ? (
            <div className="text-center py-12">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nema kompenzacija</p>
              <button
                onClick={() => setSelectedTab('create')}
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium"
              >
                <Plus className="w-4 h-4" />
                Kreiraj kompenzaciju
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Broj</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Iznos</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stavke</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {compensations.map((comp) => (
                    <tr key={comp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {comp.compensationNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(comp.compensationDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-indigo-600">
                        {formatCurrency(comp.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {comp.items?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(comp.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setShowDetailModal(comp)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Detalji"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          {comp.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleSign(comp.id)}
                                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                title="Potpiši"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleCancelClick(comp.id)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Storniraj"
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          )}
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="PDF">
                            <Download className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-2xl border border-green-200/50 shadow-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500 rounded-xl text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-green-700">Potraživanja</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{formatCurrency(receivablesTotal)}</div>
            </div>

            <div className="bg-red-50 rounded-2xl border border-red-200/50 shadow-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500 rounded-xl text-white">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-red-700">Obaveze</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{formatCurrency(payablesTotal)}</div>
            </div>

            <div className="bg-indigo-50 rounded-2xl border border-indigo-200/50 shadow-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500 rounded-xl text-white">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-indigo-700">Izabrano za kompenzaciju</span>
              </div>
              <div className={`text-2xl font-bold ${selectedTotal >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(selectedTotal))}
              </div>
              <span className="text-xs text-indigo-600">{selectedItems.length} stavki</span>
            </div>
          </div>

          {/* Open Items Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Otvorene stavke</h2>
              <button
                onClick={handleCreateCompensation}
                disabled={selectedItems.length < 2}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Kreiraj kompenzaciju
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-12">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(openItems.map(i => i.id));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                        checked={selectedItems.length === openItems.length && openItems.length > 0}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dokument</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valuta</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tip</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Originalni iznos</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preostalo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {openItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedItems.includes(item.id) ? 'bg-indigo-50' : ''
                      }`}
                      onClick={() => handleToggleItem(item.id)}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleToggleItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{item.partnerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                        {item.documentNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(item.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.type === 'RECEIVABLE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            Potraživanje
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            Obaveza
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {formatCurrency(item.originalAmount)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        item.type === 'RECEIVABLE' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(item.remainingAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Kompenzacija {showDetailModal.compensationNumber}
                </h3>
                <p className="text-sm text-gray-500">{formatDate(showDetailModal.compensationDate)}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {showDetailModal.items?.map((item, idx) => (
                  <div 
                    key={item.id || idx}
                    className={`p-4 rounded-xl border ${
                      item.type === 'RECEIVABLE' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-xs font-medium ${
                          item.type === 'RECEIVABLE' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.type === 'RECEIVABLE' ? 'Potraživanje' : 'Obaveza'}
                        </span>
                        <p className="font-medium text-gray-900">{item.documentNumber}</p>
                        <p className="text-sm text-gray-500">{item.partnerName}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          item.type === 'RECEIVABLE' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(item.compensatedAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Ukupno kompenzovano:</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {formatCurrency(showDetailModal.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">
                <Download className="w-4 h-4" />
                Preuzmi PDF
              </button>
              <button
                onClick={() => setShowDetailModal(null)}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelConfirm.open}
        onClose={() => setCancelConfirm({ open: false, id: null })}
        onConfirm={handleCancelConfirm}
        title="Storniranje kompenzacije"
        message="Da li ste sigurni da želite da stornirate ovu kompenzaciju?"
        confirmText="Storniraj"
        cancelText="Odustani"
        variant="danger"
      />
    </div>
  );
};

export default CompensationsPage;
