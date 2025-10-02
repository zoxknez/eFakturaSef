import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface SettingsData {
  // SEF API Configuration
  environment: 'demo' | 'production';
  apiKey: string;

  // Company Information
  companyName: string;
  pib: string;
  address: string;
  city: string;
  postalCode: string;

  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  desktopNotifications: boolean;

  // Advanced Settings
  autoSend: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState<SettingsData>({
    environment: 'demo',
    apiKey: '',
    companyName: 'Demo Company d.o.o.',
    pib: '123456789',
    address: 'Knez Mihailova 42',
    city: 'Beograd',
    postalCode: '11000',
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true,
    autoSend: false,
    retryAttempts: 3,
    retryDelay: 5
  });

  const handleInputChange = (field: keyof SettingsData, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simuliramo API poziv
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Konekcija sa SEF API-jem je uspešna!');
    } catch (error) {
      alert('Greška u konekciji sa SEF API-jem!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              ⚙️ Sistemska podešavanja
            </h2>
            <p className="text-gray-600 mt-1">Konfiguracija SEF API-ja, korisnika i sistema</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Korisnik: <span className="font-medium">{user?.firstName} {user?.lastName}</span></p>
            <p className="text-xs text-gray-500">Uloga: {user?.role}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Glavne postavke - 2 kolone */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEF API Konfiguracija */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🔧 SEF API Konfiguracija
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Okruženje
                </label>
                <select
                  value={settings.environment}
                  onChange={(e) => handleInputChange('environment', e.target.value as 'demo' | 'production')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="demo">🧪 Demo okruženje</option>
                  <option value="production">🏭 Produkcija</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API ključ
                </label>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Unesite API ključ"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={isLoading}
                className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 text-sm font-medium"
              >
                {isLoading ? '🔄 Testiranje...' : '🔍 Testiraj konekciju'}
              </button>
            </div>
          </div>

          {/* Podaci kompanije */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🏢 Podaci kompanije
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Naziv kompanije
                </label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Naziv vaše kompanije"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIB
                </label>
                <input
                  type="text"
                  value={settings.pib}
                  onChange={(e) => handleInputChange('pib', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresa
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ulica i broj"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grad
                </label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Beograd"
                />
              </div>
            </div>
          </div>

          {/* Napredne postavke */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🔬 Napredne postavke
            </h3>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoSend}
                  onChange={(e) => handleInputChange('autoSend', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Automatsko slanje</span>
                  <p className="text-gray-500">Automatski pošalji fakture u SEF nakon kreiranja</p>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Broj pokušaja retry-a
                  </label>
                  <select
                    value={settings.retryAttempts}
                    onChange={(e) => handleInputChange('retryAttempts', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 pokušaj</option>
                    <option value={3}>3 pokušaja</option>
                    <option value={5}>5 pokušaja</option>
                    <option value={10}>10 pokušaja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pauza između pokušaja (min)
                  </label>
                  <select
                    value={settings.retryDelay}
                    onChange={(e) => handleInputChange('retryDelay', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 minut</option>
                    <option value={5}>5 minuta</option>
                    <option value={15}>15 minuta</option>
                    <option value={30}>30 minuta</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - 1 kolona */}
        <div className="space-y-6">
          {/* Notifikacije */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🔔 Notifikacije
            </h3>

            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">Email obaveštenja</label>
                  <p className="text-xs text-gray-500">Za nove ulazne fakture</p>
                </div>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => handleInputChange('smsNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">SMS obaveštenja</label>
                  <p className="text-xs text-gray-500">Za promene statusa</p>
                </div>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={settings.desktopNotifications}
                  onChange={(e) => handleInputChange('desktopNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">Desktop notifikacije</label>
                  <p className="text-xs text-gray-500">Browser push obaveštenja</p>
                </div>
              </div>
            </div>
          </div>

          {/* Brze akcije */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              ⚡ Brze akcije
            </h3>

            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm font-medium text-left">
                📥 Izvezi konfiguraciju
              </button>
              <button className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-sm font-medium text-left">
                📤 Uvezi konfiguraciju
              </button>
              <button className="w-full px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 text-sm font-medium text-left">
                🔄 Resetuj na fabričke
              </button>
              <button
                onClick={logout}
                className="w-full px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium text-left"
              >
                🚪 Odjavi se
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              📊 Status sistema
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Verzija:</span>
                <span className="font-medium">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API Status:</span>
                <span className="text-green-600 font-medium">🟢 Aktivno</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Poslednja sinhronizacija:</span>
                <span className="font-medium">Pre 5min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
        <div className="flex justify-between items-center">
          {saved && (
            <div className="text-green-600 text-sm font-medium flex items-center">
              ✅ Podešavanja su uspešno sačuvana
            </div>
          )}
          <div className="flex space-x-3 ml-auto">
            <button
              onClick={() => setSettings({
                environment: 'demo',
                apiKey: '',
                companyName: 'Demo Company d.o.o.',
                pib: '123456789',
                address: 'Knez Mihailova 42',
                city: 'Beograd',
                postalCode: '11000',
                emailNotifications: true,
                smsNotifications: false,
                desktopNotifications: true,
                autoSend: false,
                retryAttempts: 3,
                retryDelay: 5
              })}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              🔄 Resetuj
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-sm font-medium shadow-lg shadow-blue-500/25"
            >
              {isLoading ? '💾 Čuvanje...' : '💾 Sačuvaj podešavanja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
