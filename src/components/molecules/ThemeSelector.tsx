import { Monitor, Moon, Sun } from "lucide-react";

export const ThemeSelector = () => {
  return (
    <div className="join">
      <label className="join-item btn btn-sm has-[:checked]:btn-accent">
        <input
          type="radio"
          name="theme-buttons"
          className="theme-controller hidden"
          aria-label="Light"
          value="light"
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
          value="default"
        />
        <Monitor className="h-4 w-4" />
        <span className="hidden sm:block">System</span>
      </label>
    </div>
  );
};