import { ThemeSelector } from "../components/molecules/ThemeSelector";
import { ConnectionsPanel } from "../components/organisms/ConnectionsPanel";

export default function Preferences() {
  return (
    <div className="space-y-8">
      {/* Connected Services Section */}
      <div className="max-w-2xl">
        <ConnectionsPanel />
      </div>

      {/* Other Preferences */}
      <div className="prose max-w-2xl">
        <h2>Settings</h2>

        <div className="form-control w-full max-w-xs">
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
