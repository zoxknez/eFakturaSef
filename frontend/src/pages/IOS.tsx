/**
 * IOS - Izvod Otvorenih Stavki
 * Statement of Open Items per partner
 */

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { apiClient } from '../services/api';
import { logger } from '../utils/logger';
import { 
  FileSpreadsheet, 
  Send, 
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Mail,
  Download,
  Eye,
  RefreshCw,
  Plus,
  AlertTriangle
} from 'lucide-react';

interface IOSItem {
  id: string;
  documentNumber: string;
  documentType: string;
  documentDate: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

interface IOSReport {
  id: string;
  reportNumber: string;
  reportDate: string;
  asOfDate: string;
  partnerId: string;
  partnerName: string;
  partnerEmail?: string;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'DISPUTED';
  totalReceivables: number;
  totalPayables: number;
  balance: number;
  items: IOSItem[];
  sentAt?: string;
  confirmedAt?: string;
  disputeNotes?: string;
}

interface PartnerBalance {
  partnerId: string;
  partnerName: string;
  partnerPib: string;
  receivables: number;
  payables: number;
  balance: number;
  lastIOSDate?: string;
  overdueAmount: number;
}

const IOSPage: React.FC = () => {
  const [reports, setReports] = useState<IOSReport[]>([]);
  const [balances, setBalances] = useState<PartnerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'reports' | 'balances'>('balances');
  const [showGenerateModal, setShowGenerateModal] = useState<PartnerBalance | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<IOSReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (selectedTab === 'reports') {
      fetchReports();
    } else {
      fetchBalances();
    }
  }, [selectedTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/ios');
      if (response.data.success) {
        setReports(response.data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch IOS reports', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/ios/balances');
      if (response.data.success) {
        setBalances(response.data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch partner balances', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!showGenerateModal) return;
    
    setGenerating(true);
    try {
      const response = await apiClient.post('/ios/generate', {
        partnerId: showGenerateModal.partnerId,
        asOfDate
      });

      if (response.data.success) {
        setShowGenerateModal(null);
        setSelectedTab('reports');
        fetchReports();
      }
    } catch (error) {
      logger.error('Failed to generate IOS', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      const response = await apiClient.post(`/ios/${id}/send`);
      if (response.data.success) {
        fetchReports();
      }
    } catch (error) {
      logger.error('Failed to send IOS', error);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const response = await apiClient.post(`/ios/${id}/confirm`);
      if (response.data.success) {
        fetchReports();
        if (showDetailModal?.id === id) {
          setShowDetailModal(null);
        }
      }
    } catch (error) {
      logger.error('Failed to confirm IOS', error);
    }
  };

  const handleDispute = async (id: string, notes: string) => {
    try {
      const response = await apiClient.post(`/ios/${id}/dispute`, { notes });
      if (response.data.success) {
        fetchReports();
        if (showDetailModal?.id === id) {
          setShowDetailModal(null);
        }
      }
    } catch (error) {
      logger.error('Failed to dispute IOS', error);
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
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Nacrt
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            <Send className="w-3 h-3" />
            Poslato
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            Potvrđeno
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Osporeno
          </span>
        );
      default:
        return null;
    }
  };

  const totalReceivables = balances.reduce((sum, b) => sum + b.receivables, 0);
  const totalPayables = balances.reduce((sum, b) => sum + b.payables, 0);
  const totalOverdue = balances.reduce((sum, b) => sum + b.overdueAmount, 0);

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-900 via-teal-900 to-emerald-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">IOS - Izvod Otvorenih Stavki</h1>
                <p className="text-white/70 mt-1">Usaglašavanje salda sa partnerima</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-2xl border border-green-200/50 shadow-lg p-5">
          <span className="text-sm font-medium text-green-700">Ukupna potraživanja</span>
          <div className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(totalReceivables)}</div>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200/50 shadow-lg p-5">
          <span className="text-sm font-medium text-red-700">Ukupne obaveze</span>
          <div className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(totalPayables)}</div>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-200/50 shadow-lg p-5">
          <span className="text-sm font-medium text-amber-700">Dospela potraživanja</span>
          <div className="text-2xl font-bold text-amber-900 mt-1">{formatCurrency(totalOverdue)}</div>
        </div>
        <div className="bg-cyan-50 rounded-2xl border border-cyan-200/50 shadow-lg p-5">
          <span className="text-sm font-medium text-cyan-700">Neto pozicija</span>
          <div className={`text-2xl font-bold mt-1 ${totalReceivables - totalPayables >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {formatCurrency(totalReceivables - totalPayables)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-2 flex gap-2">
        <button
          onClick={() => setSelectedTab('balances')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            selectedTab === 'balances'
              ? 'bg-cyan-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-5 h-5" />
          Salda po partnerima
        </button>
        <button
          onClick={() => setSelectedTab('reports')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            selectedTab === 'reports'
              ? 'bg-cyan-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          IOS izveštaji
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : selectedTab === 'balances' ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Partneri sa otvorenim stavkama</h2>
            <button
              onClick={fetchBalances}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {balances.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nema otvorenih stavki</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIB</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Potraživanja</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Obaveze</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dospelo</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Poslednji IOS</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akcija</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {balances.map((balance) => (
                    <tr key={balance.partnerId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{balance.partnerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {balance.partnerPib}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">
                        {balance.receivables > 0 ? formatCurrency(balance.receivables) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">
                        {balance.payables > 0 ? formatCurrency(balance.payables) : '-'}
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${
                        balance.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(balance.balance)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {balance.overdueAmount > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {formatCurrency(balance.overdueAmount)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {balance.lastIOSDate ? formatDate(balance.lastIOSDate) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setShowGenerateModal(balance)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Generiši IOS
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">IOS izveštaji</h2>
            <button
              onClick={fetchReports}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nema IOS izveštaja</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Broj</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Na dan</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {report.reportNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {report.partnerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(report.asOfDate)}
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${
                        report.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(report.balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setShowDetailModal(report)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Detalji"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          {report.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSend(report.id)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Pošalji"
                            >
                              <Mail className="w-4 h-4 text-blue-600" />
                            </button>
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
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Generiši IOS</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner</label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">{showGenerateModal.partnerName}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo</label>
                <div className={`text-lg font-bold p-3 rounded-xl ${
                  showGenerateModal.balance >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {formatCurrency(showGenerateModal.balance)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Na dan</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowGenerateModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generisanje...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      Generiši
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  IOS {showDetailModal.reportNumber}
                </h3>
                <p className="text-sm text-gray-500">
                  {showDetailModal.partnerName} • Na dan {formatDate(showDetailModal.asOfDate)}
                </p>
              </div>
              {getStatusBadge(showDetailModal.status)}
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Dokument</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Datum</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Valuta</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Iznos</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Plaćeno</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {showDetailModal.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono">{item.documentNumber}</td>
                        <td className="px-4 py-2">{formatDate(item.documentDate)}</td>
                        <td className="px-4 py-2">{formatDate(item.dueDate)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.originalAmount)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.paidAmount)}</td>
                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(item.remainingAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-right">Ukupno:</td>
                      <td className={`px-4 py-2 text-right ${showDetailModal.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(showDetailModal.balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              {showDetailModal.status === 'SENT' && (
                <>
                  <button
                    onClick={() => handleConfirm(showDetailModal.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Potvrdi
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Unesite razlog osporavanja:');
                      if (notes) handleDispute(showDetailModal.id, notes);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    Ospori
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetailModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
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

export default IOSPage;
