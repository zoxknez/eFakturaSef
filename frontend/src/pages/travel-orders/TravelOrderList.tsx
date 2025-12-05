import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TravelOrder, TravelOrderStatus } from '@sef-app/shared';
import { travelOrderService } from '../../services/travelOrderService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { logger } from '../../utils/logger';
import toast from 'react-hot-toast';
import { 
  Globe, 
  Plus, 
  Search, 
  Building2, 
  ChevronRight, 
  Check, 
  Send, 
  FileEdit, 
  DollarSign, 
  X 
} from 'lucide-react';

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case TravelOrderStatus.APPROVED:
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          text: 'text-white',
          label: 'Odobren',
          icon: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        };
      case TravelOrderStatus.SUBMITTED:
        return { 
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          text: 'text-white',
          label: 'Podnet',
          icon: <Send className="w-3.5 h-3.5" />
        };
      case TravelOrderStatus.DRAFT:
        return { 
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          label: 'Nacrt',
          icon: <FileEdit className="w-3.5 h-3.5" />
        };
      case TravelOrderStatus.PAID:
        return { 
          bg: 'bg-gradient-to-r from-violet-500 to-purple-500',
          text: 'text-white',
          label: 'Isplaćen',
          icon: <DollarSign className="w-3.5 h-3.5" />
        };
      case TravelOrderStatus.REJECTED:
        return { 
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          text: 'text-white',
          label: 'Odbijen',
          icon: <X className="w-3.5 h-3.5" />
        };
      default:
        return { 
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          label: status || 'Nepoznato',
          icon: null
        };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

export const TravelOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<TravelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: 12 };
      
      if (activeTab !== 'all') {
        params.status = activeTab.toUpperCase();
      }
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await travelOrderService.getTravelOrders(params);
      if (response.success && response.data) {
        setOrders(response.data.data || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      }
    } catch (error) {
      logger.error('Failed to fetch travel orders:', error);
      toast.error('Greška pri učitavanju putnih naloga');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm || searchTerm === '') {
        setCurrentPage(1);
        fetchOrders();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const tabs = [
    { id: 'all', name: 'Svi nalozi' },
    { id: 'draft', name: 'Nacrti' },
    { id: 'submitted', name: 'Podneti' },
    { id: 'approved', name: 'Odobreni' },
    { id: 'paid', name: 'Isplaćeni' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <Globe className="w-4 h-4" />
              Putni Nalozi
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Putni Nalozi
            </h1>
            <p className="text-xl text-indigo-100 max-w-xl">
              Evidencija službenih putovanja, obračun troškova i dnevnica.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link
              to="/travel-orders/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              Novi nalog
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži po broju naloga, zaposlenom, destinaciji..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100">
          <nav className="flex overflow-x-auto px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`relative py-4 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <LoadingSpinner />
                <p className="mt-4 text-gray-500">Učitavanje naloga...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Building2 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nema putnih naloga</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Pokušajte sa drugačijom pretragom.' : 'Kreirajte prvi putni nalog.'}
              </p>
              {!searchTerm && (
                <Link
                  to="/travel-orders/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Kreiraj nalog
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Broj</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Zaposleni</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Destinacija</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Troškovi</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Za isplatu</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        {order.number}
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        {order.employeeName}
                      </td>
                      <td className="px-4 py-4 text-gray-900">
                        {order.destination}, {order.country}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div>{new Date(order.departureDate).toLocaleDateString('sr-RS')}</div>
                        <div className="text-xs text-gray-400">do {new Date(order.returnDate).toLocaleDateString('sr-RS')}</div>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900">
                        {Number(order.totalExpenses || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-indigo-600">
                        {Number(order.totalPayout || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link 
                            to={`/travel-orders/${order.id}`}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {orders.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Prikazano <span className="font-semibold text-gray-900">{orders.length}</span> od <span className="font-semibold text-gray-900">{totalCount}</span> naloga
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prethodna
                </button>
                <span className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sledeća →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
