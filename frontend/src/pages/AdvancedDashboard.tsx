import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';

const StatCard = ({ title, value, subtitle, icon, gradient, trend, onClick }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  gradient: string;
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
}) => (
  <div 
    className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 card-hover border border-gray-200/50 cursor-pointer transition-all duration-200 ${onClick ? 'hover:scale-105' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            <span className="mr-1">{trend.positive ? '↗' : '↘'}</span>
            {trend.value}
          </div>
        )}
      </div>
      <div className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center text-2xl shadow-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

const SEFHealthCard = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
      💚 SEF Health Status
    </h3>
    
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Poslednji ping</span>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-sm font-medium">Pre 30s</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Greške (24h)</span>
        <span className="text-sm font-medium text-red-600">2</span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Queue veličina</span>
        <span className="text-sm font-medium">5 dokumenata</span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Retry trend</span>
        <span className="text-sm font-medium text-green-600">↘ -15%</span>
      </div>
      
      <div className="pt-2 border-t border-gray-100">
        <button className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">
          🔍 Detaljni status
        </button>
      </div>
    </div>
  </div>
);

const DeadlinesCard = ({ alerts }: { alerts: any }) => (
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

const ErrorsFeedCard = ({ alerts }: { alerts: any }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        📊 Upozorenja i stanje
      </h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* Overdue Invoices */}
        {alerts?.overdueInvoices?.count > 0 && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start">
              <span className="text-lg mr-3">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  {alerts.overdueInvoices.count} faktura sa isteklim rokom
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Ukupno: {alerts.overdueInvoices.items.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0).toLocaleString('sr-RS')} RSD
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Products */}
        {alerts?.lowStockProducts?.count > 0 && (
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-start">
              <span className="text-lg mr-3">📦</span>
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
              <span className="text-lg mr-3">⏰</span>
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
            <span className="text-3xl">✅</span>
            <p className="text-sm font-medium text-green-900 mt-2">Sve je u redu!</p>
            <p className="text-xs text-green-600">Nema upozorenja</p>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => window.location.href = '/reports'} 
        className="w-full mt-4 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
      >
        📋 Detaljni izveštaj
      </button>
    </div>
  );
};

export const AdvancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('Primer d.o.o. (12345678)');
  const [savedSearches] = useState([
    'Odbijene fakture danas',
    'Visoki iznosi > 100000',
    'PIB: 12345678',
    'Status: na_čekanju'
  ]);

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [overviewRes, recentRes, alertsRes] = await Promise.all([
        api.getDashboardOverview(),
        api.getDashboardRecent(10),
        api.getDashboardAlerts()
      ]);

      if (overviewRes?.success) {
        setOverview(overviewRes.data);
      } else {
        logger.error('Failed to fetch overview', overviewRes?.error);
      }

      if (recentRes?.success) {
        setRecentInvoices(recentRes.data || []);
      } else {
        logger.error('Failed to fetch recent invoices', recentRes?.error);
      }

      if (alertsRes?.success) {
        setAlerts(alertsRes.data);
      } else {
        logger.error('Failed to fetch alerts', alertsRes?.error);
      }
    } catch (err: any) {
      logger.error('Dashboard data fetch error', err);
      setError('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

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
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/>
            </svg>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
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
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              <option className="text-gray-900">Primer d.o.o. (12345678)</option>
              <option className="text-gray-900">Test Company (87654321)</option>
              <option className="text-gray-900">ABC d.o.o. (11111111)</option>
            </select>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition-all disabled:opacity-50"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              Osveži
            </button>
            <div className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center ${
              isDemoMode 
                ? 'bg-orange-500 text-white' 
                : 'bg-emerald-500 text-white'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 animate-pulse bg-white`}></div>
              {isDemoMode ? 'DEMO' : 'PRODUKCIJA'}
            </div>
            <button 
              onClick={() => setIsDemoMode(!isDemoMode)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              🔄 Promeni okruženje
            </button>
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
              placeholder="broj:2024-001 PIB:12345678 status:poslato datum:2024-10 iznos:>50000 changed:2024-10-01"
              className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
              Pretraži
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Snimljene pretrage:</span>
            {savedSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => setSearchQuery(search)}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
              >
                {search}
              </button>
            ))}
            <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors">
              + Sačuvaj pretragu
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Operatori:</span>
            <code className="bg-gray-100 px-2 py-1 rounded">broj:123</code>
            <code className="bg-gray-100 px-2 py-1 rounded">PIB:12345678</code>
            <code className="bg-gray-100 px-2 py-1 rounded">status:poslato</code>
            <code className="bg-gray-100 px-2 py-1 rounded">iznos:&gt;50000</code>
            <code className="bg-gray-100 px-2 py-1 rounded">datum:2024-10</code>
            <code className="bg-gray-100 px-2 py-1 rounded">changed:2024-10-01</code>
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
          trend={overview?.trends?.invoices ? { 
            value: `${overview.trends.invoices.value}%`, 
            positive: overview.trends.invoices.positive 
          } : undefined}
          onClick={() => navigate('/invoices?status=SENT')}
        />
        
        <StatCard
          title="Prihvaćene fakture"
          value={overview?.acceptedInvoices || 0}
          subtitle={`${overview?.acceptanceRate || 0}% stopa prihvatanja`}
          icon="✅"
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          trend={overview?.trends?.revenue ? { 
            value: `${overview.trends.revenue.value}%`, 
            positive: overview.trends.revenue.positive 
          } : undefined}
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
          trend={overview?.trends?.revenue ? { 
            value: `${overview.trends.revenue.value}%`, 
            positive: overview.trends.revenue.positive 
          } : undefined}
          onClick={() => navigate('/reports')}
        />
      </div>

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
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
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
                <div className="flex items-center space-x-4 flex-shrink-0">
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
                    {invoice.status}
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
          <SEFHealthCard />
          <ErrorsFeedCard alerts={alerts} />
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
                onClick={() => navigate('/reports')}
                className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
              >
                <span className="flex items-center text-green-900 font-medium">
                  📊 Generisi izveštaj
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