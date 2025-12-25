import { createContext, useContext } from 'react';
import { type Session } from '@atcute/oauth-browser-client';
import { type UserProfile } from '../types/auth';

export interface AuthContextType {
  session: Session | undefined;
  userProfile: UserProfile | undefined;
  loading: boolean;
  signIn: (handle: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
