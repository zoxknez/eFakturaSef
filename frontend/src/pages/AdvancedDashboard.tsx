import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { LayoutGrid, BarChart3 } from 'lucide-react';
import type { 
  DashboardOverview, 
  DashboardCharts,
  DashboardAlerts, 
  DashboardInvoice,
  SEFHealthStatus 
} from '@sef-app/shared';

// =====================================================
// COMPONENTS
// =====================================================

const StatCard = ({ title, value, subtitle, icon, gradient, trend, onClick }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  gradient: string;
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}) => (
  <div 
    className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 card-hover border border-gray-200/50 cursor-pointer transition-all duration-200 ${onClick ? 'hover:scale-105' : ''}`}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    aria-label={`${title}: ${value}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {typeof value === 'number' ? (
            <AnimatedCounter value={value} />
          ) : (
            value
          )}
        </div>
        <p className="text-sm text-gray-500">{subtitle}</p>
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            <span className="mr-1" aria-hidden="true">{trend.positive ? '↗' : '↘'}</span>
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center text-2xl shadow-lg`} aria-hidden="true">
        {icon}
      </div>
    </div>
  </div>
);

// Dynamic SEF Health Card
const SEFHealthCard = ({ 
  health, 
  loading, 
  onRefresh 
}: { 
  health: SEFHealthStatus | null; 
  loading: boolean;
  onRefresh: () => void;
}) => {
  const formatTimeSince = (isoString: string | null): string => {
    if (!isoString) return 'N/D';
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `Pre ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Pre ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `Pre ${hours}h`;
  };

  const queueTotal = health 
    ? health.queueStats.waiting + health.queueStats.active + health.queueStats.delayed
    : 0;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          {health?.isOnline ? '💚' : '❤️'} Status SEF Sistema
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          health?.environment === 'production' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {health?.environment === 'production' ? 'PRODUKCIJA' : 'DEMO'}
        </span>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                health?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">
                {health?.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Poslednji ping</span>
            <span className="text-sm font-medium">
              {formatTimeSince(health?.lastPingAt || null)}
              {health?.lastPingLatencyMs && (
                <span className="text-gray-400 ml-1">({health.lastPingLatencyMs}ms)</span>
              )}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Greške (24h)</span>
            <span className={`text-sm font-medium ${
              (health?.errors24h || 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {health?.errors24h || 0}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Uspešnost (24h)</span>
            <span className={`text-sm font-medium ${
              (health?.successRate24h || 100) >= 95 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {health?.successRate24h || 100}%
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Queue</span>
            <span className="text-sm font-medium">
              {queueTotal} dokumenata
              {health?.queueStats.failed ? (
                <span className="text-red-500 ml-1">({health.queueStats.failed} neuspešno)</span>
              ) : null}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Retry trend</span>
            <span className={`text-sm font-medium ${
              health?.retryTrend.positive ? 'text-green-600' : 'text-red-600'
            }`}>
              {health?.retryTrend.positive ? '↘' : '↗'} {health?.retryTrend.value || 0}%
            </span>
          </div>
          
          <div className="pt-2 border-t border-gray-100">
            <button 
              onClick={onRefresh}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              🔄 Osveži status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DeadlinesCard = ({ alerts }: { alerts: DashboardAlerts | null }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
      ⏰ Rokovi za odluku
    </h3>
    
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-red-900">Kritični (1-2 dana)</p>
          <p className="text-xs text-red-600">Ulazne fakture</p>
        </div>
        <span className="text-2xl font-bold text-red-600">{alerts?.deadlines?.critical || 0}</span>
      </div>
      
      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-orange-900">Oprez (3-5 dana)</p>
          <p className="text-xs text-orange-600">Ulazne fakture</p>
        </div>
        <span className="text-2xl font-bold text-orange-600">{alerts?.deadlines?.warning || 0}</span>
      </div>
      
      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-yellow-900">Aging poslate</p>
          <p className="text-xs text-yellow-600">Bez finalnog statusa</p>
        </div>
        <span className="text-2xl font-bold text-yellow-600">{alerts?.deadlines?.aging || 0}</span>
      </div>
    </div>
  </div>
);

const ErrorsFeedCard = ({ alerts, navigate }: { alerts: DashboardAlerts | null; navigate: (path: string) => void }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        📊 Upozorenja i stanje
      </h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* Overdue Invoices */}
        {alerts?.overdueInvoices && alerts.overdueInvoices.count > 0 && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start">
              <span className="text-lg mr-3" aria-hidden="true">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  {alerts.overdueInvoices.count} faktura sa isteklim rokom
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Ukupno: {alerts.overdueInvoices.totalAmount.toLocaleString('sr-RS')} RSD
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Products */}
        {alerts?.lowStockProducts && alerts.lowStockProducts.count > 0 && (
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-start">
              <span className="text-lg mr-3" aria-hidden="true">📦</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">
                  {alerts.lowStockProducts.count} proizvoda sa niskim stanjem
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Potrebna dopuna zaliha
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deadlines Summary */}
        {alerts?.deadlines && (alerts.deadlines.critical > 0 || alerts.deadlines.warning > 0) && (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-start">
              <span className="text-lg mr-3" aria-hidden="true">⏰</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  {alerts.deadlines.critical + alerts.deadlines.warning} faktura zahteva odluku
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  {alerts.deadlines.critical} kritični, {alerts.deadlines.warning} oprez
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All Clear */}
        {(!alerts || (
          alerts.overdueInvoices?.count === 0 && 
          alerts.lowStockProducts?.count === 0 && 
          alerts.deadlines?.critical === 0 && 
          alerts.deadlines?.warning === 0
        )) && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
            <span className="text-3xl" aria-hidden="true">✅</span>
            <p className="text-sm font-medium text-green-900 mt-2">Sve je u redu!</p>
            <p className="text-xs text-green-600">Nema upozorenja</p>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => navigate('/accounting/reports')} 
        className="w-full mt-4 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
      >
        📋 Detaljni izveštaj
      </button>
    </div>
  );
};

// Simple Mini Bar Chart for revenue
const MiniBarChart = ({ data }: { data: DashboardCharts['revenueByMonth'] }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
      <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Prihod (12 meseci)</h3>
      <div className="flex items-end justify-between h-32 gap-1">
        {data.map((item, index) => {
          const height = (item.revenue / maxRevenue) * 100;
          const monthName = new Date(item.month + '-01').toLocaleDateString('sr-RS', { month: 'short' });
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all hover:from-blue-600 hover:to-cyan-500"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${monthName}: ${item.revenue.toLocaleString('sr-RS')} RSD`}
              />
              <span className="text-[10px] text-gray-500 mt-1 rotate-[-45deg] origin-top-left">
                {monthName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Status Pie Chart (simple CSS version)
const StatusChart = ({ data }: { data: DashboardCharts['invoicesByStatus'] }) => {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  
  const statusLabels: Record<string, string> = {
    'DRAFT': 'Nacrt',
    'SENT': 'Poslato',
    'DELIVERED': 'Isporučeno',
    'ACCEPTED': 'Prihvaćeno',
    'REJECTED': 'Odbijeno',
    'CANCELLED': 'Otkazano',
    'STORNO': 'Stornirano',
    'EXPIRED': 'Isteklo'
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
      <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Status faktura</h3>
      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{statusLabels[item.status] || item.status}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

// Auto-refresh intervals in seconds
const REFRESH_INTERVALS = [
  { label: 'Isključeno', value: 0 },
  { label: '30 sekundi', value: 30 },
  { label: '1 minut', value: 60 },
  { label: '5 minuta', value: 300 },
];

export const AdvancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(60); // Default: 1 minute

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<DashboardInvoice[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null);
  const [sefHealth, setSefHealth] = useState<SEFHealthStatus | null>(null);
  const [sefHealthLoading, setSefHealthLoading] = useState(false);

  // Saved searches from localStorage
  const [savedSearches, setSavedSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_saved_searches');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch SEF Health
  const fetchSEFHealth = useCallback(async (refresh = false) => {
    setSefHealthLoading(true);
    try {
      const res = refresh 
        ? await api.refreshSEFHealth()
        : await api.getSEFHealth();
      if (res.success && res.data) {
        setSefHealth(res.data);
      }
    } catch (err) {
      logger.error('Failed to fetch SEF health', err);
    } finally {
      setSefHealthLoading(false);
    }
  }, []);

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [overviewRes, chartsRes, recentRes, alertsRes] = await Promise.all([
        api.getDashboardOverview(),
        api.getDashboardCharts(),
        api.getDashboardRecent(10),
        api.getDashboardAlerts()
      ]);

      if (overviewRes?.success && overviewRes.data) {
        setOverview(overviewRes.data);
      } else {
        logger.error('Failed to fetch overview', overviewRes?.error);
      }

      if (chartsRes?.success && chartsRes.data) {
        setCharts(chartsRes.data);
      } else {
        logger.error('Failed to fetch charts', chartsRes?.error);
      }

      if (recentRes?.success) {
        setRecentInvoices(recentRes.data || []);
      } else {
        logger.error('Failed to fetch recent invoices', recentRes?.error);
      }

      if (alertsRes?.success && alertsRes.data) {
        setAlerts(alertsRes.data);
      } else {
        logger.error('Failed to fetch alerts', alertsRes?.error);
      }
    } catch (err: unknown) {
      logger.error('Dashboard data fetch error', err);
      setError('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    fetchSEFHealth();
  }, [fetchDashboardData, fetchSEFHealth]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchDashboardData();
      fetchSEFHealth();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchDashboardData, fetchSEFHealth]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    
    // Parse search query and navigate to invoices with filters
    const params = new URLSearchParams();
    
    // Parse operators from search query
    const parts = searchQuery.split(/\s+/);
    parts.forEach(part => {
      if (part.includes(':')) {
        const [key, value] = part.split(':');
        const keyLower = key.toLowerCase();
        
        if (keyLower === 'broj' || keyLower === 'number') {
          params.set('invoiceNumber', value);
        } else if (keyLower === 'pib') {
          params.set('buyerPIB', value);
        } else if (keyLower === 'status') {
          params.set('status', value.toUpperCase());
        } else if (keyLower === 'datum' || keyLower === 'date') {
          params.set('dateFrom', value);
        } else if (keyLower === 'iznos' || keyLower === 'amount') {
          if (value.startsWith('>')) {
            params.set('minAmount', value.substring(1));
          } else if (value.startsWith('<')) {
            params.set('maxAmount', value.substring(1));
          }
        }
      } else if (part.trim()) {
        // General search term
        params.set('search', part);
      }
    });
    
    navigate(`/invoices?${params.toString()}`);
  }, [searchQuery, navigate]);

  // Save search
  const saveCurrentSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    if (savedSearches.includes(searchQuery)) return;
    
    const newSearches = [searchQuery, ...savedSearches].slice(0, 10);
    setSavedSearches(newSearches);
    localStorage.setItem('dashboard_saved_searches', JSON.stringify(newSearches));
  }, [searchQuery, savedSearches]);

  // Remove saved search
  const removeSavedSearch = useCallback((searchToRemove: string) => {
    const newSearches = savedSearches.filter(s => s !== searchToRemove);
    setSavedSearches(newSearches);
    localStorage.setItem('dashboard_saved_searches', JSON.stringify(newSearches));
  }, [savedSearches]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  // Loading state
  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Učitavam dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Greška pri učitavanju</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Pokušaj ponovo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating elements */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-2xl rotate-12 floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-xl -rotate-12 floating" style={{ animationDelay: '2s' }}></div>
          
          {/* Dashboard grid pattern */}
          <div className="absolute top-8 right-16 opacity-10">
            <LayoutGrid className="w-24 h-24" />
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <BarChart3 className="w-4 h-4" />
              Napredni dashboard • Multi-company
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              📊 Napredni Dashboard
            </h1>
            <p className="text-xl text-purple-100 max-w-xl">
              Detaljna analitika, SEF health monitoring i napredna pretraga faktura.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Auto-refresh selector */}
            <select 
              value={autoRefreshInterval} 
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
              aria-label="Auto-refresh interval"
            >
              {REFRESH_INTERVALS.map(interval => (
                <option key={interval.value} value={interval.value} className="text-gray-900">
                  ⏱️ {interval.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                fetchDashboardData();
                fetchSEFHealth();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all disabled:opacity-50"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              Osveži
            </button>

            {/* Environment badge from SEF health */}
            <div className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center ${
              sefHealth?.environment === 'production'
                ? 'bg-emerald-500 text-white' 
                : 'bg-orange-500 text-white'
            }`}>
              <div className="w-2 h-2 rounded-full mr-2 animate-pulse bg-white"></div>
              {sefHealth?.environment === 'production' ? 'PRODUKCIJA' : 'DEMO'}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          🔍 Napredna pretraga
        </h2>
        
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="broj:2024-001 PIB:12345678 status:poslato datum:2024-10 iznos:>50000"
              className="w-full px-4 py-3 pl-12 pr-24 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              aria-label="Pretraga faktura"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" aria-hidden="true">
              🔍
            </div>
            <button 
              onClick={handleSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Pretraži
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Snimljene pretrage:</span>
            {savedSearches.length === 0 && (
              <span className="text-sm text-gray-400 italic">Nema sačuvanih pretraga</span>
            )}
            {savedSearches.map((search, index) => (
              <div key={index} className="group relative inline-flex items-center">
                <button
                  onClick={() => setSearchQuery(search)}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors pr-7"
                >
                  {search}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSavedSearch(search);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-blue-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Ukloni pretragu"
                >
                  ×
                </button>
              </div>
            ))}
            {searchQuery.trim() && !savedSearches.includes(searchQuery) && (
              <button 
                onClick={saveCurrentSearch}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
              >
                + Sačuvaj pretragu
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Operatori:</span>
            <code className="bg-gray-100 px-2 py-1 rounded">broj:123</code>
            <code className="bg-gray-100 px-2 py-1 rounded">PIB:12345678</code>
            <code className="bg-gray-100 px-2 py-1 rounded">status:poslato</code>
            <code className="bg-gray-100 px-2 py-1 rounded">iznos:&gt;50000</code>
            <code className="bg-gray-100 px-2 py-1 rounded">datum:2024-10</code>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Poslate fakture"
          value={overview?.totalInvoices || 0}
          subtitle="Ovaj mesec"
          icon="📤"
          gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          trend={overview?.trends?.invoices}
          onClick={() => navigate('/invoices?status=SENT')}
        />
        
        <StatCard
          title="Prihvaćene fakture"
          value={overview?.acceptedInvoices || 0}
          subtitle={`${overview?.acceptanceRate || 0}% stopa prihvatanja`}
          icon="✅"
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          trend={overview?.trends?.revenue}
          onClick={() => navigate('/invoices?status=ACCEPTED')}
        />
        
        <StatCard
          title="Na čekanju"
          value={overview?.pendingInvoices || 0}
          subtitle="Čeka odluku"
          icon="⏳"
          gradient="bg-gradient-to-r from-yellow-500 to-orange-500"
          onClick={() => navigate('/invoices?status=SENT')}
        />
        
        <StatCard
          title="Ukupan promet"
          value={overview?.totalRevenue ? `${formatCurrency(overview.totalRevenue / 1000)}K` : '0'}
          subtitle="RSD ovaj mesec"
          icon="💰"
          gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          trend={overview?.trends?.revenue}
          onClick={() => navigate('/accounting/reports')}
        />
      </div>

      {/* Charts Section */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MiniBarChart data={charts.revenueByMonth} />
          <StatusChart data={charts.invoicesByStatus} />
        </div>
      )}

      {/* Recent Invoices */}
      {recentInvoices.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">📋 Poslednje fakture</h3>
            <button 
              onClick={() => navigate('/invoices')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Prikaži sve →
            </button>
          </div>
          
          <div className="space-y-3">
            {recentInvoices.slice(0, 5).map((invoice) => (
              <div 
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer gap-4 sm:gap-0"
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">{invoice.type === 'OUTGOING' ? '📤' : '📥'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {invoice.invoiceNumber}
                      </p>
                      {invoice.hasPartner ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ✅ Šifarnik
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          📝 Ručno
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{invoice.partnerName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-4 flex-shrink-0 w-full sm:w-auto">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.totalAmount)} {invoice.currency}</p>
                    <p className="text-xs text-gray-500">{new Date(invoice.createdAt).toLocaleDateString('sr-RS')}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                    invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                    invoice.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status === 'ACCEPTED' ? 'Prihvaćeno' :
                     invoice.status === 'SENT' ? 'Poslato' :
                     invoice.status === 'DRAFT' ? 'Nacrt' :
                     invoice.status === 'REJECTED' ? 'Odbijeno' :
                     invoice.status === 'CANCELLED' ? 'Stornirano' :
                     invoice.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <SEFHealthCard 
            health={sefHealth} 
            loading={sefHealthLoading} 
            onRefresh={() => fetchSEFHealth(true)} 
          />
          <ErrorsFeedCard alerts={alerts} navigate={navigate} />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <DeadlinesCard alerts={alerts} />
          
          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ Brze akcije</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/invoices/new')}
                className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <span className="flex items-center text-blue-900 font-medium">
                  🆕 Kreiraj fakturu
                </span>
                <span className="text-blue-600">→</span>
              </button>
              
              <button 
                onClick={() => navigate('/accounting/reports')}
                className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
              >
                <span className="flex items-center text-green-900 font-medium">
                  📊 Generiši izveštaj
                </span>
                <span className="text-green-600">→</span>
              </button>
              
              <button 
                onClick={() => navigate('/settings')}
                className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
              >
                <span className="flex items-center text-purple-900 font-medium">
                  ⚙️ Podešavanja
                </span>
                <span className="text-purple-600">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Keyboard shortcuts hint */}
      <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>💡 Korisni saveti:</span>
          <div className="flex space-x-4">
            <span><kbd className="bg-white px-2 py-1 rounded border">/</kbd> fokusira pretragu</span>
            <span><kbd className="bg-white px-2 py-1 rounded border">A</kbd> prihvati</span>
            <span><kbd className="bg-white px-2 py-1 rounded border">R</kbd> odbij</span>
            <span><kbd className="bg-white px-2 py-1 rounded border">N</kbd> nova faktura</span>
          </div>
        </div>
      </div>
    </div>
  );
};