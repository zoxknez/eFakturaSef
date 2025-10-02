import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { parseTokens, isAllowedKey, isTokenValid, ALLOWED_KEYS } from '../utils/queryParser';
import { settingsService } from '../services/settingsService';
import { invoiceService } from '../services/invoiceService';

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
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
      💚 SEF Status
    </h3>

    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Konekcija</span>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
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
        <span className="text-xs font-medium text-green-600">↘ -15%</span>
      </div>

      <button className="w-full px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
        🔍 Detaljni status
      </button>
    </div>
  </div>
);

const DeadlinesCard = () => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
      ⏰ Rokovi
    </h3>

    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
        <div>
          <p className="text-xs font-medium text-red-900">Kritični</p>
          <p className="text-xs text-red-600">1-2 dana</p>
        </div>
        <span className="text-lg font-bold text-red-600">3</span>
      </div>

      <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
        <div>
          <p className="text-xs font-medium text-amber-900">Oprez</p>
          <p className="text-xs text-amber-600">3-5 dana</p>
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

const ErrorsFeedCard = () => {
  const errors = [
    { id: 'e1', type: 'error', message: 'Faktura #2024-105 odbijena - Neispravan PIB', time: 'Pre 15min', icon: '❌' },
    { id: 'e2', type: 'warning', message: 'Kašnjenje u obradi fakture #2024-104', time: 'Pre 1h', icon: '⚠️' },
    { id: 'e3', type: 'error', message: 'API timeout za Company XYZ', time: 'Pre 2h', icon: '🔥' },
    { id: 'e4', type: 'info', message: 'Batch od 15 faktura uspešno poslat', time: 'Pre 3h', icon: '✅' }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
        🚨 Aktivnost sistema
      </h3>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {errors.map((error) => (
          <div key={error.id} className="flex items-start p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <span className="text-sm mr-2 mt-0.5">{error.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{error.message}</p>
              <p className="text-xs text-gray-500">{error.time}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-3 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100">
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

  // Handle UBL file import
  const handleImportUBL = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,.ubl';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        alert(`🔄 Uvoz UBL fajla "${file.name}"...`);

        const result = await invoiceService.importUBL(file);

        if (result.success) {
          setLastRefreshed(new Date());
          alert(`✅ UBL fajl "${file.name}" je uspešno uvezen!\n\nKreirana je nova faktura.`);
        } else {
          alert('❌ Greška pri uvoz UBL fajla: ' + (result.message || 'Nepoznata greška'));
        }
      } catch (error) {
        console.error('UBL import error:', error);
        alert('❌ Greška pri uvoz UBL fajla: ' + (error instanceof Error ? error.message : 'Nepoznata greška'));
      }
    };
    input.click();
  };

  // Handle SEF synchronization
  const handleSyncWithSEF = async () => {
    try {
      const confirmed = confirm('🔄 Da li želite da pokrenete sinhronizaciju sa SEF sistemom?\n\nOva operacija može potrajati nekoliko minuta.');
      if (!confirmed) return;

      alert('🔄 Pokretanje sinhronizacije sa SEF sistemom...');

      const result = await settingsService.syncWithSEF();

      if (result.success) {
        setLastRefreshed(new Date());
        alert('✅ Sinhronizacija sa SEF sistemom je uspešno završena!');
      } else {
        alert('❌ Greška pri sinhronizaciji: ' + (result.message || 'Nepoznata greška'));
      }
    } catch (error) {
      console.error('SEF sync error:', error);
      alert('❌ Greška pri sinhronizaciji sa SEF sistemom: ' + (error instanceof Error ? error.message : 'Nepoznata greška'));
    }
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
    <div className="space-y-6 animate-fade-in">
      {/* Company & Environment Header - Optimized Layout */}
      {(() => {
        const meta = getCompanyMeta(selectedCompany);
        const parsed = parseCompanyLabel(selectedCompany);
        return (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              {/* Left side - Company Info */}
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {meta.initials}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{parsed.name}</h2>
                    {parsed.pib && (
                      <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-medium">
                        PIB: {parsed.pib}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      🏢 <span className="text-gray-700 font-medium">Multi-company režim</span>
                    </span>
                    <span className="text-gray-300">•</span>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

              {/* Right side - Quick Stats & Actions */}
              <div className="flex items-center gap-6">
                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">98%</div>
                    <div className="text-xs text-gray-500">Uspešnost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">127</div>
                    <div className="text-xs text-gray-500">Ovaj mesec</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">15</div>
                    <div className="text-xs text-gray-500">Na čekanju</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/invoices/create')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25 text-sm font-medium"
                  >
                    ➕ Nova faktura
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* KPI Cards - kompaktniji nakon poboljšanog header-a */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          title="Prihvaćene"
          value="98"
          subtitle="77% uspešnost"
          icon="✅"
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          trend={{ value: "+8%", positive: true }}
          onClick={() => navigate('/invoices')}
        />

        <StatCard
          title="Čeka odluku"
          value="15"
          subtitle="Ulazne fakture"
          icon="⏳"
          gradient="bg-gradient-to-r from-amber-500 to-orange-500"
          trend={{ value: "-3%", positive: false }}
          onClick={() => navigate('/invoices')}
        />

        <StatCard
          title="Promet"
          value="2.4M"
          subtitle="RSD ovaj mesec"
          icon="💰"
          gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          trend={{ value: "+15%", positive: true }}
          onClick={() => navigate('/invoices')}
        />
      </div>

      {/* ⚡ Quick Actions - Kompaktnije */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/50">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
          ⚡ Brze akcije
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/invoices/create')}
            className="flex flex-col items-center p-3 rounded-xl border bg-blue-50 text-blue-900 hover:bg-blue-100 transition-all hover:scale-105"
          >
            <span className="text-2xl mb-1">🆕</span>
            <span className="text-xs font-medium text-center">Kreiraj</span>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="flex flex-col items-center p-3 rounded-xl border bg-green-50 text-green-900 hover:bg-green-100 transition-all hover:scale-105"
          >
            <span className="text-2xl mb-1">📊</span>
            <span className="text-xs font-medium text-center">Izveštaj</span>
          </button>
          <button
            onClick={handleImportUBL}
            className="flex flex-col items-center p-3 rounded-xl border bg-indigo-50 text-indigo-900 hover:bg-indigo-100 transition-all hover:scale-105"
          >
            <span className="text-2xl mb-1">📥</span>
            <span className="text-xs font-medium text-center">Uvezi UBL</span>
          </button>
          <button
            onClick={handleSyncWithSEF}
            className="flex flex-col items-center p-3 rounded-xl border bg-cyan-50 text-cyan-900 hover:bg-cyan-100 transition-all hover:scale-105"
          >
            <span className="text-2xl mb-1">�</span>
            <span className="text-xs font-medium text-center">Sinhronizuj</span>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="flex flex-col items-center p-3 rounded-xl border bg-teal-50 text-teal-900 hover:bg-teal-100 transition-all hover:scale-105"
          >
            <span className="text-2xl mb-1">🧾</span>
            <span className="text-xs font-medium text-center">Ulazne</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center p-3 rounded-xl border bg-purple-50 text-purple-900 hover:bg-purple-100 transition-all hover:scale-105"
          >
            <span className="text-2xl mb-1">⚙️</span>
            <span className="text-xs font-medium text-center">Postavke</span>
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


      {/* Dashboard Grid - Kompaktniji layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Glavni sadržaj - 3 kolone */}
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SEFHealthCard />
            <DeadlinesCard />
          </div>
          <ErrorsFeedCard />
        </div>

        {/* Sidebar - 1 kolona */}
        <div className="space-y-4">
          {/* 📌 Zadaci danas - kompaktniji */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
              📌 Zadaci danas
            </h3>
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
            >
              🔍 Sve zadatke
            </button>
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
