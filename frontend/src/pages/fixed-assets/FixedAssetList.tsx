/**
 * Fixed Asset List Page - Lista Osnovnih Sredstava
 * Evidencija, praćenje i obračun amortizacije
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { fixedAssetService } from '../../services/fixedAssetService';
import { FixedAsset, FixedAssetStatus } from '@sef-app/shared';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Plus,
  Building2,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Check,
  X,
  DollarSign,
  ChevronRight,
  Calculator
} from 'lucide-react';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case FixedAssetStatus.ACTIVE:
        return { 
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          text: 'text-white',
          label: 'Aktivno',
          icon: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        };
      case FixedAssetStatus.WRITTEN_OFF:
        return { 
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          label: 'Otpisano',
          icon: <X className="w-3.5 h-3.5" />
        };
      case FixedAssetStatus.SOLD:
        return { 
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          text: 'text-white',
          label: 'Prodato',
          icon: <DollarSign className="w-3.5 h-3.5" />
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

// Fixed Asset Card Component
const FixedAssetCard: React.FC<{ asset: FixedAsset }> = ({ asset }) => {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {asset.name}
              </h3>
            </div>
            <p className="text-sm font-medium text-gray-700">
              Inv. broj: {asset.inventoryNumber}
            </p>
          </div>
          <StatusBadge status={asset.status} />
        </div>
      </div>

      {/* Amount Section */}
      <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-gray-100/50 border-t border-b border-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Sadašnja vrednost</p>
            <p className="text-2xl font-bold text-gray-900">
              {Number(asset.currentValue || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
              <span className="text-sm font-medium text-gray-500 ml-1">RSD</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Nabavna vrednost</p>
            <p className="text-sm font-semibold text-gray-700">
              {Number(asset.purchaseValue || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Nabavljeno: {new Date(asset.purchaseDate).toLocaleDateString('sr-RS')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-gray-100">
          <Link
            to={`/fixed-assets/${asset.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            Detalji
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

// Main FixedAssetList Component
export const FixedAssetList: React.FC = () => {
  const navigate = useNavigate();
  
  // Data state
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fixedAssetService.getAll(currentPage, 12, debouncedSearch);
      if (response.success && response.data) {
        let filtered = response.data.data || [];
        // Filter by status tab if not 'all'
        if (activeTab !== 'all') {
          filtered = filtered.filter(a => a.status === activeTab);
        }
        setAssets(filtered);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch fixed assets:', error);
      toast.error('Greška pri učitavanju osnovnih sredstava');
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeTab, debouncedSearch]);

  // Load assets when filters change
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Handle amortization calculation
  const handleCalculateAmortization = async () => {
    const currentYear = new Date().getFullYear();
    try {
      toast.loading('Obračun amortizacije u toku...');
      const response = await fixedAssetService.calculateAmortization(currentYear, false);
      toast.dismiss();
      if (response.success) {
        toast.success(`Obračun amortizacije završen za ${response.data?.data?.length || 0} sredstava`);
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Greška pri obračunu amortizacije');
    }
  };

  const tabs = [
    { id: 'all', name: 'Sva sredstva' },
    { id: FixedAssetStatus.ACTIVE, name: 'Aktivna' },
    { id: FixedAssetStatus.WRITTEN_OFF, name: 'Otpisana' },
    { id: FixedAssetStatus.SOLD, name: 'Prodata' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <Building2 className="w-4 h-4" />
              Osnovna sredstva
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Registar imovine
            </h1>
            <p className="text-xl text-blue-100 max-w-xl">
              Evidencija osnovnih sredstava, obračun amortizacije i praćenje vrednosti imovine.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link
              to="/fixed-assets/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              Novo sredstvo
            </Link>
            <button
              onClick={handleCalculateAmortization}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/20 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-blue-500/30 transition-all"
            >
              <Calculator className="w-5 h-5" />
              Obračun amortizacije
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži po nazivu ili inventarskom broju..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-5 h-5" />
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
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-500" />
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
                <p className="mt-4 text-gray-500">Učitavanje osnovnih sredstava...</p>
              </div>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Building2 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nema osnovnih sredstava za prikaz</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Pokušajte sa drugačijom pretragom.' : 'Počnite unosom vašeg prvog osnovnog sredstva.'}
              </p>
              {!searchTerm && (
                <Link
                  to="/fixed-assets/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Unesi novo sredstvo
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {assets.map((asset) => (
                <FixedAssetCard
                  key={asset.id}
                  asset={asset}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Inv. Broj</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Naziv</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Datum nabavke</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Nabavna vr.</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Sadašnja vr.</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-gray-600">{asset.inventoryNumber}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-gray-900">{asset.name}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(asset.purchaseDate).toLocaleDateString('sr-RS')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {Number(asset.purchaseValue || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">
                        {Number(asset.currentValue || 0).toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link 
                          to={`/fixed-assets/${asset.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                        >
                          <ChevronRight className="w-4 h-4" />
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
        {assets.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Prikazano <span className="font-semibold text-gray-900">{assets.length}</span> od <span className="font-semibold text-gray-900">{totalCount}</span> sredstava
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

export default FixedAssetList;
