/**
 * VAT Records Page (PDV Evidencija)
 * KPO (Knjiga Primljenih Obračuna) and KPR (Knjiga Prometa) management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { logger } from '../utils/logger';
import {
  Receipt,
  Download,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Calendar,
  Filter,
  RotateCcw,
  AlertCircle,
  X,
  RefreshCw,
  Printer,
  FileSpreadsheet
} from 'lucide-react';

const VAT_RECORD_TYPE_LABELS: Record<string, string> = {
  INPUT: 'Ulazni PDV (pretporez)',
  OUTPUT: 'Izlazni PDV',
};

const VAT_RECORD_TYPE_COLORS: Record<string, string> = {
  INPUT: 'bg-blue-100 text-blue-700',
  OUTPUT: 'bg-green-100 text-green-700',
};

interface VATRecord {
  id: string;
  type: string;
  invoiceId?: string;
  invoiceNumber: string;
  partnerName: string;
  partnerPIB: string;
  invoiceDate: string;
  taxableAmount: number;
  vatAmount: number;
  vatRate: number;
  totalAmount: number;
  description?: string;
  createdAt: string;
}

interface VATSummary {
  period: { from: string; to: string };
  input: {
    taxableAmount: number;
    vatAmount: number;
    count: number;
  };
  output: {
    taxableAmount: number;
    vatAmount: number;
    count: number;
  };
  balance: number;
}

export const VATRecords: React.FC = () => {
  const [records, setRecords] = useState<VATRecord[]>([]);
  const [summary, setSummary] = useState<VATSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'kpo' | 'kpr' | 'pppdv'>('records');
  
  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(0); // Last day of previous month
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchRecords();
    fetchSummary();
  }, [filterType, dateFrom, dateTo]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getVATRecords({
        type: filterType || undefined,
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined
      });

      if (response.success && response.data) {
        setRecords((response.data.data as VATRecord[]) || []);
      } else {
        setError(response.error || 'Greška pri učitavanju');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju');
    } finally {
      setLoading(false);
    }
  }, [filterType, dateFrom, dateTo]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.getVATSummary({
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined
      });

      if (response.success && response.data) {
        setSummary(response.data as VATSummary);
      }
    } catch (err) {
      logger.error('Error fetching summary:', err);
    }
  }, [dateFrom, dateTo]);

  const exportKPO = async () => {
    try {
      toast.loading('Generisanje KPO...', { id: 'kpo-export' });
      await api.exportKPO({ fromDate: dateFrom, toDate: dateTo });
      toast.success('KPO uspešno preuzet', { id: 'kpo-export' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri exportu KPO', { id: 'kpo-export' });
    }
  };

  const exportKPR = async () => {
    try {
      toast.loading('Generisanje KPR...', { id: 'kpr-export' });
      await api.exportKPR({ fromDate: dateFrom, toDate: dateTo });
      toast.success('KPR uspešno preuzet', { id: 'kpr-export' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri exportu KPR', { id: 'kpr-export' });
    }
  };

  const generatePPPDV = async () => {
    try {
      toast.loading('Generisanje PP-PDV...', { id: 'pppdv' });
      const response = await api.generatePPPDV({ fromDate: dateFrom, toDate: dateTo });
      
      if (response.success) {
        toast.success('PP-PDV obrazac je generisan', { id: 'pppdv' });
      } else {
        toast.error(response.error || 'Greška pri generisanju PP-PDV', { id: 'pppdv' });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri generisanju PP-PDV', { id: 'pppdv' });
    }
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

  const formatPercent = (rate: number) => {
    return `${rate}%`;
  };

  if (loading && records.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">PDV Evidencija</h1>
                <p className="text-white/70 mt-1">Knjiga primljenih i izdatih računa, POPDV obrasci</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={exportKPO}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>KPO</span>
              </button>
              <button
                onClick={exportKPR}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>KPR</span>
              </button>
              <button
                onClick={generatePPPDV}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-amber-900 rounded-xl hover:bg-white/90 transition-all duration-200 shadow-lg font-medium"
              >
                <FileText className="w-4 h-4" />
                <span>PP-PDV</span>
              </button>
            </div>
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200/50 shadow-lg p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-blue-600 font-medium">Ulazni PDV</div>
                <div className="text-xs text-gray-500">{summary.input.count} faktura</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.input.vatAmount)}</div>
            <div className="text-sm text-gray-500 mt-1">
              Osnovica: {formatCurrency(summary.input.taxableAmount)}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-green-200/50 shadow-lg p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-green-600 font-medium">Izlazni PDV</div>
                <div className="text-xs text-gray-500">{summary.output.count} faktura</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.output.vatAmount)}</div>
            <div className="text-sm text-gray-500 mt-1">
              Osnovica: {formatCurrency(summary.output.taxableAmount)}
            </div>
          </div>

          <div className={`bg-white/80 backdrop-blur-sm rounded-2xl border shadow-lg p-6 hover:shadow-xl transition-all duration-200 ${summary.balance >= 0 ? 'border-red-200/50' : 'border-emerald-200/50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${summary.balance >= 0 ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}`}>
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className={`text-sm font-medium ${summary.balance >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {summary.balance >= 0 ? 'PDV za uplatu' : 'PDV za povrat'}
                </div>
              </div>
            </div>
            <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(Math.abs(summary.balance))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-slate-500 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600 font-medium">Period</div>
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {formatDate(dateFrom)}
            </div>
            <div className="text-sm text-gray-500">
              do {formatDate(dateTo)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filteri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tip PDV</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
            >
              <option value="">Svi tipovi</option>
              {Object.entries(VAT_RECORD_TYPE_LABELS).map(([value, label]) => (
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
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Do datuma</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                fetchRecords();
                fetchSummary();
              }}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg"
            >
              Primeni
            </button>
            <button
              onClick={() => {
                setFilterType('');
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                d.setDate(1);
                setDateFrom(d.toISOString().split('T')[0]);
                const e = new Date();
                e.setDate(0);
                setDateTo(e.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'records', name: 'Svi zapisi', icon: '📋' },
              { id: 'kpo', name: 'KPO (Ulaz)', icon: '📥' },
              { id: 'kpr', name: 'KPR (Izlaz)', icon: '📤' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'kpo') setFilterType('INPUT');
                  else if (tab.id === 'kpr') setFilterType('OUTPUT');
                  else setFilterType('');
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Br. fakture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PIB
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Osnovica
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDV %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDV iznos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ukupno
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.invoiceDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${VAT_RECORD_TYPE_COLORS[record.type]}`}>
                      {VAT_RECORD_TYPE_LABELS[record.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                    {record.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {record.partnerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {record.partnerPIB}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                    {formatCurrency(record.taxableAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatPercent(record.vatRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-semibold">
                    {formatCurrency(record.vatAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                    {formatCurrency(record.totalAmount)}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Nema PDV zapisa za izabrani period
                  </td>
                </tr>
              )}
            </tbody>
            {records.length > 0 && (
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right">UKUPNO:</td>
                  <td className="px-6 py-4 text-right font-mono">
                    {formatCurrency(records.reduce((sum, r) => sum + r.taxableAmount, 0))}
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right font-mono">
                    {formatCurrency(records.reduce((sum, r) => sum + r.vatAmount, 0))}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {formatCurrency(records.reduce((sum, r) => sum + r.totalAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* VAT Rate Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pregled po stopama PDV-a</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[20, 10, 0].map((rate) => {
            const rateRecords = records.filter(r => r.vatRate === rate);
            const totalVAT = rateRecords.reduce((sum, r) => sum + r.vatAmount, 0);
            const totalBase = rateRecords.reduce((sum, r) => sum + r.taxableAmount, 0);
            
            return (
              <div key={rate} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900">PDV {rate}%</span>
                  <span className="text-sm text-gray-500">{rateRecords.length} stavki</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Osnovica:</span>
                    <span className="font-mono">{formatCurrency(totalBase)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-600">PDV:</span>
                    <span className="font-mono">{formatCurrency(totalVAT)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VATRecords;
