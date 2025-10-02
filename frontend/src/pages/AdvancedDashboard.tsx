import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { parseTokens, isAllowedKey, isTokenValid, ALLOWED_KEYS } from '../utils/queryParser';
import { settingsService } from '../services/settingsService';
import { invoiceService } from '../services/invoiceService';
import { MagnifierToggleButton } from '../components/accessibility';

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  gradient: string;
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
  sparkline?: number[];
};

const StatCard: React.FC<StatCardProps> = React.memo(
  ({ title, value, subtitle, icon, gradient, trend, onClick, sparkline }) => {
    const asButton = Boolean(onClick);
    const sparkData = useMemo(
      () => (sparkline ? sparkline.map((y, i) => ({ i, y })) : []),
      [sparkline]
    );
    const Wrapper: 'button' | 'div' = asButton ? 'button' : 'div';

    return (
      <Wrapper
        type={asButton ? 'button' : undefined}
        onClick={onClick}
        className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 card-hover border border-gray-200/50 transition-all duration-200 w-full text-left ${
          asButton ? 'cursor-pointer hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500' : ''
        }`}
        aria-label={asButton ? title : undefined}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
            <p className="text-sm text-gray-500">{subtitle}</p>
            {trend && (
              <div
                className={`flex items-center mt-2 text-sm ${
                  trend.positive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <span className="mr-1">{trend.positive ? '↗' : '↘'}</span>
                {trend.value}
              </div>
            )}
          </div>

          <div
            className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center text-2xl shadow-lg text-white`}
            aria-hidden="true"
          >
            {icon}
          </div>
        </div>

        {sparkData.length > 0 && (
          <div className="h-16 mt-4" aria-label="Trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Tooltip cursor={false} />
                <Line type="monotone" dataKey="y" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Wrapper>
    );
  }
);

const SEFHealthCard: React.FC = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">💚 SEF Status</h3>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Konekcija</span>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          <span className="text-xs font-medium text-green-600">Aktivna</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Greške (24h)</span>
        <span className="text-xs font-medium text-red-600">2</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Queue</span>
        <span className="text-xs font-medium">5 dokumenata</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Retry trend</span>
        <span className="text-xs font-medium text-green-600">↘ −15%</span>
      </div>

      <button
        className="w-full px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100"
        type="button"
      >
        🔍 Detaljni status
      </button>
    </div>
  </div>
);

const DeadlinesCard: React.FC = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">⏰ Rokovi</h3>
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
        <div>
          <p className="text-xs font-medium text-red-900">Kritični</p>
          <p className="text-xs text-red-600">1–2 dana</p>
        </div>
        <span className="text-lg font-bold text-red-600">3</span>
      </div>

      <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
        <div>
          <p className="text-xs font-medium text-amber-900">Oprez</p>
          <p className="text-xs text-amber-600">3–5 dana</p>
        </div>
        <span className="text-lg font-bold text-amber-600">7</span>
      </div>

      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <p className="text-xs font-medium text-blue-900">Aging</p>
          <p className="text-xs text-blue-600">Bez statusa</p>
        </div>
        <span className="text-lg font-bold text-blue-600">12</span>
      </div>
    </div>
  </div>
);

const ErrorsFeedCard: React.FC = () => {
  const errors = [
    { id: 'e1', type: 'error', message: 'Faktura #2024-105 odbijena – Neispravan PIB', time: 'Pre 15 min', icon: '❌' },
    { id: 'e2', type: 'warning', message: 'Kašnjenje u obradi fakture #2024-104', time: 'Pre 1 h', icon: '⚠️' },
    { id: 'e3', type: 'error', message: 'API timeout za Company XYZ', time: 'Pre 2 h', icon: '🔥' },
    { id: 'e4', type: 'info', message: 'Batch od 15 faktura uspešno poslat', time: 'Pre 3 h', icon: '✅' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">🚨 Aktivnost sistema</h3>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {errors.map((error) => (
          <div
            key={error.id}
            className="flex items-start p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            role="status"
            aria-live="polite"
          >
            <span className="text-sm mr-2 mt-0.5">{error.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{error.message}</p>
              <p className="text-xs text-gray-500">{error.time}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        className="w-full mt-3 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100"
        type="button"
      >
        📋 Svi događaji
      </button>
    </div>
  );
};

// ––– Helpers –––
type CompanyMeta = { label: string; initials: string; gradient: string };
const COMPANIES: CompanyMeta[] = [
  { label: 'Primer d.o.o. (12345678)', initials: 'PR', gradient: 'from-blue-500 to-cyan-500' },
  { label: 'Test Company (87654321)', initials: 'TC', gradient: 'from-violet-500 to-fuchsia-500' },
  { label: 'ABC d.o.o. (11111111)', initials: 'AB', gradient: 'from-emerald-500 to-teal-500' },
];

function getCompanyMeta(label: string): CompanyMeta {
  return COMPANIES.find((c) => c.label === label) || COMPANIES[0];
}

function parseCompanyLabel(label: string): { name: string; pib?: string } {
  const m = label.match(/^(.+?)\s*\((\d+)\)$/);
  if (m) return { name: m[1], pib: m[2] };
  return { name: label };
}

const PLACEHOLDERS = [
  'status:poslato broj:2024-001 PIB:12345678',
  'iznos:>50000 datum:2024-10',
  'status:na_čekanju pib:87654321',
  'broj:2024-* status:obrađeno',
  'datum:2024-10-01 company:"Test d.o.o."',
] as const;

function formatISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function showToast(msg: string, colorClass = 'bg-gray-700') {
  const el = document.createElement('div');
  el.textContent = msg;
  el.className = `fixed top-4 right-4 ${colorClass} text-white px-4 py-2 rounded-lg z-[99999] shadow`;
  document.body.appendChild(el);
  const t = setTimeout(() => {
    if (document.body.contains(el)) document.body.removeChild(el);
  }, 2500);
  return () => {
    clearTimeout(t);
    if (document.body.contains(el)) document.body.removeChild(el);
  };
}

export const AdvancedDashboard: React.FC = () => {
  const navigate = useNavigate();

  // ––– State –––
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('Primer d.o.o. (12345678)');
  const [savedSearches, setSavedSearches] = useState<string[]>([
    'status:odbijeno datum:' + formatISODate(new Date()),
    'iznos:>100000',
    'pib:12345678',
    'status:na_čekanju',
  ]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const tokens = useMemo(() => parseTokens(searchQuery), [searchQuery]);

  const removeToken = useCallback((raw: string) => {
    setSearchQuery((q) =>
      q
        .split(/\s+/)
        .filter((p) => p !== raw)
        .join(' ')
    );
  }, []);

  const addExample = useCallback((example: string) => {
    setSearchQuery((q) => (q ? `${q} ${example}` : example));
  }, []);

  // Placeholder rotacija (stabilan interval + cleanup)
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcuts (/, n, a, r) – stable handlers + cleanup
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target && target.isContentEditable);
      if (isTyping) return;

      // ignorisi browser prečice
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case '/': {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          break;
        }
        case 'n':
        case 'N': {
          e.preventDefault();
          navigate('/invoices/create');
          break;
        }
        case 'a':
        case 'A': {
          e.preventDefault();
          const acceptBtn = document.querySelector(
            '[title*="prihvati"], [aria-label*="prihvati"]'
          ) as HTMLButtonElement | null;
          acceptBtn?.click();
          break;
        }
        case 'r':
        case 'R': {
          e.preventDefault();
          const rejectBtn = document.querySelector(
            '[title*="odbij"], [aria-label*="odbij"]'
          ) as HTMLButtonElement | null;
          rejectBtn?.click();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const saveCurrentSearch = useCallback(() => {
    const label = searchQuery.trim();
    if (!label) return;
    setSavedSearches((arr) => (arr.includes(label) ? arr : [label, ...arr].slice(0, 10)));
  }, [searchQuery]);

  // Uvoz UBL
  const handleImportUBL = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,.ubl';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const close = showToast(`🔄 Uvoz UBL fajla "${file.name}"…`, 'bg-blue-600');
        const result = await invoiceService.importUBL(file);
        close();

        if (result?.success) {
          setLastRefreshed(new Date());
          showToast(`✅ "${file.name}" uspešno uvezen (kreirana faktura).`, 'bg-green-600');
        } else {
          showToast(`❌ Greška pri uvozu: ${result?.message || 'Nepoznata greška'}`, 'bg-red-600');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Nepoznata greška';
        showToast(`❌ Greška pri uvozu: ${msg}`, 'bg-red-600');
        // eslint-disable-next-line no-console
        console.error('UBL import error:', err);
      }
    };
    input.click();
  }, []);

  // Sinhronizacija sa SEF
  const handleSyncWithSEF = useCallback(async () => {
    const confirmed = window.confirm(
      '🔄 Pokrenuti sinhronizaciju sa SEF sistemom?\n\nOperacija može potrajati nekoliko minuta.'
    );
    if (!confirmed) return;

    const close = showToast('🔄 Sinhronizacija u toku…', 'bg-blue-600');
    try {
      const result = await settingsService.syncWithSEF();
      close();

      if (result?.success) {
        setLastRefreshed(new Date());
        showToast('✅ Sinhronizacija završena!', 'bg-green-600');
      } else {
        showToast(`❌ Greška: ${result?.message || 'Nepoznata greška'}`, 'bg-red-600');
      }
    } catch (err: unknown) {
      close();
      const msg = err instanceof Error ? err.message : 'Nepoznata greška';
      showToast(`❌ Greška pri sinhronizaciji: ${msg}`, 'bg-red-600');
      // eslint-disable-next-line no-console
      console.error('SEF sync error:', err);
    }
  }, []);

  // “Sada” se osvežava na 30 s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const refreshedLabel = useMemo(() => {
    if (!lastRefreshed) return '—';
    const diffMin = Math.round((now.getTime() - lastRefreshed.getTime()) / 60000); // pozitivno = pre X min
    if (diffMin < 1) return 'upravo';
    const rtf = new Intl.RelativeTimeFormat('sr-RS', { numeric: 'auto' });
    return rtf.format(-diffMin, 'minute');
  }, [lastRefreshed, now]);

  const todayISO = useMemo(() => formatISODate(new Date()), []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      {(() => {
        const meta = getCompanyMeta(selectedCompany);
        const parsed = parseCompanyLabel(selectedCompany);
        return (
          <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <div className="flex items-center justify-between">
              {/* Left */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                >
                  {meta.initials}
                </div>

                <h2 className="text-lg font-bold text-gray-900 tracking-tight">{parsed.name}</h2>

                {parsed.pib && (
                  <div className="flex items-center px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 h-9">
                    <span className="text-sm font-semibold text-blue-800">PIB: {parsed.pib}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 rounded-xl h-9">
                  <span className="text-emerald-600 text-sm" aria-hidden="true">
                    🏢
                  </span>
                  <span className="text-emerald-700 font-medium text-sm">Multi-company</span>
                </div>
              </div>

              {/* Center */}
              <div className="flex items-center">
                <div className="relative">
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="appearance-none bg-white/90 backdrop-blur-sm border border-gray-300/60 rounded-xl px-3 py-2 pr-10 text-sm text-gray-800 font-medium hover:bg-white hover:border-blue-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm cursor-pointer min-w-[160px] h-9"
                    aria-label="Odaberi kompaniju"
                  >
                    {COMPANIES.map((c) => {
                      const p = parseCompanyLabel(c.label);
                      return (
                        <option key={c.label} value={c.label}>
                          {p.name}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 rounded-xl border border-gray-200/50 h-9">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date().toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50/80 rounded-xl border border-green-200/50 h-9">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold text-green-700">Online</span>
                  </div>

                  <div className="flex items-center px-3 py-2 bg-blue-50/80 rounded-xl border border-blue-200/50 h-9">
                    <span className="text-sm font-semibold text-blue-700">&lt; 100ms</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/invoices/create')}
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md text-sm font-semibold h-9"
                    type="button"
                    title="Nova faktura"
                  >
                    ➕ Nova faktura
                  </button>

                  <button
                    onClick={handleSyncWithSEF}
                    className="flex items-center justify-center w-9 h-9 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200/50 hover:border-blue-300"
                    title="Sinhronizuj sa SEF"
                    type="button"
                    aria-label="Sinhronizuj sa SEF"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>

                  <button
                    onClick={handleImportUBL}
                    className="flex items-center justify-center w-9 h-9 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all border border-gray-200/50 hover:border-green-300"
                    title="Uvezi UBL"
                    type="button"
                    aria-label="Uvezi UBL"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Poslate fakture"
          value="127"
          subtitle="Ovaj mesec"
          icon="📤"
          gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          trend={{ value: '+12%', positive: true }}
          onClick={() => navigate('/invoices')}
          sparkline={[12, 14, 9, 15, 18, 13, 19, 22, 18, 24]}
        />
        <StatCard
          title="Prihvaćene"
          value="98"
          subtitle="77% uspešnost"
          icon="✅"
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          trend={{ value: '+8%', positive: true }}
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          title="Čeka odluku"
          value="15"
          subtitle="Ulazne fakture"
          icon="⏳"
          gradient="bg-gradient-to-r from-amber-500 to-orange-500"
          trend={{ value: '−3%', positive: false }}
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          title="Promet"
          value="2.4M"
          subtitle="RSD ovaj mesec"
          icon="💰"
          gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          trend={{ value: '+15%', positive: true }}
          onClick={() => navigate('/invoices')}
        />
      </div>

      {/* Prečice */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center justify-center">⚡ Prečice</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Kreiraj', icon: '🆕', onClick: () => navigate('/invoices/create') },
            { label: 'Izveštaj', icon: '📊', onClick: () => navigate('/invoices') },
            { label: 'Uvezi UBL', icon: '📥', onClick: handleImportUBL },
            { label: 'Sinhronizuj', icon: '🔄', onClick: handleSyncWithSEF },
            { label: 'Ulazne', icon: '🧾', onClick: () => navigate('/invoices') },
            { label: 'Postavke', icon: '⚙️', onClick: () => navigate('/settings') },
         ].map((b) => (
            <button
              key={b.label}
              onClick={b.onClick}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all hover:scale-105 hover:shadow-md"
              type="button"
            >
              <span className="text-3xl mb-2" aria-hidden="true">
                {b.icon}
              </span>
              <span className="text-sm font-medium text-center text-gray-700">{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Napredna pretraga */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">🔍 Napredna pretraga</h2>
          <button
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-medium transition-all border border-blue-200 hover:border-blue-300"
            onClick={() => setShowAdvancedDetails((v) => !v)}
            type="button"
          >
            {showAdvancedDetails ? '📤 Sakrij detalje' : '📥 Prikaži detalje'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={PLACEHOLDERS[placeholderIndex]}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm placeholder-gray-400"
              aria-label="Napredna pretraga"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 transition-all"
                type="button"
                title="Resetuj"
              >
                🔄 Reset
              </button>
              <button
                className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-all"
                onClick={() => setLastRefreshed(new Date())}
                type="button"
                title="Pretraži"
              >
                🔍 Pretraži
              </button>
            </div>
          </div>

          {tokens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tokens.map((t: any, i: number) => {
                const known = isAllowedKey(t.key);
                const ok = isTokenValid(t);
                const cls = ok
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : known
                  ? 'bg-gray-100 text-gray-700 border-gray-200'
                  : 'bg-red-50 text-red-700 border-red-200';
                return (
                  <span
                    key={`${t.raw}-${i}`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${cls}`}
                    title={known ? (ok ? 'Validan' : 'Nevalidna vrednost') : 'Nepoznat operator'}
                  >
                    <strong>{t.key}</strong>
                    <span>:</span>
                    <span>{t.value}</span>
                    <button
                      aria-label="Ukloni"
                      className="ml-1 text-gray-500 hover:text-gray-800"
                      onClick={() => removeToken(t.raw)}
                      type="button"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {showAdvancedDetails && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Odbijene danas', q: `status:odbijeno datum:${todayISO}` },
                  { label: 'Visoki iznosi > 100000', q: 'iznos:>100000' },
                  { label: 'Na čekanju', q: 'status:na_čekanju' },
                  { label: 'Moj kupac 12345678', q: 'pib:12345678' },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setSearchQuery(f.q)}
                    className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px]"
                    type="button"
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600">Snimljene pretrage:</span>
                {savedSearches.map((s, idx) => (
                  <button
                    key={`${s}-${idx}`}
                    onClick={() => setSearchQuery(s)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    type="button"
                  >
                    {s}
                  </button>
                ))}
                <button
                  onClick={saveCurrentSearch}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  type="button"
                >
                  + Sačuvaj pretragu
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { t: 'Danas', v: '12' },
                  { t: 'Ove nedelje', v: '58' },
                  { t: 'Na čekanju', v: '15' },
                  { t: 'Greške 24h', v: '2' },
                ].map((kpi) => (
                  <div
                    key={kpi.t}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between"
                  >
                    <span className="text-xs text-gray-600">{kpi.t}</span>
                    <span className="text-sm font-semibold text-gray-900">{kpi.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Operatori</h4>
                <div className="flex flex-wrap gap-2 text-xs text-gray-700">
                  {ALLOWED_KEYS.map((k) => (
                    <code key={k} className="bg-white px-2 py-1 rounded border shadow-sm">
                      {k}:…
                    </code>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Podržani su opsezi i relacije npr. iznos:&gt;50000, datum:2024-10.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Primeri</h4>
                <div className="flex flex-wrap gap-2">
                  {['status:poslato datum:2024-10', 'pib:12345678 iznos:>50000', 'broj:2024-001 changed:2024-10-01', 'status:na_čekanju'].map(
                    (ex, i) => (
                      <button
                        key={`${ex}-${i}`}
                        onClick={() => addExample(ex)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200"
                        type="button"
                      >
                        {ex}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Poslednje osvežavanje</span>
                  <span className="text-xs font-medium text-gray-900">{refreshedLabel}</span>
                </div>
                <button
                  onClick={() => setLastRefreshed(new Date())}
                  className="mt-2 w-full px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
                  type="button"
                >
                  🔄 Osveži
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SEFHealthCard />
            <DeadlinesCard />
          </div>
          <ErrorsFeedCard />
        </div>

        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">📌 Zadaci danas</h3>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs font-medium text-green-900">Potvrdi ulazne</p>
                <p className="text-xs text-green-600">7 čeka odluku</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-medium text-blue-900">Pošalji drafts</p>
                <p className="text-xs text-blue-600">3 spremne</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-medium text-red-900">Greške u obradi</p>
                <p className="text-xs text-red-600">2 incidenta</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-medium text-amber-900">Novi partneri</p>
                <p className="text-xs text-amber-600">2 zahteva</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                <p className="text-xs font-medium text-purple-900">PDV evidencija</p>
                <p className="text-xs text-purple-600">Prethodni mesec</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/invoices')}
              className="w-full mt-3 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200 transition-colors"
              type="button"
            >
              🔍 Sve zadatke
            </button>
          </div>
        </div>
      </div>

      {/* Pristupačnost */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50">
        <div className="flex items-center justify-center flex-wrap gap-4">
          {/* Keyboard shortcuts */}
          <span className="flex items-center gap-2">
            <kbd className="bg-gray-100 px-2 py-1.5 rounded-lg border-2 text-gray-700 font-mono text-sm font-bold shadow-sm">/</kbd>
            <span className="text-gray-700 text-sm font-medium">pretraga</span>
          </span>
          <span className="flex items-center gap-2">
            <kbd className="bg-gray-100 px-2 py-1.5 rounded-lg border-2 text-gray-700 font-mono text-sm font-bold shadow-sm">A</kbd>
            <span className="text-gray-700 text-sm font-medium">prihvati</span>
          </span>
          <span className="flex items-center gap-2">
            <kbd className="bg-gray-100 px-2 py-1.5 rounded-lg border-2 text-gray-700 font-mono text-sm font-bold shadow-sm">R</kbd>
            <span className="text-gray-700 text-sm font-medium">odbij</span>
          </span>
          <span className="flex items-center gap-2">
            <kbd className="bg-gray-100 px-2 py-1.5 rounded-lg border-2 text-gray-700 font-mono text-sm font-bold shadow-sm">N</kbd>
            <span className="text-gray-700 text-sm font-medium">nova</span>
          </span>

          <div className="w-0.5 h-8 bg-gray-300 mx-2" />

          {/* Napredna lupa komponenta */}
          <MagnifierToggleButton speak={false} />

          <button
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border-2 shadow-sm ${
              highContrast ? 'bg-purple-100 border-purple-400 text-purple-800' : 'bg-purple-50 hover:bg-purple-100 border-purple-200 hover:border-purple-300'
            }`}
            onClick={() => {
              const newContrast = !highContrast;
              setHighContrast(newContrast);
              document.body.classList.toggle('high-contrast', newContrast);
              const close = showToast(`Visok kontrast ${newContrast ? 'uključen' : 'isključen'}`, 'bg-purple-600');
              setTimeout(close, 1800);
            }}
            type="button"
          >
            <span className="text-purple-600 text-lg" aria-hidden="true">
              🎨
            </span>
            <span className="text-purple-700 font-semibold text-sm">{highContrast ? 'Normal' : 'Kontrast'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
