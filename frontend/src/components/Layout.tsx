import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MobileNavigation, MobileMoreMenu } from './MobileNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | string;
  children?: NavItem[];
}

// SVG Icons as components for better quality
const Icons = {
  dashboard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  invoice: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  add: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  partners: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  products: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  accounting: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  bank: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  link: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  cash: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  chart: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  vat: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>,
  credit: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>,
  bell: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  company: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  audit: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  list: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
  book: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  reports: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  form: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  chevronDown: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  logout: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  search: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  repeat: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  download: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  calculator: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  fixedAssets: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
};

const navigation: NavItem[] = [
  { name: 'Komandna tabla', href: '/', icon: Icons.dashboard },
  { name: 'Fakture', href: '/invoices', icon: Icons.invoice, badge: 3 },
  { name: 'Ulazne Fakture', href: '/incoming-invoices', icon: Icons.download },
  { name: 'Nova faktura', href: '/invoices/new', icon: Icons.add },
  { name: 'Avansne fakture', href: '/advance-invoices', icon: Icons.invoice },
  { name: 'Periodične Fakture', href: '/recurring-invoices', icon: Icons.repeat },
  { name: 'Partneri', href: '/partners', icon: Icons.partners },
  { name: 'Proizvodi', href: '/products', icon: Icons.products },
  { name: 'Kalkulacije', href: '/calculations', icon: Icons.calculator },
  { name: 'Osnovna sredstva', href: '/fixed-assets', icon: Icons.fixedAssets },
  { 
    name: 'Računovodstvo', 
    href: '/accounting', 
    icon: Icons.accounting,
    children: [
      { name: 'Kontni plan', href: '/accounting/chart-of-accounts', icon: Icons.list },
      { name: 'Dnevnik knjiženja', href: '/accounting/journal', icon: Icons.book },
      { name: 'Finansijski izveštaji', href: '/accounting/reports', icon: Icons.reports },
      { name: 'KPO knjiga', href: '/kpo', icon: Icons.book },
    ]
  },
  { name: 'Bankovni izvodi', href: '/bank-statements', icon: Icons.bank },
  { name: 'Uparivanje', href: '/bank-reconciliation', icon: Icons.link },
  { name: 'Kompenzacije', href: '/compensations', icon: Icons.link },
  { name: 'IOS', href: '/ios', icon: Icons.form },
  { name: 'Tok novca', href: '/cash-flow-forecast', icon: Icons.cash },
  { name: 'Blagajna', href: '/petty-cash', icon: Icons.cash },
  { name: 'Kursna lista', href: '/exchange-rates', icon: Icons.chart },
  { name: 'Starosna analiza', href: '/aging', icon: Icons.chart },
  { 
    name: 'PDV', 
    href: '/vat', 
    icon: Icons.vat,
    children: [
      { name: 'PDV evidencija', href: '/vat', icon: Icons.list },
      { name: 'PP-PDV obrazac', href: '/pppdv', icon: Icons.form },
    ]
  },
  { name: 'Knjižna odobrenja', href: '/credit-notes', icon: Icons.credit },
  { name: 'Putni nalozi', href: '/travel-orders', icon: Icons.form },
  { name: 'Email obaveštenja', href: '/email-notifications', icon: Icons.bell },
  { name: 'Notifikacije', href: '/notifications', icon: Icons.bell, badge: 5 },
  { 
    name: 'Administracija', 
    href: '/admin', 
    icon: Icons.settings,
    children: [
      { name: 'Profil kompanije', href: '/company', icon: Icons.company },
      { name: 'Audit log', href: '/audit-logs', icon: Icons.audit },
      { name: 'Podešavanja', href: '/settings', icon: Icons.settings },
    ]
  },
];

// Flatten navigation for page title lookup
const flatNavigation = navigation.flatMap(item => 
  item.children ? [item, ...item.children] : [item]
);

