import { PelotonConnector } from '../molecules/PelotonConnector';

export function ConnectionsPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Connected Services</h2>
        <p className="text-base-content/70 mb-6">
          Connect your fitness accounts to sync and manage your workout data.
        </p>
      </div>

      <PelotonConnector />
      
      {/* Future connections can be added here */}
    </div>
  );
}
