/**
 * Global Search Component with Command Palette
 * Provides fuzzy search across all entities
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

interface SearchResult {
  id: string;
  type: 'invoice' | 'partner' | 'product' | 'page' | 'action';
  title: string;
  subtitle?: string;
  icon: string;
  url?: string;
  action?: () => void;
  keywords?: string[];
}

// Predefined pages and actions for quick access
const staticResults: SearchResult[] = [
  { id: 'page-dashboard', type: 'page', title: 'Komandna tabla', subtitle: 'Početna stranica', icon: '📊', url: '/', keywords: ['home', 'dashboard', 'pocetna'] },
  { id: 'page-sef', type: 'page', title: 'SEF Portal', subtitle: 'Sistem Elektronskih Faktura', icon: '🏛️', url: '/sef', keywords: ['sef', 'efaktura', 'elektronska', 'portal', 'api'] },
  { id: 'page-invoices', type: 'page', title: 'Fakture', subtitle: 'Lista svih faktura', icon: '📄', url: '/invoices', keywords: ['invoice', 'racun', 'lista'] },
  { id: 'page-new-invoice', type: 'action', title: 'Nova faktura', subtitle: 'Kreiraj novu fakturu', icon: '➕', url: '/invoices/new', keywords: ['new', 'nova', 'create', 'kreiraj'] },
  { id: 'page-partners', type: 'page', title: 'Partneri', subtitle: 'Šifarnik partnera', icon: '👥', url: '/partners', keywords: ['partner', 'buyer', 'kupac', 'dobavljac'] },
  { id: 'page-products', type: 'page', title: 'Proizvodi', subtitle: 'Šifarnik proizvoda', icon: '📦', url: '/products', keywords: ['product', 'proizvod', 'artikal', 'usluga'] },
  { id: 'page-accounting', type: 'page', title: 'Kontni plan', subtitle: 'Računovodstvo', icon: '📑', url: '/accounting/chart-of-accounts', keywords: ['account', 'konto', 'racunovodstvo'] },
  { id: 'page-journal', type: 'page', title: 'Dnevnik knjiženja', subtitle: 'Nalozi za knjiženje', icon: '📖', url: '/accounting/journal', keywords: ['journal', 'dnevnik', 'knjizenje', 'nalog'] },
  { id: 'page-reports', type: 'page', title: 'Izveštaji', subtitle: 'Finansijski izveštaji', icon: '📈', url: '/accounting/reports', keywords: ['report', 'izvestaj', 'bilans'] },
  { id: 'page-vat', type: 'page', title: 'PDV evidencija', subtitle: 'Porez na dodatu vrednost', icon: '💰', url: '/vat', keywords: ['vat', 'pdv', 'porez', 'tax'] },
  { id: 'page-bank', type: 'page', title: 'Bankovni izvodi', subtitle: 'Import i pregled izvoda', icon: '🏦', url: '/bank-statements', keywords: ['bank', 'izvod', 'statement'] },
  { id: 'page-cashflow', type: 'page', title: 'Tok novca', subtitle: 'Projekcija novčanih tokova', icon: '💵', url: '/cash-flow', keywords: ['cash', 'flow', 'tok', 'novac', 'prognoza'] },
  { id: 'page-settings', type: 'page', title: 'Podešavanja', subtitle: 'Sistemska podešavanja', icon: '⚙️', url: '/settings', keywords: ['settings', 'podesavanja', 'config'] },
  { id: 'page-company', type: 'page', title: 'Profil kompanije', subtitle: 'Podaci o preduzeću', icon: '🏢', url: '/company', keywords: ['company', 'firma', 'preduzece', 'profil'] },
  { id: 'page-notifications', type: 'page', title: 'Notifikacije', subtitle: 'Obaveštenja', icon: '🔔', url: '/notifications', keywords: ['notification', 'obaveštenje', 'alert'] },
];

// Simple fuzzy search function
const fuzzySearch = (query: string, items: SearchResult[]): SearchResult[] => {
  if (!query.trim()) return items.slice(0, 8);
  
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  return items
    .map(item => {
      let score = 0;
      const searchText = [
        item.title,
        item.subtitle,
        ...(item.keywords || [])
      ].join(' ').toLowerCase();
      
      for (const word of words) {
        if (searchText.includes(word)) {
          score += word.length;
          // Bonus for exact title match
          if (item.title.toLowerCase().includes(word)) score += 5;
          // Bonus for start match
          if (item.title.toLowerCase().startsWith(word)) score += 10;
        }
      }
      
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, 10);
};

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Search when query changes
  useEffect(() => {
    const searchResults = fuzzySearch(query, staticResults);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          const result = results[selectedIndex];
          if (result.url) {
            navigate(result.url);
          } else if (result.action) {
            result.action();
          }
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, navigate, onClose]);

  const handleSelect = (result: SearchResult) => {
    if (result.url) {
      navigate(result.url);
    } else if (result.action) {
      result.action();
    }
    onClose();
  };

  if (!isOpen) return null;

  const typeLabels: Record<string, string> = {
    invoice: 'Faktura',
    partner: 'Partner',
    product: 'Proizvod',
    page: 'Stranica',
    action: 'Akcija',
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pretražite fakture, partnere, stranice..."
            className="flex-1 text-lg outline-none bg-transparent"
            autoComplete="off"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
              ↑↓
            </kbd>
            <kbd className="hidden sm:inline px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
              Enter
            </kbd>
            <kbd className="hidden sm:inline px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-3 text-gray-500">Pretraga...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium">Nema rezultata</p>
              <p className="text-sm mt-1">Pokušajte sa drugim terminom</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors ${
                    index === selectedIndex 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    result.type === 'action' 
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {typeLabels[result.type]}
                  </span>
                  {index === selectedIndex && (
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">Tab</kbd>
              za navigaciju
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">?</kbd>
              za pomoć
            </span>
          </div>
          <span>Pritisnite <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">⌘K</kbd> bilo gde</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GlobalSearch;
