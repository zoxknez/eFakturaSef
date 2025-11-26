import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { calculationService, CalculationListParams } from '../../services/calculationService';
import { Calculation, CalculationStatus } from '@sef-app/shared';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case CalculationStatus.POSTED:
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          text: 'text-white',
          label: 'Proknjiženo',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      case CalculationStatus.DRAFT:
        return { 
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          label: 'Nacrt',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )
        };
      case CalculationStatus.CANCELLED:
        return { 
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          text: 'text-white',
          label: 'Stornirano',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
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

const CalculationCard = ({ calculation, onPreview }: { 
  calculation: Calculation; 
  onPreview: () => void; 
}) => {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {calculation.number}
              </h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">{calculation.type}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {/* Partner info would need to be fetched or included in the calculation object if expanded */}
              Partner ID: {calculation.partnerId || 'N/A'}
            </p>
          </div>
          <StatusBadge status={calculation.status} />
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-gray-100/50 border-t border-b border-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Prodajna vrednost</p>
            <p className="text-2xl font-bold text-gray-900">
              {Number(calculation.totalSellingValue || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
              <span className="text-sm font-medium text-gray-500 ml-1">RSD</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Marža</p>
            <p className="text-sm font-semibold text-emerald-600">
              {Number(calculation.totalMargin || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{new Date(calculation.date).toLocaleDateString('sr-RS')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
             {/* Actions like Print could go here */}
          </div>
          <Link
            to={`/calculations/${calculation.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            Detalji
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const CalculationList: React.FC = () => {
  const navigate = useNavigate();
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const handlePreview = (calculation: Calculation) => {
    navigate(`/calculations/${calculation.id}`);
  };

  useEffect(() => {
    fetchCalculations();
  }, [currentPage, activeTab]);

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const params: CalculationListParams = { page: currentPage, limit: 12 };
      
      if (activeTab !== 'all') {
        params.status = activeTab as CalculationStatus;
      }
      
      const response = await calculationService.getAll(params);
      if (response.success && response.data) {
        setCalculations(response.data.data || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch calculations:', error);
      toast.error('Greška pri učitavanju kalkulacija');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'all', name: 'Sve kalkulacije', count: totalCount, color: 'gray' },
    { id: CalculationStatus.DRAFT, name: 'Nacrti', count: 0, color: 'gray' }, // Count logic needs backend support or separate queries
    { id: CalculationStatus.POSTED, name: 'Proknjižene', count: 0, color: 'green' },
  ];

  const filteredCalculations = calculations.filter(calc => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      calc.number.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Robno knjigovodstvo
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Kalkulacije
            </h1>
            <p className="text-xl text-indigo-100 max-w-xl">
              Izrada kalkulacija cena, evidencija ulaza robe i formiranje prodajnih cena.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link
              to="/calculations/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova kalkulacija
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Pretraži po broju kalkulacije..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
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
                <p className="mt-4 text-gray-500">Učitavanje kalkulacija...</p>
              </div>
            </div>
          ) : filteredCalculations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nema kalkulacija za prikaz</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Pokušajte sa drugačijom pretragom.' : 'Počnite kreiranjem vaše prve kalkulacije.'}
              </p>
              {!searchTerm && (
                <Link
                  to="/calculations/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Kreiraj prvu kalkulaciju
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCalculations.map((calc) => (
                <CalculationCard
                  key={calc.id}
                  calculation={calc}
                  onPreview={() => handlePreview(calc)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Broj</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Datum</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Nabavna vr.</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Prodajna vr.</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCalculations.map((calc) => (
                    <tr key={calc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-semibold text-gray-900">{calc.number}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(calc.date).toLocaleDateString('sr-RS')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {Number(calc.totalPurchaseValue || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">
                        {Number(calc.totalSellingValue || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={calc.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link 
                          to={`/calculations/${calc.id}`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredCalculations.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Prikazano <span className="font-semibold text-gray-900">{filteredCalculations.length}</span> od <span className="font-semibold text-gray-900">{totalCount}</span> kalkulacija
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
