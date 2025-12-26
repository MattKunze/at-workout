import type { Connection } from '../../types/connections';

interface PelotonConnectionStatusProps {
  connection: Connection;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  formatExpiry: (expiresAt?: number) => string;
  isExpired: (expiresAt?: number) => boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
}

/**
 * Stateless molecule component that displays connection status and token information.
 * Prop-driven and contains no business logic or lifecycle methods.
 */
export function PelotonConnectionStatus({
  connection,
  error,
  loading,
  refreshing,
  formatExpiry,
  isExpired,
  onRefresh,
  onDisconnect,
}: PelotonConnectionStatusProps) {
  const expired = isExpired(connection.expiresAt);

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm text-base-content/70">
          Connected on {new Date(connection.connectedAt).toLocaleDateString()}
        </p>
        <div className="text-sm">
          <span className="text-base-content/70">Token expires: </span>
          <span className={expired ? 'text-error font-semibold' : 'text-base-content'}>
            {formatExpiry(connection.expiresAt)}
          </span>
          {expired && <span className="ml-2 text-error">(Needs refresh)</span>}
        </div>
        {connection.expiresAt && (
          <p className="text-xs text-base-content/50">
            {new Date(connection.expiresAt).toLocaleString()}
          </p>
        )}
      </div>
      
      {error && (
        <div className="alert alert-error">
          <span className="text-sm">{error}</span>
        </div>
      )}
      
      <div className="card-actions justify-end">
        <button
          className="btn btn-primary btn-sm"
          onClick={onRefresh}
          disabled={loading || refreshing || !connection.refreshToken}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Token'}
        </button>
        <button
          className="btn btn-error btn-sm"
          onClick={onDisconnect}
          disabled={loading || refreshing}
        >
          {loading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    </>
  );
}
