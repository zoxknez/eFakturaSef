/**
 * Chart of Accounts Page (Kontni Plan)
 * Serbian accounting standard chart of accounts management
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  X,
  BookOpen,
  Filter,
  RotateCcw,
  Settings,
  AlertCircle
} from 'lucide-react';

// Account type colors
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: 'bg-blue-100 text-blue-800',
  LIABILITY: 'bg-red-100 text-red-800',
  EQUITY: 'bg-purple-100 text-purple-800',
  REVENUE: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-orange-100 text-orange-800',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: 'Aktiva',
  LIABILITY: 'Pasiva',
  EQUITY: 'Kapital',
  REVENUE: 'Prihodi',
  EXPENSE: 'Rashodi',
};

// Serbian account class labels
const ACCOUNT_CLASSES: Record<string, string> = {
  '0': 'Neuplaćeni upisani kapital i dugoročna imovina',
  '1': 'Zalihe',
  '2': 'Kratkoročna potraživanja, plasmani i gotovina',
  '3': 'Kapital',
  '4': 'Dugoročna rezervisanja i obaveze',
  '5': 'Rashodi',
  '6': 'Prihodi',
  '7': 'Otvaranje i zaključak računa',
  '8': 'Vanbilansna aktiva',
  '9': 'Vanbilansna pasiva',
};

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  normalSide: string;
  level: number;
  parentId: string | null;
  isActive: boolean;
  description?: string;
  children?: Account[];
}

interface AccountFormData {
  code: string;
  name: string;
  type: string;
  description: string;
  parentId: string;
}

export const ChartOfAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set(['0', '1', '2', '3', '4', '5', '6']));
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    code: '',
    name: '',
    type: 'ASSET',
    description: '',
    parentId: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounting/accounts?flat=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch accounts');
      
      const data = await response.json();
      setAccounts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju');
    } finally {
      setLoading(false);
    }
  };

  const initializeAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounting/accounts/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to initialize accounts');
      
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri inicijalizaciji');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAccount 
        ? `/api/accounting/accounts/${editingAccount.id}`
        : '/api/accounting/accounts';
      
      const response = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save account');

      setShowModal(false);
      setEditingAccount(null);
      setFormData({ code: '', name: '', type: 'ASSET', description: '', parentId: '' });
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju');
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description || '',
      parentId: account.parentId || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj konto?')) return;
    
    try {
      const response = await fetch(`/api/accounting/accounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete account');
      
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri brisanju');
    }
  };

  const toggleClass = (classCode: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classCode)) {
        newSet.delete(classCode);
      } else {
        newSet.add(classCode);
      }
      return newSet;
    });
  };

  // Group accounts by class
  const groupedAccounts = useMemo(() => {
    const filtered = accounts.filter(account => {
      const matchesSearch = searchTerm === '' || 
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === '' || account.type === selectedType;
      return matchesSearch && matchesType;
    });

    const groups: Record<string, Account[]> = {};
    filtered.forEach(account => {
      const classCode = account.code.charAt(0);
      if (!groups[classCode]) groups[classCode] = [];
      groups[classCode].push(account);
    });

    // Sort accounts within each group
    Object.values(groups).forEach(group => {
      group.sort((a, b) => a.code.localeCompare(b.code));
    });

    return groups;
  }, [accounts, searchTerm, selectedType]);

  if (loading && accounts.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-violet-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Kontni Plan</h1>
                <p className="text-white/70 mt-1">Upravljanje kontima po srpskim računovodstvenim standardima</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              {accounts.length === 0 && (
                <button
                  onClick={initializeAccounts}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-all duration-200 shadow-lg"
                >
                  <Settings className="w-4 h-4" />
                  <span>Inicijalizuj</span>
                </button>
              )}
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setFormData({ code: '', name: '', type: 'ASSET', description: '', parentId: '' });
                  setShowModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-900 rounded-xl hover:bg-white/90 transition-all duration-200 shadow-lg font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Novi konto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-slideIn">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filteri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pretraga</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Šifra ili naziv konta..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tip konta</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            >
              <option value="">Svi tipovi</option>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('');
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resetuj filtere</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Classes */}
      <div className="space-y-4">
        {Object.entries(ACCOUNT_CLASSES).map(([classCode, className]) => {
          const classAccounts = groupedAccounts[classCode] || [];
          const isExpanded = expandedClasses.has(classCode);
          
          if (classAccounts.length === 0 && searchTerm) return null;

          return (
            <div key={classCode} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
              {/* Class Header */}
              <button
                onClick={() => toggleClass(classCode)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold rounded-xl shadow-lg">
                    {classCode}
                  </span>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{className}</h3>
                    <p className="text-sm text-gray-500">{classAccounts.length} konta</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Accounts List */}
              {isExpanded && classAccounts.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {classAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="px-6 py-3 flex items-center justify-between hover:bg-indigo-50/50 transition-all duration-200 group"
                      style={{ paddingLeft: `${24 + (account.level - 1) * 24}px` }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <code className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg font-mono text-sm">
                          {account.code}
                        </code>
                        <span className="text-gray-900">{account.name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ACCOUNT_TYPE_COLORS[account.type]}`}>
                          {ACCOUNT_TYPE_LABELS[account.type]}
                        </span>
                        {!account.isActive && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                            Neaktivan
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all duration-200"
                          title="Izmeni"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200"
                          title="Obriši"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && classAccounts.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Nema konta u ovoj klasi
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(ACCOUNT_TYPE_LABELS).map(([type, label]) => {
          const count = accounts.filter(a => a.type === type).length;
          return (
            <div key={type} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-5 text-center hover:shadow-xl transition-all duration-200">
              <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium ${ACCOUNT_TYPE_COLORS[type]}`}>
                {label}
              </div>
              <div className="mt-3 text-3xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-500">konta</div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingAccount ? 'Izmeni konto' : 'Novi konto'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Šifra konta *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="npr. 2020"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naziv konta *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="npr. Kupci u zemlji"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tip konta *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  >
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opis</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
                  >
                    {editingAccount ? 'Sačuvaj' : 'Kreiraj'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;
