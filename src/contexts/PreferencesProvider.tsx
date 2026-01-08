import React, { useState, useCallback, useEffect } from 'react';
import { PreferencesContext, type Theme } from './PreferencesContext';

const THEME_STORAGE_KEY = 'app-theme-preference';

/**
 * Get the user's system theme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Load theme preference from localStorage
 */
function loadThemeFromStorage(): Theme {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'system'; // Default to system theme on server
  }
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (error) {
    console.error('Failed to load theme from localStorage:', error);
  }
  return 'system'; // Default to system theme
}

/**
 * Save theme preference to localStorage
 */
function saveThemeToStorage(theme: Theme): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme to localStorage:', error);
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadThemeFromStorage());
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  // Calculate the effective theme (what actually gets applied)
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  // Listen for system theme changes
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to the document
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    saveThemeToStorage(newTheme);
  }, []);

  return (
    <PreferencesContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </PreferencesContext.Provider>
  );
}
