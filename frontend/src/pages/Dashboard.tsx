import React, { useState } from 'react';

const StatCard = ({ title, value, subtitle, icon, gradient, trend }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  gradient: string;
  trend?: { value: string; positive: boolean };
}) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 card-hover border border-gray-200/50">
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

const ActivityItem = ({ title, time, status, icon }: {
  title: string;
  time: string;
  status: 'success' | 'warning' | 'info';
  icon: string;
}) => {
  const statusColors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="flex items-center p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm mr-4">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
        {status === 'success' ? 'Uspešno' : status === 'warning' ? 'Upozorenje' : 'Info'}
      </span>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Dobro došli u SEF Portal! 👋</h1>
          <p className="text-blue-100 text-lg">Upravljajte elektronskim fakturama brzo i efikasno</p>
          <div className="mt-6 flex space-x-4">
            <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-colors">
              📄 Nova faktura
            </button>
            <button className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/20">
              📊 Izveštaji
            </button>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full floating"></div>
        <div className="absolute -right-16 -bottom-8 w-24 h-24 bg-white/5 rounded-full floating" style={{animationDelay: '2s'}}></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Poslate fakture"
          value="127"
          subtitle="Ovaj mesec"
          icon="📤"
          gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          trend={{ value: "+12%", positive: true }}
        />
        <StatCard
          title="Prihvaćene fakture"
          value="98"
          subtitle="77% stopa prihvatanja"
          icon="✅"
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          trend={{ value: "+8%", positive: true }}
        />
        <StatCard
          title="Na čekanju"
          value="15"
          subtitle="Čeka odluku"
          icon="⏳"
          gradient="bg-gradient-to-r from-yellow-500 to-orange-500"
          trend={{ value: "-3%", positive: false }}
        />
        <StatCard
          title="Ukupan promet"
          value="2.4M"
          subtitle="RSD ovaj mesec"
          icon="💰"
          gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          trend={{ value: "+15%", positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Poslednje aktivnosti</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Pogledaj sve →
              </button>
            </div>
            <div className="space-y-4">
              <ActivityItem
                title="Faktura #2024-001 uspešno poslata"
                time="Pre 2 sata"
                status="success"
                icon="📤"
              />
              <ActivityItem
                title="Nova ulazna faktura od ABC d.o.o."
                time="Pre 4 sata"
                status="info"
                icon="📥"
              />
              <ActivityItem
                title="Faktura #2024-002 na čekanju"
                time="Pre 6 sati"
                status="warning"
                icon="⏳"
              />
              <ActivityItem
                title="SEF API konekcija obnovljena"
                time="Pre 1 dan"
                status="success"
                icon="🔗"
              />
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Status sistema</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">SEF API</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-green-600 text-sm font-medium">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Baza podataka</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-green-600 text-sm font-medium">Aktivna</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Backup sistem</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-yellow-600 text-sm font-medium">U toku</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Brze akcije</h3>
            <div className="space-y-3">
              <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                🆕 Kreiraj fakturu
              </button>
              <button className="w-full bg-gray-100 text-gray-700 p-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                📊 Generisi izveštaj
              </button>
              <button className="w-full bg-gray-100 text-gray-700 p-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                ⚙️ Podešavanja
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};