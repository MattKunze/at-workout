import { useQuery } from '@tanstack/react-query';
import { getWorkoutDetails } from '../../services/peloton';
import { queryKeys } from '../../lib/queryKeys';

/**
 * React Query hook for fetching detailed workout information.
 * 
 * This hook fetches comprehensive workout data including ride details,
 * instructor information, and metrics. It's separate from the performance
 * graph data and provides metadata about the workout.
 * 
 * @param workoutId - The Peloton workout ID to fetch details for
 * @param options - Query options
 * @param options.enabled - Whether the query should run (default: true)
 * @returns Query result with workout data, loading, and error states
 */
export function useWorkoutDetails(
  workoutId: string | undefined,
  options?: {
    enabled?: boolean;
  }
) {
  const { enabled = true } = options || {};
  
  return useQuery({
    queryKey: queryKeys.peloton.workout(workoutId || ''),
    queryFn: async () => {
      if (!workoutId) {
        throw new Error('Workout ID is required to fetch workout details');
      }
      return await getWorkoutDetails(workoutId);
    },
    enabled: enabled && !!workoutId,
    // Workout details don't change, so use a longer stale time
    staleTime: 1000 * 60 * 30, // 30 minutes
    // Keep data in cache for 1 hour
    gcTime: 1000 * 60 * 60,
  });
}
