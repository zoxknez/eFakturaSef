import React, { useState, useEffect, useCallback } from 'react';
import api, { apiClient } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';

interface BankTransaction {
  id: string;
  date: string;
  valueDate: string;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  counterpartName?: string;
  counterpartAccount?: string;
  transactionType: 'CREDIT' | 'DEBIT';
  status: 'UNMATCHED' | 'MATCHED' | 'PARTIALLY_MATCHED' | 'IGNORED';
  matchedPaymentId?: string;
  matchedInvoiceId?: string;
  matchConfidence?: number;
  createdAt: string;
}

interface SuggestedMatch {
  type: 'INVOICE' | 'PAYMENT';
  id: string;
  reference: string;
  amount: number;
  date: string;
  partnerName: string;
  confidence: number;
  reason: string;
}

interface ReconciliationSummary {
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  totalCredits: number;
  totalDebits: number;
  matchRate: number;
}

const BankReconciliation: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [suggestedMatches, setSuggestedMatches] = useState<SuggestedMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<string>('mt940');
  const [importProgress, setImportProgress] = useState(0);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [autoMatchInProgress, setAutoMatchInProgress] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      // For now, use mock data since endpoint may not exist
      const mockTransactions: BankTransaction[] = [
        {
          id: '1',
          date: new Date().toISOString(),
          valueDate: new Date().toISOString(),
          amount: 125000,
          currency: 'RSD',
          description: 'Uplata po fakturi 2024-0123',
          reference: '2024-0123',
          counterpartName: 'ABC d.o.o.',
          counterpartAccount: '160-123456-78',
          transactionType: 'CREDIT',
          status: 'UNMATCHED',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          date: new Date(Date.now() - 86400000).toISOString(),
          valueDate: new Date(Date.now() - 86400000).toISOString(),
          amount: 45000,
          currency: 'RSD',
          description: 'Isplata dobavljaču XYZ',
          counterpartName: 'XYZ Supplies',
          counterpartAccount: '265-987654-32',
          transactionType: 'DEBIT',
          status: 'MATCHED',
          matchedPaymentId: 'pay-001',
          matchConfidence: 95,
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          date: new Date(Date.now() - 172800000).toISOString(),
          valueDate: new Date(Date.now() - 172800000).toISOString(),
          amount: 78500,
          currency: 'RSD',
          description: 'Uplata - klijent DEF',
          counterpartName: 'DEF Company',
          counterpartAccount: '340-555666-77',
          transactionType: 'CREDIT',
          status: 'PARTIALLY_MATCHED',
          matchedInvoiceId: 'inv-002',
          matchConfidence: 75,
          createdAt: new Date().toISOString(),
        },
      ];
      
      setTransactions(mockTransactions);
      
      // Calculate summary
      const matched = mockTransactions.filter(t => t.status === 'MATCHED').length;
      const unmatched = mockTransactions.filter(t => t.status === 'UNMATCHED').length;
      const credits = mockTransactions.filter(t => t.transactionType === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
      const debits = mockTransactions.filter(t => t.transactionType === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);
      
      setSummary({
        totalTransactions: mockTransactions.length,
        matchedTransactions: matched,
        unmatchedTransactions: unmatched,
        totalCredits: credits,
        totalDebits: debits,
        matchRate: mockTransactions.length > 0 ? (matched / mockTransactions.length) * 100 : 0,
      });
    } catch (error) {
      logger.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter, typeFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const fetchSuggestedMatches = async (transaction: BankTransaction) => {
    setLoadingMatches(true);
    try {
      // Mock suggested matches
      const mockMatches: SuggestedMatch[] = [
        {
          type: 'INVOICE',
          id: 'inv-001',
          reference: 'FAK-2024-0123',
          amount: 125000,
          date: new Date().toISOString(),
          partnerName: 'ABC d.o.o.',
          confidence: 92,
          reason: 'Referenca se podudara sa brojem fakture',
        },
        {
          type: 'PAYMENT',
          id: 'pay-002',
          reference: 'UPL-2024-001',
          amount: 124500,
          date: new Date().toISOString(),
          partnerName: 'ABC d.o.o.',
          confidence: 78,
          reason: 'Iznos približno odgovara, isti partner',
        },
      ];
      setSuggestedMatches(mockMatches);
    } catch (error) {
      logger.error('Failed to fetch suggested matches', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSelectTransaction = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    if (transaction.status === 'UNMATCHED' || transaction.status === 'PARTIALLY_MATCHED') {
      fetchSuggestedMatches(transaction);
    } else {
      setSuggestedMatches([]);
    }
  };

  const handleMatch = async (matchType: string, matchId: string) => {
    if (!selectedTransaction) return;
    
    try {
      // API call to create match
      setTransactions(prev => 
        prev.map(t => 
          t.id === selectedTransaction.id 
            ? { ...t, status: 'MATCHED' as const, matchedInvoiceId: matchType === 'INVOICE' ? matchId : undefined, matchedPaymentId: matchType === 'PAYMENT' ? matchId : undefined }
            : t
        )
      );
      setSelectedTransaction(null);
      setSuggestedMatches([]);
    } catch (error) {
      logger.error('Failed to match transaction', error);
    }
  };

  const handleIgnore = async () => {
    if (!selectedTransaction) return;
    
    setTransactions(prev =>
      prev.map(t =>
        t.id === selectedTransaction.id
          ? { ...t, status: 'IGNORED' as const }
          : t
      )
    );
    setSelectedTransaction(null);
    setSuggestedMatches([]);
  };

  const handleAutoMatch = async () => {
    setAutoMatchInProgress(true);
    try {
      // Simulate auto-matching process
      await new Promise(resolve => setTimeout(resolve, 2000));
      fetchTransactions();
    } catch (error) {
      logger.error('Auto-match failed', error);
    } finally {
      setAutoMatchInProgress(false);
    }
  };

  const handleImportFile = async () => {
    if (!importFile) return;
    
    try {
      setImportProgress(10);
      
      // Simulate import progress
      const interval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 20, 90));
      }, 500);
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      clearInterval(interval);
      setImportProgress(100);
      
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportProgress(0);
        fetchTransactions();
      }, 500);
    } catch (error) {
      logger.error('Import failed', error);
      setImportProgress(0);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-RS');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED':
        return 'bg-green-100 text-green-800';
      case 'UNMATCHED':
        return 'bg-red-100 text-red-800';
      case 'PARTIALLY_MATCHED':
        return 'bg-yellow-100 text-yellow-800';
      case 'IGNORED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'MATCHED': return 'Upareno';
      case 'UNMATCHED': return 'Neupareno';
      case 'PARTIALLY_MATCHED': return 'Delimično';
      case 'IGNORED': return 'Ignorisano';
      default: return status;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredTransactions = transactions.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (typeFilter && t.transactionType !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-2xl rotate-12 floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-xl -rotate-12 floating" style={{ animationDelay: '2s' }}></div>
          
          {/* Bank icon pattern */}
          <div className="absolute top-8 right-16 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/>
            </svg>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Bankovni izvodi • Automatsko uparivanje
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              🏦 Bankarsko Uparivanje
            </h1>
            <p className="text-xl text-indigo-100 max-w-xl">
              Automatsko i ručno uparivanje bankovnih izvoda sa fakturama i uplatama.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Uvoz izvoda
            </button>
            <button
              onClick={handleAutoMatch}
              disabled={autoMatchInProgress}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {autoMatchInProgress ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uparivanje...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Auto uparivanje
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500">Ukupno transakcija</div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalTransactions}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500">Upareno</div>
            <div className="text-2xl font-bold text-green-600">{summary.matchedTransactions}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500">Neupareno</div>
            <div className="text-2xl font-bold text-red-600">{summary.unmatchedTransactions}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500">Ukupne uplate</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalCredits)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500">Ukupne isplate</div>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalDebits)}</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {summary && summary.totalTransactions > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progres uparivanja</span>
            <span className="text-sm font-bold text-gray-900">{summary.matchRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${summary.matchRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Od datuma</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Do datuma</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Svi statusi</option>
              <option value="UNMATCHED">Neupareno</option>
              <option value="MATCHED">Upareno</option>
              <option value="PARTIALLY_MATCHED">Delimično</option>
              <option value="IGNORED">Ignorisano</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Svi tipovi</option>
              <option value="CREDIT">Uplate</option>
              <option value="DEBIT">Isplate</option>
            </select>
          </div>

          {/* Spacer */}
          <div className="md:col-span-2" />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            📥 Uvezi Izvod
          </button>
          <button
            onClick={handleAutoMatch}
            disabled={autoMatchInProgress}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {autoMatchInProgress ? (
              <>
                <span className="animate-spin inline-block mr-2">⚙️</span>
                Uparivanje...
              </>
            ) : (
              <>🔄 Auto Uparivanje</>
            )}
          </button>
          <button
            onClick={() => setShowRulesModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            ⚙️ Pravila Uparivanja
          </button>
          <button
            onClick={fetchTransactions}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            🔃 Osveži
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Bankovne Transakcije</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">Nema transakcija za prikaz</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  onClick={() => handleSelectTransaction(transaction)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedTransaction?.id === transaction.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-lg ${transaction.transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.transactionType === 'CREDIT' ? '↓' : '↑'}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {transaction.counterpartName || 'Nepoznat'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                          {getStatusLabel(transaction.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{transaction.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>📅 {formatDate(transaction.date)}</span>
                        {transaction.reference && <span>🔖 {transaction.reference}</span>}
                        {transaction.matchConfidence && (
                          <span className={getConfidenceColor(transaction.matchConfidence)}>
                            🎯 {transaction.matchConfidence}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${transaction.transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                      <div className="text-xs text-gray-500">{transaction.currency}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Match Panel */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Uparivanje</h2>
          </div>

          {!selectedTransaction ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">👈</div>
              <p className="text-gray-500">Izaberite transakciju za uparivanje</p>
            </div>
          ) : (
            <div className="p-4">
              {/* Selected Transaction Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Izabrana Transakcija</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Partner:</span> {selectedTransaction.counterpartName}</p>
                  <p><span className="text-gray-500">Iznos:</span> {formatCurrency(selectedTransaction.amount)}</p>
                  <p><span className="text-gray-500">Datum:</span> {formatDate(selectedTransaction.date)}</p>
                  {selectedTransaction.reference && (
                    <p><span className="text-gray-500">Referenca:</span> {selectedTransaction.reference}</p>
                  )}
                </div>
              </div>

              {/* Suggested Matches */}
              <h3 className="font-medium text-gray-900 mb-3">Predložena Uparivanja</h3>
              
              {loadingMatches ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : suggestedMatches.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Nema predloženih uparivanja</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {suggestedMatches.map((match, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            match.type === 'INVOICE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {match.type === 'INVOICE' ? '📄 Faktura' : '💳 Uplata'}
                          </span>
                          <span className={`ml-2 font-bold ${getConfidenceColor(match.confidence)}`}>
                            {match.confidence}%
                          </span>
                        </div>
                      </div>
                      <p className="font-medium text-gray-900 text-sm">{match.reference}</p>
                      <p className="text-sm text-gray-600">{match.partnerName}</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(match.amount)}</p>
                      <p className="text-xs text-gray-500 mt-1">{match.reason}</p>
                      <button
                        onClick={() => handleMatch(match.type, match.id)}
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        ✓ Upari
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <button
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  🔍 Ručno Uparivanje
                </button>
                <button
                  onClick={handleIgnore}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  ⏭️ Ignoriši Transakciju
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Uvoz Bankovnog Izvoda</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportProgress(0);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value)}
                >
                  <option value="mt940">MT940 (SWIFT)</option>
                  <option value="csv">CSV</option>
                  <option value="xml">XML (ISO 20022)</option>
                  <option value="ofx">OFX</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fajl</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    id="bank-file"
                    accept=".txt,.csv,.xml,.ofx"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="bank-file" className="cursor-pointer">
                    {importFile ? (
                      <div>
                        <p className="font-medium text-gray-900">{importFile.name}</p>
                        <p className="text-sm text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600">📁 Kliknite za izbor fajla</p>
                        <p className="text-sm text-gray-400 mt-1">ili prevucite ovde</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {importProgress > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Uvoz u toku...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleImportFile}
                disabled={!importFile || importProgress > 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                📥 Uvezi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pravila Auto-Uparivanja</h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-800">✓ Tačna referenca</span>
                    <span className="text-green-600 font-bold">95% poverenje</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Ako referenca transakcije tačno odgovara broju fakture
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">✓ Isti iznos i partner</span>
                    <span className="text-blue-600 font-bold">85% poverenje</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Ako se iznos i partner podudaraju sa neplaćenom fakturom
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-yellow-800">⚠ Približan iznos</span>
                    <span className="text-yellow-600 font-bold">70% poverenje</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Ako je iznos u okviru 5% razlike od fakture istog partnera
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-purple-800">🔧 Samo partner</span>
                    <span className="text-purple-600 font-bold">50% poverenje</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Ako samo ime partnera odgovara, predloži moguća uparivanja
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Prag automatskog uparivanja</h4>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    defaultValue="85"
                    className="flex-1"
                  />
                  <span className="font-bold text-gray-900">85%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Transakcije sa poverenjem iznad ovog praga će se automatski upariti
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sačuvaj Pravila
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;
