/**
 * KPO - Knjiga Prometa Obveznika
 * Za preduzetnike koji vode poslovne knjige po prostom sistemu
 */

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { apiClient } from '../services/api';
import { logger } from '../utils/logger';
import { 
  BookOpen, 
  Plus, 
  Download, 
  RefreshCw, 
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Filter,
  Trash2,
  Edit,
  Wand2
} from 'lucide-react';

interface KPOEntry {
  id: string;
  ordinalNumber: number;
  date: string;
  description: string;
  documentNumber: string;
  documentType: string;
  grossIncome: number;
  vatAmount: number;
  netIncome: number;
  expense: number;
  createdAt: string;
  invoiceId?: string;
}

interface KPOSummary {
  totalGrossIncome: number;
  totalVatAmount: number;
  totalNetIncome: number;
  totalExpenses: number;
  profit: number;
  entryCount: number;
}

const KPOPage: React.FC = () => {
  const [entries, setEntries] = useState<KPOEntry[]>([]);
  const [summary, setSummary] = useState<KPOSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'Januar' }, { value: 2, label: 'Februar' }, 
    { value: 3, label: 'Mart' }, { value: 4, label: 'April' },
    { value: 5, label: 'Maj' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Avgust' },
    { value: 9, label: 'Septembar' }, { value: 10, label: 'Oktobar' },
    { value: 11, label: 'Novembar' }, { value: 12, label: 'Decembar' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fromDate = new Date(selectedYear, selectedMonth - 1, 1);
      const toDate = new Date(selectedYear, selectedMonth, 0);

      const [entriesRes, summaryRes] = await Promise.all([
        apiClient.get('/kpo/entries', {
          params: {
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
          }
        }),
        apiClient.get('/kpo/summary', {
          params: {
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
          }
        })
      ]);

      if (entriesRes.data.success) {
        setEntries(entriesRes.data.data);
      }
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch KPO data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const fromDate = new Date(selectedYear, selectedMonth - 1, 1);
      const toDate = new Date(selectedYear, selectedMonth, 0);

      const response = await apiClient.post('/kpo/auto-generate', {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      });

      if (response.data.success) {
        await fetchData();
        setShowAutoGenerate(false);
      }
    } catch (error) {
      logger.error('Failed to auto-generate KPO', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const fromDate = new Date(selectedYear, selectedMonth - 1, 1);
      const toDate = new Date(selectedYear, selectedMonth, 0);

      const response = await apiClient.get('/kpo/export', {
        params: {
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString()
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `KPO_${selectedYear}_${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      logger.error('Failed to export KPO', error);
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

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">KPO - Knjiga Prometa</h1>
                <p className="text-white/70 mt-1">Evidencija prihoda i rashoda za preduzetnike</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAutoGenerate(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200"
              >
                <Wand2 className="w-4 h-4" />
                Auto generisanje
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2 rounded-xl font-medium transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Novi unos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">Period</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Godina</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mesec</label>
            <select
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchData}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-emerald-500/25"
            >
              <RefreshCw className="w-4 h-4" />
              Učitaj
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Bruto prihod</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalGrossIncome)}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">PDV</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalVatAmount)}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Neto prihod</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalNetIncome)}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl text-white">
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">Rashodi</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalExpenses)}</div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl text-white ${summary.profit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-green-500' : 'bg-gradient-to-br from-red-500 to-rose-500'}`}>
                {summary.profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <span className="text-sm font-medium text-gray-500">Dobit/Gubitak</span>
            </div>
            <div className={`text-xl font-bold ${summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(summary.profit)}
            </div>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Knjiženja</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {entries.length} unosa
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nema unosa za izabrani period</p>
            <button
              onClick={() => setShowAutoGenerate(true)}
              className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium"
            >
              <Wand2 className="w-4 h-4" />
              Generiši iz faktura
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">R.B.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dokument</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bruto prihod</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PDV</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto prihod</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rashod</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akcije</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.ordinalNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {entry.documentNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      {entry.grossIncome > 0 ? formatCurrency(entry.grossIncome) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {entry.vatAmount > 0 ? formatCurrency(entry.vatAmount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                      {entry.netIncome > 0 ? formatCurrency(entry.netIncome) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                      {entry.expense > 0 ? formatCurrency(entry.expense) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* Auto Generate Modal */}
      {showAutoGenerate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Auto generisanje KPO</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Automatski generiši KPO unose iz izlaznih faktura za period{' '}
                <strong>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAutoGenerate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleAutoGenerate}
                  disabled={generating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generisanje...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generiši
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

export default KPOPage;
