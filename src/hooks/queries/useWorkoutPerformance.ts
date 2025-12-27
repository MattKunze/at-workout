import { useQuery } from '@tanstack/react-query';
import { getWorkoutPerformance } from '../../services/peloton';
import { queryKeys } from '../../lib/queryKeys';
import { db, getCurrentUserId } from '../../lib/db';

/**
 * React Query hook for fetching workout performance time series data.
 * 
 * Benefits over manual useEffect:
 * - Automatic deduplication (multiple components can call this without duplicate requests)
 * - Built-in caching and stale-while-revalidate
 * - Automatic cleanup (no abort controllers needed)
 * - Refetch on window focus
 * - Better error handling with retry logic
 * 
 * @param workoutId - The Peloton workout ID to fetch performance data for
 * @param options - Query options
 * @param options.everyN - Time series sampling rate (1 = every second, 5 = every 5 seconds, etc.)
 * @param options.enabled - Whether the query should run
 * @returns Query result with performance data, loading, and error states
 */
export function useWorkoutPerformance(
  workoutId: string | undefined,
  options?: {
    everyN?: number;
    enabled?: boolean;
  }
) {
  const { everyN = 1, enabled = true } = options || {};
  
  return useQuery({
    queryKey: queryKeys.peloton.workoutPerformance(workoutId || ''),
    queryFn: async () => {
      if (!workoutId) {
        throw new Error('Workout ID is required to fetch performance data');
      }

      // Two-tier caching strategy:
      // 1. Check IndexedDB first (persistent across sessions)
      const cached = await db.workoutPerformance.get(workoutId);
      
      if (cached) {
        // Cache hit! Return the stored data
        return cached.rawData;
      }

      // 2. Cache miss - fetch from API
      const data = await getWorkoutPerformance(workoutId, everyN);
      
      // 3. Store in IndexedDB for future use
      const userId = getCurrentUserId();
      
      if (userId) {
        await db.workoutPerformance.put({
          workoutId,
          userId,
          fetchedAt: Date.now(),
          everyN,
          rawData: data,
        });
      }
      
      return data;
    },
    enabled: enabled && !!workoutId,
    // Performance data is static once workout is complete, so cache aggressively
    staleTime: 1000 * 60 * 30, // 30 minutes
    // Keep data in cache for 1 hour even if unused
    gcTime: 1000 * 60 * 60,
  });
}
