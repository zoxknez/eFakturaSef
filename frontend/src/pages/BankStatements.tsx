import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '../services/api';
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
  ChevronRight,
  MousePointer,
  ClipboardList,
  Check,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Ban
} from 'lucide-react';

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
  transactions?: BankTransaction[];
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
  statement?: { statementNumber: string; accountNumber: string };
}

// Hooks using apiClient
function useBankStatements(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['bankStatements', params],
    queryFn: async () => {
      const response = await apiClient.getBankStatements(params);
      return response;
    },
  });
}

function useBankStatement(id: string | null) {
  return useQuery({
    queryKey: ['bankStatements', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.getBankStatement(id);
      return response;
    },
    enabled: !!id,
  });
}

function useUnmatchedTransactions() {
  return useQuery({
    queryKey: ['bankStatements', 'unmatched'],
    queryFn: async () => {
      const response = await apiClient.getUnmatchedTransactions();
      return response;
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
    mutationFn: async (file: File) => {
      const response = await apiClient.uploadBankStatement(file);
      return response;
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
        setShowUploadModal(false);
        toast.success('Bankovni izvod uspešno uvezen');
      } else {
        toast.error(response.error || 'Greška pri uvozu');
      }
    },
    onError: (error: Error) => {
      toast.error(`Greška pri uvozu: ${error.message}`);
    },
  });

  // Auto-match mutation
  const autoMatchMutation = useMutation({
    mutationFn: async (statementId: string) => {
      const response = await apiClient.autoMatchTransactions(statementId);
      return response;
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
        toast.success(`Auto-uparivanje završeno: ${response.data.matched} transakcija upareno`);
      } else {
        toast.error(response.error || 'Greška pri auto-uparivanju');
      }
    },
    onError: (error: Error) => {
      toast.error(`Greška pri auto-uparivanju: ${error.message}`);
    },
  });

  // Manual match mutation
  const matchMutation = useMutation({
    mutationFn: async ({ transactionId, invoiceId }: { transactionId: string; invoiceId: string }) => {
      const response = await apiClient.matchTransaction(transactionId, invoiceId);
      return response;
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
        setShowMatchModal(false);
        setSelectedTransaction(null);
        toast.success('Transakcija uspešno uparena sa fakturom');
      } else {
        toast.error(response.error || 'Greška pri uparivanju');
      }
    },
    onError: (error: Error) => {
      toast.error(`Greška pri uparivanju: ${error.message}`);
    },
  });

  // Ignore transaction mutation
  const ignoreMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await apiClient.ignoreTransaction(transactionId);
      return response;
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
        toast.success('Transakcija označena kao ignorisana');
      } else {
        toast.error(response.error || 'Greška');
      }
    },
    onError: (error: Error) => {
      toast.error(`Greška: ${error.message}`);
    },
  });

  // Post statement mutation
  const postMutation = useMutation({
    mutationFn: async (statementId: string) => {
      const response = await apiClient.postBankStatement(statementId);
      return response;
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
        toast.success('Izvod uspešno proknjižen');
      } else {
        toast.error(response.error || 'Greška pri proknjiženju');
      }
    },
    onError: (error: Error) => {
      toast.error(`Greška pri proknjiženju: ${error.message}`);
    },
  });

  const handleFileUpload = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    if (file) {
      importMutation.mutate(file);
    }
  }, [importMutation]);

  // Extract data with proper typing
  const statementsResponse = statementsData as { data?: { data: BankStatement[] } } | undefined;
  const statements: BankStatement[] = statementsResponse?.data?.data || [];
  const unmatchedResponse = unmatchedData as { data?: BankTransaction[] } | undefined;
  const unmatchedTransactions: BankTransaction[] = unmatchedResponse?.data || [];
  const statementDetailData = (statementDetail as { data?: BankStatement } | undefined)?.data;
  const detailTransactions: BankTransaction[] = statementDetailData?.transactions || [];

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
                <FileText className="mx-auto h-12 w-12 text-gray-400" strokeWidth={1.5} />
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
                      <ClipboardList className="w-4 h-4 mr-1" />
                      {statement._count?.transactions || 0} transakcija
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {statements.length > 20 && (
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
            {selectedStatement && statementDetailData ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Statement Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Izvod #{statementDetailData.statementNumber}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {statementDetailData.bankName} • {statementDetailData.accountNumber}
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
                      <p className="text-sm font-semibold">{formatCurrency(Number(statementDetailData.openingBalance))}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Ukupno duguje</p>
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(Number(statementDetailData.totalDebit))}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Ukupno potražuje</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(Number(statementDetailData.totalCredit))}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500">Krajnje stanje</p>
                      <p className="text-sm font-semibold">{formatCurrency(Number(statementDetailData.closingBalance))}</p>
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
                            {tx.matchStatus === 'UNMATCHED' && (
                              <button
                                onClick={() => ignoreMutation.mutate(tx.id)}
                                disabled={ignoreMutation.isPending}
                                className="text-gray-400 hover:text-gray-600 text-sm"
                                title="Ignoriši transakciju"
                              >
                                <Ban className="w-4 h-4" />
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
                  <MousePointer className="mx-auto h-12 w-12 text-gray-400" strokeWidth={1.5} />
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
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
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
                <X className="w-6 h-6" />
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
                    <Upload className="mx-auto h-12 w-12 text-gray-400" strokeWidth={1.5} />
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

interface Invoice {
  id: string;
  invoiceNumber: string;
  partner?: {
    name: string;
  };
  totalAmount: number;
  issueDate: string;
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
      const response = await apiClient.getInvoices({ search: searchQuery, limit: 10 });
      return response;
    },
    enabled: searchQuery.length >= 2,
  });

  const invoicesList = invoicesData?.data?.data || [];

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
              <X className="w-6 h-6" />
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
          ) : invoicesList.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nema pronađenih faktura
            </div>
          ) : (
            <div className="space-y-2">
              {invoicesList.map((invoice) => (
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
