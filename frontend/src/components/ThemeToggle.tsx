// Theme toggle component
import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

export function ThemeToggle() {
  const { theme, setTheme } = useDarkMode();

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Svetla tema' },
    { value: 'dark' as const, icon: Moon, label: 'Tamna tema' },
    { value: 'system' as const, icon: Monitor, label: 'Sistemska tema' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`
            p-2 rounded-md transition-colors
            ${
              theme === value
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
          `}
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

// Simple toggle button (moon/sun only)
export function SimpleThemeToggle() {
  const { isDark, setTheme } = useDarkMode();

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={isDark ? 'Prebaci na svetlu temu' : 'Prebaci na tamnu temu'}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}



