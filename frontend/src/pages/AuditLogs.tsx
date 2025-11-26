/**
 * Audit Logs stranica - pregled svih aktivnosti u sistemu
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import axios from 'axios';
import { 
  Shield, 
  Filter, 
  RefreshCw, 
  Search, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Eye,
  X,
  Clock,
  User,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Send,
  Download,
  Upload
} from 'lucide-react';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface Filters {
  action: string;
  entityType: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

// Mapiranje akcija na srpski
const actionLabels: Record<string, string> = {
  LOGIN: 'Prijava',
  LOGOUT: 'Odjava',
  LOGIN_FAILED: 'Neuspešna prijava',
  CREATE: 'Kreiranje',
  UPDATE: 'Izmena',
  DELETE: 'Brisanje',
  SEND: 'Slanje',
  ACCEPT: 'Prihvatanje',
  REJECT: 'Odbijanje',
  CANCEL: 'Otkazivanje',
  EXPORT: 'Izvoz',
  IMPORT: 'Uvoz',
  INVOICE_CREATED: 'Faktura kreirana',
  INVOICE_SENT: 'Faktura poslata',
  INVOICE_ACCEPTED: 'Faktura prihvaćena',
  INVOICE_REJECTED: 'Faktura odbijena',
  INVOICE_CANCELLED: 'Faktura stornirana',
  PAYMENT_CREATED: 'Plaćanje kreirano',
  PAYMENT_MATCHED: 'Plaćanje upareno',
  VAT_SUBMITTED: 'PDV prijavljen',
  PARTNER_CREATED: 'Partner kreiran',
  PRODUCT_CREATED: 'Proizvod kreiran',
  USER_CREATED: 'Korisnik kreiran',
  SETTINGS_UPDATED: 'Podešavanja izmenjena',
  BANK_STATEMENT_IMPORTED: 'Izvod uvezen',
  JOURNAL_ENTRY_POSTED: 'Nalog proknjižen',
  PASSWORD_RESET: 'Reset lozinke',
  API_KEY_GENERATED: 'API ključ generisan',
  WEBHOOK_RECEIVED: 'Webhook primljen'
};

// Mapiranje tipova entiteta na srpski
const entityTypeLabels: Record<string, string> = {
  USER: 'Korisnik',
  INVOICE: 'Faktura',
  PARTNER: 'Partner',
  PRODUCT: 'Proizvod',
  COMPANY: 'Kompanija',
  PAYMENT: 'Plaćanje',
  VAT_RECORD: 'PDV zapis',
  BANK_STATEMENT: 'Bankovni izvod',
  JOURNAL_ENTRY: 'Nalog za knjiženje',
  ACCOUNT: 'Konto',
  CREDIT_NOTE: 'Knjižno odobrenje',
  SETTINGS: 'Podešavanja',
  WEBHOOK: 'Webhook',
  SESSION: 'Sesija'
};

// Boje za akcije
const actionColors: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  LOGIN_FAILED: 'bg-red-100 text-red-800',
  CREATE: 'bg-blue-100 text-blue-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  SEND: 'bg-purple-100 text-purple-800',
  ACCEPT: 'bg-green-100 text-green-800',
  REJECT: 'bg-red-100 text-red-800',
  CANCEL: 'bg-orange-100 text-orange-800',
  EXPORT: 'bg-cyan-100 text-cyan-800',
  IMPORT: 'bg-indigo-100 text-indigo-800'
};

const getActionColor = (action: string): string => {
  for (const [key, value] of Object.entries(actionColors)) {
    if (action.includes(key)) return value;
  }
  return 'bg-gray-100 text-gray-800';
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<Filters>({
    action: '',
    entityType: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch audit logs
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);

      const response = await apiClient.get<AuditLogsResponse>(`/api/audit-logs?${params}`);
      return response.data;
    }
  });

  // Unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    Object.keys(actionLabels).forEach(a => actions.add(a));
    return Array.from(actions).sort();
  }, []);

  // Unique entity types for filter dropdown
  const uniqueEntityTypes = useMemo(() => {
    return Object.keys(entityTypeLabels).sort();
  }, []);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      userId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm:ss', { locale: sr });
    } catch {
      return dateString;
    }
  };

  const renderDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) {
      return <span className="text-gray-400 italic">Nema dodatnih detalja</span>;
    }

    return (
      <div className="space-y-1">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex">
            <span className="text-gray-500 mr-2">{key}:</span>
            <span className="text-gray-900 font-mono text-sm">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Audit Log</h1>
                <p className="text-white/70 mt-1">Pregled svih aktivnosti u sistemu</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  showFilters || hasActiveFilters
                    ? 'bg-white text-slate-900'
                    : 'bg-white/10 backdrop-blur-sm hover:bg-white/20'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filteri
                {hasActiveFilters && (
                  <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full">
                    {Object.values(filters).filter(v => v !== '').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Osveži
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pretraga</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="ID entiteta, korisnik..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Akcija</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
              >
                <option value="">Sve akcije</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>
                    {actionLabels[action] || action}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tip entiteta</label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
              >
                <option value="">Svi tipovi</option>
                {uniqueEntityTypes.map(type => (
                  <option key={type} value={type}>
                    {entityTypeLabels[type] || type}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Datum od</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Datum do</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-4 h-4" />
                Ukloni sve filtere
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-500 rounded-xl text-white">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-500">Ukupno zapisa</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.total.toLocaleString('sr-RS')}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-500">Prikazano</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.logs.length}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-500">Stranica</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{page} / {totalPages || 1}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-500">Po stranici</span>
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="text-xl font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-slate-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Učitavanje audit logova...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-700 font-medium">Greška pri učitavanju audit logova</p>
          <p className="text-red-500 text-sm mt-1">{(error as Error).message}</p>
        </div>
      )}

      {/* Audit Logs Table */}
      {data && data.logs.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vreme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Akcija
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Entitet
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Korisnik
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    IP Adresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Detalji
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.logs.map((log: AuditLog) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/50 cursor-pointer transition-all duration-200"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{formatDateTime(log.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {entityTypeLabels[log.entityType] || log.entityType}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{log.entityId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{log.userName || log.userId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 font-mono">{log.ipAddress}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-1 text-slate-600 hover:text-slate-800 text-sm font-medium">
                        <Eye className="w-4 h-4" />
                        Prikaži
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div className="text-sm text-gray-500">
              Prikazano {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} od {data.total} zapisa
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all duration-200"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Stranica {page} od {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all duration-200"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data && data.logs.length === 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
            <Shield className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">Nema audit logova</p>
          <p className="text-gray-400 text-sm mt-1">
            {hasActiveFilters ? 'Probajte sa drugim filterima' : 'Aktivnosti će se pojaviti ovde'}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-gray-900">Detalji aktivnosti</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-all duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {/* Main Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 uppercase">ID</label>
                    <p className="text-sm text-gray-900 font-mono mt-1">{selectedLog.id}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 uppercase">Vreme</label>
                    <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedLog.createdAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 uppercase">Akcija</label>
                    <p className="mt-1">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                        {actionLabels[selectedLog.action] || selectedLog.action}
                      </span>
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 uppercase">Tip entiteta</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {entityTypeLabels[selectedLog.entityType] || selectedLog.entityType}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="text-xs font-medium text-gray-500 uppercase">ID Entiteta</label>
                  <p className="text-sm text-gray-900 font-mono mt-1">{selectedLog.entityId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 uppercase">Korisnik</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedLog.userName || selectedLog.userId}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 uppercase">IP Adresa</label>
                    <p className="text-sm text-gray-900 font-mono mt-1">{selectedLog.ipAddress}</p>
                  </div>
                </div>

                {selectedLog.userAgent && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 uppercase">User Agent</label>
                    <p className="text-xs text-gray-600 font-mono break-all mt-1">
                      {selectedLog.userAgent}
                    </p>
                  </div>
                )}

                {/* Details */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Detalji</label>
                  <div className="bg-gray-50 rounded-xl p-4">
                    {renderDetails(selectedLog.details)}
                  </div>
                </div>

                {/* Raw JSON */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Raw JSON</label>
                  <pre className="bg-slate-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
