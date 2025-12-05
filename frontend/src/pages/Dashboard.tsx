import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { logger } from '../utils/logger';
import { 
  TrendingUp, 
  ChevronRight, 
  Send, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Plus, 
  FileText,
  ArrowRight
} from 'lucide-react';

interface Activity {
  id: string;
  invoiceNumber: string;
  partnerName: string;
  totalAmount: number;
  createdAt: string;
  status: string;
}

interface ChartData {
  month: string;
  revenue: number;
}

interface OverviewData {
  totalInvoices: number;
  acceptedInvoices: number;
  pendingInvoices: number;
  totalRevenue: number;
  acceptanceRate: number;
  trends: {
    invoices: { value: number; positive: boolean };
    revenue: { value: number; positive: boolean };
  };
}

// Animated counter hook
const useAnimatedCounter = (target: number, duration: number = 1500) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  
  return count;
};

// Modern stat card with glass effect and animations
const StatCard = ({ title, value, subtitle, icon, gradient, trend, delay = 0 }: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: { value: string; positive: boolean };
  delay?: number;
}) => {
  const numericValue = typeof value === 'number' ? value : parseInt(value.replace(/[^0-9]/g, ''));
  const animatedValue = useAnimatedCounter(numericValue);
  const displayValue = typeof value === 'string' && value.includes('M') 
    ? `${(animatedValue / 10).toFixed(1)}M` 
    : animatedValue.toLocaleString('sr-RS');

  return (
    <div 
      className="group relative bg-white/90 backdrop-blur-xl rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background gradient overlay on hover */}
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-black text-gray-900 tracking-tight">{displayValue}</p>
          <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
          {trend && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
              trend.positive 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'bg-red-50 text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${trend.positive ? '' : 'rotate-180'}`} />
              {trend.value}
            </div>
          )}
        </div>
        <div className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          {icon}
        </div>
      </div>
      
      {/* Subtle bottom border gradient */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
    </div>
  );
};

