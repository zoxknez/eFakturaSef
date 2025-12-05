/**
 * Cash Flow Page - Projekcija novčanih tokova
 * Cash Flow Forecast i analiza
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Wallet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import cashFlowService, { CashFlowProjection, CashFlowPeriod } from '../services/cashFlowService';
import { logger } from '../utils/logger';

type Granularity = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const CashFlow: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company?.id || '';

  // State
  const [loading, setLoading] = useState(true);
  const [projection, setProjection] = useState<CashFlowProjection | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{
    currentBalance: number;
    receivables: number;
    payables: number;
    overdueReceivables: number;
    overduePayables: number;
    netPosition: number;
  } | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [granularity, setGranularity] = useState<Granularity>('WEEKLY');

  // Chart view
  const [chartView, setChartView] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchProjection();
    }
  }, [startDate, endDate, granularity]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectionRes, positionRes] = await Promise.all([
        cashFlowService.getProjection(companyId, { startDate, endDate, granularity }),
        cashFlowService.getCurrentPosition(companyId),
      ]);
      
      if (projectionRes.success && projectionRes.data) {
        setProjection(projectionRes.data);
      }
      if (positionRes.success && positionRes.data) {
        setCurrentPosition(positionRes.data);
      }
    } catch (error) {
      logger.error('Error fetching cash flow data', error);
      toast.error('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjection = async () => {
    try {
      const response = await cashFlowService.getProjection(companyId, { 
        startDate, 
        endDate, 
        granularity 
      });
      if (response.success && response.data) {
        setProjection(response.data);
      }
    } catch (error) {
      logger.error('Error fetching projection', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await cashFlowService.exportProjection(companyId, {
        startDate,
        endDate,
        granularity,
      });
      if (response.success && response.data) {
        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cash-flow-${startDate}-${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Izvoz uspešan');
      }
    } catch (error) {
      toast.error('Greška pri izvozu');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-Latn-RS', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getBarWidth = (value: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(100, Math.abs(value / max) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  const maxValue = projection?.periods.reduce((max, p) => 
    Math.max(max, Math.abs(p.totalInflows), Math.abs(p.totalOutflows)), 0
  ) || 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Flow Projekcija</h1>
          <p className="text-gray-500 mt-1">Analiza i projekcija novčanih tokova</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Osveži"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Izvezi
          </button>
        </div>
      </div>

      {/* Current Position Cards */}
      {currentPosition && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <span className={`text-sm ${currentPosition.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentPosition.currentBalance >= 0 ? '+' : ''}
                {formatCurrency(currentPosition.currentBalance)}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold">{formatCurrency(Math.abs(currentPosition.currentBalance))}</p>
            <p className="text-sm text-gray-500 mt-1">Trenutni saldo</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowDownRight className="w-5 h-5 text-green-600" />
              </div>
              {currentPosition.overdueReceivables > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  {formatCurrency(currentPosition.overdueReceivables)} dospelo
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-green-600">{formatCurrency(currentPosition.receivables)}</p>
            <p className="text-sm text-gray-500 mt-1">Potraživanja</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
              </div>
              {currentPosition.overduePayables > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  {formatCurrency(currentPosition.overduePayables)} dospelo
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-red-600">{formatCurrency(currentPosition.payables)}</p>
            <p className="text-sm text-gray-500 mt-1">Obaveze</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-bold ${currentPosition.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(currentPosition.netPosition)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Neto pozicija</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {projection?.alerts && projection.alerts.length > 0 && (
        <div className="space-y-2">
          {projection.alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-4 rounded-lg ${
                alert.type === 'CRITICAL' 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${
                alert.type === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className={`font-medium ${
                  alert.type === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {alert.message}
                </p>
                <p className="text-sm text-gray-600">
                  {formatDate(alert.date)} - Projektovani saldo: {formatCurrency(alert.projectedBalance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="DAILY">Dnevno</option>
              <option value="WEEKLY">Nedeljno</option>
              <option value="MONTHLY">Mesečno</option>
            </select>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setChartView('bar')}
              className={`p-2 rounded-lg ${chartView === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setChartView('line')}
              className={`p-2 rounded-lg ${chartView === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <LineChart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {projection?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Ukupni prilivi</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              {formatCurrency(projection.summary.totalInflows)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Ukupni odlivi</p>
            <p className="text-xl font-bold text-red-600 mt-1">
              {formatCurrency(projection.summary.totalOutflows)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Neto promena</p>
            <p className={`text-xl font-bold mt-1 ${projection.summary.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(projection.summary.netChange)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Krajnji saldo</p>
            <p className={`text-xl font-bold mt-1 ${projection.summary.closingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(projection.summary.closingBalance)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Najniži saldo</p>
            <p className={`text-xl font-bold mt-1 ${projection.summary.lowestBalance >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
              {formatCurrency(projection.summary.lowestBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(projection.summary.lowestBalanceDate)}
            </p>
          </div>
        </div>
      )}

      {/* Chart / Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {projection?.periods && projection.periods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Period</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Početni saldo</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Prilivi</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Odlivi</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Neto</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Krajnji saldo</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600 w-48">Vizualizacija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projection.periods.map((period, index) => (
                  <tr key={index} className={`hover:bg-gray-50 ${period.isProjection ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatDate(period.date)}</span>
                        {period.isProjection && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                            projekcija
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(period.openingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-600 font-medium">
                        +{formatCurrency(period.totalInflows)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-red-600 font-medium">
                        -{formatCurrency(period.totalOutflows)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${period.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {period.netCashFlow >= 0 ? '+' : ''}{formatCurrency(period.netCashFlow)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${period.closingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(period.closingBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative h-6 flex items-center gap-1">
                        {/* Inflows bar */}
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${getBarWidth(period.totalInflows, maxValue)}%` }}
                          />
                        </div>
                        {/* Outflows bar */}
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ width: `${getBarWidth(period.totalOutflows, maxValue)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nema podataka za prikaz</p>
            <p className="text-sm text-gray-400 mt-1">Promenite period ili osvežite podatke</p>
          </div>
        )}
      </div>

      {/* Details breakdown for current period */}
      {projection?.periods && projection.periods.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inflows breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Struktura priliva
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Naplata faktura</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(
                    projection.periods.reduce((sum, p) => sum + p.invoiceCollections, 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ostali prilivi</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(
                    projection.periods.reduce((sum, p) => sum + p.otherInflows, 0)
                  )}
                </span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between font-medium">
                <span>Ukupno</span>
                <span className="text-green-600">
                  {formatCurrency(projection.summary.totalInflows)}
                </span>
              </div>
            </div>
          </div>

          {/* Outflows breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Struktura odliva
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Plaćanje dobavljača</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(
                    projection.periods.reduce((sum, p) => sum + p.supplierPayments, 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Plate</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(
                    projection.periods.reduce((sum, p) => sum + p.salaries, 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Porezi</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(
                    projection.periods.reduce((sum, p) => sum + p.taxes, 0)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ostali odlivi</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(
                    projection.periods.reduce((sum, p) => sum + p.otherOutflows, 0)
                  )}
                </span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between font-medium">
                <span>Ukupno</span>
                <span className="text-red-600">
                  {formatCurrency(projection.summary.totalOutflows)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlow;
