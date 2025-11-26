/**
 * Keyboard Shortcuts Hook
 * Provides global keyboard shortcuts throughout the application
 */
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

// Global shortcuts registry
const globalShortcuts: ShortcutConfig[] = [];

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  // Define shortcuts
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'k',
      ctrl: true,
      action: () => {
        const searchEvent = new CustomEvent('openGlobalSearch');
        window.dispatchEvent(searchEvent);
      },
      description: 'Otvori globalnu pretragu',
    },
    {
      key: 'n',
      ctrl: true,
      shift: true,
      action: () => navigate('/invoices/new'),
      description: 'Nova faktura',
    },
    {
      key: 'h',
      ctrl: true,
      action: () => navigate('/'),
      description: 'Idi na početnu',
    },
    {
      key: 'i',
      ctrl: true,
      action: () => navigate('/invoices'),
      description: 'Lista faktura',
    },
    {
      key: 'p',
      ctrl: true,
      shift: true,
      action: () => navigate('/partners'),
      description: 'Partneri',
    },
    {
      key: '?',
      shift: true,
      action: () => {
        const helpEvent = new CustomEvent('openKeyboardHelp');
        window.dispatchEvent(helpEvent);
      },
      description: 'Prikaži prečice na tastaturi',
    },
    {
      key: 'Escape',
      action: () => {
        const escEvent = new CustomEvent('escapePressed');
        window.dispatchEvent(escEvent);
      },
      description: 'Zatvori modal/dijalog',
    },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape in inputs
      if (event.key !== 'Escape') return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      
      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
};

// Hook for registering custom shortcuts
export const useCustomShortcut = (config: ShortcutConfig) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (event.key !== 'Escape') return;
      }

      const ctrlMatch = config.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = config.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = config.alt ? event.altKey : !event.altKey;

      if (
        event.key.toLowerCase() === config.key.toLowerCase() &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault();
        config.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
};

export default useKeyboardShortcuts;