// Timeline activity item with enhanced styling
const ActivityItem = ({ title, time, status, icon, description }: {
  title: string;
  time: string;
  status: 'success' | 'warning' | 'info' | 'error';
  icon: React.ReactNode;
  description?: string;
}) => {
  const statusConfig = {
    success: { bg: 'bg-emerald-500', ring: 'ring-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700', label: 'Uspešno' },
    warning: { bg: 'bg-amber-500', ring: 'ring-amber-100', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700', label: 'Čekanje' },
    info: { bg: 'bg-blue-500', ring: 'ring-blue-100', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-700', label: 'Info' },
    error: { bg: 'bg-red-500', ring: 'ring-red-100', text: 'text-red-700', badge: 'bg-red-50 text-red-700', label: 'Greška' }
  };
  const config = statusConfig[status];

  return (
    <div className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50/80 transition-all duration-300 cursor-pointer">
      <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl ${config.bg} ring-4 ${config.ring} flex items-center justify-center text-white text-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        {icon}
        <span className={`absolute -bottom-1 -right-1 w-4 h-4 ${config.bg} rounded-full border-2 border-white`}></span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{title}</p>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${config.badge}`}>
            {config.label}
          </span>
        </div>
        {description && <p className="text-sm text-gray-500 mb-1">{description}</p>}
        <p className="text-xs text-gray-400 font-medium">{time}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
    </div>
  );
};

// Quick action button component
const QuickActionButton = ({ icon, label, description, gradient, to, primary = false }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  gradient?: string;
  to: string;
  primary?: boolean;
}) => (
  <Link
    to={to}
    className={`group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 overflow-hidden ${
      primary 
        ? `${gradient} text-white shadow-lg hover:shadow-xl hover:-translate-y-1` 
        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:-translate-y-1'
    }`}
  >
    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${primary ? 'bg-white/20' : 'bg-white shadow-sm'} flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="font-semibold">{label}</p>
      <p className={`text-xs ${primary ? 'text-white/80' : 'text-gray-500'}`}>{description}</p>
    </div>
    <ArrowRight className={`w-5 h-5 ${primary ? 'text-white/60' : 'text-gray-400'} group-hover:translate-x-1 transition-transform`} />
  </Link>
);

// System status indicator
const SystemStatus = ({ name, status, description }: {
  name: string;
  status: 'online' | 'warning' | 'offline';
  description: string;
}) => {
  const statusConfig = {
    online: { color: 'bg-emerald-500', pulse: true, text: 'text-emerald-600', label: 'Online' },
    warning: { color: 'bg-amber-500', pulse: false, text: 'text-amber-600', label: 'Upozorenje' },
    offline: { color: 'bg-red-500', pulse: false, text: 'text-red-600', label: 'Offline' }
  };
  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
          {config.pulse && (
            <div className={`absolute inset-0 w-3 h-3 rounded-full ${config.color} animate-ping opacity-75`}></div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <span className={`text-xs font-bold ${config.text}`}>{config.label}</span>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [charts, setCharts] = useState<{ revenueByMonth: ChartData[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, recentRes, chartsRes] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/recent'),
          api.get('/dashboard/charts')
        ]);

        setOverview(overviewRes.data.data);
        setRecentActivity(recentRes.data.data);
        setCharts(chartsRes.data.data);
      } catch (error) {
        logger.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Dobro jutro';
    if (hour < 18) return 'Dobar dan';
    return 'Dobro veče';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Upravo sada';
    if (diffInSeconds < 3600) return `Pre ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Pre ${Math.floor(diffInSeconds / 3600)} sati`;
    return `Pre ${Math.floor(diffInSeconds / 86400)} dana`;
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success';
      case 'SENT': return 'warning';
      case 'DRAFT': return 'info';
      case 'REJECTED': return 'error';
      default: return 'info';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner - Premium Design */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
          
          {/* Floating orbs */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-white/5 rounded-full floating"></div>
          <div className="absolute bottom-10 right-40 w-14 h-14 bg-white/5 rounded-full floating" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-20 right-1/3 w-8 h-8 bg-white/10 rounded-full floating" style={{ animationDelay: '4s' }}></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50"></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Sistem aktivan • {currentTime.toLocaleTimeString('sr-RS')}
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              {greeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Admin</span>! 👋
            </h1>
            <p className="text-xl text-blue-200/80 max-w-xl">
              Upravljajte elektronskim fakturama brzo i efikasno kroz moderan SEF portal.
            </p>
            <div className="flex flex-wrap gap-3 pt-4">
              <Link to="/invoices/new" className="group inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition-all duration-300 shadow-lg shadow-white/25 hover:shadow-xl hover:shadow-white/30 hover:-translate-y-0.5">
                <Plus className="w-5 h-5 text-blue-600" />
                Nova faktura
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/invoices" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3.5 rounded-xl font-bold hover:bg-white/20 transition-all duration-300 border border-white/20">
                <FileText className="w-5 h-5" />
                Pregledaj fakture
              </Link>
            </div>
          </div>
          
          {/* Mini stats in banner */}
          <div className="grid grid-cols-2 gap-4 lg:w-80">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-3xl font-black">{overview?.totalInvoices || 0}</p>
              <p className="text-sm text-blue-200/70">Faktura danas</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <p className="text-3xl font-black text-emerald-400">{overview?.acceptanceRate || 0}%</p>
              <p className="text-sm text-blue-200/70">Prihvaćeno</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards - Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Poslate fakture"
          value={overview?.totalInvoices || 0}
          subtitle="Ovaj mesec"
          icon={<Send className="w-7 h-7" />}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
          trend={overview?.trends?.invoices ? { 
            value: `${overview.trends.invoices.positive ? '+' : ''}${overview.trends.invoices.value}%`, 
            positive: overview.trends.invoices.positive 
          } : undefined}
          delay={100}
        />
        <StatCard
          title="Prihvaćene fakture"
          value={overview?.acceptedInvoices || 0}
          subtitle={`${overview?.acceptanceRate || 0}% stopa prihvatanja`}
          icon={<CheckCircle className="w-7 h-7" />}
          gradient="bg-gradient-to-br from-emerald-500 to-green-500"
          trend={{ value: "+0%", positive: true }} // Backend doesn't provide trend for accepted yet
          delay={200}
        />
        <StatCard
          title="Na čekanju"
          value={overview?.pendingInvoices || 0}
          subtitle="Čeka odluku"
          icon={<Clock className="w-7 h-7" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          trend={{ value: "0%", positive: true }}
          delay={300}
        />
        <StatCard
          title="Ukupan promet"
          value={formatCurrency(overview?.totalRevenue || 0)}
          subtitle="RSD ovaj mesec"
          icon={<DollarSign className="w-7 h-7" />}
          gradient="bg-gradient-to-br from-violet-500 to-purple-500"
          trend={overview?.trends?.revenue ? { 
            value: `${overview.trends.revenue.positive ? '+' : ''}${overview.trends.revenue.value}%`, 
            positive: overview.trends.revenue.positive 
          } : undefined}
          delay={400}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Poslednje aktivnosti</h3>
                <p className="text-sm text-gray-500">Praćenje svih promena u realnom vremenu</p>
              </div>
              <Link to="/audit-logs" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold group">
                Pogledaj sve
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nema nedavnih aktivnosti</div>
              ) : (
                recentActivity.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    title={`Faktura #${activity.invoiceNumber}`}
                    description={`Partner: ${activity.partnerName} • Iznos: ${formatCurrency(activity.totalAmount)}`}
                    time={formatTimeAgo(activity.createdAt)}
                    status={getStatusType(activity.status) as 'success' | 'warning' | 'info' | 'error'}
                    icon={<CheckCircle className="w-5 h-5" />}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Brze akcije</h3>
            <div className="space-y-3">
              <QuickActionButton
                icon={<Plus className="w-6 h-6 text-white" />}
                label="Kreiraj fakturu"
                description="Nova izlazna faktura"
                gradient="bg-gradient-to-r from-blue-600 to-cyan-500"
                to="/invoices/new"
                primary
              />
              <QuickActionButton
                icon="👥"
                label="Dodaj partnera"
                description="Novi kupac ili dobavljač"
                to="/partners"
              />
              <QuickActionButton
                icon="📦"
                label="Dodaj proizvod"
                description="Novi artikal u šifarniku"
                to="/products"
              />
              <QuickActionButton
                icon="📊"
                label="Generiši izveštaj"
                description="Finansijski izveštaji"
                to="/accounting/reports"
              />
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Status sistema</h3>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">Sve u redu</span>
            </div>
            <div className="space-y-1">
              <SystemStatus name="SEF API" status="online" description="demoefaktura.mfin.gov.rs" />
              <SystemStatus name="Baza podataka" status="online" description="PostgreSQL 15" />
              <SystemStatus name="Redis keš" status="online" description="Konekcija aktivna" />
              <SystemStatus name="Backup sistem" status="warning" description="Sledeći za 2h" />
            </div>
          </div>

          {/* Mini Chart Placeholder */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white">
            <h3 className="text-lg font-bold mb-2">Mesečni pregled</h3>
            <p className="text-sm text-slate-400 mb-4">Prihod po mesecima</p>
            <div className="flex items-end justify-between h-24 gap-1">
              {charts?.revenueByMonth ? (
                charts.revenueByMonth.map((item, i) => {
                  const maxRevenue = Math.max(...charts.revenueByMonth.map((r) => r.revenue));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div 
                      key={i} 
                      className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${item.month}: ${formatCurrency(item.revenue)}`}
                    ></div>
                  );
                })
              ) : (
                [40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 95, 70].map((height, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ height: `${height}%` }}
                  ></div>
                ))
              )}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <span>{charts?.revenueByMonth?.[0]?.month || 'Jan'}</span>
              <span>{charts?.revenueByMonth?.[charts.revenueByMonth.length - 1]?.month || 'Dec'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};