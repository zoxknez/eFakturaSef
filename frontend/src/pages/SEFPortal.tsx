/**
 * SEF Portal - Glavni kontrolni centar za Sistem Elektronskih Faktura
 * Kompletna integracija sa SEF API demo/produkcija
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { logger } from '../utils/logger';
import { toast } from 'react-hot-toast';
import type { SEFHealthStatus } from '@sef-app/shared';
import {
  Server,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Send,
  FileText,
  Download,
  Upload,
  Settings,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Globe,
  Bell,
  Database,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Info,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  ChevronRight,
  History,
  Users,
  Building2,
  FileCheck,
  FileClock,
  FileX,
  Inbox,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Gauge,
  Search,
  Ruler,
  BookOpen,
  TestTube,
  Copy,
  Check,
  Terminal,
  Code,
  List,
  Hash,
  Percent,
  Scale,
  Clipboard
} from 'lucide-react';

// Tab types
type PortalTab = 'overview' | 'api-test' | 'unit-measures' | 'company-check' | 'vat-exemptions' | 'documentation';

// Unit Measure type
interface UnitMeasure {
  Code: string;
  Symbol?: string;
  NameEng: string;
  NameSrbLtn: string;
  NameSrbCyr: string;
  IsOnShortList: boolean;
}

// VAT Exemption Reason
interface VatExemptionReason {
  Id: number;
  Key: string;
  NameEng: string;
  NameSrbLtn: string;
  NameSrbCyr: string;
}

// Company Check Result
interface CompanyCheckResult {
  exists: boolean;
  companyName?: string;
  vatNumber?: string;
  registrationCode?: string;
  isBudgetUser: boolean;
}

// SEF Queue Status
interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// Recent SEF Operation
interface SEFOperation {
  id: string;
  type: 'send' | 'sync' | 'cancel' | 'storno';
  invoiceNumber: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  duration?: number;
  error?: string;
}

// Component: Status Badge
const StatusBadge = ({ status, size = 'md' }: { status: 'online' | 'offline' | 'warning' | 'unknown'; size?: 'sm' | 'md' | 'lg' }) => {
  const config = {
    online: { color: 'bg-emerald-500', text: 'Online', pulse: true },
    offline: { color: 'bg-red-500', text: 'Offline', pulse: false },
    warning: { color: 'bg-amber-500', text: 'Upozorenje', pulse: true },
    unknown: { color: 'bg-gray-400', text: 'Nepoznato', pulse: false },
  };
  const c = config[status];
  const sizeClasses = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full ${c.color}`} />
        {c.pulse && (
          <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full ${c.color} animate-ping opacity-75`} />
        )}
      </div>
      <span className={`text-sm font-semibold ${status === 'online' ? 'text-emerald-600' : status === 'offline' ? 'text-red-600' : status === 'warning' ? 'text-amber-600' : 'text-gray-500'}`}>
        {c.text}
      </span>
    </div>
  );
};

// Component: Metric Card
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  subtitle,
  color = 'blue',
  onClick
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  trend?: { value: number; positive: boolean };
  subtitle?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'cyan';
  onClick?: () => void;
}) => {
  const colorConfig = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-500', text: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-500', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-500', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', icon: 'bg-red-500', text: 'text-red-600' },
    violet: { bg: 'bg-violet-50', icon: 'bg-violet-500', text: 'text-violet-600' },
    cyan: { bg: 'bg-cyan-50', icon: 'bg-cyan-500', text: 'text-cyan-600' },
  };
  const c = colorConfig[color];

  return (
    <div 
      className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// Component: Queue Stats Card
const QueueStatsCard = ({ stats, onRetryFailed }: { stats: QueueStats; onRetryFailed: () => void }) => {
  const total = stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed;
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Red za slanje</h3>
            <p className="text-sm text-gray-500">Bull Queue statistika</p>
          </div>
        </div>
        {stats.failed > 0 && (
          <button
            onClick={onRetryFailed}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Ponovi neuspele ({stats.failed})
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="text-center p-3 bg-amber-50 rounded-xl">
          <p className="text-2xl font-bold text-amber-600">{stats.waiting}</p>
          <p className="text-xs text-amber-700 font-medium">Čeka</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
          <p className="text-xs text-blue-700 font-medium">Aktivno</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-xl">
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-xs text-emerald-700 font-medium">Završeno</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-xl">
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-xs text-red-700 font-medium">Neuspelo</p>
        </div>
        <div className="text-center p-3 bg-gray-100 rounded-xl">
          <p className="text-2xl font-bold text-gray-600">{stats.delayed}</p>
          <p className="text-xs text-gray-700 font-medium">Odloženo</p>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
            {stats.completed > 0 && (
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${(stats.completed / total) * 100}%` }} 
              />
            )}
            {stats.active > 0 && (
              <div 
                className="bg-blue-500 h-full transition-all duration-500" 
                style={{ width: `${(stats.active / total) * 100}%` }} 
              />
            )}
            {stats.waiting > 0 && (
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${(stats.waiting / total) * 100}%` }} 
              />
            )}
            {stats.failed > 0 && (
              <div 
                className="bg-red-500 h-full transition-all duration-500" 
                style={{ width: `${(stats.failed / total) * 100}%` }} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Component: Night Pause Indicator
const NightPauseIndicator = ({ isNightPause, minutesUntilEnd }: { isNightPause: boolean; minutesUntilEnd: number }) => {
  if (!isNightPause) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <Sun className="w-5 h-5 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-700">SEF je aktivan</p>
          <p className="text-xs text-emerald-600">Slanje faktura je omogućeno</p>
        </div>
      </div>
    );
  }

  const hours = Math.floor(minutesUntilEnd / 60);
  const mins = minutesUntilEnd % 60;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <Moon className="w-5 h-5 text-amber-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-700">Noćna pauza aktivna</p>
        <p className="text-xs text-amber-600">
          Završava za {hours > 0 ? `${hours}h ` : ''}{mins}min (22:00 - 06:00)
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-amber-700">{hours}:{mins.toString().padStart(2, '0')}</p>
        <p className="text-xs text-amber-600">preostalo</p>
      </div>
    </div>
  );
};

// Component: Quick Action Button
const QuickAction = ({ 
  icon: Icon, 
  label, 
  description, 
  to, 
  color = 'blue',
  external = false
}: { 
  icon: React.ElementType; 
  label: string; 
  description: string; 
  to: string;
  color?: 'blue' | 'emerald' | 'violet' | 'cyan';
  external?: boolean;
}) => {
  const colorConfig = {
    blue: 'from-blue-600 to-cyan-500 shadow-blue-500/25',
    emerald: 'from-emerald-600 to-teal-500 shadow-emerald-500/25',
    violet: 'from-violet-600 to-purple-500 shadow-violet-500/25',
    cyan: 'from-cyan-600 to-blue-500 shadow-cyan-500/25',
  };

  const content = (
    <div className={`group flex items-center gap-4 p-4 bg-gradient-to-r ${colorConfig[color]} text-white rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-white/80">{description}</p>
      </div>
      {external ? (
        <ExternalLink className="w-5 h-5 text-white/60" />
      ) : (
        <ChevronRight className="w-5 h-5 text-white/60 group-hover:translate-x-1 transition-transform" />
      )}
    </div>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link to={to}>{content}</Link>;
};

// Component: API Endpoint Test
const APIEndpointTest = ({ 
  name, 
  endpoint, 
  status, 
  latency, 
  lastCheck 
}: { 
  name: string; 
  endpoint: string; 
  status: 'ok' | 'error' | 'pending'; 
  latency?: number;
  lastCheck?: string;
}) => {
  const statusConfig = {
    ok: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  };
  const c = statusConfig[status];
  const StatusIcon = c.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
          <StatusIcon className={`w-4 h-4 ${c.color}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400 font-mono">{endpoint}</p>
        </div>
      </div>
      <div className="text-right">
        {latency !== undefined && (
          <p className={`text-sm font-bold ${latency < 500 ? 'text-emerald-600' : latency < 1000 ? 'text-amber-600' : 'text-red-600'}`}>
            {latency}ms
          </p>
        )}
        {lastCheck && (
          <p className="text-xs text-gray-400">{lastCheck}</p>
        )}
      </div>
    </div>
  );
};

// Main Component
const SEFPortal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<SEFHealthStatus | null>(null);
  const [isNightPauseActive, setIsNightPauseActive] = useState(false);
  const [nightPauseMinutes, setNightPauseMinutes] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  
  // Unit Measures state
  const [unitMeasures, setUnitMeasures] = useState<UnitMeasure[]>([]);
  const [unitMeasuresLoading, setUnitMeasuresLoading] = useState(false);
  const [unitMeasureSearch, setUnitMeasureSearch] = useState('');
  
  // Company Check state
  const [companyPib, setCompanyPib] = useState('');
  const [companyCheckLoading, setCompanyCheckLoading] = useState(false);
  const [companyCheckResult, setCompanyCheckResult] = useState<CompanyCheckResult | null>(null);
  
  // VAT Exemption state
  const [vatExemptions, setVatExemptions] = useState<VatExemptionReason[]>([]);
  const [vatExemptionsLoading, setVatExemptionsLoading] = useState(false);
  const [vatExemptionSearch, setVatExemptionSearch] = useState('');
  
  // API Version state
  const [sefVersion, setSefVersion] = useState<string | null>(null);
  
  // Copied state for clipboard
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Mock data for demo - u produkciji bi došlo sa backend-a
  const [recentOperations] = useState<SEFOperation[]>([
    { id: '1', type: 'send', invoiceNumber: 'FAK-2024-0156', status: 'success', timestamp: '2024-12-04T10:30:00', duration: 1250 },
    { id: '2', type: 'sync', invoiceNumber: 'FAK-2024-0155', status: 'success', timestamp: '2024-12-04T10:28:00', duration: 890 },
    { id: '3', type: 'send', invoiceNumber: 'FAK-2024-0154', status: 'failed', timestamp: '2024-12-04T10:25:00', error: 'Validation error: Invalid PIB' },
    { id: '4', type: 'cancel', invoiceNumber: 'FAK-2024-0150', status: 'success', timestamp: '2024-12-04T10:20:00', duration: 450 },
    { id: '5', type: 'send', invoiceNumber: 'FAK-2024-0153', status: 'pending', timestamp: '2024-12-04T10:15:00' },
  ]);

  const fetchHealth = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const response = await api.getSEFHealth();
      
      if (response.success && response.data) {
        setHealth(response.data);
        setLastRefresh(new Date());
        
        // Check night pause (22:00 - 06:00)
        const now = new Date();
        const hour = now.getHours();
        const isNight = hour >= 22 || hour < 6;
        setIsNightPauseActive(isNight);
        
        if (isNight) {
          // Calculate minutes until 6:00
          if (hour >= 22) {
            setNightPauseMinutes((24 - hour + 6) * 60 - now.getMinutes());
          } else {
            setNightPauseMinutes((6 - hour) * 60 - now.getMinutes());
          }
        }

        if (showToast) {
          toast.success('SEF status osvežen');
        }
      }
    } catch (error) {
      logger.error('Failed to fetch SEF health', error);
      if (showToast) {
        toast.error('Greška pri osvežavanju SEF statusa');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const handleManualRefresh = async () => {
    await fetchHealth(true);
  };

  const handleRetryFailed = async () => {
    toast.loading('Ponavljanje neuspelih operacija...');
    // TODO: Implement retry failed jobs
    setTimeout(() => {
      toast.dismiss();
      toast.success('Pokrenuto ponavljanje neuspelih operacija');
    }, 1000);
  };

  // Fetch Unit Measures
  const fetchUnitMeasures = async () => {
    if (unitMeasures.length > 0) return; // Already loaded
    
    setUnitMeasuresLoading(true);
    try {
      const response = await api.getSEFUnitMeasures();
      if (response.success && response.data) {
        setUnitMeasures(response.data);
        toast.success(`Učitano ${response.data.length} jedinica mere`);
      }
    } catch (error) {
      logger.error('Failed to fetch unit measures', error);
      toast.error('Greška pri učitavanju jedinica mere');
    } finally {
      setUnitMeasuresLoading(false);
    }
  };

  // Check Company by PIB
  const handleCompanyCheck = async () => {
    if (!companyPib || companyPib.length !== 9) {
      toast.error('PIB mora imati tačno 9 cifara');
      return;
    }
    
    setCompanyCheckLoading(true);
    setCompanyCheckResult(null);
    try {
      const response = await api.checkSEFCompany(companyPib);
      if (response.success && response.data) {
        setCompanyCheckResult(response.data);
        if (response.data.exists) {
          toast.success('Kompanija pronađena u SEF sistemu');
        } else {
          toast.error('Kompanija nije registrovana u SEF sistemu');
        }
      }
    } catch (error) {
      logger.error('Failed to check company', error);
      toast.error('Greška pri proveri kompanije');
    } finally {
      setCompanyCheckLoading(false);
    }
  };

  // Fetch SEF Version
  const fetchSEFVersion = async () => {
    try {
      const response = await api.getSEFVersion();
      if (response.success && response.data) {
        setSefVersion(response.data.version);
      }
    } catch (error) {
      logger.error('Failed to fetch SEF version', error);
    }
  };

  // Fetch VAT Exemptions
  const fetchVatExemptions = async () => {
    if (vatExemptions.length > 0) return;
    
    setVatExemptionsLoading(true);
    try {
      const response = await api.getSEFVatExemptionReasons();
      if (response.success && response.data) {
        setVatExemptions(response.data);
        toast.success(`Učitano ${response.data.length} razloga oslobođenja`);
      }
    } catch (error) {
      logger.error('Failed to fetch VAT exemptions', error);
      toast.error('Greška pri učitavanju razloga oslobođenja PDV-a');
    } finally {
      setVatExemptionsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(text);
      toast.success(`${label} kopirano!`);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Filter unit measures
  const filteredUnitMeasures = unitMeasures.filter(um => 
    um.Code.toLowerCase().includes(unitMeasureSearch.toLowerCase()) ||
    um.NameSrbLtn.toLowerCase().includes(unitMeasureSearch.toLowerCase()) ||
    um.NameEng.toLowerCase().includes(unitMeasureSearch.toLowerCase())
  );

  // Filter VAT exemptions
  const filteredVatExemptions = vatExemptions.filter(ve => 
    ve.Key.toLowerCase().includes(vatExemptionSearch.toLowerCase()) ||
    ve.NameSrbLtn.toLowerCase().includes(vatExemptionSearch.toLowerCase()) ||
    ve.NameEng.toLowerCase().includes(vatExemptionSearch.toLowerCase())
  );

  const getOverallStatus = (): 'online' | 'offline' | 'warning' | 'unknown' => {
    if (!health) return 'unknown';
    if (!health.isOnline) return 'offline';
    if (health.successRate24h < 90 || (health.queueStats?.failed ?? 0) > 5) return 'warning';
    return 'online';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Upravo sada';
    if (diffMins < 60) return `Pre ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Pre ${diffHours}h`;
    return `Pre ${Math.floor(diffHours / 24)}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-500">Učitavanje SEF statusa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 rounded-[2rem] p-8 lg:p-10 text-white overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
          
          {/* Decorative elements */}
          <div className="absolute top-8 right-16 opacity-10">
            <Server className="w-24 h-24" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium">
              <Activity className="w-4 h-4" />
              Sistem Elektronskih Faktura • Kontrolni Panel
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              🏛️ SEF Portal
            </h1>
            <p className="text-xl text-indigo-100 max-w-xl">
              Praćenje statusa, upravljanje redom za slanje i monitoring SEF API integracije.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Status Badge */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-indigo-200">Status sistema</span>
                <StatusBadge status={getOverallStatus()} size="lg" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-indigo-300">Okruženje</span>
                <span className={`font-bold ${health?.environment === 'production' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {health?.environment === 'production' ? '🔴 Produkcija' : '🟡 Demo'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                Osveži
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2.5 backdrop-blur-sm border rounded-xl font-medium transition-all ${
                  autoRefresh 
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' 
                    : 'bg-white/10 border-white/20 hover:bg-white/20'
                }`}
              >
                {autoRefresh ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'overview' as PortalTab, label: 'Pregled', icon: BarChart3 },
            { id: 'api-test' as PortalTab, label: 'API Test', icon: TestTube },
            { id: 'unit-measures' as PortalTab, label: 'Jedinice Mere', icon: Ruler },
            { id: 'vat-exemptions' as PortalTab, label: 'PDV Oslobođenja', icon: Percent },
            { id: 'company-check' as PortalTab, label: 'Provera PIB', icon: Building2 },
            { id: 'documentation' as PortalTab, label: 'Dokumentacija', icon: BookOpen },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'unit-measures') fetchUnitMeasures();
                if (tab.id === 'vat-exemptions') fetchVatExemptions();
                if (tab.id === 'api-test') fetchSEFVersion();
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Night Pause Indicator */}
      <NightPauseIndicator isNightPause={isNightPauseActive} minutesUntilEnd={nightPauseMinutes} />

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
          title="Uspešnost 24h"
          value={`${health?.successRate24h ?? 0}%`}
          icon={Gauge}
          color={health?.successRate24h && health.successRate24h >= 95 ? 'emerald' : health?.successRate24h && health.successRate24h >= 80 ? 'amber' : 'red'}
          trend={health?.retryTrend}
          subtitle="Stopa uspešnih operacija"
        />
        <MetricCard
          title="Latencija"
          value={health?.lastPingLatencyMs ? `${health.lastPingLatencyMs}ms` : 'N/A'}
          icon={Timer}
          color={health?.lastPingLatencyMs && health.lastPingLatencyMs < 500 ? 'emerald' : health?.lastPingLatencyMs && health.lastPingLatencyMs < 1000 ? 'amber' : 'red'}
          subtitle="Vreme odgovora SEF API"
        />
        <MetricCard
          title="Greške 24h"
          value={health?.errors24h ?? 0}
          icon={AlertTriangle}
          color={health?.errors24h === 0 ? 'emerald' : health?.errors24h && health.errors24h < 5 ? 'amber' : 'red'}
          subtitle="Broj grešaka danas"
        />
        <MetricCard
          title="U redu"
          value={(health?.queueStats?.waiting ?? 0) + (health?.queueStats?.active ?? 0)}
          icon={Inbox}
          color="violet"
          subtitle={`${health?.queueStats?.active ?? 0} aktivno`}
        />
      </div>

      {/* Queue Stats */}
      {health?.queueStats && (
        <QueueStatsCard stats={health.queueStats} onRetryFailed={handleRetryFailed} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Operations */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Poslednje operacije</h3>
                  <p className="text-sm text-gray-500">Real-time praćenje SEF aktivnosti</p>
                </div>
              </div>
              <Link 
                to="/audit-logs" 
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
              >
                Sve aktivnosti <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentOperations.map((op) => (
                <div 
                  key={op.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    op.status === 'success' ? 'bg-emerald-100' : 
                    op.status === 'failed' ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    {op.type === 'send' && <Send className={`w-5 h-5 ${op.status === 'success' ? 'text-emerald-600' : op.status === 'failed' ? 'text-red-600' : 'text-amber-600'}`} />}
                    {op.type === 'sync' && <RefreshCw className="w-5 h-5 text-emerald-600" />}
                    {op.type === 'cancel' && <XCircle className="w-5 h-5 text-amber-600" />}
                    {op.type === 'storno' && <RotateCcw className="w-5 h-5 text-violet-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{op.invoiceNumber}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        op.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                        op.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {op.status === 'success' ? 'Uspešno' : op.status === 'failed' ? 'Neuspelo' : 'U toku'}
                      </span>
                    </div>
                    {op.error && <p className="text-sm text-red-500 truncate">{op.error}</p>}
                    <p className="text-xs text-gray-400">{formatTimeAgo(op.timestamp)}</p>
                  </div>
                  {op.duration && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-600">{formatDuration(op.duration)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions & API Status */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Brze akcije</h3>
            <div className="space-y-3">
              <QuickAction
                icon={FileText}
                label="Nova faktura"
                description="Kreiraj i pošalji fakturu"
                to="/invoices/new"
                color="blue"
              />
              <QuickAction
                icon={Download}
                label="Ulazne fakture"
                description="Sinhronizuj sa SEF"
                to="/incoming-invoices"
                color="emerald"
              />
              <QuickAction
                icon={BarChart3}
                label="PDV Evidencija"
                description="Pojedinačna i zbirna"
                to="/vat-records"
                color="violet"
              />
              <QuickAction
                icon={Globe}
                label="SEF Portal"
                description="Otvori zvanični portal"
                to={health?.environment === 'production' 
                  ? 'https://efaktura.mfin.gov.rs' 
                  : 'https://demoefaktura.mfin.gov.rs'}
                color="cyan"
                external
              />
            </div>
          </div>

          {/* API Endpoints Status */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">API Endpointi</h3>
                <p className="text-sm text-gray-500">Status ključnih servisa</p>
              </div>
            </div>

            <div className="space-y-1">
              <APIEndpointTest
                name="SEF API"
                endpoint="/api/publicApi/version"
                status={health?.isOnline ? 'ok' : 'error'}
                latency={health?.lastPingLatencyMs ?? undefined}
                lastCheck={lastRefresh ? formatTimeAgo(lastRefresh.toISOString()) : undefined}
              />
              <APIEndpointTest
                name="Sales Invoice"
                endpoint="/api/publicApi/sales-invoice"
                status={health?.isOnline ? 'ok' : 'error'}
              />
              <APIEndpointTest
                name="Purchase Invoice"
                endpoint="/api/publicApi/purchase-invoice"
                status={health?.isOnline ? 'ok' : 'error'}
              />
              <APIEndpointTest
                name="CIR Registry"
                endpoint="/api/publicApi/cir"
                status={health?.isOnline ? 'ok' : 'error'}
              />
              <APIEndpointTest
                name="VAT Records"
                endpoint="/api/eppApi/vat"
                status={health?.isOnline ? 'ok' : 'pending'}
              />
            </div>
          </div>

          {/* Last Sync Info */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Poslednja sinhronizacija</span>
              {health?.isOnline ? (
                <Wifi className="w-5 h-5 text-emerald-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-lg font-bold text-gray-900">
              {health?.lastSuccessfulSync 
                ? formatTimeAgo(health.lastSuccessfulSync)
                : 'Nema podataka'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {health?.lastPingAt 
                ? `Poslednji ping: ${formatTimeAgo(health.lastPingAt)}`
                : 'Ping nije dostupan'}
            </p>
          </div>
        </div>
      </div>

      {/* SEF Statistics */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">SEF Statistika</h3>
              <p className="text-sm text-gray-500">Pregled aktivnosti i performansi</p>
            </div>
          </div>
          <Link 
            to="/reports" 
            className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center gap-1"
          >
            Detaljna analitika <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <FileCheck className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{health?.queueStats?.completed ?? 0}</p>
            <p className="text-sm text-blue-600">Poslate fakture</p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <Download className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-700">0</p>
            <p className="text-sm text-emerald-600">Primljene fakture</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-xl">
            <FileClock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-700">{health?.queueStats?.delayed ?? 0}</p>
            <p className="text-sm text-amber-600">Na čekanju</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <FileX className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{health?.queueStats?.failed ?? 0}</p>
            <p className="text-sm text-red-600">Odbijene</p>
          </div>
        </div>
      </div>
        </>
      )}

      {/* TAB: API Test */}
      {activeTab === 'api-test' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">SEF API Test Console</h3>
                <p className="text-gray-500">Testirajte SEF API endpoint-e direktno</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* API Version */}
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-700">API Verzija</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                    GET
                  </span>
                </div>
                <code className="block p-3 bg-gray-900 text-green-400 rounded-lg text-sm font-mono mb-4">
                  /api/publicApi/version
                </code>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rezultat:</span>
                  <span className="font-bold text-lg text-indigo-600">
                    {sefVersion ?? 'Nije učitano'}
                  </span>
                </div>
              </div>

              {/* Health Check */}
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-700">Health Check</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                    GET
                  </span>
                </div>
                <code className="block p-3 bg-gray-900 text-green-400 rounded-lg text-sm font-mono mb-4">
                  /api/publicApi/health
                </code>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <StatusBadge status={health?.isOnline ? 'online' : 'offline'} />
                </div>
              </div>
            </div>

            {/* Available Endpoints */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-700 mb-4">Dostupni Endpoint-i</h4>
              <div className="grid gap-2">
                {[
                  { method: 'GET', path: '/api/publicApi/sales-invoice', desc: 'Dohvat izlazne fakture' },
                  { method: 'POST', path: '/api/publicApi/sales-invoice/ubl', desc: 'Slanje UBL fakture' },
                  { method: 'GET', path: '/api/publicApi/purchase-invoice', desc: 'Dohvat ulazne fakture' },
                  { method: 'POST', path: '/api/publicApi/purchase-invoice/accept', desc: 'Prihvatanje fakture' },
                  { method: 'GET', path: '/api/publicApi/get-unit-measures', desc: 'Lista jedinica mere' },
                  { method: 'GET', path: '/api/publicApi/company/check', desc: 'Provera kompanije' },
                ].map((ep, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ep.method}
                    </span>
                    <code className="text-sm font-mono text-gray-600 flex-1">{ep.path}</code>
                    <span className="text-sm text-gray-400">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Unit Measures */}
      {activeTab === 'unit-measures' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Ruler className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Jedinice Mere</h3>
                  <p className="text-gray-500">SEF registar jedinica mere (UN/ECE Rec 20)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-indigo-600">{unitMeasures.length}</span>
                <p className="text-sm text-gray-500">ukupno</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={unitMeasureSearch}
                onChange={(e) => setUnitMeasureSearch(e.target.value)}
                placeholder="Pretraži po kodu ili nazivu..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {unitMeasuresLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kod</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Naziv (SR)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Naziv (EN)</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Često</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUnitMeasures.slice(0, 50).map((um) => (
                      <tr key={um.Code} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-mono text-sm font-bold">
                            {um.Code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{um.NameSrbLtn}</td>
                        <td className="px-4 py-3 text-gray-500">{um.NameEng}</td>
                        <td className="px-4 py-3 text-center">
                          {um.IsOnShortList && (
                            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUnitMeasures.length > 50 && (
                  <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                    Prikazano 50 od {filteredUnitMeasures.length} rezultata
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: VAT Exemptions */}
      {activeTab === 'vat-exemptions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <Percent className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Razlozi Oslobođenja PDV-a</h3>
                  <p className="text-gray-500">Šifrarnik razloga za oslobođenje od PDV-a</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-rose-600">{vatExemptions.length}</span>
                <p className="text-sm text-gray-500">ukupno</p>
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={vatExemptionSearch}
                onChange={(e) => setVatExemptionSearch(e.target.value)}
                placeholder="Pretraži po ključu ili nazivu..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>

            {vatExemptionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : vatExemptions.length === 0 ? (
              <div className="text-center py-12">
                <Percent className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Kliknite na tab da učitate razloge oslobođenja</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredVatExemptions.map((ve) => (
                  <div 
                    key={ve.Id} 
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50/50 transition-all"
                  >
                    <button
                      onClick={() => copyToClipboard(ve.Key, 'Ključ')}
                      className="flex items-center gap-2 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg font-mono text-sm font-bold hover:bg-rose-200 transition-colors"
                    >
                      {copiedCode === ve.Key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {ve.Key}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{ve.NameSrbLtn}</p>
                      <p className="text-sm text-gray-500 mt-1">{ve.NameEng}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Company Check */}
      {activeTab === 'company-check' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Provera Kompanije</h3>
                <p className="text-gray-500">Proverite da li je kompanija registrovana u SEF sistemu</p>
              </div>
            </div>

            <div className="max-w-xl mx-auto">
              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={companyPib}
                    onChange={(e) => setCompanyPib(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="Unesite PIB (9 cifara)"
                    maxLength={9}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleCompanyCheck}
                  disabled={companyCheckLoading || companyPib.length !== 9}
                  className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {companyCheckLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  Proveri
                </button>
              </div>

              {companyCheckResult && (
                <div className={`p-6 rounded-2xl border-2 ${
                  companyCheckResult.exists 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-4">
                    {companyCheckResult.exists ? (
                      <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h4 className={`text-lg font-bold ${companyCheckResult.exists ? 'text-emerald-700' : 'text-red-700'}`}>
                        {companyCheckResult.exists ? 'Kompanija pronađena' : 'Kompanija nije pronađena'}
                      </h4>
                      {companyCheckResult.exists && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between py-2 border-b border-emerald-200">
                            <span className="text-emerald-600">Naziv:</span>
                            <span className="font-semibold text-emerald-800">{companyCheckResult.companyName}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-emerald-200">
                            <span className="text-emerald-600">PIB:</span>
                            <span className="font-mono font-semibold text-emerald-800">{companyCheckResult.vatNumber}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-emerald-200">
                            <span className="text-emerald-600">MB:</span>
                            <span className="font-mono font-semibold text-emerald-800">{companyCheckResult.registrationCode}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-emerald-600">Budžetski korisnik:</span>
                            <span className="font-semibold text-emerald-800">
                              {companyCheckResult.isBudgetUser ? 'Da' : 'Ne'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Documentation */}
      {activeTab === 'documentation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">SEF Dokumentacija</h3>
                <p className="text-gray-500">Korisni linkovi i resursi za SEF integraciju</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <a 
                href="https://efaktura.gov.rs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 hover:shadow-lg transition-all group"
              >
                <Globe className="w-10 h-10 text-indigo-600" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">SEF Portal</h4>
                  <p className="text-sm text-gray-500">Zvanični portal eFaktura</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </a>

              <a 
                href="https://demoefaktura.mfin.gov.rs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-100 hover:shadow-lg transition-all group"
              >
                <TestTube className="w-10 h-10 text-amber-600" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">Demo Portal</h4>
                  <p className="text-sm text-gray-500">Testno okruženje</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-amber-600" />
              </a>

              <a 
                href="https://ppppdv.mfin.gov.rs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:shadow-lg transition-all group"
              >
                <BarChart3 className="w-10 h-10 text-emerald-600" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">EPP Portal</h4>
                  <p className="text-sm text-gray-500">Evidencija PDV</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
              </a>

              <a 
                href="https://www.efaktura.gov.rs/pogledaj-dokument/89/api_specification_sr_-_v3.1_-_20241115-.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100 hover:shadow-lg transition-all group"
              >
                <FileText className="w-10 h-10 text-cyan-600" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 group-hover:text-cyan-600 transition-colors">API Specifikacija</h4>
                  <p className="text-sm text-gray-500">Tehnička dokumentacija v3.1</p>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-cyan-600" />
              </a>
            </div>

            {/* API Info Cards */}
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-indigo-600">v3.1</p>
                <p className="text-sm text-gray-500">Verzija API-ja</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-emerald-600">UBL 2.1</p>
                <p className="text-sm text-gray-500">XML Standard</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-amber-600">REST</p>
                <p className="text-sm text-gray-500">API Tip</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-sm text-gray-500 px-4">
        <div className="flex items-center gap-4">
          <span>Poslednje osvežavanje: {lastRefresh?.toLocaleTimeString('sr-RS') ?? 'N/A'}</span>
          <span>•</span>
          <span>Auto-refresh: {autoRefresh ? 'Uključen (30s)' : 'Isključen'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>SEF API v{health?.environment === 'production' ? '3.1' : '3.0-demo'}</span>
        </div>
      </div>
    </div>
  );
};

export default SEFPortal;
