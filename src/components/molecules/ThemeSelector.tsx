import { Monitor, Moon, Sun } from "lucide-react";
import { usePreferences } from "../../contexts/PreferencesContext";

export const ThemeSelector = () => {
  const { theme, setTheme } = usePreferences();

  return (
    <div className="join">
      <label className="join-item btn btn-sm has-[:checked]:btn-accent">
        <input
          type="radio"
          name="theme-buttons"
          className="theme-controller hidden"
          aria-label="Light"
          value="light"
          checked={theme === 'light'}
          onChange={(e) => setTheme(e.target.value as 'light')}
        />
        <Sun className="h-4 w-4" />
        <span className="hidden sm:block">Light</span>
      </label>
      <label className="join-item btn btn-sm has-[:checked]:btn-accent">
        <input
          type="radio"
          name="theme-buttons"
          className="theme-controller hidden"
          aria-label="Dark"
          value="dark"
          checked={theme === 'dark'}
          onChange={(e) => setTheme(e.target.value as 'dark')}
        />
        <Moon className="h-4 w-4" />
        <span className="hidden sm:block">Dark</span>
      </label>
      <label className="join-item btn btn-sm has-[:checked]:btn-accent">
        <input
          type="radio"
          name="theme-buttons"
          className="theme-controller hidden"
          aria-label="System"
          value="system"
          checked={theme === 'system'}
          onChange={(e) => setTheme(e.target.value as 'system')}
        />
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:block">System</span>
      </label>
    </div>
  );
};