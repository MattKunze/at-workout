import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";

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
        <SunIcon className="h-4 w-4" />
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
        <MoonIcon className="h-4 w-4" />
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
        <ComputerDesktopIcon className="h-4 w-4" />
        <span className="hidden sm:block">System</span>
      </label>
    </div>
  );
};