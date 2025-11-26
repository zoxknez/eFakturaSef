import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';
import ImportModal from '../components/ImportModal';
import ExportModal from '../components/ExportModal';
import InventoryHistory from '../components/InventoryHistory';

interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  unitPrice: number;
  costPrice?: number;
  vatRate: number;
  unit: string;
  trackInventory: boolean;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  manufacturer?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    invoiceLines: number;
  };
}

interface PaginatedResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ProductParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  trackInventory?: string;
  isActive?: string;
}

interface ProductPayload {
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  unitPrice: number;
  costPrice?: number;
  vatRate: number;
  unit: string;
  trackInventory: boolean;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  manufacturer?: string;
  note?: string;
}

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onStockAdjust: () => void;
  onViewHistory: () => void;
  getStockStatus: (product: Product) => { label: string; class: string; bg: string } | null;
}> = ({ product, onEdit, onDelete, onStockAdjust, onViewHistory, getStockStatus }) => {
  const stockStatus = getStockStatus(product);
  const margin = product.costPrice ? ((product.unitPrice - product.costPrice) / product.unitPrice * 100).toFixed(1) : null;
  
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden">
      {/* Header with Category Badge */}
      <div className="relative p-5 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {product.category && (
                <span className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold rounded-lg">
                  {product.category}
                </span>
              )}
              {!product.isActive && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">
                  Neaktivan
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-lg truncate group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{product.code}</span>
              {product.barcode && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  {product.barcode}
                </span>
              )}
            </div>
          </div>
          {/* Quick Actions - visible on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Price Section */}
      <div className="px-5 py-4 bg-gradient-to-br from-gray-50 to-gray-100/50 border-t border-b border-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Prodajna cena</p>
            <p className="text-2xl font-bold text-gray-900">
              {product.unitPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
              <span className="text-sm font-medium text-gray-500 ml-1">RSD</span>
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1.5 rounded-lg text-sm font-bold ${
                product.vatRate === 20 ? 'bg-blue-100 text-blue-700' :
                product.vatRate === 10 ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                PDV {product.vatRate}%
              </span>
            </div>
            {margin && (
              <p className="text-xs text-gray-500 mt-1.5">
                Marža: <span className={`font-bold ${parseFloat(margin) > 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{margin}%</span>
              </p>
            )}
          </div>
        </div>
        {product.costPrice && (
          <p className="text-sm text-gray-500 mt-2">
            Nabavna: {product.costPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
          </p>
        )}
      </div>

      {/* Footer - Stock & Stats */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          {/* Stock Info */}
          {product.trackInventory ? (
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stockStatus?.bg || 'bg-gray-100'}`}>
                <svg className={`w-5 h-5 ${stockStatus?.class.includes('red') ? 'text-red-600' : stockStatus?.class.includes('orange') ? 'text-orange-600' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{product.currentStock} {product.unit}</p>
                {stockStatus && (
                  <span className={`text-xs font-medium ${stockStatus.class}`}>{stockStatus.label}</span>
                )}
              </div>
              <button 
                onClick={onStockAdjust}
                className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Prilagodi
              </button>
              <button 
                onClick={onViewHistory}
                className="ml-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="Istorija promena"
              >
                🕒
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm">Bez praćenja</span>
            </div>
          )}

          {/* Usage count */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium">{product._count?.invoiceLines || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [trackInventoryFilter, setTrackInventoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProductId, setHistoryProductId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ productId: '', adjustment: 0, note: '' });
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    subcategory: '',
    unitPrice: '',
    costPrice: '',
    vatRate: 20,
    unit: 'kom',
    trackInventory: false,
    currentStock: 0,
    minStock: '',
    maxStock: '',
    supplier: '',
    manufacturer: '',
    note: '',
  });

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: totalCount,
      withInventory: products.filter(p => p.trackInventory).length,
      lowStock: products.filter(p => p.trackInventory && p.currentStock !== undefined && p.minStock !== undefined && p.currentStock <= p.minStock).length,
      active: products.filter(p => p.isActive).length,
    };
  }, [products, totalCount]);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm, categoryFilter, trackInventoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: ProductParams = {
        page: currentPage,
        limit: 20,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (trackInventoryFilter) params.trackInventory = trackInventoryFilter;
      if (statusFilter) params.isActive = statusFilter;

      const response = await api.getProducts(params);
      
      if (response.success && response.data) {
        setProducts(response.data.data);
        setTotalPages(response.data.pagination.pages);
        setTotalCount(response.data.pagination.total);
      }
    } catch (error) {
      logger.error('Failed to fetch products', error);
      alert('Greška pri učitavanju proizvoda');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: Product) => {
    if (!product.trackInventory) return null;
    const stock = product.currentStock || 0;
    const minStock = product.minStock || 0;
    const maxStock = product.maxStock || Infinity;

    if (stock <= minStock) {
      return { label: 'Niska zaliha', class: 'text-red-600', bg: 'bg-red-50' };
    } else if (stock >= maxStock) {
      return { label: 'Visoka zaliha', class: 'text-orange-600', bg: 'bg-orange-50' };
    } else {
      return { label: 'Normalno', class: 'text-emerald-600', bg: 'bg-emerald-50' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload: ProductPayload = {
        ...formData,
        unitPrice: parseFloat(formData.unitPrice),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        minStock: formData.minStock ? parseFloat(formData.minStock) : undefined,
        maxStock: formData.maxStock ? parseFloat(formData.maxStock) : undefined,
        barcode: formData.barcode || undefined,
        description: formData.description || undefined,
        category: formData.category || undefined,
        subcategory: formData.subcategory || undefined,
        supplier: formData.supplier || undefined,
        manufacturer: formData.manufacturer || undefined,
      };

      let response;
      if (editingProduct) {
        response = await api.updateProduct(editingProduct.id, payload);
        if (response.success) {
          alert('Proizvod uspešno ažuriran!');
        }
      } else {
        response = await api.createProduct(payload);
        if (response.success) {
          alert('Proizvod uspešno kreiran!');
        }
      }

      if (!response.success) {
        alert(response.error || 'Greška pri čuvanju proizvoda');
        return;
      }

      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error: unknown) {
      logger.error('Failed to save product', error);
      alert('Greška pri čuvanju proizvoda');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await api.updateProductStock(
        stockAdjustment.productId,
        stockAdjustment.adjustment,
        stockAdjustment.note
      );
      
      if (response.success) {
        alert('Zalihe uspešno ažurirane!');
        setShowStockModal(false);
        setStockAdjustment({ productId: '', adjustment: 0, note: '' });
        fetchProducts();
      } else {
        alert(response.error || 'Greška pri ažuriranju zaliha');
      }
    } catch (error) {
      logger.error('Failed to update stock', error);
      alert('Greška pri ažuriranju zaliha');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj proizvod?')) {
      return;
    }

    try {
      const response = await api.deleteProduct(id);
      
      if (response.success) {
        alert('Proizvod obrisan!');
        fetchProducts();
      } else {
        alert(response.error || 'Greška pri brisanju proizvoda');
      }
    } catch (error: unknown) {
      logger.error('Failed to delete product', error);
      alert('Greška pri brisanju proizvoda');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      barcode: product.barcode || '',
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      unitPrice: product.unitPrice.toString(),
      costPrice: product.costPrice?.toString() || '',
      vatRate: product.vatRate,
      unit: product.unit,
      trackInventory: product.trackInventory,
      currentStock: product.currentStock || 0,
      minStock: product.minStock?.toString() || '',
      maxStock: product.maxStock?.toString() || '',
      supplier: product.supplier || '',
      manufacturer: product.manufacturer || '',
      note: '',
    });
    setShowModal(true);
  };

  const openStockModal = (product: Product) => {
    setStockAdjustment({ productId: product.id, adjustment: 0, note: '' });
    setShowStockModal(true);
  };

  const openHistoryModal = (product: Product) => {
    setHistoryProductId(product.id);
    setShowHistoryModal(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      barcode: '',
      name: '',
      description: '',
      category: '',
      subcategory: '',
      unitPrice: '',
      costPrice: '',
      vatRate: 20,
      unit: 'kom',
      trackInventory: false,
      currentStock: 0,
      minStock: '',
      maxStock: '',
      supplier: '',
      manufacturer: '',
      note: '',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-2xl rotate-12 floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-xl -rotate-12 floating" style={{ animationDelay: '2s' }}></div>
          
          {/* Package icons pattern */}
          <div className="absolute top-8 right-16 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Proizvodi i usluge • Šifarnik
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Šifarnik Proizvoda
            </h1>
            <p className="text-xl text-violet-100 max-w-xl">
              Upravljajte katalogom proizvoda i usluga, pratite zalihe i marže.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                const response = await api.getLowStockProducts();
                if (response.success && response.data) {
                  alert(`Proizvoda sa niskim zalihama: ${response.data.length}`);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 text-amber-900 rounded-xl font-medium hover:bg-amber-300 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Niske zalihe
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Uvoz
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Izvoz
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-violet-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novi proizvod
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ukupno proizvoda</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Praćene zalihe</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.withInventory}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Niske zalihe</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.lowStock}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Aktivni</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
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
                placeholder="Pretraži po šifri, barkodu, nazivu..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <input
            type="text"
            placeholder="Kategorija"
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50 focus:bg-white min-w-[140px]"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          />

          {/* Status Filter */}
          <select
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-gray-50 focus:bg-white min-w-[140px]"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Svi statusi</option>
            <option value="true">Aktivni</option>
            <option value="false">Neaktivni</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-violet-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow text-violet-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-500">Učitavanje proizvoda...</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nema pronađenih proizvoda</h3>
          <p className="text-gray-500 mb-6">Počnite dodavanjem vašeg prvog proizvoda ili usluge.</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dodaj prvi proizvod
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEditModal(product)}
              onDelete={() => handleDelete(product.id)}
              onStockAdjust={() => openStockModal(product)}
              onViewHistory={() => openHistoryModal(product)}
              getStockStatus={getStockStatus}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Proizvod</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategorija</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Cena</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">PDV</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Zalihe</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Korišćeno</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{product.code}</span>
                          {product.barcode && <span className="ml-2 text-gray-400">| {product.barcode}</span>}
                          {!product.isActive && <span className="ml-2 text-red-500">(Neaktivan)</span>}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {product.category ? (
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-lg">
                          {product.category}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-gray-900">{product.unitPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD</p>
                      {product.costPrice && (
                        <p className="text-xs text-gray-500">Nabavna: {product.costPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        product.vatRate === 20 ? 'bg-blue-100 text-blue-700' :
                        product.vatRate === 10 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {product.vatRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {product.trackInventory ? (
                        <div>
                          <p className="font-semibold text-gray-900">{product.currentStock} {product.unit}</p>
                          {stockStatus && (
                            <span className={`text-xs font-medium ${stockStatus.class}`}>{stockStatus.label}</span>
                          )}
                          <button onClick={() => openStockModal(product)} className="block text-xs text-violet-600 hover:text-violet-700 mt-1 mx-auto">
                            Prilagodi
                          </button>
                          <button onClick={() => openHistoryModal(product)} className="block text-xs text-gray-500 hover:text-gray-700 mt-1 mx-auto">
                            Istorija
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-gray-900">{product._count?.invoiceLines || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(product)} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Prikazano <span className="font-semibold text-gray-900">{products.length}</span> od <span className="font-semibold text-gray-900">{totalCount}</span> proizvoda
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
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  {editingProduct ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingProduct ? 'Izmeni Proizvod' : 'Novi Proizvod'}
                  </h2>
                  <p className="text-white/70 text-sm">Popunite podatke o proizvodu ili usluzi</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Osnovni Podaci
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Šifra Artikla * (SKU)</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Barkod</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Jedinica Mere *</label>
                    <select
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="kom">kom (komad)</option>
                      <option value="kg">kg (kilogram)</option>
                      <option value="m">m (metar)</option>
                      <option value="m2">m² (kvadratni metar)</option>
                      <option value="l">l (litar)</option>
                      <option value="h">h (sat)</option>
                      <option value="dan">dan</option>
                      <option value="usluga">usluga</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Naziv Proizvoda *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Opis</label>
                    <textarea
                      rows={2}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Category & Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Kategorija
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategorija</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Podkategorija</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cene i PDV
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Prodajna Cena * (RSD)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.unitPrice}
                        onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nabavna Cena (RSD)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Stopa PDV-a *</label>
                      <select
                        required
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.vatRate}
                        onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) })}
                      >
                        <option value="0">0% (Oslobođeno)</option>
                        <option value="10">10% (Snižena)</option>
                        <option value="20">20% (Opšta)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Magacin
                </h3>
                
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      checked={formData.trackInventory}
                      onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">Prati stanje zaliha</span>
                  </label>
                </div>

                {formData.trackInventory && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Trenutno Stanje</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.currentStock}
                        onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Min. Stanje (Upozorenje)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Max. Stanje</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                        value={formData.maxStock}
                        onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Supplier & Manufacturer */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Dobavljač i Proizvođač
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Dobavljač</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Proizvođač</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-6 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
                >
                  {editingProduct ? 'Sačuvaj Izmene' : 'Kreiraj Proizvod'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Prilagođavanje Zaliha</h2>
                  <p className="text-white/70 text-sm">Ručna korekcija stanja</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prilagođenje (+ ili -)</label>
                <input
                  type="number"
                  required
                  step="0.001"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-lg font-semibold"
                  value={stockAdjustment.adjustment}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, adjustment: parseFloat(e.target.value) })}
                  placeholder="npr. +10 ili -5"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Unesite pozitivan broj za povećanje zaliha, ili negativan za smanjenje
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Napomena</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                  value={stockAdjustment.note}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, note: e.target.value })}
                  placeholder="Razlog prilagođenja..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowStockModal(false); setStockAdjustment({ productId: '', adjustment: 0, note: '' }); }}
                  className="px-6 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                >
                  Potvrdi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory History Modal */}
      {showHistoryModal && historyProductId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-5 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">🕒</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Istorija Promena Zaliha</h2>
                  <p className="text-white/70 text-sm">Pregled svih transakcija za proizvod</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <InventoryHistory productId={historyProductId} />
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        importType="products"
        onSuccess={() => {
          setShowImportModal(false);
          fetchProducts();
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="products"
        title="Izvoz proizvoda"
      />
    </div>
  );
};

export default Products;