// Enhanced Navigation Item Component
const NavigationItem = React.memo<{ item: NavItem; isActive: boolean; isChildActive?: boolean; collapsed?: boolean }>(
  ({ item, isActive, isChildActive, collapsed }) => {
    const [isExpanded, setIsExpanded] = useState(isChildActive || false);
    const location = useLocation();
    
    useEffect(() => {
      if (isChildActive) setIsExpanded(true);
    }, [isChildActive]);
    
    if (item.children) {
      return (
        <div className="space-y-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
              isChildActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={`flex-shrink-0 ${isChildActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
              {item.icon}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.name}</span>
                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  {Icons.chevronDown}
                </span>
              </>
            )}
          </button>
          {isExpanded && !collapsed && (
            <div className="ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  to={child.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    location.pathname === child.href
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className={location.pathname === child.href ? 'text-white' : 'text-gray-400'}>
                    {child.icon}
                  </span>
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <Link
        to={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
          {item.icon}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {item.badge}
              </span>
            )}
          </>
        )}
        {isActive && (
          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80" />
        )}
      </Link>
    );
  }
);

NavigationItem.displayName = 'NavigationItem';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 shadow-xl shadow-gray-200/50 transform transition-transform duration-300 ease-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
                  <span className="text-white font-black text-xl">S</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">✓</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">SEF Portal</h1>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">eFakture Srbija</p>
              </div>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-4">
            <button 
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 text-sm transition-colors"
            >
              {Icons.search}
              <span>Pretraži...</span>
              <kbd className="ml-auto text-xs font-medium bg-white px-2 py-0.5 rounded border border-gray-200">⌘K</kbd>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-thin">
            <div className="mb-4">
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Glavni meni</p>
              {navigation.slice(0, 5).map((item) => {
                const isChildActive = item.children?.some(child => location.pathname === child.href);
                return (
                  <NavigationItem
                    key={item.name}
                    item={item}
                    isActive={location.pathname === item.href}
                    isChildActive={isChildActive}
                  />
                );
              })}
            </div>
            
            <div className="mb-4">
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Finansije</p>
              {navigation.slice(5, 11).map((item) => {
                const isChildActive = item.children?.some(child => location.pathname === child.href);
                return (
                  <NavigationItem
                    key={item.name}
                    item={item}
                    isActive={location.pathname === item.href}
                    isChildActive={isChildActive}
                  />
                );
              })}
            </div>
            
            <div>
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sistem</p>
              {navigation.slice(11).map((item) => {
                const isChildActive = item.children?.some(child => location.pathname === child.href);
                return (
                  <NavigationItem
                    key={item.name}
                    item={item}
                    isActive={location.pathname === item.href}
                    isChildActive={isChildActive}
                  />
                );
              })}
            </div>
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-50 transition-colors cursor-pointer group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <span className="text-white text-sm font-bold">
                    {user?.firstName?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Admin User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@example.com'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Odjavi se"
              >
                {Icons.logout}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Top header */}
      <header className="fixed top-0 right-0 left-0 lg:left-72 bg-white/80 backdrop-blur-xl border-b border-gray-100 z-40 h-16">
        <div className="px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              
              {/* Breadcrumb / Page Title */}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">
                  {flatNavigation.find(item => item.href === location.pathname)?.name || 'SEF Portal'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Environment indicator */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/25">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                Demo okruženje
              </div>
              
              {/* Notifications */}
              <button className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                {Icons.bell}
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              </button>

              {/* Quick add */}
              <Link 
                to="/invoices/new"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all"
              >
                {Icons.add}
                Nova faktura
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="lg:pl-72 pt-16 pb-20 lg:pb-0">
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation onMoreClick={() => setMoreMenuOpen(true)} />
      
      {/* Mobile More Menu Bottom Sheet */}
      <MobileMoreMenu isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />

      {/* Global search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-gray-100">
              {Icons.search}
              <input
                type="text"
                placeholder="Pretražite fakture, partnere..."
                className="flex-1 text-base sm:text-lg outline-none"
                autoFocus
              />
              <kbd className="hidden sm:inline text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">ESC</kbd>
            </div>
            <div className="p-4 text-center text-gray-500 text-sm">
              Počnite da kucate za pretragu...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};