import { useState } from 'react';
import { useConnections } from '../../contexts/ConnectionsContext';

export function PelotonConnector() {
  const { isConnected, connectPeloton, disconnectPeloton, refreshPelotonToken, getConnection } = useConnections();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = isConnected('peloton');
  const connection = getConnection('peloton');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await connectPeloton(username, password);
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectPeloton();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setError(null);
    setRefreshing(true);
    try {
      await refreshPelotonToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
    } finally {
      setRefreshing(false);
    }
  };

  const formatExpiry = (expiresAt?: number) => {
    if (!expiresAt) {
      return 'Unknown';
    }
    
    const now = Date.now();
    const diffMs = expiresAt - now;
    
    if (diffMs < 0) {
      return 'Expired';
    }
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const isExpired = (expiresAt?: number) => {
    if (!expiresAt) return false;
    return Date.now() >= expiresAt;
  };

  if (connected && connection) {
    const expired = isExpired(connection.expiresAt);
    
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title">
            Peloton
            <div className="badge badge-success">Connected</div>
          </h3>
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
              onClick={handleRefresh}
              disabled={loading || refreshing || !connection.refreshToken}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Token'}
            </button>
            <button
              className="btn btn-error btn-sm"
              onClick={handleDisconnect}
              disabled={loading || refreshing}
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
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

        <form onSubmit={handleConnect} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Username or Email</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !username || !password}
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
