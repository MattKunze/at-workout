import { ThemeSelector } from "../components/molecules/ThemeSelector";
import { ConnectionsPanel } from "../components/organisms/ConnectionsPanel";

export default function Preferences() {
  return (
    <div className="space-y-8">
      <div className="prose">
        <h1>User Preferences</h1>
      </div>

      {/* Connected Services Section */}
      <div className="max-w-2xl">
        <ConnectionsPanel />
      </div>

      {/* Other Preferences */}
      <div className="prose max-w-2xl">
        <h2>Settings</h2>

        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Theme</span>
          </label>
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
