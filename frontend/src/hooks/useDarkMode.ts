import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'sef-theme-preference';

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      return stored || 'system';
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const getSystemTheme = (): boolean => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    const applyTheme = (newTheme: Theme) => {
      const dark = newTheme === 'system' ? getSystemTheme() : newTheme === 'dark';
      setIsDark(dark);
      
      root.classList.remove('light', 'dark');
      root.classList.add(dark ? 'dark' : 'light');
      
      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', dark ? '#1f2937' : '#ffffff');
      }
    };

    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const toggleDarkMode = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return { theme, isDark, setTheme, toggleDarkMode };
}
