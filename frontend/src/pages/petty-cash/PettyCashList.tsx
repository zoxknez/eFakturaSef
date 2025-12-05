import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import { 
  PettyCashAccount, 
  PettyCashEntry, 
  PettyCashType 
} from '@sef-app/shared';
import { pettyCashService } from '../../services/pettyCashService';
import { PettyCashEntryModal } from './PettyCashEntryModal';
import { PettyCashAccountModal } from './PettyCashAccountModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Plus, Minus, Landmark } from 'lucide-react';
import { logger } from '../../utils/logger';

export const PettyCashList: React.FC = () => {
  const [accounts, setAccounts] = useState<PettyCashAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PettyCashAccount | null>(null);
  const [entries, setEntries] = useState<PettyCashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  
  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<PettyCashType>(PettyCashType.DEPOSIT);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchEntries(selectedAccount.id, page);
    }
  }, [selectedAccount, page]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await pettyCashService.getAccounts();
      if (response.success && response.data) {
        setAccounts(response.data);
        if (response.data.length > 0 && !selectedAccount) {
          setSelectedAccount(response.data[0]);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch accounts', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (accountId: string, pageNum: number) => {
    try {
      setEntriesLoading(true);
      const response = await pettyCashService.listEntries(accountId, pageNum);
      if (response.success && response.data) {
        setEntries(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      logger.error('Failed to fetch entries', error);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleAccountCreated = () => {
    fetchAccounts();
  };

  const handleEntryCreated = () => {
    if (selectedAccount) {
      // Refresh accounts to update balance
      fetchAccounts();
      // Refresh entries
      fetchEntries(selectedAccount.id, 1);
      setPage(1);
    }
  };

  const openEntryModal = (type: PettyCashType) => {
    setEntryType(type);
    setIsEntryModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blagajna</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upravljanje gotovinskim tokovima
          </p>
        </div>
        <button
          onClick={() => setIsAccountModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Landmark className="h-5 w-5 mr-2" />
          Nova Blagajna
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            onClick={() => {
              setSelectedAccount(account);
              setPage(1);
            }}
            className={`relative rounded-xl border px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-blue-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 cursor-pointer transition-all ${
              selectedAccount?.id === account.id
                ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white'
            }`}
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">{account.name}</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {new Intl.NumberFormat('sr-RS', {
                  style: 'currency',
                  currency: account.currency
                }).format(account.balance)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedAccount ? (
        <div className="bg-white shadow rounded-xl overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Promet: {selectedAccount.name}
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={() => openEntryModal(PettyCashType.DEPOSIT)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Uplata
              </button>
              <button
                onClick={() => openEntryModal(PettyCashType.WITHDRAWAL)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Minus className="h-4 w-4 mr-1" />
                Isplata
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broj
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opis
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uplata
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Isplata
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entriesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <LoadingSpinner size="md" />
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Nema evidentiranih promena
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.entryNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(entry.date), 'dd.MM.yyyy', { locale: srLatn })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {entry.description}
                        {entry.expenseCategory && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {entry.expenseCategory}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.partnerName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        {entry.type === PettyCashType.DEPOSIT 
                          ? new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2 }).format(entry.amount)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                        {entry.type === PettyCashType.WITHDRAWAL
                          ? new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2 }).format(entry.amount)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2 }).format(entry.balanceAfter ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Prethodna
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Sledeća
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Strana <span className="font-medium">{page}</span> od <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Prethodna
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Sledeća
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow">
          <Landmark className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nema blagajni</h3>
          <p className="mt-1 text-sm text-gray-500">Kreirajte novu blagajnu da biste počeli sa radom.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Nova Blagajna
            </button>
          </div>
        </div>
      )}

      <PettyCashAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={handleAccountCreated}
      />

      {selectedAccount && (
        <PettyCashEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          onSuccess={handleEntryCreated}
          accountId={selectedAccount.id}
          type={entryType}
        />
      )}
    </div>
  );
};
