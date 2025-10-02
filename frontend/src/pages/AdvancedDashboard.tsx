import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { parseTokens, isAllowedKey, isTokenValid, ALLOWED_KEYS } from '../utils/queryParser';

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

const StatCard = React.memo(({ title, value, subtitle, icon, gradient, trend, onClick, sparkline }: StatCardProps) => {
  const asButton = Boolean(onClick);
  const sparkData = useMemo(() => (sparkline ? sparkline.map((y, i) => ({ i, y })) : []), [sparkline]);
  const Wrapper: any = asButton ? 'button' : 'div';

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
            <div className={`flex items-center mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              <span className="mr-1">{trend.positive ? '↗' : '↘'}</span>
              {trend.value}
            </div>
          )}
        </div>

        <div className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center text-2xl shadow-lg text-white`}>
          {icon}
        </div>
      </div>

      {sparkData.length > 0 && (
        <div className="h-16 mt-4">
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
});

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

const DeadlinesCard = () => (
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
        <span className="text-2xl font-bold text-red-600">3</span>
      </div>

  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-blue-900">Oprez (3-5 dana)</p>
          <p className="text-xs text-blue-600">Ulazne fakture</p>
        </div>
  <span className="text-2xl font-bold text-blue-600">7</span>
      </div>

  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-blue-900">Aging poslate</p>
          <p className="text-xs text-blue-600">Bez finalnog statusa</p>
        </div>
  <span className="text-2xl font-bold text-blue-600">12</span>
      </div>
    </div>
  </div>
);

const ErrorsFeedCard = () => {
  const errors = [
    { id: 'e1', type: 'error', message: 'Faktura #2024-105 odbijena - Neispravan PIB', time: 'Pre 15min', icon: '❌' },
    { id: 'e2', type: 'warning', message: 'Kašnjenje u obradi fakture #2024-104', time: 'Pre 1h', icon: '⚠️' },
    { id: 'e3', type: 'error', message: 'API timeout za Company XYZ', time: 'Pre 2h', icon: '🔥' },
    { id: 'e4', type: 'info', message: 'Batch od 15 faktura uspešno poslat', time: 'Pre 3h', icon: '✅' }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        🚨 Greške i upozorenja
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {errors.map((error) => (
          <div key={error.id} className="flex items-start p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <span className="text-lg mr-3 mt-0.5">{error.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{error.message}</p>
              <p className="text-xs text-gray-500">{error.time}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100">
        📋 Svi događaji
      </button>
    </div>
  );
};

// Token parser and validators are imported from utils/queryParser

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

// parseTokens imported

const EXAMPLES = [
  'status:poslato datum:2024-10',
  'pib:12345678 iznos:>50000',
  'broj:2024-001 changed:2024-10-01',
  'status:na_čekanju',
];

export const AdvancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('Primer d.o.o. (12345678)');
  const [savedSearches, setSavedSearches] = useState<string[]>([
    'status:odbijeno datum:2025-10-02',
    'iznos:>100000',
    'pib:12345678',
    'status:na_čekanju',
  ]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  const tokens = useMemo(() => parseTokens(searchQuery), [searchQuery]);

  const removeToken = (raw: string) => {
    setSearchQuery((q) => q.split(/\s+/).filter((p) => p !== raw).join(' '));
  };

  const addExample = (example: string) => {
    setSearchQuery((q) => (q ? `${q} ${example}` : example));
  };

  const saveCurrentSearch = () => {
    const label = searchQuery.trim();
    if (!label) return;
    if (!savedSearches.includes(label)) setSavedSearches((arr) => [label, ...arr].slice(0, 10));
  };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const refreshedLabel = useMemo(() => {
    if (!lastRefreshed) return '—';
    const diffMin = Math.round((lastRefreshed.getTime() - now.getTime()) / 60000);
    return new Intl.RelativeTimeFormat('sr-RS', { numeric: 'auto' }).format(diffMin, 'minute');
  }, [lastRefreshed, now]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Company & Environment Header */}
      {(() => {
        const meta = getCompanyMeta(selectedCompany);
        const parsed = parseCompanyLabel(selectedCompany);
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white font-bold text-lg shadow`}>{meta.initials}</div>
                <div className="leading-tight">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-xl font-bold text-gray-900 tracking-tight">{parsed.name}</div>
                    {parsed.pib && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border">PIB: {parsed.pib}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <span className="hidden sm:inline flex items-center gap-1">
                      🏢 <span className="text-gray-700">Multi-company režim</span>
                    </span>
                    <span className="text-gray-300">•</span>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {COMPANIES.map((c) => {
                        const p = parseCompanyLabel(c.label);
                        return (
                          <option key={c.label} value={c.label}>{p.name}</option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center border ${
                    isDemoMode
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-green-50 text-green-800 border-green-200'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mr-2 animate-pulse ${isDemoMode ? 'bg-blue-500' : 'bg-green-500'}`}
                  />
                  {isDemoMode ? 'DEMO OKRUŽENJE' : 'PRODUKCIJA'}
                </div>
                <button
                  onClick={() => setIsDemoMode(!isDemoMode)}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm text-gray-700 inline-flex items-center gap-2"
                >
                  <span>{isDemoMode ? 'Prebaci u PROD' : 'Prebaci u DEMO'}</span>
                  <span className="opacity-70">⇆</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* KPI Cards directly under company header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Poslate fakture"
          value="127"
          subtitle="Ovaj mesec"
          icon="📤"
          gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          trend={{ value: "+12%", positive: true }}
          onClick={() => navigate('/invoices')}
          sparkline={[12, 14, 9, 15, 18, 13, 19, 22, 18, 24]}
        />

        <StatCard
          title="Prihvaćene fakture"
          value="98"
          subtitle="77% stopa prihvatanja"
          icon="✅"
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          trend={{ value: "+8%", positive: true }}
          onClick={() => navigate('/invoices')}
        />

        <StatCard
          title="Na čekanju"
          value="15"
          subtitle="Čeka odluku"
          icon="⏳"
          gradient="bg-gradient-to-r from-sky-500 to-blue-500"
          trend={{ value: "-3%", positive: false }}
          onClick={() => navigate('/invoices')}
        />

        <StatCard
          title="Ukupan promet"
          value="2.4M"
          subtitle="RSD ovaj mesec"
          icon="💰"
          gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          trend={{ value: "+15%", positive: true }}
          onClick={() => navigate('/invoices')}
        />
      </div>

      {/* ⚡ Quick Actions (larger, grid) */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
        <div className="mb-3 text-base font-semibold text-gray-900">⚡ Brze akcije</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/invoices/create')}
            className="flex items-center justify-between p-4 rounded-xl border bg-blue-50 text-blue-900 hover:bg-blue-100 transition-colors"
          >
            <span className="font-medium">🆕 Kreiraj fakturu</span>
            <span className="text-blue-600">→</span>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center justify-between p-4 rounded-xl border bg-green-50 text-green-900 hover:bg-green-100 transition-colors"
          >
            <span className="font-medium">📊 Generiši izveštaj</span>
            <span className="text-green-600">→</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-between p-4 rounded-xl border bg-purple-50 text-purple-900 hover:bg-purple-100 transition-colors"
          >
            <span className="font-medium">⚙️ Podešavanja</span>
            <span className="text-purple-600">→</span>
          </button>
          <button
            onClick={() => console.log('Uvoz UBL fajla')}
            className="flex items-center justify-between p-4 rounded-xl border bg-indigo-50 text-indigo-900 hover:bg-indigo-100 transition-colors"
          >
            <span className="font-medium">📥 Uvezi UBL</span>
            <span className="text-indigo-600">→</span>
          </button>
          <button
            onClick={() => console.log('Sinhronizuj sa SEF')}
            className="flex items-center justify-between p-4 rounded-xl border bg-blue-50 text-blue-900 hover:bg-blue-100 transition-colors"
          >
            <span className="font-medium">🔁 Sinhronizuj SEF</span>
            <span className="text-blue-600">→</span>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center justify-between p-4 rounded-xl border bg-teal-50 text-teal-900 hover:bg-teal-100 transition-colors"
          >
            <span className="font-medium">🧾 Ulazne fakture</span>
            <span className="text-teal-600">→</span>
          </button>
        </div>
      </div>

      {/* Napredna pretraga - još kompaktnija */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-200/50">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-900 flex items-center">🔍 Napredna pretraga</h2>
          <button
            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100"
            onClick={() => setShowAdvancedDetails((v) => !v)}
          >
            {showAdvancedDetails ? 'Sakrij detalje' : 'Prikaži detalje'}
          </button>
        </div>

        {/* Compact row always visible */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="status:poslato broj:2024-001 PIB:12345678"
              className="w-full px-3.5 py-2 pl-9 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                onClick={() => setSearchQuery('')}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs hover:bg-gray-200"
              >
                Reset
              </button>
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600"
                onClick={() => setLastRefreshed(new Date())}
              >
                Pretraži
              </button>
            </div>
          </div>

          {tokens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tokens.map((t, i) => {
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
                    <strong>{t.key}</strong><span>:</span><span>{t.value}</span>
                    <button aria-label="Ukloni" className="ml-1 text-gray-500 hover:text-gray-800" onClick={() => removeToken(t.raw)}>✕</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Details panel (collapsed by default) */}
        {showAdvancedDetails && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: saved + micro KPIs */}
            <div className="lg:col-span-2 space-y-4">
              {/* Brzi filteri */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Odbijene danas', q: 'status:odbijeno datum:2025-10-02' },
                  { label: 'Visoki iznosi > 100000', q: 'iznos:>100000' },
                  { label: 'Na čekanju', q: 'status:na_čekanju' },
                  { label: 'Moj kupac 12345678', q: 'pib:12345678' },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setSearchQuery(f.q)}
                    className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px]"
                  >
                    {f.label}
                  </button>
                ))}
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
                <button
                  onClick={saveCurrentSearch}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  + Sačuvaj pretragu
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ t: 'Danas', v: '12' }, { t: 'Ove nedelje', v: '58' }, { t: 'Na čekanju', v: '15' }, { t: 'Greške 24h', v: '2' }].map(
                  (kpi) => (
                    <div key={kpi.t} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-gray-600">{kpi.t}</span>
                      <span className="text-sm font-semibold text-gray-900">{kpi.v}</span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Right: Operators, Examples, Refresh */}
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Operatori</h4>
                <div className="flex flex-wrap gap-2 text-xs text-gray-700">
                  {ALLOWED_KEYS.map((k) => (
                    <code key={k} className="bg-white px-2 py-1 rounded border shadow-sm">{k}:…</code>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Podržani su opsezi i relacije npr. iznos:&gt;50000, datum:2024-10.</p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Primeri</h4>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => addExample(ex)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200"
                    >
                      {ex}
                    </button>
                  ))}
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
                >
                  🔄 Osveži
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <SEFHealthCard />
          <ErrorsFeedCard />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <DeadlinesCard />

          {/* 📌 Zadaci danas */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📌 Zadaci danas</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">Potvrdi ulazne fakture</p>
                  <p className="text-xs text-gray-600">7 faktura čeka odluku</p>
                </div>
                <button onClick={() => navigate('/invoices')} className="px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-sm hover:bg-green-200">Otvori</button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">Pošalji fakture u draftu</p>
                  <p className="text-xs text-gray-600">3 spremne za slanje</p>
                </div>
                <button onClick={() => navigate('/invoices')} className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-sm hover:bg-blue-200">Pošalji</button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">Pregledaj greške u obradi</p>
                  <p className="text-xs text-gray-600">2 nova incidenta</p>
                </div>
                <button onClick={() => navigate('/invoices')} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-sm hover:bg-red-200">Pregled</button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">Validiraj nove partnere</p>
                  <p className="text-xs text-gray-600">2 nova zahteva</p>
                </div>
                <button onClick={() => navigate('/settings')} className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 text-sm hover:bg-amber-200">Otvori</button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">Exportuj PDV evidenciju</p>
                  <p className="text-xs text-gray-600">Za prethodni mesec</p>
                </div>
                <button onClick={() => console.log('Export PDV')} className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-900 text-sm hover:bg-purple-200">Export</button>
              </div>
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
