import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';
import ImportModal from '../components/ImportModal';
import ExportModal from '../components/ExportModal';
import { useToast } from '../contexts/ToastContext';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { useDebounce } from '../hooks/useDebounce';
import type { PartnerListItem, CreatePartnerDTO, PartnerType } from '@sef-app/shared';
import {
  Users,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  Plus,
  Upload,
  Download,
  Search,
  Edit2,
  Trash2,
  Mail,
  Phone,
  LayoutGrid,
  List,
  CheckCircle,
  UserPlus,
  Building2,
  MapPin,
  DollarSign,
  FileText
} from 'lucide-react';

// Use Partner type from shared (alias for backward compatibility)
type Partner = PartnerListItem;

// Extended pagination response with optional summary
interface PartnerPaginatedResponse {
  data: Partner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages?: number; // Alias for pages
  };
  summary?: {
    total: number;
    buyers: number;
    suppliers: number;
    both: number;
    active: number;
  };
}

interface PartnerParams {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  isActive?: string;
}

// Use CreatePartnerDTO from shared (extended locally for payload)
type PartnerPayload = CreatePartnerDTO;

// Type config for badges and icons
const typeConfig = {
  BUYER: { 
    label: 'Kupac', 
    icon: <ShoppingCart className="w-4 h-4" />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  SUPPLIER: { 
    label: 'Dobavljač', 
    icon: <Package className="w-4 h-4" />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  BOTH: { 
    label: 'Kupac/Dobavljač', 
    icon: <ArrowLeftRight className="w-4 h-4" />,
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200'
  }
};

// Partner Card Component
const PartnerCard = ({ partner, onEdit, onDelete }: { partner: Partner; onEdit: () => void; onDelete: () => void }) => {
  const config = typeConfig[partner.type];
  
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden">
      {/* Header with gradient */}
      <div className={`relative px-5 py-4 ${config.bg} border-b ${config.border}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 ${config.text} text-xs font-bold`}>
            {config.icon}
            {config.label}
          </div>
          {!partner.isActive && (
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">
              Neaktivan
            </span>
          )}
        </div>
      </div>
      
      {/* Body */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
          {partner.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">PIB: {partner.pib}</span>
          <span className="text-gray-300">•</span>
          <span>{partner.city}</span>
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-gray-900">{partner._count?.invoices || 0}</p>
            <p className="text-xs text-gray-500">Faktura</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-gray-900">{partner.defaultPaymentTerms}d</p>
            <p className="text-xs text-gray-500">Rok</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <p className="text-lg font-bold text-gray-900">{partner.discount || 0}%</p>
            <p className="text-xs text-gray-500">Popust</p>
          </div>
        </div>
        
        {/* Contact info */}
        <div className="space-y-2 mb-4">
          {partner.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{partner.email}</span>
            </div>
          )}
          {partner.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{partner.phone}</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-xl font-medium text-sm transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Izmeni
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center p-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Partners: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [serverStats, setServerStats] = useState<{ buyers: number; suppliers: number; both: number; active: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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
  }, [currentPage, debouncedSearchTerm, typeFilter, statusFilter]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params: PartnerParams = {
        page: currentPage,
        limit: 12,
      };
      
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.isActive = statusFilter;

      const response = await api.getPartners(params);
      
      if (response.success && response.data) {
        // Cast to our extended type
        const data = response.data as unknown as PartnerPaginatedResponse;
        setPartners(data.data);
        setTotalPages(data.pagination.pages);
        setTotalCount(data.pagination.total || 0);
        // Capture server stats if available
        if (data.summary) {
          setServerStats(data.summary);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch partners', error);
      toast.error('Greška pri učitavanju', 'Nije moguće učitati listu partnera. Molimo pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      const payload: PartnerPayload = {
        ...formData,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
      };

      let response;
      if (editingPartner) {
        response = await api.updatePartner(editingPartner.id, payload);
        if (response.success) {
          toast.success('Partner ažuriran', 'Partner je uspešno ažuriran.');
        }
      } else {
        response = await api.createPartner(payload);
        if (response.success) {
          toast.success('Partner kreiran', 'Partner je uspešno kreiran.');
        }
      }

      if (!response.success) {
        toast.error('Greška pri čuvanju', response.error || 'Nije moguće sačuvati partnera.');
        return;
      }

      setShowModal(false);
      resetForm();
      fetchPartners();
    } catch (error: unknown) {
      logger.error('Failed to save partner', error);
      toast.error('Greška pri čuvanju', 'Došlo je do greške prilikom čuvanja partnera.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    confirm({
      title: 'Obriši partnera',
      message: 'Da li ste sigurni da želite da obrišete ovog partnera? Ova akcija se ne može poništiti.',
      confirmText: 'Obriši',
      cancelText: 'Otkaži',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.deletePartner(id);
          
          if (response.success) {
            toast.success('Partner obrisan', 'Partner je uspešno obrisan.');
            fetchPartners();
          } else {
            toast.error('Greška pri brisanju', response.error || 'Nije moguće obrisati partnera.');
          }
        } catch (error: unknown) {
          logger.error('Failed to delete partner', error);
          toast.error('Greška pri brisanju', 'Došlo je do greške prilikom brisanja partnera.');
        }
      }
    });
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

  // Stats calculations - use server stats when available, fallback to local calculation
  const stats = {
    total: totalCount,
    buyers: serverStats?.buyers ?? partners.filter(p => p.type === 'BUYER').length,
    suppliers: serverStats?.suppliers ?? partners.filter(p => p.type === 'SUPPLIER').length,
    active: serverStats?.active ?? partners.filter(p => p.isActive).length,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-full floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-full floating" style={{ animationDelay: '2s' }}></div>
          
          {/* People icons pattern */}
          <div className="absolute top-8 right-16 opacity-10">
            <Users className="w-24 h-24" />
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <Users className="w-4 h-4" />
              Kupci i dobavljači • CRM
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Partneri
            </h1>
            <p className="text-xl text-emerald-100 max-w-xl">
              Upravljajte poslovnim partnerima, pratite kreditne limite i istoriju saradnje.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              <Upload className="w-5 h-5" />
              Uvoz
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              <Download className="w-5 h-5" />
              Izvoz
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-5 h-5" />
              Novi partner
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ukupno partnera</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Kupci</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.buyers}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Dobavljači</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.suppliers}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Aktivni</p>
              <p className="text-3xl font-bold text-violet-600 mt-1">{stats.active}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-violet-600" />
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
                placeholder="Pretraži po imenu, PIB-u, email-u..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white min-w-[160px]"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Svi tipovi</option>
            <option value="BUYER">Kupci</option>
            <option value="SUPPLIER">Dobavljači</option>
            <option value="BOTH">Kupci i Dobavljači</option>
          </select>

          {/* Status Filter */}
          <select
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white min-w-[140px]"
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

      {/* Partners List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-500">Učitavanje partnera...</p>
          </div>
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Nema pronađenih partnera</h3>
          <p className="text-gray-500 mb-6">Počnite dodavanjem vašeg prvog poslovnog partnera.</p>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            Dodaj prvog partnera
          </button>
        </div>
      ) : (
        <>
          {/* Mobile View - Always Cards */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {partners.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                onEdit={() => openEditModal(partner)}
                onDelete={() => handleDelete(partner.id)}
              />
            ))}
          </div>

          {/* Desktop View - Respects viewMode */}
          <div className="hidden md:block">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {partners.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onEdit={() => openEditModal(partner)}
                    onDelete={() => handleDelete(partner.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Partner</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tip</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kontakt</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Uslovi</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fakture</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {partners.map((partner) => {
                      const config = typeConfig[partner.type];
                      return (
                        <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{partner.name}</p>
                              <p className="text-sm text-gray-500">PIB: {partner.pib} • {partner.city}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${config.bg} ${config.text}`}>
                              {config.icon}
                              {config.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <p>{partner.email || '-'}</p>
                            <p className="text-gray-400">{partner.phone || '-'}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <p>{partner.defaultPaymentTerms} dana</p>
                            {partner.discount ? <p className="text-emerald-600">Popust: {partner.discount}%</p> : null}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-900">{partner._count?.invoices || 0}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditModal(partner)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleDelete(partner.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Prikazano <span className="font-semibold text-gray-900">{partners.length}</span> od <span className="font-semibold text-gray-900">{totalCount}</span> partnera
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  {editingPartner ? (
                    <Edit2 className="w-6 h-6 text-white" />
                  ) : (
                    <UserPlus className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingPartner ? 'Izmeni Partnera' : 'Novi Partner'}
                  </h2>
                  <p className="text-white/70 text-sm">Popunite podatke o poslovnom partneru</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Partner Type Selection */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Tip Partnera
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'BUYER' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.type === 'BUYER'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.type === 'BUYER' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <span className="font-semibold">Kupac</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'SUPPLIER' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.type === 'SUPPLIER'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.type === 'SUPPLIER' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="font-semibold">Dobavljač</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'BOTH' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.type === 'BOTH'
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.type === 'BOTH' ? 'bg-violet-100' : 'bg-gray-100'}`}>
                        <ArrowLeftRight className="w-5 h-5" />
                      </div>
                      <span className="font-semibold">Oba</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Osnovni Podaci
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">PIB * (9 cifara)</label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]{9}"
                      maxLength={9}
                      placeholder="123456789"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                      value={formData.pib}
                      onChange={(e) => setFormData({ ...formData, pib: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kratko Ime</label>
                    <input
                      type="text"
                      placeholder="Skraćenica"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.shortName}
                      onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Puno Ime Firme *</label>
                    <input
                      type="text"
                      required
                      placeholder="Naziv pravnog lica"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Adresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ulica i Broj *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ulica i kućni broj"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Grad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Beograd"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Poštanski Broj *</label>
                    <input
                      type="text"
                      required
                      placeholder="11000"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Država</label>
                    <select
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    >
                      <option value="RS">🇷🇸 Srbija</option>
                      <option value="ME">🇲🇪 Crna Gora</option>
                      <option value="BA">🇧🇦 BiH</option>
                      <option value="HR">🇭🇷 Hrvatska</option>
                      <option value="SI">🇸🇮 Slovenija</option>
                      <option value="MK">🇲🇰 S. Makedonija</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-600" />
                  Kontakt Informacije
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="office@firma.rs"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
                    <input
                      type="tel"
                      placeholder="+381 11 123 4567"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Platni Uslovi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Rok Plaćanja *</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-14"
                        value={formData.defaultPaymentTerms}
                        onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: parseInt(e.target.value) || 0 })}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">dana</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kreditni Limit</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-14"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">RSD</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Popust</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-10"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      checked={formData.vatPayer}
                      onChange={(e) => setFormData({ ...formData, vatPayer: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-gray-700">Obveznik PDV-a</span>
                  </label>
                </div>
              </div>

              {/* Note */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Napomena
                </h3>
                <textarea
                  rows={3}
                  placeholder="Dodatne informacije o partneru..."
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Čuvanje...' : (editingPartner ? 'Sačuvaj Izmene' : 'Kreiraj Partnera')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        importType="partners"
        onSuccess={() => {
          setShowImportModal(false);
          fetchPartners();
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportType="partners"
        title="Izvoz partnera"
      />

      {/* Confirm Dialog */}
      {ConfirmDialog}
    </div>
  );
};

export default Partners;
