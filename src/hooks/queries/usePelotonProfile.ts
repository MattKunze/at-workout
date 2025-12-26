import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '../../services/peloton';
import { queryKeys } from '../../lib/queryKeys';

/**
 * React Query hook for fetching the authenticated Peloton user's profile.
 * 
 * Benefits over manual useEffect:
 * - Automatic deduplication (multiple components can call this without duplicate requests)
 * - Built-in caching and stale-while-revalidate
 * - Automatic cleanup (no abort controllers needed)
 * - Refetch on window focus
 * - Better error handling with retry logic
 * 
 * @param enabled - Whether the query should run (typically based on connection status)
 * @returns Query result with profile data, loading, and error states
 */
export function usePelotonProfile(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.peloton.profile(),
    queryFn: async () => {
      // Note: We no longer need to pass an abort signal
      // React Query handles cancellation automatically
      return await getUserProfile();
    },
    enabled,
    // Peloton profile data doesn't change frequently
    staleTime: 1000 * 60 * 10, // 10 minutes
    // Keep data in cache for 30 minutes even if unused
    gcTime: 1000 * 60 * 30,
  });
}
