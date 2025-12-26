import { useState, useEffect, useCallback } from 'react';
import { useConnections } from '../contexts/ConnectionsContext';
import { getUserProfile, PelotonApiError } from '../services/peloton';
import type { PelotonUserProfile } from '../types/peloton';
import type { Connection } from '../types/connections';

export interface UsePelotonConnectionReturn {
  // Connection state
  connected: boolean;
  connection: Connection | undefined;
  connectionsLoading: boolean;
  
  // Profile state
  profile: PelotonUserProfile | null;
  loadingProfile: boolean;
  
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
 * Encapsulates all business logic for connecting, disconnecting, and managing Peloton account data.
 */
export function usePelotonConnection(): UsePelotonConnectionReturn {
  const { isConnected, connectPeloton, disconnectPeloton, refreshPelotonToken, getConnection, loading: connectionsLoading } = useConnections();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PelotonUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const connected = isConnected('peloton');
  const connection = getConnection('peloton');

  // Fetch user profile when connected
  useEffect(() => {
    // Create an abort controller to cancel the fetch if the component unmounts
    const abortController = new AbortController();
    let ignore = false;

    const fetchProfile = async () => {
      if (!connected) {
        setProfile(null);
        return;
      }

      setLoadingProfile(true);
      try {
        const userProfile = await getUserProfile(abortController.signal);
        // Only update state if we haven't been told to ignore this fetch
        if (!ignore) {
          setProfile(userProfile);
        }
      } catch (err) {
        // Ignore abort errors - they're expected when cleaning up
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        // Only handle errors if we haven't been told to ignore this fetch
        if (!ignore) {
          console.error('Failed to fetch Peloton profile:', err);
          if (err instanceof PelotonApiError) {
            setError(`Failed to load profile: ${err.message}`);
          }
        }
      } finally {
        if (!ignore) {
          setLoadingProfile(false);
        }
      }
    };

    fetchProfile();

    // Cleanup function: set ignore flag to prevent state updates after unmount
    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [connected]);

  const handleConnect = useCallback(async (e: React.FormEvent) => {
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
  }, [username, password, connectPeloton]);

  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    try {
      await disconnectPeloton();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  }, [disconnectPeloton]);

  const handleRefresh = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      await refreshPelotonToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
    } finally {
      setRefreshing(false);
    }
  }, [refreshPelotonToken]);

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
  };
}
