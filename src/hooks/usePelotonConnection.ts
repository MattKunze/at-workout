import { useState, useCallback } from 'react';
import { useConnections } from '../contexts/ConnectionsContext';
import { usePelotonProfile } from './queries/usePelotonProfile';
import { usePelotonConnect, usePelotonDisconnect, usePelotonRefreshToken } from './mutations/usePelotonMutations';
import type { PelotonUserProfile } from '../types/peloton';
import type { Connection } from '../types/connections';

export interface UsePelotonConnectionReturn {
  // Connection state
  connected: boolean;
  connection: Connection | undefined;
  connectionsLoading: boolean;
  
  // Profile state (from React Query)
  profile: PelotonUserProfile | null;
  loadingProfile: boolean;
  profileError: Error | null;
  
  // Form state
  username: string;
  password: string;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  
  // Loading and error states
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  
  // Actions
  handleConnect: (e: React.FormEvent) => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  
  // Utility functions
  formatExpiry: (expiresAt?: number) => string;
  isExpired: (expiresAt?: number) => boolean;
}

/**
 * Custom hook to manage Peloton connection state and operations.
 * Now uses React Query for data fetching, eliminating manual useEffect and abort controller logic.
 */
export function usePelotonConnection(): UsePelotonConnectionReturn {
  const { isConnected, getConnection, loading: connectionsLoading } = useConnections();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const connected = isConnected('peloton');
  const connection = getConnection('peloton');

  // Use React Query for profile fetching - enabled only when connected
  const { 
    data: profile = null, 
    isLoading: loadingProfile,
    error: profileError,
  } = usePelotonProfile(connected);

  // Mutations
  const connectMutation = usePelotonConnect();
  const disconnectMutation = usePelotonDisconnect();
  const refreshMutation = usePelotonRefreshToken();

  const handleConnect = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await connectMutation.mutateAsync({ username, password });
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [username, password, connectMutation]);

  const handleDisconnect = useCallback(async () => {
    try {
      setError(null);
      await disconnectMutation.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [disconnectMutation]);

  const handleRefresh = useCallback(async () => {
    setError(null);
    try {
      await refreshMutation.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
    }
  }, [refreshMutation]);

  const formatExpiry = useCallback((expiresAt?: number): string => {
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
  }, []);

  const isExpired = useCallback((expiresAt?: number): boolean => {
    if (!expiresAt) return false;
    return Date.now() >= expiresAt;
  }, []);

  return {
    connected,
    connection,
    connectionsLoading,
    profile,
    loadingProfile,
    profileError,
    username,
    password,
    setUsername,
    setPassword,
    loading: connectMutation.isPending || disconnectMutation.isPending,
    refreshing: refreshMutation.isPending,
    error,
    handleConnect,
    handleDisconnect,
    handleRefresh,
    formatExpiry,
    isExpired,
  };
}
