/**
 * Financial Reports Page
 * Balance Sheet, Income Statement, Trial Balance, Aging Reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import api from '../services/api';
import { formatAmount, formatDateShort } from '../utils/formatters';
import { logger } from '../utils/logger';
import { 
  FileText, 
  TrendingUp, 
  ClipboardList, 
  Clock, 
  Users, 
  Package, 
  Calendar,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Printer
} from 'lucide-react';

type ReportType = 'balance-sheet' | 'income-statement' | 'trial-balance' | 'aging' | 'sales-by-partner' | 'sales-by-product' | 'monthly-summary';

interface BalanceSheetData {
  asOfDate: string;
  assets: { total: number; items: Array<{ code: string; name: string; balance: number }> };
  liabilities: { total: number; items: Array<{ code: string; name: string; balance: number }> };
  equity: { total: number; items: Array<{ code: string; name: string; balance: number }> };
}

interface IncomeStatementData {
  period: { from: string; to: string };
  revenue: { total: number; items: Array<{ code: string; name: string; amount: number }> };
  expenses: { total: number; items: Array<{ code: string; name: string; amount: number }> };
  netIncome: number;
}

interface TrialBalanceData {
  period: { from: string; to: string };
  accounts: Array<{
    code: string;
    name: string;
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  }>;
  totals: {
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
}

interface AgingData {
  type: string;
  asOfDate: string;
  items: Array<{
    partnerId: string;
    partnerName: string;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  }>;
  totals: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
    total: number;
  };
}

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('balance-sheet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date filters
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [agingType, setAgingType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Report data
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementData | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
  const [agingReport, setAgingReport] = useState<AgingData | null>(null);
  const [salesByPartner, setSalesByPartner] = useState<any>(null);
  const [salesByProduct, setSalesByProduct] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);

  const reports = [
    { id: 'balance-sheet', name: 'Bilans Stanja', icon: FileText, color: 'blue' },
    { id: 'income-statement', name: 'Bilans Uspeha', icon: TrendingUp, color: 'green' },
    { id: 'trial-balance', name: 'Bruto Bilans', icon: ClipboardList, color: 'purple' },
    { id: 'aging', name: 'Starosna Struktura', icon: Clock, color: 'orange' },
    { id: 'sales-by-partner', name: 'Prodaja po Partnerima', icon: Users, color: 'pink' },
    { id: 'sales-by-product', name: 'Prodaja po Proizvodima', icon: Package, color: 'indigo' },
    { id: 'monthly-summary', name: 'Mesečni Pregled', icon: Calendar, color: 'teal' },
  ];

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let response;
      
      switch (activeReport) {
        case 'balance-sheet':
          response = await api.getBalanceSheet(asOfDate);
          if (response.success) setBalanceSheet(response.data as BalanceSheetData);
          break;
        case 'income-statement':
          response = await api.getIncomeStatement(dateFrom, dateTo);
          if (response.success) setIncomeStatement(response.data as IncomeStatementData);
          break;
        case 'trial-balance':
          response = await api.getTrialBalance(dateFrom, dateTo);
          if (response.success) setTrialBalance(response.data as TrialBalanceData);
          break;
        case 'aging':
          response = await api.getAgingReport(agingType, asOfDate);
          if (response.success) setAgingReport(response.data as AgingData);
          break;
        case 'sales-by-partner':
          response = await api.getSalesByPartnerReport(dateFrom, dateTo);
          if (response.success) setSalesByPartner(response.data);
          break;
        case 'sales-by-product':
          response = await api.getSalesByProductReport(dateFrom, dateTo);
          if (response.success) setSalesByProduct(response.data);
          break;
        case 'monthly-summary':
          response = await api.getMonthlySummaryReport(selectedYear);
          if (response.success) setMonthlySummary(response.data);
          break;
      }

      if (response && !response.success) {
        setError(response.error || 'Greška pri učitavanju izveštaja');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju izveštaja');
    } finally {
      setLoading(false);
    }
  }, [activeReport, asOfDate, dateFrom, dateTo, agingType, selectedYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportReport = async (format: 'pdf' | 'xlsx') => {
    try {
      toast.loading(`Generisanje ${format.toUpperCase()}...`, { id: 'export-report' });
      const params: Record<string, unknown> = {};
      
      switch (activeReport) {
        case 'balance-sheet':
          params.asOfDate = asOfDate;
          break;
        case 'income-statement':
        case 'trial-balance':
        case 'sales-by-partner':
        case 'sales-by-product':
          params.fromDate = dateFrom;
          params.toDate = dateTo;
          break;
        case 'aging':
          params.type = agingType;
          params.asOfDate = asOfDate;
          break;
        case 'monthly-summary':
          params.year = selectedYear;
          break;
      }

      await api.exportReport(activeReport, params, format);
      toast.success(`${format.toUpperCase()} uspešno preuzet`, { id: 'export-report' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri eksportu', { id: 'export-report' });
    }
  };

  // Use centralized formatters
  const formatCurrency = formatAmount;
  const formatDate = formatDateShort;

  const downloadReport = async (format: 'pdf' | 'excel') => {
    try {
      let blob: Blob;
      let filename = '';
      
      switch (activeReport) {
        case 'balance-sheet':
          blob = await api.downloadBalanceSheet(asOfDate, format);
          filename = `bilans-stanja-${asOfDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
          break;
        case 'income-statement':
          blob = await api.downloadIncomeStatement(dateFrom, dateTo, format);
          filename = `bilans-uspeha-${dateFrom}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
          break;
        default:
          toast.error('Export je trenutno dostupan samo za Bilans Stanja i Bilans Uspeha');
          return;
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Izveštaj uspešno preuzet');
    } catch (err) {
      logger.error('Error downloading report', err);
      toast.error('Greška pri preuzimanju izveštaja');
    }
  };

  const exportToPDF = () => downloadReport('pdf');
  const exportToExcel = () => downloadReport('excel');

  const renderFilters = () => {
    const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200";
    const labelClass = "block text-sm font-medium text-gray-700 mb-2";

    switch (activeReport) {
      case 'balance-sheet':
      case 'aging':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Na dan</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className={inputClass}
              />
            </div>
            {activeReport === 'aging' && (
              <div>
                <label className={labelClass}>Tip</label>
                <select
                  value={agingType}
                  onChange={(e) => setAgingType(e.target.value as 'RECEIVABLE' | 'PAYABLE')}
                  className={inputClass}
                >
                  <option value="RECEIVABLE">Potraživanja</option>
                  <option value="PAYABLE">Obaveze</option>
                </select>
              </div>
            )}
          </div>
        );

      case 'income-statement':
      case 'trial-balance':
      case 'sales-by-partner':
      case 'sales-by-product':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Od datuma</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Do datuma</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'monthly-summary':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Godina</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={inputClass}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderBalanceSheet = () => {
    if (!balanceSheet) return null;

    return (
      <div className="space-y-6">
        <div className="text-center pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">BILANS STANJA</h2>
          <p className="text-gray-600">Na dan {formatDate(balanceSheet.asOfDate)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">AKTIVA</h3>
            <div className="space-y-2">
              {balanceSheet.assets.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.code} - {item.name}</span>
                  <span className="font-mono">{formatCurrency(item.balance)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200 flex justify-between font-bold">
              <span>UKUPNA AKTIVA</span>
              <span className="font-mono">{formatCurrency(balanceSheet.assets.total)}</span>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div className="space-y-6">
            <div className="bg-red-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-900 mb-4">OBAVEZE</h3>
              <div className="space-y-2">
                {balanceSheet.liabilities.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.code} - {item.name}</span>
                    <span className="font-mono">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-red-200 flex justify-between font-bold">
                <span>UKUPNE OBAVEZE</span>
                <span className="font-mono">{formatCurrency(balanceSheet.liabilities.total)}</span>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4">KAPITAL</h3>
              <div className="space-y-2">
                {balanceSheet.equity.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.code} - {item.name}</span>
                    <span className="font-mono">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-purple-200 flex justify-between font-bold">
                <span>UKUPAN KAPITAL</span>
                <span className="font-mono">{formatCurrency(balanceSheet.equity.total)}</span>
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 flex justify-between font-bold text-lg">
              <span>UKUPNA PASIVA</span>
              <span className="font-mono">{formatCurrency(balanceSheet.liabilities.total + balanceSheet.equity.total)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderIncomeStatement = () => {
    if (!incomeStatement) return null;

    return (
      <div className="space-y-6">
        <div className="text-center pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">BILANS USPEHA</h2>
          <p className="text-gray-600">
            Za period {formatDate(incomeStatement.period.from)} - {formatDate(incomeStatement.period.to)}
          </p>
        </div>

        <div className="space-y-6">
          {/* Revenue */}
          <div className="bg-green-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">PRIHODI</h3>
            <div className="space-y-2">
              {incomeStatement.revenue.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.code} - {item.name}</span>
                  <span className="font-mono">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-green-200 flex justify-between font-bold">
              <span>UKUPNI PRIHODI</span>
              <span className="font-mono">{formatCurrency(incomeStatement.revenue.total)}</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-orange-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-orange-900 mb-4">RASHODI</h3>
            <div className="space-y-2">
              {incomeStatement.expenses.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.code} - {item.name}</span>
                  <span className="font-mono">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between font-bold">
              <span>UKUPNI RASHODI</span>
              <span className="font-mono">{formatCurrency(incomeStatement.expenses.total)}</span>
            </div>
          </div>

          {/* Net Income */}
          <div className={`rounded-xl p-6 ${incomeStatement.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">
                {incomeStatement.netIncome >= 0 ? 'NETO DOBIT' : 'NETO GUBITAK'}
              </span>
              <span className="text-2xl font-bold font-mono">
                {formatCurrency(Math.abs(incomeStatement.netIncome))}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (!trialBalance) return null;

    return (
      <div className="space-y-6">
        <div className="text-center pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">BRUTO BILANS</h2>
          <p className="text-gray-600">
            Za period {formatDate(trialBalance.period.from)} - {formatDate(trialBalance.period.to)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r">Konto</th>
                <th colSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r bg-blue-50">Početno stanje</th>
                <th colSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r bg-green-50">Promet perioda</th>
                <th colSpan={2} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-yellow-50">Krajnje stanje</th>
              </tr>
              <tr>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase bg-blue-50">Duguje</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r bg-blue-50">Potražuje</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase bg-green-50">Duguje</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r bg-green-50">Potražuje</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase bg-yellow-50">Duguje</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase bg-yellow-50">Potražuje</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trialBalance.accounts.map((account, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm border-r">
                    <code className="text-xs bg-gray-100 px-1 rounded">{account.code}</code>
                    <span className="ml-2">{account.name}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono">
                    {account.openingDebit > 0 ? formatCurrency(account.openingDebit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono border-r">
                    {account.openingCredit > 0 ? formatCurrency(account.openingCredit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono">
                    {account.periodDebit > 0 ? formatCurrency(account.periodDebit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono border-r">
                    {account.periodCredit > 0 ? formatCurrency(account.periodCredit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono">
                    {account.closingDebit > 0 ? formatCurrency(account.closingDebit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono">
                    {account.closingCredit > 0 ? formatCurrency(account.closingCredit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="px-4 py-3 border-r">UKUPNO</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance.totals.openingDebit)}</td>
                <td className="px-4 py-3 text-right font-mono border-r">{formatCurrency(trialBalance.totals.openingCredit)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance.totals.periodDebit)}</td>
                <td className="px-4 py-3 text-right font-mono border-r">{formatCurrency(trialBalance.totals.periodCredit)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance.totals.closingDebit)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(trialBalance.totals.closingCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderAgingReport = () => {
    if (!agingReport) return null;

    return (
      <div className="space-y-6">
        <div className="text-center pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            STAROSNA STRUKTURA {agingReport.type === 'RECEIVABLE' ? 'POTRAŽIVANJA' : 'OBAVEZA'}
          </h2>
          <p className="text-gray-600">Na dan {formatDate(agingReport.asOfDate)}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-green-50">Tekuće</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-yellow-50">1-30 dana</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-orange-50">31-60 dana</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-red-50">61-90 dana</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-red-100">Preko 90</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ukupno</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agingReport.items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium">{item.partnerName}</td>
                  <td className="px-4 py-2 text-sm text-right font-mono">{formatCurrency(item.current)}</td>
                  <td className="px-4 py-2 text-sm text-right font-mono">{formatCurrency(item.days1to30)}</td>
                  <td className="px-4 py-2 text-sm text-right font-mono">{formatCurrency(item.days31to60)}</td>
                  <td className="px-4 py-2 text-sm text-right font-mono">{formatCurrency(item.days61to90)}</td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-red-600">{formatCurrency(item.over90)}</td>
                  <td className="px-4 py-2 text-sm text-right font-mono font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="px-4 py-3">UKUPNO</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(agingReport.totals.current)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(agingReport.totals.days1to30)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(agingReport.totals.days31to60)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(agingReport.totals.days61to90)}</td>
                <td className="px-4 py-3 text-right font-mono text-red-600">{formatCurrency(agingReport.totals.over90)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(agingReport.totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-sm text-green-700">Tekuće</div>
            <div className="text-lg font-bold text-green-900">{formatCurrency(agingReport.totals.current)}</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <div className="text-sm text-yellow-700">1-30 dana</div>
            <div className="text-lg font-bold text-yellow-900">{formatCurrency(agingReport.totals.days1to30)}</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-sm text-orange-700">31-60 dana</div>
            <div className="text-lg font-bold text-orange-900">{formatCurrency(agingReport.totals.days31to60)}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <div className="text-sm text-red-700">61-90 dana</div>
            <div className="text-lg font-bold text-red-900">{formatCurrency(agingReport.totals.days61to90)}</div>
          </div>
          <div className="bg-red-100 rounded-xl p-4 text-center">
            <div className="text-sm text-red-800">Preko 90</div>
            <div className="text-lg font-bold text-red-900">{formatCurrency(agingReport.totals.over90)}</div>
          </div>
          <div className="bg-gray-100 rounded-xl p-4 text-center">
            <div className="text-sm text-gray-700">Ukupno</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(agingReport.totals.total)}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }

    switch (activeReport) {
      case 'balance-sheet':
        return renderBalanceSheet();
      case 'income-statement':
        return renderIncomeStatement();
      case 'trial-balance':
        return renderTrialBalance();
      case 'aging':
        return renderAgingReport();
      case 'sales-by-partner':
      case 'sales-by-product':
      case 'monthly-summary':
        return (
          <div className="text-center py-12 text-gray-500">
            Izveštaj će biti prikazan nakon generisanja
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Finansijski Izveštaji</h1>
                <p className="text-white/70 mt-1">Bilans stanja, bilans uspeha, bruto bilans i analitički izveštaji</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
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
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar - Report Selection */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-4 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
              Izveštaji
            </h3>
            <nav className="space-y-1">
              {reports.map((report) => {
                const Icon = report.icon;
                const isActive = activeReport === report.id;
                return (
                  <button
                    key={report.id}
                    onClick={() => setActiveReport(report.id as ReportType)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">{report.name}</span>
                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${
                      isActive ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                    }`} />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Filters Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Parametri Izveštaja</h3>
              <button
                onClick={fetchReport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Generiši</span>
              </button>
            </div>
            {renderFilters()}
          </div>

          {/* Report Content Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 min-h-[400px]">
            {renderReportContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
