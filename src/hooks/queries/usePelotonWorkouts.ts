import { useQuery } from '@tanstack/react-query';
import { getUserWorkouts } from '../../services/peloton';
import { queryKeys } from '../../lib/queryKeys';

/**
 * React Query hook for fetching a Peloton user's workout history.
 * 
 * Benefits over manual useEffect:
 * - Automatic deduplication (multiple components can call this without duplicate requests)
 * - Built-in caching and stale-while-revalidate
 * - Automatic cleanup (no abort controllers needed)
 * - Refetch on window focus
 * - Better error handling with retry logic
 * 
 * @param userId - The Peloton user ID to fetch workouts for
 * @param options - Query options
 * @param options.limit - Maximum number of workouts to return (default: 10)
 * @param options.page - Page number for pagination (default: 0)
 * @param options.enabled - Whether the query should run (typically based on connection status)
 * @returns Query result with workouts data, loading, and error states
 */
export function usePelotonWorkouts(
  userId: string | undefined,
  options?: {
    limit?: number;
    page?: number;
    enabled?: boolean;
  }
) {
  const { limit = 10, page = 0, enabled = true } = options || {};
  
  return useQuery({
    queryKey: queryKeys.peloton.workouts(userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required to fetch workouts');
      }
      // React Query handles cancellation automatically
      return await getUserWorkouts(userId, limit, page);
    },
    enabled: enabled && !!userId,
    // Workout data changes frequently, so use a shorter stale time
    staleTime: 1000 * 60 * 2, // 2 minutes
    // Keep data in cache for 10 minutes even if unused
    gcTime: 1000 * 60 * 10,
  });
}
