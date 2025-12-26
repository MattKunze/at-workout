import React, { useState, useCallback, useEffect } from 'react';
import type { Connection } from '../types/connections';
import { ConnectionsContext } from './ConnectionsContext';
import {
  saveConnection,
  getConnection,
  removeConnection,
  listConnections,
} from '../services/storage';

export function ConnectionsProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<Map<string, Connection>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load connections from storage on mount
  useEffect(() => {
    const loadConnections = () => {
      const services = listConnections();
      const loadedConnections = new Map<string, Connection>();
      
      for (const service of services) {
        const connection = getConnection(service);
        if (connection) {
          loadedConnections.set(service, connection);
        }
      }
      
      setConnections(loadedConnections);
      setLoading(false);
    };
    
    loadConnections();
  }, []);

  const connectPeloton = useCallback(async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await fetch('/api/peloton/connect', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json() as {
      success: boolean;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
      error?: string;
    };
    
    if (!result.success || !result.accessToken) {
      throw new Error(result.error || 'Failed to connect to Peloton');
    }
    
    // Calculate expiration timestamp
    const expiresAt = result.expiresIn 
      ? Date.now() + (result.expiresIn * 1000)
      : undefined;
    
    const connection: Connection = {
      service: 'peloton',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt,
      connectedAt: Date.now(),
    };
    
    saveConnection('peloton', connection);
    setConnections(prev => new Map(prev).set('peloton', connection));
  }, []);

  const disconnectPeloton = useCallback(async () => {
    removeConnection('peloton');
    setConnections(prev => {
      const newMap = new Map(prev);
      newMap.delete('peloton');
      return newMap;
    });
  }, []);

  const refreshPelotonToken = useCallback(async () => {
    const connection = connections.get('peloton');
    
    if (!connection || !connection.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const formData = new FormData();
    formData.append('refreshToken', connection.refreshToken);
    
    const response = await fetch('/api/peloton/refresh', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json() as {
      success: boolean;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
      error?: string;
    };
    
    if (!result.success || !result.accessToken) {
      throw new Error(result.error || 'Failed to refresh Peloton token');
    }
    
    // Calculate new expiration timestamp
    const expiresAt = result.expiresIn 
      ? Date.now() + (result.expiresIn * 1000)
      : undefined;
    
    const updatedConnection: Connection = {
      ...connection,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || connection.refreshToken,
      expiresAt,
    };
    
    saveConnection('peloton', updatedConnection);
    setConnections(prev => new Map(prev).set('peloton', updatedConnection));
  }, [connections]);

  const isConnected = useCallback((service: string) => {
    return connections.has(service);
  }, [connections]);

  const getConnectionById = useCallback((service: string) => {
    return connections.get(service);
  }, [connections]);

  return (
    <ConnectionsContext.Provider
      value={{
        connections,
        loading,
        connectPeloton,
        disconnectPeloton,
        refreshPelotonToken,
        isConnected,
        getConnection: getConnectionById,
      }}
    >
      {children}
    </ConnectionsContext.Provider>
  );
}
