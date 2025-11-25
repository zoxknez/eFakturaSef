import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    name: 'Početna',
    href: '/',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
      </svg>
    ),
  },
  {
    name: 'Fakture',
    href: '/invoices',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM9.75 14.25a.75.75 0 000 1.5H15a.75.75 0 000-1.5H9.75z" clipRule="evenodd" />
        <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
      </svg>
    ),
  },
  {
    name: 'Nova',
    href: '/invoices/new',
    icon: (
      <div className="w-12 h-12 -mt-4 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
    ),
  },
  {
    name: 'Partneri',
    href: '/partners',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
      </svg>
    ),
  },
  {
    name: 'Više',
    href: '#more',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
  },
];

export const MobileNavigation: React.FC<{ onMoreClick?: () => void }> = ({ onMoreClick }) => {
  const location = useLocation();

  return (
    <nav className="mobile-nav lg:hidden">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        const isCreateButton = item.href === '/invoices/new';
        const isMoreButton = item.href === '#more';

        if (isMoreButton) {
          return (
            <button
              key={item.name}
              onClick={onMoreClick}
              className="mobile-nav-item"
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          );
        }

        if (isCreateButton) {
          return (
            <Link
              key={item.name}
              to={item.href}
              className="flex flex-col items-center justify-center px-2"
            >
              {item.icon}
            </Link>
          );
        }

        return (
          <Link
            key={item.name}
            to={item.href}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            {isActive && item.activeIcon ? item.activeIcon : item.icon}
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

// More Menu Bottom Sheet
export const MobileMoreMenu: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const menuItems = [
    { name: 'Proizvodi', href: '/products', icon: '📦' },
    { name: 'Bankovni izvodi', href: '/bank-statements', icon: '🏦' },
    { name: 'PDV Evidencija', href: '/vat', icon: '📋' },
    { name: 'Starosna analiza', href: '/aging', icon: '📊' },
    { name: 'Tok novca', href: '/cash-flow', icon: '💰' },
    { name: 'Knjižna odobrenja', href: '/credit-notes', icon: '📄' },
    { name: 'Notifikacije', href: '/notifications', icon: '🔔' },
    { name: 'Profil kompanije', href: '/company', icon: '🏢' },
    { name: 'Podešavanja', href: '/settings', icon: '⚙️' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="bottom-sheet z-50 lg:hidden">
        <div className="bottom-sheet-handle" />
        
        <div className="px-4 pb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Više opcija</h3>
          
          <div className="grid grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-medium text-gray-700 text-center">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;
