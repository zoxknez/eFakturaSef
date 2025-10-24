import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';

interface Partner {
  id: string;
  type: 'BUYER' | 'SUPPLIER' | 'BOTH';
  pib: string;
  name: string;
  shortName?: string;
  address: string;
  city: string;
  postalCode: string;
  email?: string;
  phone?: string;
  vatPayer: boolean;
  defaultPaymentTerms: number;
  creditLimit?: number;
  discount?: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    invoices: number;
  };
}

interface PaginatedResponse {
  data: Partner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const Partners: React.FC = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    type: 'BUYER' as 'BUYER' | 'SUPPLIER' | 'BOTH',
    pib: '',
    name: '',
    shortName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'RS',
    email: '',
    phone: '',
    fax: '',
    website: '',
    contactPerson: '',
    vatPayer: true,
    vatNumber: '',
    defaultPaymentTerms: 15,
    creditLimit: '',
    discount: 0,
    note: '',
  });

  useEffect(() => {
    fetchPartners();
  }, [currentPage, searchTerm, typeFilter, statusFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.isActive = statusFilter;

      const response = await api.getPartners(params);
      
      if (response.success && response.data) {
        setPartners(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      logger.error('Failed to fetch partners', error);
      alert('Greška pri učitavanju partnera');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
      };

      let response;
      if (editingPartner) {
        response = await api.updatePartner(editingPartner.id, payload);
        if (response.success) {
          alert('Partner uspešno ažuriran!');
        }
      } else {
        response = await api.createPartner(payload);
        if (response.success) {
          alert('Partner uspešno kreiran!');
        }
      }

      if (!response.success) {
        alert(response.error || 'Greška pri čuvanju partnera');
        return;
      }

      setShowModal(false);
      resetForm();
      fetchPartners();
    } catch (error: any) {
      logger.error('Failed to save partner', error);
      alert('Greška pri čuvanju partnera');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovog partnera?')) {
      return;
    }

    try {
      const response = await api.deletePartner(id);
      
      if (response.success) {
        alert('Partner obrisan!');
        fetchPartners();
      } else {
        alert(response.error || 'Greška pri brisanju partnera');
      }
    } catch (error: any) {
      logger.error('Failed to delete partner', error);
      alert('Greška pri brisanju partnera');
    }
  };

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      type: partner.type,
      pib: partner.pib,
      name: partner.name,
      shortName: partner.shortName || '',
      address: partner.address,
      city: partner.city,
      postalCode: partner.postalCode,
      country: 'RS',
      email: partner.email || '',
      phone: partner.phone || '',
      fax: '',
      website: '',
      contactPerson: '',
      vatPayer: partner.vatPayer,
      vatNumber: '',
      defaultPaymentTerms: partner.defaultPaymentTerms,
      creditLimit: partner.creditLimit?.toString() || '',
      discount: partner.discount || 0,
      note: '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPartner(null);
    setFormData({
      type: 'BUYER',
      pib: '',
      name: '',
      shortName: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'RS',
      email: '',
      phone: '',
      fax: '',
      website: '',
      contactPerson: '',
      vatPayer: true,
      vatNumber: '',
      defaultPaymentTerms: 15,
      creditLimit: '',
      discount: 0,
      note: '',
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'BUYER': return '🛒 Kupac';
      case 'SUPPLIER': return '📦 Dobavljač';
      case 'BOTH': return '🔄 Kupac i Dobavljač';
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'BUYER': return 'bg-blue-100 text-blue-800';
      case 'SUPPLIER': return 'bg-green-100 text-green-800';
      case 'BOTH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Šifarnik Partnera</h1>
        <p className="text-gray-600">Upravljanje kupcima i dobavljačima</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Pretraži po imenu, PIB-u, email-u..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Svi tipovi</option>
              <option value="BUYER">Kupci</option>
              <option value="SUPPLIER">Dobavljači</option>
              <option value="BOTH">Kupci i Dobavljači</option>
            </select>
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

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          ➕ Dodaj Novog Partnera
        </button>
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">Nema pronađenih partnera</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Dodaj prvog partnera
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tip
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platni Uslovi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fakture
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {partners.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                        <div className="text-sm text-gray-500">
                          PIB: {partner.pib} {!partner.isActive && <span className="text-red-500">(Neaktivan)</span>}
                        </div>
                        <div className="text-xs text-gray-400">{partner.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeClass(partner.type)}`}>
                      {getTypeLabel(partner.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{partner.email || '-'}</div>
                    <div className="text-sm text-gray-500">{partner.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{partner.defaultPaymentTerms} dana</div>
                    {partner.discount && partner.discount > 0 && (
                      <div className="text-sm text-green-600">Popust: {partner.discount}%</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{partner._count?.invoices || 0}</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(partner)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      ✏️ Izmeni
                    </button>
                    <button
                      onClick={() => handleDelete(partner.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      🗑️ Obriši
                    </button>
                  </td>
                </tr>
              ))}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPartner ? '✏️ Izmeni Partnera' : '➕ Novi Partner'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Osnovni Podaci</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tip Partnera *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="BUYER">Kupac</option>
                      <option value="SUPPLIER">Dobavljač</option>
                      <option value="BOTH">Kupac i Dobavljač</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIB * (9 cifara)
                    </label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]{9}"
                      maxLength={9}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.pib}
                      onChange={(e) => setFormData({ ...formData, pib: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Puno Ime *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kratko Ime
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.shortName}
                      onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ulica i Broj *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grad *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Poštanski Broj *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontakt Informacije</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platni Uslovi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rok Plaćanja (dana) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.defaultPaymentTerms}
                      onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kreditni Limit (RSD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Popust (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.vatPayer}
                      onChange={(e) => setFormData({ ...formData, vatPayer: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Obveznik PDV-a</span>
                  </label>
                </div>
              </div>

              {/* Napomena */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Napomena
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
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
                  {editingPartner ? 'Sačuvaj Izmene' : 'Kreiraj Partnera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partners;
