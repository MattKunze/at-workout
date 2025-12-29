import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, getCurrentUserId } from '../lib/db';
import { getWorkoutPerformance } from '../services/peloton';
import { calculatePowerCurve } from '../lib/powerCurveUtils';
import { queryKeys } from '../lib/queryKeys';
import { aggregatePowerCurveKeys } from './queries/useAggregatePowerCurves';
import { clearAllAggregateCaches } from '../lib/aggregatePowerCurves';
import type { PelotonWorkout, PelotonWorkoutsResponse } from '../types/peloton';

/**
 * Hook to check if workout data is cached and provide methods to fetch it
 * 
 * @param workoutIds - Array of workout IDs to check cache status for
 * @param options - Configuration options
 * @param options.autoFetch - Whether to automatically fetch uncached workouts serially
 * @returns Object with cache status map and mutation to fetch workout data
 */
export function useWorkoutCache(
  workoutIds: string[],
  options?: {
    autoFetch?: boolean;
  }
) {
  const { autoFetch = false } = options || {};
  const [cacheStatus, setCacheStatus] = useState<Record<string, boolean>>({});
  const [currentlyFetching, setCurrentlyFetching] = useState<string | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const queueRef = useRef<string[]>([]);
  const queryClient = useQueryClient();
  const fetchMutateRef = useRef<((workoutId: string) => void) | null>(null);
  const currentWorkoutIdsKey = useRef<string>('');
  const workoutIdsKey = workoutIds.join(','); // Create a stable key for tracking when workout IDs change
  const fetchedWorkoutsInBatch = useRef<string[]>([]); // Track workouts fetched in current batch

  // Check cache status for all workout IDs
  useEffect(() => {
    if (typeof window === 'undefined' || workoutIds.length === 0) {
      return;
    }

    // If workoutIds changed (page navigation), clear the old queue
    const idsChanged = currentWorkoutIdsKey.current !== workoutIdsKey;
    if (idsChanged) {
      queueRef.current = [];
      setQueueLength(0);
      currentWorkoutIdsKey.current = workoutIdsKey;
      // Clear the fetched workouts tracking when navigating pages
      fetchedWorkoutsInBatch.current = [];
    }

    const checkCache = async () => {
      const status: Record<string, boolean> = {};
      const uncached: string[] = [];
      
      for (const workoutId of workoutIds) {
        const cached = await db.workoutPerformance.get(workoutId);
        status[workoutId] = !!cached;
        
        if (!cached) {
          uncached.push(workoutId);
        }
      }
      
      setCacheStatus(status);
      
      // Only start autofetch if IDs changed and there are uncached workouts
      if (autoFetch && idsChanged && uncached.length > 0) {
        queueRef.current = uncached;
        setQueueLength(uncached.length);
        // Trigger processing on next tick to avoid setState in effect
        setTimeout(() => {
          const nextWorkoutId = queueRef.current.shift();
          if (nextWorkoutId && fetchMutateRef.current) {
            setQueueLength(queueRef.current.length);
            setCurrentlyFetching(nextWorkoutId);
            fetchMutateRef.current(nextWorkoutId);
          }
        }, 0);
      }
    };

    checkCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutIdsKey, autoFetch]);

  // Mutation to fetch and cache workout data
  const fetchWorkoutData = useMutation({
    mutationFn: async (workoutId: string) => {
      // Fetch performance data
      const performance = await getWorkoutPerformance(workoutId, 1);
      
      // Store in IndexedDB
      const userId = getCurrentUserId();
      if (userId) {
        // Wait for the write to complete
        await db.workoutPerformance.put({
          workoutId,
          userId,
          fetchedAt: Date.now(),
          everyN: 1,
          rawData: performance,
        });

        // Calculate and store power curve from output metric (if available)
        // Some workouts (freeform, non-cycling) may not have power data
        const outputMetric = performance.metrics?.find(m => m.slug === 'output');
        if (outputMetric) {
          const powerCurve = calculatePowerCurve(outputMetric.values);
          
          // We need workout metadata - get it from the query cache if available
          // Since we don't know the exact query key, we'll try to find any workouts query
          const queryCache = queryClient.getQueryCache();
          const workoutsQueries = queryCache.findAll({
            predicate: (query) => {
              const key = query.queryKey;
              // Match both 'workouts' (paginated) and 'workouts-infinite' queries
              return Array.isArray(key) && key[0] === 'peloton' && 
                     (key[1] === 'workouts' || key[1] === 'workouts-infinite');
            },
          });
          
          let workout: PelotonWorkout | null = null;
          for (const query of workoutsQueries) {
            // Handle both paginated response and infinite query response
            const data = query.state.data as PelotonWorkoutsResponse | { pages?: PelotonWorkoutsResponse[] } | undefined;
            
            // Check if this is an infinite query (has pages array)
            if (data && 'pages' in data && Array.isArray(data.pages)) {
              // Search through all pages
              for (const page of data.pages) {
                if (page?.data) {
                  const found = page.data.find((w) => w.id === workoutId);
                  if (found) {
                    workout = found;
                    break;
                  }
                }
              }
              if (workout) break;
            } else if (data && 'data' in data && Array.isArray(data.data)) {
              // Handle paginated response
              const found = data.data.find((w) => w.id === workoutId);
              if (found) {
                workout = found;
                break;
              }
            }
          }

          if (workout) {
            // Wait for this write to complete too
            await db.powerCurves.put({
              workoutId,
              userId,
              calculatedAt: Date.now(),
              curve: powerCurve,
              metadata: {
                // Convert created_at from seconds to milliseconds for consistent time range filtering
                workoutDate: workout.created_at * 1000,
                fitnessDiscipline: workout.fitness_discipline,
                duration: workout.ride?.duration || 0,
                totalWork: workout.total_work,
              },
            });
          }
        }
      }
      
      return { workoutId, performance };
    },
    onSuccess: async ({ workoutId }) => {
      // Double-check the data is in the database after write completes
      // Use a small delay to ensure IndexedDB transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 50));
      const cached = await db.workoutPerformance.get(workoutId);
      
      if (cached) {
        // Update cache status for this specific workout
        setCacheStatus((prev) => {
          // Only update if this workout is in the current view
          if (workoutId in prev) {
            return {
              ...prev,
              [workoutId]: true,
            };
          }
          return prev;
        });
        
        // Track this workout for aggregate invalidation
        fetchedWorkoutsInBatch.current.push(workoutId);
      }
      
      // Invalidate workout performance query so it picks up the cached data
      queryClient.invalidateQueries({
        queryKey: queryKeys.peloton.workoutPerformance(workoutId),
      });
    },
    onSettled: async () => {
      // Clear currently fetching and process next item
      setCurrentlyFetching(null);
      // Add a small delay to ensure state updates and DB writes are complete
      setTimeout(async () => {
        const nextWorkoutId = queueRef.current.shift();
        if (nextWorkoutId && fetchMutateRef.current) {
          setQueueLength(queueRef.current.length);
          setCurrentlyFetching(nextWorkoutId);
          fetchMutateRef.current(nextWorkoutId);
        } else {
          // Queue is empty - invalidate aggregate power curves if we fetched any workouts
          if (autoFetch && fetchedWorkoutsInBatch.current.length > 0) {
            const userId = getCurrentUserId();
            if (userId) {
              console.log(`Background fetch complete. Invalidating aggregate curves for ${fetchedWorkoutsInBatch.current.length} new workouts.`);
              
              // CRITICAL: Clear IndexedDB aggregate caches first
              // Otherwise React Query will refetch but get stale data from IndexedDB
              await clearAllAggregateCaches(userId);
              
              // Then invalidate the React Query caches
              // These will automatically recalculate when next accessed
              queryClient.invalidateQueries({
                queryKey: aggregatePowerCurveKeys.lifetime(userId),
              });
              queryClient.invalidateQueries({
                queryKey: aggregatePowerCurveKeys.days(userId, 30),
              });
              queryClient.invalidateQueries({
                queryKey: aggregatePowerCurveKeys.days(userId, 90),
              });
              queryClient.invalidateQueries({
                queryKey: aggregatePowerCurveKeys.days(userId, 365),
              });
              
              // Also invalidate available years in case we crossed into a new year
              queryClient.invalidateQueries({
                queryKey: aggregatePowerCurveKeys.availableYears(userId),
              });
              
              // Also invalidate top efforts queries
              queryClient.invalidateQueries({
                queryKey: [...aggregatePowerCurveKeys.all, 'topEfforts'],
              });
              
              // Clear the batch tracker
              fetchedWorkoutsInBatch.current = [];
            }
          }
          setQueueLength(0);
        }
      }, 100);
    },
  });

  // Store mutate function in ref for use in queue processing
  useEffect(() => {
    fetchMutateRef.current = fetchWorkoutData.mutate;
  }, [fetchWorkoutData.mutate]);

  return {
    cacheStatus,
    isCached: (workoutId: string) => cacheStatus[workoutId] || false,
    fetchWorkoutData: fetchWorkoutData.mutate,
    isFetching: fetchWorkoutData.isPending,
    fetchingWorkoutId: fetchWorkoutData.variables,
    queueLength,
    isAutoFetching: autoFetch && (currentlyFetching !== null || queueLength > 0),
  };
}
