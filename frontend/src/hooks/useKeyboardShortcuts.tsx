// Keyboard shortcuts hook
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

/**
 * Register keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Global keyboard shortcuts for the app
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'k',
      ctrl: true,
      description: 'Pretraga',
      action: () => {
        // Open search modal
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      },
    },
    {
      key: 'n',
      ctrl: true,
      description: 'Nova faktura',
      action: () => navigate('/invoices/new'),
    },
    {
      key: 'h',
      ctrl: true,
      shift: true,
      description: 'Početna',
      action: () => navigate('/'),
    },
    {
      key: 'i',
      ctrl: true,
      shift: true,
      description: 'Fakture',
      action: () => navigate('/invoices'),
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      description: 'Podešavanja',
      action: () => navigate('/settings'),
    },
    {
      key: '/',
      ctrl: false,
      description: 'Fokus na pretragu',
      action: () => {
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        searchInput?.focus();
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

/**
 * Keyboard shortcuts help modal data
 */
export function getShortcutGroups() {
  return [
    {
      group: 'Navigacija',
      shortcuts: [
        { keys: ['Ctrl', 'Shift', 'H'], description: 'Početna strana' },
        { keys: ['Ctrl', 'Shift', 'I'], description: 'Lista faktura' },
        { keys: ['Ctrl', 'Shift', 'S'], description: 'Podešavanja' },
      ],
    },
    {
      group: 'Akcije',
      shortcuts: [
        { keys: ['Ctrl', 'N'], description: 'Nova faktura' },
        { keys: ['Ctrl', 'K'], description: 'Pretraga' },
        { keys: ['/'], description: 'Fokus na pretragu' },
      ],
    },
    {
      group: 'Tabela',
      shortcuts: [
        { keys: ['↑', '↓'], description: 'Navigacija kroz redove' },
        { keys: ['Enter'], description: 'Otvori selektovani red' },
        { keys: ['Space'], description: 'Selektuj/deselektuj red' },
      ],
    },
  ];
}

