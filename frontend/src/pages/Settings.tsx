import React, { useState, useEffect } from 'react';
import api from '../services/api';

type Tab = 'company' | 'sef' | 'stock';

interface CompanyData {
  id: string;
  name: string;
  pib: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  sefApiKey?: string;
  sefEnvironment?: string;
  autoStockDeduction?: boolean;
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    pib: '',
    address: '',
    city: '',
    postalCode: '',
    email: '',
    phone: '',
    bankAccount: '',
    sefApiKey: '',
    sefEnvironment: 'DEMO',
    autoStockDeduction: false,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch company data on mount
  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCompany();
      
      if (response?.success && response.data) {
        setCompany(response.data);
        setFormData({
          name: response.data.name || '',
          pib: response.data.pib || '',
          address: response.data.address || '',
          city: response.data.city || '',
          postalCode: response.data.postalCode || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          bankAccount: response.data.bankAccount || '',
          sefApiKey: response.data.sefApiKey || '',
          sefEnvironment: response.data.sefEnvironment || 'DEMO',
          autoStockDeduction: response.data.autoStockDeduction || false,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = (): string | null => {
    if (activeTab === 'company') {
      if (!formData.name.trim()) return 'Naziv kompanije je obavezan';
      if (!formData.pib.trim()) return 'PIB je obavezan';
      if (!/^\d{9}$/.test(formData.pib)) return 'PIB mora imati tačno 9 cifara';
      if (!formData.address.trim()) return 'Adresa je obavezna';
      if (!formData.city.trim()) return 'Grad je obavezan';
      if (!formData.postalCode.trim()) return 'Poštanski broj je obavezan';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        return 'Email format nije validan';
      }
    }
    
    if (activeTab === 'sef') {
      if (!formData.sefApiKey.trim()) return 'SEF API ključ je obavezan';
    }
    
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updatePayload: any = {};
      
      if (activeTab === 'company') {
        updatePayload.name = formData.name;
        updatePayload.pib = formData.pib;
        updatePayload.address = formData.address;
        updatePayload.city = formData.city;
        updatePayload.postalCode = formData.postalCode;
        updatePayload.email = formData.email || null;
        updatePayload.phone = formData.phone || null;
        updatePayload.bankAccount = formData.bankAccount || null;
      }
      
      if (activeTab === 'sef') {
        updatePayload.sefApiKey = formData.sefApiKey;
        updatePayload.sefEnvironment = formData.sefEnvironment;
      }
      
      if (activeTab === 'stock') {
        updatePayload.autoStockDeduction = formData.autoStockDeduction;
      }

      const response = await api.updateCompany(updatePayload);
      
      if (response?.success) {
        setSuccess('Podešavanja uspešno sačuvana! ✅');
        await fetchCompanyData(); // Refresh data
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response?.error || 'Greška pri čuvanju podešavanja');
      }
    } catch (err: any) {
      setError(err?.message || 'Greška pri čuvanju podešavanja');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.sefApiKey.trim()) {
      setError('Unesite API ključ pre testiranja');
      return;
    }

    try {
      setTestingConnection(true);
      setConnectionStatus('idle');
      setError(null);

      // TODO: Implement actual test connection endpoint
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response - in real app, call api.testSEFConnection()
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      if (success) {
        setConnectionStatus('success');
        setSuccess('Konekcija sa SEF API uspešna! ✅');
      } else {
        setConnectionStatus('error');
        setError('Konekcija neuspešna. Proverite API ključ i okruženje.');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setError(err?.message || 'Greška pri testiranju konekcije');
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Podešavanja
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Upravljajte podacima kompanije, SEF konfiguracijom i magacinskim podešavanjima
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('company')}
              className={`${
                activeTab === 'company'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              🏢 Podaci kompanije
            </button>
            <button
              onClick={() => setActiveTab('sef')}
              className={`${
                activeTab === 'sef'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              🔐 SEF Konfiguracija
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`${
                activeTab === 'stock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              📦 Magacin
            </button>
          </nav>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="px-6 py-6">
          {/* Company Info Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naziv kompanije <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Moja Firma DOO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIB <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pib"
                    value={formData.pib}
                    onChange={handleInputChange}
                    maxLength={9}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123456789"
                  />
                  <p className="mt-1 text-xs text-gray-500">9 cifara</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Kneza Miloša 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Beograd"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Poštanski broj <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="11000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="info@firma.rs"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+381 11 1234567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Broj tekućeg računa
                  </label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="160-123456-78"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEF Configuration Tab */}
          {activeTab === 'sef' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-blue-700">
                      <strong>SEF API konfiguracija</strong> omogućava slanje faktura u Sistem Elektronskih Faktura Ministarstva Finansija.
                      API ključ možete dobiti registracijom na <a href="https://efaktura.mfin.gov.rs" target="_blank" rel="noopener noreferrer" className="underline">efaktura.mfin.gov.rs</a>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Okruženje <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sefEnvironment"
                    value={formData.sefEnvironment}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="DEMO">Demo (demoefaktura.mfin.gov.rs)</option>
                    <option value="PRODUCTION">Produkcija (efaktura.mfin.gov.rs)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.sefEnvironment === 'DEMO' 
                      ? 'Koristi demo okruženje za testiranje' 
                      : 'Produkciono okruženje za stvarne fakture'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API ključ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      name="sefApiKey"
                      value={formData.sefApiKey}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Test konekcije</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Testirajte da li je konekcija sa SEF API-jem uspešna.
                </p>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {testingConnection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Testiram...
                      </>
                    ) : (
                      <>
                        🔌 Testiraj konekciju
                      </>
                    )}
                  </button>
                  
                  {connectionStatus === 'success' && (
                    <span className="text-sm text-green-600 flex items-center">
                      ✅ Konekcija uspešna
                    </span>
                  )}
                  {connectionStatus === 'error' && (
                    <span className="text-sm text-red-600 flex items-center">
                      ❌ Konekcija neuspešna
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stock Settings Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-yellow-700">
                      <strong>Automatsko oduzimanje zaliha</strong> omogućava da se pri kreiranju fakture automatski oduzima količina proizvoda iz magacina.
                      Ova opcija utiče samo na proizvode koji imaju uključeno <strong>praćenje inventara</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      name="autoStockDeduction"
                      checked={formData.autoStockDeduction}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label className="font-medium text-gray-700">
                      Omogući automatsko oduzimanje zaliha
                    </label>
                    <p className="text-gray-500 mt-1">
                      Kada je uključeno, kreiranje fakture će automatski oduzeti količinu proizvoda iz magacina.
                      Pri brisanju ili otkazivanju fakture, zalihe će biti vraćene.
                    </p>
                  </div>
                </div>

                {formData.autoStockDeduction && (
                  <div className="ml-7 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      ✅ <strong>Automatsko oduzimanje je uključeno</strong>
                    </p>
                    <ul className="mt-2 text-xs text-green-700 list-disc list-inside space-y-1">
                      <li>Pri kreiranju fakture, sistem će proveriti dostupnost zaliha</li>
                      <li>Ako nema dovoljno zaliha, kreiranje fakture će biti odbijeno</li>
                      <li>Ako su zalihe dovoljne, količina će biti automatski oduzeta</li>
                      <li>Pri brisanju/otkazivanju fakture, zalihe će biti vraćene</li>
                    </ul>
                  </div>
                )}

                {!formData.autoStockDeduction && (
                  <div className="ml-7 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-700">
                      ℹ️ <strong>Automatsko oduzimanje je isključeno</strong>
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Zalihe neće biti automatski ažurirane pri kreiranju fakture. Moraćete ručno upravljati zalihama proizvoda.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Kako radi automatsko oduzimanje?</h4>
                <div className="bg-white border border-gray-200 rounded-md p-4">
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                    <li>
                      <strong>Kreiranje fakture sa proizvodima</strong>
                      <p className="ml-6 text-xs text-gray-600">
                        Ako je automatsko oduzimanje uključeno i proizvod ima "Praćenje inventara", sistem će proveriti dostupnost zaliha.
                      </p>
                    </li>
                    <li>
                      <strong>Validacija dostupnosti</strong>
                      <p className="ml-6 text-xs text-gray-600">
                        Ako trenutna zaliha (currentStock) nije dovoljna, kreiranje fakture će biti odbijeno sa detaljnom greškom.
                      </p>
                    </li>
                    <li>
                      <strong>Atomsko oduzimanje</strong>
                      <p className="ml-6 text-xs text-gray-600">
                        Ako su zalihe dovoljne, količina će biti atomski oduzeta iz currentStock polja (SQL: decrement).
                      </p>
                    </li>
                    <li>
                      <strong>Vraćanje zaliha</strong>
                      <p className="ml-6 text-xs text-gray-600">
                        Pri brisanju DRAFT fakture ili otkazivanju SENT fakture, zalihe će biti automatski vraćene.
                      </p>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Save Button */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Čuvam...
              </>
            ) : (
              <>
                💾 Sačuvaj podešavanja
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};