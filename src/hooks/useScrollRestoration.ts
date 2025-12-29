import { useCallback, useState } from 'react';

/**
 * Scroll restoration data stored in SessionStorage
 */
interface ScrollRestorationData {
  scrollY: number;
  loadedPages: number;
  timestamp: number;
  userId: string;
}

/**
 * Hook to manage scroll position restoration across navigation.
 * 
 * Uses SessionStorage to persist scroll position and loaded page count
 * when navigating away from the workout list. On return, restores the
 * scroll position after loading the necessary pages.
 * 
 * Features:
 * - Automatic expiration after 5 minutes
 * - User-specific restoration (prevents wrong restoration on user switch)
 * - One-time restoration (clears after use)
 * 
 * @param userId - Current user ID to scope restoration data
 * @returns Restoration state and control functions
 */
export function useScrollRestoration(userId: string | undefined) {
  const [hasRestored, setHasRestored] = useState(false);

  const storageKey = `workout-scroll:${userId || 'unknown'}`;
  const expirationMs = 5 * 60 * 1000; // 5 minutes

  // Get restoration data (computed on each render, but cheap)
  const getRestorationData = useCallback((): ScrollRestorationData | null => {
    if (typeof window === 'undefined' || !userId) {
      return null;
    }

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) {
        return null;
      }

      const data: ScrollRestorationData = JSON.parse(stored);
      
      // Check if data is expired
      const age = Date.now() - data.timestamp;
      if (age > expirationMs) {
        sessionStorage.removeItem(storageKey);
        return null;
      }

      // Check if data is for the correct user
      if (data.userId !== userId) {
        sessionStorage.removeItem(storageKey);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to load scroll restoration data:', error);
      sessionStorage.removeItem(storageKey);
      return null;
    }
  }, [userId, storageKey, expirationMs]);

  const restorationData = getRestorationData();

  /**
   * Save current scroll position and page count
   */
  const savePosition = useCallback(
    (scrollY: number, loadedPages: number) => {
      if (typeof window === 'undefined' || !userId) {
        return;
      }

      try {
        const data: ScrollRestorationData = {
          scrollY,
          loadedPages,
          timestamp: Date.now(),
          userId,
        };
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save scroll position:', error);
      }
    },
    [userId, storageKey]
  );

  /**
   * Mark restoration as complete and clear stored data
   */
  const markRestored = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setHasRestored(true);
    sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  /**
   * Clear restoration data without marking as restored
   */
  const clearRestoration = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    // Should we attempt to restore scroll position?
    shouldRestore: !!restorationData && !hasRestored,
    
    // Target scroll position to restore to
    targetScrollY: restorationData?.scrollY ?? null,
    
    // Number of pages to load before restoring scroll
    targetPages: restorationData?.loadedPages ?? 0,
    
    // Control functions
    markRestored,
    savePosition,
    clearRestoration,
  };
}
