import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface PreferencesContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark'; // The actual theme being applied (system resolves to light or dark)
}

export const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
