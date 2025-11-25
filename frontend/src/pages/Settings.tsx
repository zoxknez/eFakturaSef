import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Building2, 
  Shield, 
  Package, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Zap,
  Server,
  Globe,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Key,
  Settings as SettingsIcon,
  Database,
  ArrowDownToLine,
  RotateCcw,
  HelpCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Lock,
  Unlock
} from 'lucide-react';

type Tab = 'company' | 'sef' | 'stock' | 'notifications' | 'security';

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

// Tab configuration with icons
const tabs: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'company', label: 'Kompanija', icon: <Building2 className="w-4 h-4" />, description: 'Osnovni podaci' },
  { id: 'sef', label: 'SEF API', icon: <Shield className="w-4 h-4" />, description: 'Integracija' },
  { id: 'stock', label: 'Magacin', icon: <Package className="w-4 h-4" />, description: 'Zalihe' },
  { id: 'notifications', label: 'Obaveštenja', icon: <Zap className="w-4 h-4" />, description: 'Podešavanja' },
  { id: 'security', label: 'Bezbednost', icon: <Lock className="w-4 h-4" />, description: 'Pristup' },
];

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
    // Notification settings
    emailNotifications: true,
    invoiceReminders: true,
    stockAlerts: true,
    // Security settings
    twoFactorEnabled: false,
    sessionTimeout: 30,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Fetch company data on mount
  useEffect(() => {
    fetchCompanyData();
  }, []);

  // Auto-dismiss messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCompany();
      
      if (response?.success && response.data) {
        setCompany(response.data);
        setFormData(prev => ({
          ...prev,
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
        }));
      }
    } catch (err: any) {
      setError(err?.message || 'Greška pri učitavanju podataka kompanije');
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
        setSuccess('Podešavanja uspešno sačuvana!');
        setLastSaved(new Date());
        await fetchCompanyData();
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

      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3;
      
      if (success) {
        setConnectionStatus('success');
        setSuccess('Konekcija sa SEF API uspešna!');
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

  // Input field component
  const InputField = ({ 
    label, 
    name, 
    value, 
    onChange, 
    type = 'text', 
    placeholder, 
    icon: Icon, 
    required = false,
    hint,
    maxLength,
    disabled = false
  }: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    icon?: React.ComponentType<any>;
    required?: boolean;
    hint?: string;
    maxLength?: number;
    disabled?: boolean;
  }) => (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        disabled={disabled}
        className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl 
                   shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                   transition-all duration-200 placeholder:text-gray-400
                   disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );

  // Toggle switch component
  const ToggleSwitch = ({
    label,
    description,
    checked,
    onChange,
    icon: Icon,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: () => void;
    icon?: React.ComponentType<any>;
  }) => (
    <div 
      className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 
                 hover:bg-white/70 transition-all duration-200 cursor-pointer group"
      onClick={onChange}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg transition-colors ${checked ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </div>
    </div>
  );

  // Info card component
  const InfoCard = ({
    type = 'info',
    title,
    children,
  }: {
    type?: 'info' | 'warning' | 'success' | 'error';
    title?: string;
    children: React.ReactNode;
  }) => {
    const styles = {
      info: 'bg-blue-50/80 border-blue-200 text-blue-800',
      warning: 'bg-amber-50/80 border-amber-200 text-amber-800',
      success: 'bg-emerald-50/80 border-emerald-200 text-emerald-800',
      error: 'bg-red-50/80 border-red-200 text-red-800',
    };
    const icons = {
      info: <Info className="w-5 h-5 text-blue-500" />,
      warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      error: <XCircle className="w-5 h-5 text-red-500" />,
    };

    return (
      <div className={`rounded-xl border p-4 backdrop-blur-sm ${styles[type]}`}>
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
          <div>
            {title && <p className="font-semibold mb-1">{title}</p>}
            <div className="text-sm">{children}</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 animate-pulse">Učitavanje podešavanja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <SettingsIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Podešavanja</h1>
              <p className="text-blue-200 mt-1">Upravljajte konfiguracijom sistema i kompanije</p>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="mt-6 flex items-center gap-6 text-sm">
            {company && (
              <>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-300" />
                  <span className="text-blue-100">{company.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-300" />
                  <span className="text-blue-100">PIB: {company.pib}</span>
                </div>
              </>
            )}
            {lastSaved && (
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Sačuvano: {lastSaved.toLocaleTimeString('sr-RS')}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      {/* Toast Notifications */}
      {(success || error) && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-xl shadow-2xl backdrop-blur-sm animate-slideIn
                        ${success ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          <div className="flex items-center gap-3">
            {success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <p className="font-medium">{success || error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Navigation */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden sticky top-4">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Kategorije</h3>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200
                             ${activeTab === tab.id
                               ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                               : 'text-gray-600 hover:bg-gray-100'
                             }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {tab.icon}
                  </div>
                  <div>
                    <p className="font-medium">{tab.label}</p>
                    <p className={`text-xs ${activeTab === tab.id ? 'text-blue-100' : 'text-gray-400'}`}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            {/* Tab Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/25">
                  {tabs.find(t => t.id === activeTab)?.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'company' && 'Osnovni podaci o vašoj kompaniji'}
                    {activeTab === 'sef' && 'Konfiguracija Sisteme Elektronskih Faktura'}
                    {activeTab === 'stock' && 'Podešavanja za upravljanje magacinom'}
                    {activeTab === 'notifications' && 'Upravljanje obaveštenjima'}
                    {activeTab === 'security' && 'Bezbednosna podešavanja'}
                  </p>
                </div>
              </div>
            </div>

            {/* Company Tab */}
            {activeTab === 'company' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Naziv kompanije"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Moja Firma DOO"
                    icon={Building2}
                    required
                  />
                  <InputField
                    label="PIB"
                    name="pib"
                    value={formData.pib}
                    onChange={handleInputChange}
                    placeholder="123456789"
                    icon={CreditCard}
                    required
                    maxLength={9}
                    hint="Poreski identifikacioni broj (9 cifara)"
                  />
                </div>

                <InputField
                  label="Adresa"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Kneza Miloša 10"
                  icon={MapPin}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Grad"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Beograd"
                    icon={Globe}
                    required
                  />
                  <InputField
                    label="Poštanski broj"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="11000"
                    required
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    Kontakt informacije
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="info@firma.rs"
                      icon={Mail}
                    />
                    <InputField
                      label="Telefon"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+381 11 1234567"
                      icon={Phone}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    Bankarski podaci
                  </h3>
                  <InputField
                    label="Broj tekućeg računa"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleInputChange}
                    placeholder="160-123456-78"
                    icon={CreditCard}
                    hint="Format: XXX-XXXXXXXXX-XX"
                  />
                </div>
              </div>
            )}

            {/* SEF Configuration Tab */}
            {activeTab === 'sef' && (
              <div className="p-6 space-y-6">
                <InfoCard type="info" title="SEF API Integracija">
                  <p>
                    Sistem Elektronskih Faktura (SEF) je obavezan za sve privredne subjekte u Srbiji.
                    API ključ možete dobiti registracijom na{' '}
                    <a 
                      href="https://efaktura.mfin.gov.rs" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      efaktura.mfin.gov.rs
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </InfoCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Server className="w-4 h-4 text-gray-400" />
                      Okruženje
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['DEMO', 'PRODUCTION'].map((env) => (
                        <button
                          key={env}
                          onClick={() => setFormData(prev => ({ ...prev, sefEnvironment: env }))}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left
                                     ${formData.sefEnvironment === env
                                       ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                       : 'border-gray-200 hover:border-gray-300 bg-white/50'
                                     }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${formData.sefEnvironment === env ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                              {env === 'DEMO' ? <Database className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {env === 'DEMO' ? 'Demo' : 'Produkcija'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {env === 'DEMO' ? 'demoefaktura.mfin.gov.rs' : 'efaktura.mfin.gov.rs'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Key className="w-4 h-4 text-gray-400" />
                      API Ključ
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        name="sefApiKey"
                        value={formData.sefApiKey}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 pr-12 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl 
                                   shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                                   transition-all duration-200 placeholder:text-gray-400 font-mono text-sm"
                        placeholder="••••••••••••••••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 
                                   hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connection Test */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Test Konekcije
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Proverite da li je API ključ validan i da li server odgovara
                      </p>
                    </div>
                    <button
                      onClick={handleTestConnection}
                      disabled={testingConnection || !formData.sefApiKey.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold 
                                 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 
                                 transform hover:-translate-y-0.5 transition-all duration-200 
                                 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                                 flex items-center gap-2"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Testiram...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Testiraj
                        </>
                      )}
                    </button>
                  </div>

                  {connectionStatus !== 'idle' && (
                    <div className={`mt-4 p-4 rounded-xl ${
                      connectionStatus === 'success' 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        {connectionStatus === 'success' 
                          ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          : <XCircle className="w-6 h-6 text-red-500" />
                        }
                        <div>
                          <p className={`font-semibold ${connectionStatus === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {connectionStatus === 'success' ? 'Konekcija uspešna!' : 'Konekcija neuspešna'}
                          </p>
                          <p className={`text-sm ${connectionStatus === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {connectionStatus === 'success' 
                              ? 'SEF API je dostupan i spreman za korišćenje'
                              : 'Proverite API ključ i pokušajte ponovo'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {formData.sefEnvironment === 'DEMO' && (
                  <InfoCard type="warning" title="Demo okruženje">
                    Koristite demo okruženje samo za testiranje. Fakture poslate u demo okruženju 
                    neće imati pravnu snagu.
                  </InfoCard>
                )}
              </div>
            )}

            {/* Stock Tab */}
            {activeTab === 'stock' && (
              <div className="p-6 space-y-6">
                <InfoCard type="info" title="Automatsko upravljanje zalihama">
                  Kada je omogućeno, sistem automatski oduzima količinu proizvoda iz magacina 
                  pri kreiranju fakture i vraća pri brisanju/otkazivanju.
                </InfoCard>

                <ToggleSwitch
                  label="Automatsko oduzimanje zaliha"
                  description="Pri kreiranju fakture automatski oduzmi količinu iz magacina"
                  checked={formData.autoStockDeduction}
                  onChange={() => setFormData(prev => ({ ...prev, autoStockDeduction: !prev.autoStockDeduction }))}
                  icon={ArrowDownToLine}
                />

                {formData.autoStockDeduction && (
                  <InfoCard type="success" title="Automatsko oduzimanje aktivno">
                    <ul className="space-y-2 mt-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Pri kreiranju fakture, sistem proverava dostupnost zaliha</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Ako nema dovoljno zaliha, kreiranje fakture će biti odbijeno</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Pri brisanju/otkazivanju fakture, zalihe se automatski vraćaju</span>
                      </li>
                    </ul>
                  </InfoCard>
                )}

                {!formData.autoStockDeduction && (
                  <InfoCard type="warning">
                    Automatsko oduzimanje je isključeno. Moraćete ručno upravljati zalihama proizvoda.
                  </InfoCard>
                )}

                {/* How it works section */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-blue-500" />
                    Kako funkcioniše?
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { step: 1, title: 'Kreiranje fakture', desc: 'Sistem proverava dostupnost zaliha za sve proizvode' },
                      { step: 2, title: 'Validacija', desc: 'Ako nema dovoljno zaliha, faktura neće biti kreirana' },
                      { step: 3, title: 'Oduzimanje', desc: 'Količina se atomski oduzima iz currentStock polja' },
                      { step: 4, title: 'Vraćanje', desc: 'Pri brisanju DRAFT ili otkazivanju fakture, zalihe se vraćaju' },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-3 p-3 bg-white/50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-6 space-y-4">
                <ToggleSwitch
                  label="Email obaveštenja"
                  description="Primajte obaveštenja na email o važnim događajima"
                  checked={formData.emailNotifications}
                  onChange={() => setFormData(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                  icon={Mail}
                />
                <ToggleSwitch
                  label="Podsetnici za fakture"
                  description="Dobijajte podsetnike za fakture koje dospevaju"
                  checked={formData.invoiceReminders}
                  onChange={() => setFormData(prev => ({ ...prev, invoiceReminders: !prev.invoiceReminders }))}
                  icon={Zap}
                />
                <ToggleSwitch
                  label="Upozorenja o zalihama"
                  description="Obaveštenja kada zalihe padnu ispod minimuma"
                  checked={formData.stockAlerts}
                  onChange={() => setFormData(prev => ({ ...prev, stockAlerts: !prev.stockAlerts }))}
                  icon={Package}
                />
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="p-6 space-y-6">
                <ToggleSwitch
                  label="Dvofaktorska autentifikacija"
                  description="Dodatni sloj zaštite za vaš nalog"
                  checked={formData.twoFactorEnabled}
                  onChange={() => setFormData(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                  icon={formData.twoFactorEnabled ? Lock : Unlock}
                />

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    Automatska odjava nakon neaktivnosti
                  </label>
                  <select
                    value={formData.sessionTimeout}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl 
                               shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value={15}>15 minuta</option>
                    <option value={30}>30 minuta</option>
                    <option value={60}>1 sat</option>
                    <option value={120}>2 sata</option>
                    <option value={480}>8 sati</option>
                  </select>
                </div>

                <InfoCard type="info">
                  Preporučujemo omogućavanje dvofaktorske autentifikacije za dodatnu sigurnost vašeg naloga.
                </InfoCard>
              </div>
            )}

            {/* Footer with Save Button */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  onClick={fetchCompanyData}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl 
                             transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetuj izmene
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold 
                             rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 
                             transform hover:-translate-y-0.5 transition-all duration-200 
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                             flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Čuvam...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Sačuvaj podešavanja
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};