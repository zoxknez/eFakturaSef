import React, { useState } from 'react';

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
      
      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-orange-900">Oprez (3-5 dana)</p>
          <p className="text-xs text-orange-600">Ulazne fakture</p>
        </div>
        <span className="text-2xl font-bold text-orange-600">7</span>
      </div>
      
      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-yellow-900">Aging poslate</p>
          <p className="text-xs text-yellow-600">Bez finalnog statusa</p>
        </div>
        <span className="text-2xl font-bold text-yellow-600">12</span>
      </div>
    </div>
  </div>
);

const ErrorsFeedCard = () => {
  const errors = [
    { type: 'error', message: 'Faktura #2024-105 odbijena - Neispravan PIB', time: 'Pre 15min', icon: '❌' },
    { type: 'warning', message: 'Kašnjenje u obradi fakture #2024-104', time: 'Pre 1h', icon: '⚠️' },
    { type: 'error', message: 'API timeout za Company XYZ', time: 'Pre 2h', icon: '🔥' },
    { type: 'info', message: 'Batch od 15 faktura uspešno poslat', time: 'Pre 3h', icon: '✅' }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        🚨 Greške i upozorenja
      </h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {errors.map((error, index) => (
          <div key={index} className="flex items-start p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
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

export const AdvancedDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('Primer d.o.o. (12345678)');
  const [savedSearches] = useState([
    'Odbijene fakture danas',
    'Visoki iznosi > 100000',
    'PIB: 12345678',
    'Status: na_čekanju'
  ]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Company & Environment Header */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
        <div className="flex items-center space-x-4">
          <select 
            value={selectedCompany} 
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-transparent border-none text-lg font-semibold text-gray-900 focus:ring-0 cursor-pointer"
          >
            <option>Primer d.o.o. (12345678)</option>
            <option>Test Company (87654321)</option>
            <option>ABC d.o.o. (11111111)</option>
          </select>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm text-gray-600">Multi-company režim</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center ${
            isDemoMode 
              ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' 
              : 'bg-green-100 text-green-800 border-2 border-green-300'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
              isDemoMode ? 'bg-orange-500' : 'bg-green-500'
            }`}></div>
            {isDemoMode ? 'DEMO OKRUŽENJE' : 'PRODUKCIJA'}
          </div>
          <button 
            onClick={() => setIsDemoMode(!isDemoMode)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Prebaci okruženje"
          >
            🔄
          </button>
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
          value="127"
          subtitle="Ovaj mesec"
          icon="📤"
          gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          trend={{ value: "+12%", positive: true }}
          onClick={() => console.log('Navigate to sent invoices')}
        />
        
        <StatCard
          title="Prihvaćene fakture"
          value="98"
          subtitle="77% stopa prihvatanja"
          icon="✅"
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          trend={{ value: "+8%", positive: true }}
          onClick={() => console.log('Navigate to accepted invoices')}
        />
        
        <StatCard
          title="Na čekanju"
          value="15"
          subtitle="Čeka odluku"
          icon="⏳"
          gradient="bg-gradient-to-r from-yellow-500 to-orange-500"
          trend={{ value: "-3%", positive: false }}
          onClick={() => console.log('Navigate to pending invoices')}
        />
        
        <StatCard
          title="Ukupan promet"
          value="2.4M"
          subtitle="RSD ovaj mesec"
          icon="💰"
          gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          trend={{ value: "+15%", positive: true }}
          onClick={() => console.log('Navigate to revenue report')}
        />
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
          
          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ Brze akcije</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                <span className="flex items-center text-blue-900 font-medium">
                  🆕 Kreiraj fakturu
                </span>
                <span className="text-blue-600">→</span>
              </button>
              
              <button className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
                <span className="flex items-center text-green-900 font-medium">
                  📊 Generisi izveštaj
                </span>
                <span className="text-green-600">→</span>
              </button>
              
              <button className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
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