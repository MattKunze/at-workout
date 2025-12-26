import { createContext, useContext } from 'react';
import type { Connection } from '../types/connections';

export interface ConnectionsContextType {
  connections: Map<string, Connection>;
  loading: boolean;
  connectPeloton: (username: string, password: string) => Promise<void>;
  disconnectPeloton: () => Promise<void>;
  refreshPelotonToken: () => Promise<void>;
  isConnected: (service: string) => boolean;
  getConnection: (service: string) => Connection | undefined;
}

export const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export function useConnections() {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
}
