/**
 * Company Profile stranica - podešavanja kompanije, SEF integracija, korisnici
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
  Building2,
  Link,
  FileText,
  Users,
  Bell,
  Shield,
  Edit,
  Save,
  Plus,
  Eye,
  EyeOff,
  Zap,
  AlertTriangle,
  Check,
  X,
  Settings,
  User,
  Monitor,
  Key,
  Lock
} from 'lucide-react';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Company {
  id: string;
  name: string;
  taxId: string;
  registrationNumber: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  bankAccount?: string;
  bankName?: string;
  logo?: string;
  settings?: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

interface CompanySettings {
  sefApiKey?: string;
  sefEnvironment?: 'demo' | 'production';
  defaultCurrency?: string;
  invoicePrefix?: string;
  invoiceStartNumber?: number;
  defaultPaymentTerms?: number;
  emailNotifications?: boolean;
  autoSendInvoices?: boolean;
  defaultVatRate?: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'AUDITOR' | 'OPERATOR';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

type TabType = 'profile' | 'sef' | 'invoicing' | 'users' | 'notifications' | 'security';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  ACCOUNTANT: 'Računovođa',
  AUDITOR: 'Revizor',
  OPERATOR: 'Operater'
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  ACCOUNTANT: 'bg-blue-100 text-blue-800',
  AUDITOR: 'bg-green-100 text-green-800',
  OPERATOR: 'bg-gray-100 text-gray-800'
};

export default function CompanyProfile() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [profileForm, setProfileForm] = useState<Partial<Company>>({});
  const [settingsForm, setSettingsForm] = useState<Partial<CompanySettings>>({});
  const [userForm, setUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'OPERATOR' as User['role'],
    password: ''
  });

  // Fetch company data
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const response = await apiClient.get<Company>('/api/company');
      return response.data;
    }
  });

  // Update profileForm when company loads
  React.useEffect(() => {
    if (company) {
      setProfileForm(company);
      setSettingsForm(company.settings || {});
    }
  }, [company]);

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: User[] }>('/api/users');
      return response.data.data || [];
    }
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Partial<Company>) => {
      const response = await apiClient.put('/api/company', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Podaci kompanije uspešno ažurirani');
      setIsEditing(false);
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Greška pri ažuriranju');
      } else {
        toast.error('Greška pri ažuriranju');
      }
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettings>) => {
      const response = await apiClient.put('/api/company/settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Podešavanja uspešno sačuvana');
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Greška pri čuvanju podešavanja');
      } else {
        toast.error('Greška pri čuvanju podešavanja');
      }
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof userForm) => {
      const response = await apiClient.post('/api/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Korisnik uspešno kreiran');
      setShowUserModal(false);
      setUserForm({ email: '', firstName: '', lastName: '', role: 'OPERATOR', password: '' });
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Greška pri kreiranju korisnika');
      } else {
        toast.error('Greška pri kreiranju korisnika');
      }
    }
  });

  // Toggle user status mutation
  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiClient.patch(`/api/users/${id}/status`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Status korisnika ažuriran');
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Greška');
      } else {
        toast.error('Greška');
      }
    }
  });

  // Test SEF connection
  const testSefMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/sef/test-connection');
      return response.data;
    },
    onSuccess: (data: { success: boolean; message?: string }) => {
      if (data.success) {
        toast.success('Konekcija sa SEF-om uspešna!');
      } else {
        toast.error('Konekcija neuspešna: ' + data.message);
      }
    },
    onError: () => {
      toast.error('Greška pri testiranju konekcije');
    }
  });

  const handleSaveProfile = () => {
    updateCompanyMutation.mutate(profileForm);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(userForm);
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profil kompanije', icon: Building2 },
    { id: 'sef' as TabType, label: 'SEF Integracija', icon: Link },
    { id: 'invoicing' as TabType, label: 'Fakturisanje', icon: FileText },
    { id: 'users' as TabType, label: 'Korisnici', icon: Users },
    { id: 'notifications' as TabType, label: 'Notifikacije', icon: Bell },
    { id: 'security' as TabType, label: 'Bezbednost', icon: Shield }
  ];

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-900 via-teal-900 to-emerald-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Podešavanja kompanije</h1>
                <p className="text-white/70 mt-1">{company?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Osnovni podaci</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? 'text-gray-600 hover:bg-gray-100' 
                      : 'text-cyan-600 hover:bg-cyan-50'
                  }`}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {isEditing ? 'Otkaži' : 'Izmeni'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naziv kompanije</label>
                  <input
                    type="text"
                    value={profileForm.name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PIB</label>
                  <input
                    type="text"
                    value={profileForm.taxId || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">PIB se ne može menjati</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matični broj</label>
                  <input
                    type="text"
                    value={profileForm.registrationNumber || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PDV broj</label>
                  <input
                    type="text"
                    value={profileForm.vatNumber || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, vatNumber: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresa</label>
                  <input
                    type="text"
                    value={profileForm.address || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grad</label>
                  <input
                    type="text"
                    value={profileForm.city || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Poštanski broj</label>
                  <input
                    type="text"
                    value={profileForm.postalCode || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, postalCode: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={profileForm.phone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Web sajt</label>
                  <input
                    type="url"
                    value={profileForm.website || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tekući račun</label>
                  <input
                    type="text"
                    value={profileForm.bankAccount || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, bankAccount: e.target.value })}
                    disabled={!isEditing}
                    placeholder="XXX-XXXXXXXXXXXXX-XX"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banka</label>
                  <input
                    type="text"
                    value={profileForm.bankName || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all duration-200"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={updateCompanyMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-cyan-500/25 transition-all duration-200"
                  >
                    {updateCompanyMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Sačuvaj izmene
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SEF Integration Tab */}
          {activeTab === 'sef' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Link className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">SEF Integracija</h3>
                      <p className="text-blue-100 mt-1">Sistem Elektronskih Faktura - Ministarstvo finansija</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                    settingsForm.sefEnvironment === 'production' 
                      ? 'bg-green-500/30 text-green-100' 
                      : 'bg-yellow-500/30 text-yellow-100'
                  }`}>
                    {settingsForm.sefEnvironment === 'production' ? (
                      <><Check className="w-4 h-4" /> Produkcija</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Demo</>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Okruženje</label>
                  <select
                    value={settingsForm.sefEnvironment || 'demo'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, sefEnvironment: e.target.value as 'demo' | 'production' })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  >
                    <option value="demo">Demo (demoefaktura.mfin.gov.rs)</option>
                    <option value="production">Produkcija (efaktura.mfin.gov.rs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Ključ</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settingsForm.sefApiKey || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, sefApiKey: e.target.value })}
                      placeholder="Unesite API ključ sa SEF portala"
                      className="w-full px-4 py-2.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => testSefMutation.mutate()}
                  disabled={testSefMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 transition-all duration-200"
                >
                  {testSefMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Testiraj konekciju
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-cyan-500/25 transition-all duration-200"
                >
                  <Save className="w-4 h-4" />
                  Sačuvaj podešavanja
                </button>
              </div>

              <div className="mt-6 p-4 bg-amber-50/80 border border-amber-200/50 rounded-xl backdrop-blur-sm">
                <div className="flex gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-800">Važno</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      API ključ možete dobiti na <a href="https://efaktura.mfin.gov.rs" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">SEF portalu</a>. 
                      Čuvajte ključ na sigurnom mestu i nemojte ga deliti.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoicing Tab */}
          {activeTab === 'invoicing' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-xl">
                  <FileText className="w-5 h-5 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Podešavanja fakturisanja</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prefiks faktura</label>
                  <input
                    type="text"
                    value={settingsForm.invoicePrefix || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, invoicePrefix: e.target.value })}
                    placeholder="npr. FAK-"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Početni broj fakture</label>
                  <input
                    type="number"
                    value={settingsForm.invoiceStartNumber || 1}
                    onChange={(e) => setSettingsForm({ ...settingsForm, invoiceStartNumber: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Podrazumevana valuta</label>
                  <select
                    value={settingsForm.defaultCurrency || 'RSD'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultCurrency: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  >
                    <option value="RSD">RSD - Srpski dinar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - Američki dolar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rok plaćanja (dana)</label>
                  <input
                    type="number"
                    value={settingsForm.defaultPaymentTerms || 15}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultPaymentTerms: parseInt(e.target.value) })}
                    min="1"
                    max="365"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Podrazumevana PDV stopa (%)</label>
                  <select
                    value={settingsForm.defaultVatRate || 20}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultVatRate: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  >
                    <option value="20">20% - Opšta stopa</option>
                    <option value="10">10% - Posebna stopa</option>
                    <option value="0">0% - Oslobođeno</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-xl border border-gray-200/50">
                  <input
                    type="checkbox"
                    id="autoSend"
                    checked={settingsForm.autoSendInvoices || false}
                    onChange={(e) => setSettingsForm({ ...settingsForm, autoSendInvoices: e.target.checked })}
                    className="w-5 h-5 text-cyan-600 border-gray-300 rounded-lg focus:ring-cyan-500 cursor-pointer"
                  />
                  <label htmlFor="autoSend" className="text-sm text-gray-700 cursor-pointer">
                    Automatski šalji fakture na SEF nakon kreiranja
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-cyan-500/25 transition-all duration-200"
                >
                  <Save className="w-4 h-4" />
                  Sačuvaj podešavanja
                </button>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-xl">
                    <Users className="w-5 h-5 text-cyan-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Korisnici sistema</h3>
                </div>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-cyan-500/25 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Novi korisnik
                </button>
              </div>

              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200/50">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Korisnik</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Uloga</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Poslednja prijava</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {Array.isArray(users) && users.map((user: User) => (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-medium shadow-md">
                                {user.firstName[0]}{user.lastName[0]}
                              </div>
                              <span className="font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${roleColors[user.role]}`}>
                              {roleLabels[user.role]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {user.isActive ? 'Aktivan' : 'Neaktivan'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString('sr-RS') : 'Nikada'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => toggleUserMutation.mutate({ id: user.id, isActive: !user.isActive })}
                              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                user.isActive 
                                  ? 'text-red-600 hover:bg-red-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {user.isActive ? 'Deaktiviraj' : 'Aktiviraj'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-xl">
                  <Bell className="w-5 h-5 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Podešavanja notifikacija</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Email notifikacije</h4>
                    <p className="text-sm text-gray-500 mt-1">Primaj obaveštenja putem email-a</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.emailNotifications ?? true}
                      onChange={(e) => setSettingsForm({ ...settingsForm, emailNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-teal-500"></div>
                  </label>
                </div>

                <div className="p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm">
                  <h4 className="font-medium text-gray-900 mb-4">Tipovi notifikacija</h4>
                  <div className="space-y-4">
                    {[
                      { id: 'invoiceSent', label: 'Faktura poslata', desc: 'Kada se faktura uspešno pošalje na SEF', icon: '📤' },
                      { id: 'invoiceAccepted', label: 'Faktura prihvaćena', desc: 'Kada kupac prihvati fakturu', icon: '✅' },
                      { id: 'invoiceRejected', label: 'Faktura odbijena', desc: 'Kada kupac odbije fakturu', icon: '❌' },
                      { id: 'paymentReceived', label: 'Plaćanje primljeno', desc: 'Kada se uplata uklopi sa fakturom', icon: '💰' },
                      { id: 'dailyReport', label: 'Dnevni izveštaj', desc: 'Sažetak dnevnih aktivnosti', icon: '📊' }
                    ].map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50/80 transition-colors">
                        <input
                          type="checkbox"
                          id={item.id}
                          defaultChecked
                          className="w-5 h-5 text-cyan-600 border-gray-300 rounded-lg focus:ring-cyan-500 cursor-pointer"
                        />
                        <div className="text-xl">{item.icon}</div>
                        <label htmlFor={item.id} className="flex-1 cursor-pointer">
                          <span className="block text-sm font-medium text-gray-800">{item.label}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">{item.desc}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-cyan-500/25 transition-all duration-200"
                >
                  <Save className="w-4 h-4" />
                  Sačuvaj podešavanja
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-xl">
                  <Shield className="w-5 h-5 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Bezbednost</h3>
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl">
                      <Key className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Dvofaktorska autentifikacija</h4>
                      <p className="text-sm text-gray-500 mt-1 mb-4">Dodatni nivo zaštite za vaš nalog</p>
                      <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all duration-200">
                        <Lock className="w-4 h-4" />
                        Omogući 2FA
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl">
                      <Monitor className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">Aktivne sesije</h4>
                      <p className="text-sm text-gray-500 mb-4">Pregled uređaja na kojima ste prijavljeni</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <Monitor className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Windows - Chrome</p>
                              <p className="text-xs text-gray-500">Trenutna sesija • Beograd, RS</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Aktivna
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl">
                      <Lock className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Promena lozinke</h4>
                      <p className="text-sm text-gray-500 mt-1 mb-4">Redovno menjajte lozinku za bolju zaštitu</p>
                      <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all duration-200">
                        <Edit className="w-4 h-4" />
                        Promeni lozinku
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Novi korisnik</h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ime</label>
                  <input
                    type="text"
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prezime</label>
                  <input
                    type="text"
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lozinka</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Uloga</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as User['role'] })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                >
                  <option value="OPERATOR">Operater</option>
                  <option value="ACCOUNTANT">Računovođa</option>
                  <option value="AUDITOR">Revizor</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-cyan-500/25 transition-all duration-200"
                >
                  {createUserMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Kreiraj korisnika
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
