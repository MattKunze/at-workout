import React, { useState, useCallback, useEffect } from 'react';
import { type Session } from '@atcute/oauth-browser-client';
import { getCurrentSession, signIn as authSignIn, signOut as authSignOut } from '../services/auth';
import { Client } from '@atcute/client';
import { type UserProfile } from '../types/auth';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (currentSession: Session) => {
    try {
        // Fetch profile from public AppView to avoid PDS proxy scope issues
        const publicHandler = {
          handle: async (pathname: string, init?: RequestInit) => {
            const url = new URL(pathname, 'https://public.api.bsky.app');
            return fetch(url, init);
          }
        };

        const rpc = new Client({ handler: publicHandler });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (rpc as any).get('app.bsky.actor.getProfile', {
            params: {
              actor: currentSession.info.sub,
            }
        });
        
        if (response.ok) {
           setUserProfile(response.data as UserProfile);
        }
    } catch (e) {
        console.error("Failed to fetch profile", e);
    }
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const currentSession = await getCurrentSession();
      setSession(currentSession);
      if (currentSession) {
          await fetchProfile(currentSession);
      } else {
          setUserProfile(undefined);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signIn = async (handle: string) => {
    await authSignIn(handle);
  };

  const signOut = async () => {
    await authSignOut();
    setSession(undefined);
    setUserProfile(undefined);
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, signIn, signOut, refreshSession: loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}
