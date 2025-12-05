import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { logger } from '../utils/logger';

interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
}

interface InventoryHistoryProps {
  productId: string;
}

const InventoryHistory: React.FC<InventoryHistoryProps> = ({ productId }) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [productId, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.getInventoryHistory(productId, { page, limit: 20 });
      
      if (response.success && response.data) {
        setTransactions(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      logger.error('Failed to fetch inventory history', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INITIAL': return '🏁 Početno stanje';
      case 'PURCHASE': return '📥 Nabavka';
      case 'SALE': return '📤 Prodaja';
      case 'RETURN_IN': return '↩️ Povraćaj od kupca';
      case 'RETURN_OUT': return '↪️ Povraćaj dobavljaču';
      case 'ADJUSTMENT': return '🔧 Korekcija';
      case 'DAMAGE': return '🗑️ Otpis/Kalo';
      case 'TRANSFER': return '📦 Prenos';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500 mt-2">Učitavanje istorije...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Nema evidentiranih promena na zalihama</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Promena</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stanje</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Napomena</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(tx.createdAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {getTypeLabel(tx.type)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                  tx.quantity > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.quantity > 0 ? '+' : ''}{Number(tx.quantity).toFixed(3)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {Number(tx.stockAfter).toFixed(3)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={tx.note || ''}>
                  {tx.note || '-'}
                  {tx.referenceType && (
                    <span className="block text-xs text-gray-400">
                      Ref: {tx.referenceType} {tx.referenceId ? '🔗' : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Prethodna
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Strana {page} od {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Sledeća
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryHistory;
