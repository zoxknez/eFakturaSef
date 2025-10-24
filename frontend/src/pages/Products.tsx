import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';

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

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [trackInventoryFilter, setTrackInventoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
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

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm, categoryFilter, trackInventoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
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
      }
    } catch (error) {
      logger.error('Failed to fetch products', error);
      alert('Greška pri učitavanju proizvoda');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

  const getStockStatus = (product: Product) => {
    if (!product.trackInventory) return null;
    const stock = product.currentStock || 0;
    const minStock = product.minStock || 0;
    const maxStock = product.maxStock || Infinity;

    if (stock <= minStock) {
      return { label: 'Nisko', class: 'bg-red-100 text-red-800' };
    } else if (stock >= maxStock) {
      return { label: 'Visoko', class: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: 'Normalno', class: 'bg-green-100 text-green-800' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Šifarnik Proizvoda</h1>
        <p className="text-gray-600">Upravljanje proizvodima i uslugama</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Pretraži po šifri, barkodu, imenu..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Category Filter */}
          <div>
            <input
              type="text"
              placeholder="Kategorija"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Svi statusi</option>
              <option value="true">Aktivni</option>
              <option value="false">Neaktivni</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            ➕ Dodaj Novi Proizvod
          </button>
          
          <button
            onClick={async () => {
              const response = await api.getLowStockProducts();
              if (response.success && response.data) {
                alert(`Proizvoda sa niskim zalihama: ${response.data.length}`);
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            ⚠️ Niske Zalihe
          </button>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">Nema pronađenih proizvoda</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Dodaj prvi proizvod
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proizvod
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorija
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cena
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDV
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zalihe
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Korišćeno
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            Šifra: {product.code}
                            {product.barcode && ` | Barkod: ${product.barcode}`}
                            {!product.isActive && <span className="text-red-500 ml-2">(Neaktivan)</span>}
                          </div>
                          <div className="text-xs text-gray-400">{product.unit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{product.category || '-'}</div>
                      {product.subcategory && (
                        <div className="text-xs text-gray-500">{product.subcategory}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {product.unitPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD
                      </div>
                      {product.costPrice && (
                        <div className="text-xs text-gray-500">
                          Nabavna: {product.costPrice.toLocaleString('sr-RS', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm text-gray-900">{product.vatRate}%</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {product.trackInventory ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.currentStock}</div>
                          {stockStatus && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.class}`}>
                              {stockStatus.label}
                            </span>
                          )}
                          <button
                            onClick={() => openStockModal(product)}
                            className="text-xs text-blue-600 hover:text-blue-900 mt-1 block mx-auto"
                          >
                            ⚙️ Prilagodi
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-gray-900">{product._count?.invoiceLines || 0}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        ✏️ Izmeni
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️ Obriši
                      </button>
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
        <div className="mt-6 flex justify-center">
          <nav className="inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md"
            >
              ← Prethodna
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Strana {currentPage} od {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md"
            >
              Sledeća →
            </button>
          </nav>
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProduct ? '✏️ Izmeni Proizvod' : '➕ Novi Proizvod'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Osnovni Podaci</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Šifra Artikla * (SKU)
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barkod
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jedinica Mere *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Naziv Proizvoda *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opis
                    </label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategorija</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategorija
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Podkategorija
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cene i PDV</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prodajna Cena * (RSD)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nabavna Cena (RSD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stopa PDV-a * (%)
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

              {/* Inventory */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Magacin</h3>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.trackInventory}
                      onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Prati stanje zaliha</span>
                  </label>
                </div>

                {formData.trackInventory && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trenutno Stanje
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.currentStock}
                        onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min. Stanje (Upozorenje)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max. Stanje
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={formData.maxStock}
                        onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Supplier & Manufacturer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dobavljač i Proizvođač</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dobavljač
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proizvođač
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">⚙️ Prilagođavanje Zaliha</h2>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prilagođenje (+ ili -)
                </label>
                <input
                  type="number"
                  required
                  step="0.001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={stockAdjustment.adjustment}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, adjustment: parseFloat(e.target.value) })}
                  placeholder="npr. +10 ili -5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unesite pozitivan broj za povećanje zaliha, ili negativan za smanjenje
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Napomena
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={stockAdjustment.note}
                  onChange={(e) => setStockAdjustment({ ...stockAdjustment, note: e.target.value })}
                  placeholder="Razlog prilagođenja..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStockModal(false);
                    setStockAdjustment({ productId: '', adjustment: 0, note: '' });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Potvrdi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
