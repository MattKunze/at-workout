import { useInfiniteQuery } from '@tanstack/react-query';
import { getUserWorkouts } from '../../services/peloton';
import { queryKeys } from '../../lib/queryKeys';
import { useMemo } from 'react';

/**
 * React Query hook for fetching Peloton workouts with infinite scroll support.
 * 
 * This hook wraps TanStack Query's useInfiniteQuery to provide automatic
 * pagination management for infinite scrolling lists.
 * 
 * Benefits:
 * - Automatic page fetching and caching
 * - Built-in loading and error states
 * - Optimistic updates and background refetching
 * - Seamless integration with intersection observers
 * 
 * @param userId - The Peloton user ID to fetch workouts for
 * @param options - Query options
 * @param options.limit - Number of workouts per page (default: 50)
 * @param options.enabled - Whether the query should run (typically based on connection status)
 * @returns Query result with flattened workouts array and pagination controls
 */
export function usePelotonWorkoutsInfinite(
  userId: string | undefined,
  options?: {
    limit?: number;
    enabled?: boolean;
  }
) {
  const { limit = 20, enabled = true } = options || {};
  
  const query = useInfiniteQuery({
    queryKey: queryKeys.peloton.workoutsInfinite(userId || '', { limit }),
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) {
        throw new Error('User ID is required to fetch workouts');
      }
      return await getUserWorkouts(userId, limit, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If we received fewer workouts than requested, we've reached the end
      if (!lastPage.data || lastPage.data.length < limit) {
        return undefined;
      }
      
      // If total is available, check if we've fetched all workouts
      if (lastPage.total !== undefined) {
        const fetchedCount = allPages.reduce((acc, page) => acc + page.data.length, 0);
        if (fetchedCount >= lastPage.total) {
          return undefined;
        }
      }
      
      // Return next page number
      return allPages.length;
    },
    getPreviousPageParam: (_firstPage, allPages) => {
      // For future bidirectional scroll support
      if (allPages.length <= 1) {
        return undefined;
      }
      return allPages.length - 2;
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes (shorter for infinite queries)
  });

  // Flatten all pages into a single workouts array
  const workouts = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data]
  );

  // Get total workout count from the first page response
  const totalWorkouts = query.data?.pages[0]?.total ?? 0;

  // Get number of loaded pages
  const loadedPages = query.data?.pages.length ?? 0;

  return {
    // Flattened data
    workouts,
    totalWorkouts,
    loadedPages,
    
    // Pagination controls
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    
    // Status flags
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    
    // Raw query for advanced use cases
    query,
  };
}
