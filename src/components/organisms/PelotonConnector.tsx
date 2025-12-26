import { usePelotonConnection } from '../../hooks/usePelotonConnection';
import { PelotonProfileCard } from '../molecules/PelotonProfileCard';
import { PelotonConnectionForm } from '../molecules/PelotonConnectionForm';
import { PelotonConnectionStatus } from '../molecules/PelotonConnectionStatus';

/**
 * Organism component that manages the full Peloton connection lifecycle.
 * Uses the usePelotonConnection hook for state management and composes
 * stateless molecule components for presentation.
 */
export function PelotonConnector() {
  const {
    connected,
    connection,
    connectionsLoading,
    profile,
    loadingProfile,
    username,
    password,
    setUsername,
    setPassword,
    loading,
    refreshing,
    error,
    handleConnect,
    handleDisconnect,
    handleRefresh,
    formatExpiry,
    isExpired,
  } = usePelotonConnection();

  // Show loading state while connections are being initialized
  if (connectionsLoading) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title">Peloton</h3>
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <span className="loading loading-spinner loading-sm"></span>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (connected && connection) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title">
            Peloton
            <div className="badge badge-success">Connected</div>
          </h3>
          
          {/* User Profile Section */}
          {loadingProfile ? (
            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <span className="loading loading-spinner loading-sm"></span>
              Loading profile...
            </div>
          ) : profile ? (
            <PelotonProfileCard profile={profile} />
          ) : null}
          
          <PelotonConnectionStatus
            connection={connection}
            error={error}
            loading={loading}
            refreshing={refreshing}
            formatExpiry={formatExpiry}
            isExpired={isExpired}
            onRefresh={handleRefresh}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h3 className="card-title">
          Peloton
          <div className="badge badge-ghost">Not Connected</div>
        </h3>
        <p className="text-sm text-base-content/70">
          Connect your Peloton account to sync your workout data.
        </p>

        <PelotonConnectionForm
          username={username}
          password={password}
          loading={loading}
          error={error}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleConnect}
        />
      </div>
    </div>
  );
}
