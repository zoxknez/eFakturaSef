/**
 * Products Page - Šifarnik Proizvoda i Usluga
 * Upravljanje artiklima sa praćenjem zaliha
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  productService, 
  type ProductListItem, 
  type CreateProductDTO,
  type ProductSummary 
} from '../services/productService';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { logger } from '../utils/logger';
import { useDebounce } from '../hooks/useDebounce';
import ImportModal from '../components/ImportModal';
import ExportModal from '../components/ExportModal';
import InventoryHistory from '../components/InventoryHistory';
import {
  Plus,
  Package,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Search,
  LayoutGrid,
  List,
  Edit,
  Trash2,
  Settings,
  X,
  Info,
  Tag,
  DollarSign,
  Boxes,
  Building,
  Download,
  Upload,
  History,
  Barcode
} from 'lucide-react';

// Form data type
interface ProductFormData {
  code: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  unitPrice: string;
  costPrice: string;
  vatRate: number;
  unit: string;
  trackInventory: boolean;
  currentStock: number;
  minStock: string;
  maxStock: string;
  supplier: string;
  manufacturer: string;
}

const initialFormData: ProductFormData = {
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
  manufacturer: ''
};

// ProductCard Component
interface ProductCardProps {
  product: ProductListItem;
  onEdit: () => void;
  onDelete: () => void;
  onStockAdjust: () => void;
  onViewHistory: () => void;
  getStockStatus: (product: ProductListItem) => { label: string; class: string } | null;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onStockAdjust,
  onViewHistory,
  getStockStatus
}) => {
  const stockStatus = getStockStatus(product);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${!product.isActive ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-mono">{product.code}</p>
              <h3 className="font-bold text-white text-lg truncate max-w-[200px]">{product.name}</h3>
            </div>
          </div>
          {!product.isActive && (
            <span className="px-2 py-1 bg-red-500/20 text-white text-xs rounded-lg">Neaktivan</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Category & Barcode */}
        <div className="flex items-center justify-between text-sm">
          {product.category ? (
            <span className="px-2 py-1 bg-violet-100 text-violet-700 font-medium rounded-lg">
              {product.category}
            </span>
          ) : (
            <span className="text-gray-400">Bez kategorije</span>
          )}
          {product.barcode && (
            <span className="text-gray-500 font-mono text-xs flex items-center gap-1">
              <Barcode className="w-3 h-3" />
              {product.barcode}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Prodajna cena</p>
            <p className="text-2xl font-bold text-gray-900">
              {product.unitPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
              <span className="text-sm font-normal text-gray-500 ml-1">RSD</span>
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
            product.vatRate === 20 ? 'bg-blue-100 text-blue-700' :
            product.vatRate === 10 ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'
          }`}>
            PDV {product.vatRate}%
          </span>
        </div>

        {/* Stock */}
        {product.trackInventory && (
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Stanje zaliha</p>
                <p className="text-lg font-bold text-gray-900">
                  {product.currentStock} <span className="text-sm font-normal text-gray-500">{product.unit}</span>
                </p>
              </div>
              {stockStatus && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${stockStatus.class}`}>
                  {stockStatus.label}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={onStockAdjust}
                className="flex-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                Prilagodi
              </button>
              <button
                onClick={onViewHistory}
                className="flex-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Istorija
              </button>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Korišćeno u fakturama:</span>
          <span className="font-semibold text-gray-900">{product._count?.invoiceLines || 0}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-2">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          title="Izmeni"
        >
          <Edit className="w-5 h-5" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Obriši"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Main Products Component
const Products: React.FC = () => {
  // Data state
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Server-side stats
  const [serverStats, setServerStats] = useState<ProductSummary | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; productId: string | null; productName: string }>({
    isOpen: false,
    productId: null,
    productName: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock adjustment
  const [stockAdjustment, setStockAdjustment] = useState<{
    productId: string;
    adjustment: number;
    note: string;
  }>({ productId: '', adjustment: 0, note: '' });
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  // History modal
  const [historyProductId, setHistoryProductId] = useState<string | null>(null);

  // Calculate stats from current page data or use server stats
  const stats = useMemo(() => {
    if (serverStats) {
      return serverStats;
    }
    // Fallback to client-side calculation
    return {
      total: totalCount,
      withInventory: products.filter(p => p.trackInventory).length,
      lowStock: products.filter(p => 
        p.trackInventory && 
        p.minStock !== null && 
        p.minStock !== undefined && 
        (p.currentStock || 0) <= p.minStock
      ).length,
      active: products.filter(p => p.isActive).length
    };
  }, [products, totalCount, serverStats]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await productService.list({
        page: currentPage,
        limit: 12,
        search: debouncedSearch || undefined,
        category: categoryFilter || undefined,
        isActive: statusFilter || undefined
      });

      setProducts(result.data);
      setTotalCount(result.pagination.total);
      setTotalPages(result.pagination.totalPages);

      // Use summary from response if available
      if (result.summary) {
        setServerStats(result.summary);
      }
    } catch (error) {
      logger.error('Failed to fetch products:', error);
      toast.error('Greška pri učitavanju proizvoda');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, categoryFilter, statusFilter]);

  // Load products on mount and when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProduct(null);
  };

  // Open edit modal
  const openEditModal = (product: ProductListItem) => {
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
      supplier: '',
      manufacturer: ''
    });
    setShowModal(true);
  };

  // Open stock adjustment modal
  const openStockModal = (product: ProductListItem) => {
    setStockAdjustment({
      productId: product.id,
      adjustment: 0,
      note: ''
    });
    setShowStockModal(true);
  };

  // Open history modal
  const openHistoryModal = (product: ProductListItem) => {
    setHistoryProductId(product.id);
    setShowHistoryModal(true);
  };

  // Get stock status
  const getStockStatus = (product: ProductListItem): { label: string; class: string } | null => {
    if (!product.trackInventory) return null;
    
    const stock = product.currentStock || 0;
    
    if (stock === 0) {
      return { label: 'Nema na stanju', class: 'bg-red-100 text-red-700' };
    }
    if (product.minStock !== null && product.minStock !== undefined && stock <= product.minStock) {
      return { label: 'Niske zalihe', class: 'bg-amber-100 text-amber-700' };
    }
    if (product.maxStock !== null && product.maxStock !== undefined && stock >= product.maxStock) {
      return { label: 'Prekomerno', class: 'bg-blue-100 text-blue-700' };
    }
    return { label: 'Optimalno', class: 'bg-green-100 text-green-700' };
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: CreateProductDTO = {
        code: formData.code,
        barcode: formData.barcode || undefined,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        subcategory: formData.subcategory || undefined,
        unitPrice: parseFloat(formData.unitPrice),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        vatRate: formData.vatRate,
        unit: formData.unit,
        trackInventory: formData.trackInventory,
        currentStock: formData.trackInventory ? formData.currentStock : undefined,
        minStock: formData.minStock ? parseFloat(formData.minStock) : undefined,
        maxStock: formData.maxStock ? parseFloat(formData.maxStock) : undefined,
        supplier: formData.supplier || undefined,
        manufacturer: formData.manufacturer || undefined
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, payload);
        toast.success('Proizvod uspešno ažuriran');
      } else {
        await productService.create(payload);
        toast.success('Proizvod uspešno kreiran');
      }

      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      logger.error('Failed to save product:', error);
      toast.error(editingProduct ? 'Greška pri ažuriranju proizvoda' : 'Greška pri kreiranju proizvoda');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setDeleteConfirm({
      isOpen: true,
      productId,
      productName: product?.name || ''
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.productId) return;

    setIsDeleting(true);
    try {
      await productService.delete(deleteConfirm.productId);
      toast.success('Proizvod uspešno obrisan');
      setDeleteConfirm({ isOpen: false, productId: null, productName: '' });
      fetchProducts();
    } catch (error) {
      logger.error('Failed to delete product:', error);
      toast.error('Greška pri brisanju proizvoda');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle stock adjustment
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdjustingStock(true);

    try {
      await productService.adjustStock(stockAdjustment.productId, {
        adjustment: stockAdjustment.adjustment,
        note: stockAdjustment.note || undefined
      });
      toast.success('Zalihe uspešno ažurirane');
      setShowStockModal(false);
      setStockAdjustment({ productId: '', adjustment: 0, note: '' });
      fetchProducts();
    } catch (error) {
      logger.error('Failed to adjust stock:', error);
      toast.error('Greška pri ažuriranju zaliha');
    } finally {
      setIsAdjustingStock(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
            Šifarnik Proizvoda
          </h1>
          <p className="text-gray-500 mt-1">Upravljanje proizvodima i uslugama</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Uvoz
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Izvoz
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novi Proizvod
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ukupno Proizvoda</p>
              <p className="text-3xl font-bold text-violet-600 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-violet-600" />
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
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
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
              <AlertTriangle className="w-6 h-6 text-red-600" />
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
              <CheckCircle className="w-6 h-6 text-emerald-600" />
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow text-violet-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-5 h-5" />
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
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nema pronađenih proizvoda</h3>
          <p className="text-gray-500 mb-6">Počnite dodavanjem vašeg prvog proizvoda ili usluge.</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
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
                          <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
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
                    <Edit className="w-5 h-5 text-white" />
                  ) : (
                    <Plus className="w-5 h-5 text-white" />
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
                  <Info className="w-5 h-5 text-violet-600" />
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
                    <Tag className="w-5 h-5 text-violet-600" />
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
                    <DollarSign className="w-5 h-5 text-violet-600" />
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
                  <Boxes className="w-5 h-5 text-violet-600" />
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
                  <Building className="w-5 h-5 text-violet-600" />
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all disabled:opacity-50"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <LoadingSpinner />}
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
                  <Settings className="w-5 h-5 text-white" />
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
                  disabled={isAdjustingStock}
                  className="px-6 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all disabled:opacity-50"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingStock}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isAdjustingStock && <LoadingSpinner />}
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
                  <History className="w-5 h-5 text-white" />
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
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <InventoryHistory productId={historyProductId} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, productId: null, productName: '' })}
        onConfirm={confirmDelete}
        title="Brisanje Proizvoda"
        message={
          <span>
            Da li ste sigurni da želite da obrišete proizvod <strong>"{deleteConfirm.productName}"</strong>?
            <br />
            <span className="text-gray-500 text-sm mt-2 block">Ova akcija se ne može poništiti.</span>
          </span>
        }
        confirmText="Obriši"
        variant="danger"
        isLoading={isDeleting}
      />

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
