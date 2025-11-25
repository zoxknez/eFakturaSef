import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Landmark, 
  Upload, 
  FileText, 
  RefreshCw, 
  Link2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ChevronRight
} from 'lucide-react';

// API instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Types
interface BankStatement {
  id: string;
  statementNumber: string;
  accountNumber: string;
  bankName: string | null;
  statementDate: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  status: 'IMPORTED' | 'PROCESSING' | 'MATCHED' | 'POSTED';
  _count?: { transactions: number };
}

interface BankTransaction {
  id: string;
  transactionDate: string;
  valueDate: string | null;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  partnerName: string | null;
  partnerAccount: string | null;
  reference: string | null;
  description: string | null;
  matchStatus: 'UNMATCHED' | 'MATCHED' | 'PARTIAL' | 'IGNORED';
  matchedInvoiceId: string | null;
}

// Hooks
function useBankStatements(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['bankStatements', params],
    queryFn: async () => {
      const { data } = await api.get('/bank-statements', { params });
      return data;
    },
  });
}

function useBankStatement(id: string | null) {
  return useQuery({
    queryKey: ['bankStatements', id],
    queryFn: async () => {
      const { data } = await api.get(`/bank-statements/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

function useUnmatchedTransactions() {
  return useQuery({
    queryKey: ['bankStatements', 'unmatched'],
    queryFn: async () => {
      const { data } = await api.get('/bank-statements/transactions/unmatched');
      return data;
    },
  });
}

// Format helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('sr-RS');
};

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    IMPORTED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    MATCHED: 'bg-green-100 text-green-800',
    POSTED: 'bg-purple-100 text-purple-800',
  };
  const labels: Record<string, string> = {
    IMPORTED: 'Uvezeno',
    PROCESSING: 'U obradi',
    MATCHED: 'Upareno',
    POSTED: 'Proknjiženo',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
};

const getMatchStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    UNMATCHED: 'bg-red-100 text-red-800',
    MATCHED: 'bg-green-100 text-green-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    IGNORED: 'bg-gray-100 text-gray-800',
  };
  const labels: Record<string, string> = {
    UNMATCHED: 'Neupareno',
    MATCHED: 'Upareno',
    PARTIAL: 'Delimično',
    IGNORED: 'Ignorisano',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
};

// Main Component
export default function BankStatements() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'statements' | 'unmatched'>('statements');
  const [selectedStatement, setSelectedStatement] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: statementsData, isLoading } = useBankStatements({ page, status: filterStatus || undefined });
  const { data: statementDetail } = useBankStatement(selectedStatement);
  const { data: unmatchedData } = useUnmatchedTransactions();

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await api.post('/bank-statements/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
      setShowUploadModal(false);
    },
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: async (statementId: string) => {
      const { data } = await api.post(`/bank-statements/${statementId}/auto-match`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
    },
  });

  // Manual match mutation
  const matchMutation = useMutation({
    mutationFn: async ({ transactionId, invoiceId }: { transactionId: string; invoiceId: string }) => {
      const { data } = await api.post(`/bank-statements/transactions/${transactionId}/match`, { invoiceId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
      setShowMatchModal(false);
      setSelectedTransaction(null);
    },
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data } = await api.post(`/bank-statements/transactions/${transactionId}/create-payment`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
    },
  });

  const handleFileUpload = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    importMutation.mutate(formData);
  }, [importMutation]);

  const statements = statementsData?.data?.data || [];
  const unmatchedTransactions = unmatchedData?.data || [];
  const detailTransactions = statementDetail?.data?.transactions || [];

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Landmark className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Bankovni Izvodi</h1>
                <p className="text-white/70 mt-1">Uvoz i uparivanje transakcija sa fakturama</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-900 rounded-xl hover:bg-white/90 transition-all duration-200 shadow-lg font-medium"
            >
              <Upload className="w-4 h-4" />
              <span>Uvezi izvod</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 px-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('statements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === 'statements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Izvodi</span>
                {statements.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">{statements.length}</span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('unmatched')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                activeTab === 'unmatched'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                <span>Neuparene transakcije</span>
                {unmatchedTransactions.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                    {unmatchedTransactions.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
        {activeTab === 'statements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statements List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Svi statusi</option>
                <option value="IMPORTED">Uvezeno</option>
                <option value="PROCESSING">U obradi</option>
                <option value="MATCHED">Upareno</option>
                <option value="POSTED">Proknjiženo</option>
              </select>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Učitavanje...</div>
            ) : statements.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nema izvoda</h3>
                <p className="mt-1 text-sm text-gray-500">Uvezite prvi bankovni izvod</p>
              </div>
            ) : (
              <div className="space-y-2">
                {statements.map((statement: BankStatement) => (
                  <button
                    key={statement.id}
                    onClick={() => setSelectedStatement(statement.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedStatement === statement.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          Izvod #{statement.statementNumber}
                        </p>
                        <p className="text-sm text-gray-500">{statement.accountNumber}</p>
                      </div>
                      {getStatusBadge(statement.status)}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>{formatDate(statement.statementDate)}</p>
                      <p className="font-medium">
                        {formatCurrency(Number(statement.closingBalance))}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {statement._count?.transactions || 0} transakcija
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {statementsData?.pagination?.total > 20 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
                >
                  Prethodna
                </button>
                <span className="px-3 py-1 text-sm">Strana {page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={statements.length < 20}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
                >
                  Sledeća
                </button>
              </div>
            )}
          </div>

          {/* Statement Detail */}
          <div className="lg:col-span-2">
            {selectedStatement && statementDetail?.data ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Statement Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Izvod #{statementDetail.data.statementNumber}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {statementDetail.data.bankName} • {statementDetail.data.accountNumber}
                      </p>
                    </div>
                    <button
                      onClick={() => autoMatchMutation.mutate(selectedStatement)}
                      disabled={autoMatchMutation.isPending}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      {autoMatchMutation.isPending ? 'Uparivanje...' : '🔄 Auto-upari'}
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Početno stanje</p>
                      <p className="text-sm font-semibold">{formatCurrency(Number(statementDetail.data.openingBalance))}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Ukupno duguje</p>
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(Number(statementDetail.data.totalDebit))}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Ukupno potražuje</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(Number(statementDetail.data.totalCredit))}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Krajnje stanje</p>
                      <p className="text-sm font-semibold">{formatCurrency(Number(statementDetail.data.closingBalance))}</p>
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Iznos</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailTransactions.map((tx: BankTransaction) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(tx.transactionDate)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <p className="text-gray-900">{tx.partnerName || '-'}</p>
                            <p className="text-xs text-gray-500">{tx.partnerAccount || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {tx.description || tx.reference || '-'}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getMatchStatusBadge(tx.matchStatus)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {tx.matchStatus === 'UNMATCHED' && (
                              <button
                                onClick={() => {
                                  setSelectedTransaction(tx);
                                  setShowMatchModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Upari
                              </button>
                            )}
                            {tx.matchStatus === 'MATCHED' && !tx.matchedInvoiceId && (
                              <button
                                onClick={() => createPaymentMutation.mutate(tx.id)}
                                disabled={createPaymentMutation.isPending}
                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                              >
                                Proknjiži
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Izaberite izvod za prikaz detalja</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'unmatched' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Neuparene transakcije</h3>
            <p className="text-sm text-gray-500">Transakcije koje čekaju uparivanje sa fakturama</p>
          </div>
          
          {unmatchedTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">Sve transakcije su uparene!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Izvod</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Iznos</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unmatchedTransactions.map((tx: BankTransaction & { statement?: { statementNumber: string; accountNumber: string } }) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium text-gray-900">#{tx.statement?.statementNumber}</p>
                        <p className="text-xs text-gray-500">{tx.statement?.accountNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p className="text-gray-900">{tx.partnerName || '-'}</p>
                        <p className="text-xs text-gray-500">{tx.partnerAccount || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {tx.description || tx.reference || '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedTransaction(tx);
                            setShowMatchModal(true);
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          Upari
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Uvezi bankovni izvod</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fajl izvoda
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    name="file"
                    accept=".xml,.csv,.mt940,.sta"
                    required
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      Kliknite za izbor fajla ili prevucite ovde
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      XML, CSV, MT940 (max 10MB)
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format (opciono)
                </label>
                <select
                  name="format"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Auto-detekcija</option>
                  <option value="xml">XML (NBS format)</option>
                  <option value="csv">CSV</option>
                  <option value="mt940">MT940 (SWIFT)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending}
                  className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {importMutation.isPending ? 'Uvozi se...' : 'Uvezi'}
                </button>
              </div>
            </form>

            {importMutation.isError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                Greška pri uvozu: {(importMutation.error as Error)?.message || 'Nepoznata greška'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match Modal */}
      {showMatchModal && selectedTransaction && (
        <MatchTransactionModal
          transaction={selectedTransaction}
          onClose={() => {
            setShowMatchModal(false);
            setSelectedTransaction(null);
          }}
          onMatch={(invoiceId) => {
            matchMutation.mutate({ transactionId: selectedTransaction.id, invoiceId });
          }}
          isLoading={matchMutation.isPending}
        />
      )}
    </div>
  );
}

// Match Transaction Modal Component
function MatchTransactionModal({
  transaction,
  onClose,
  onMatch,
  isLoading,
}: {
  transaction: BankTransaction;
  onClose: () => void;
  onMatch: (invoiceId: string) => void;
  isLoading: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  // Search invoices
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices', 'search', searchQuery],
    queryFn: async () => {
      const { data } = await api.get('/invoices', {
        params: { search: searchQuery, limit: 10 },
      });
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  const invoices = invoicesData?.data?.data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upari transakciju</h3>
              <p className="text-sm text-gray-500 mt-1">
                Iznos: <span className="font-medium">{formatCurrency(Number(transaction.amount))}</span>
                {transaction.partnerName && ` • ${transaction.partnerName}`}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Pretraži fakture po broju ili partneru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {searchQuery.length < 2 ? (
            <div className="text-center text-gray-500 py-8">
              Unesite najmanje 2 karaktera za pretragu
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nema pronađenih faktura
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice: any) => (
                <button
                  key={invoice.id}
                  onClick={() => setSelectedInvoice(invoice.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedInvoice === invoice.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">{invoice.partner?.name || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(Number(invoice.totalAmount))}</p>
                      <p className="text-sm text-gray-500">{formatDate(invoice.issueDate)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Otkaži
            </button>
            <button
              onClick={() => selectedInvoice && onMatch(selectedInvoice)}
              disabled={!selectedInvoice || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Uparivanje...' : 'Upari'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
