/**
 * InfiniteWorkoutList Component
 * 
 * Organism component that manages infinite scrolling workout list.
 * Handles data fetching, scroll restoration, cache management, and all loading states.
 * 
 * Features:
 * - Infinite scroll with automatic page fetching
 * - Session-based scroll position restoration
 * - Automatic workout cache fetching
 * - Loading skeletons and end-of-list indicators
 * - Error handling and retry logic
 */

import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { useInView } from 'react-intersection-observer';
import { usePelotonWorkoutsInfinite } from '../../hooks/queries/usePelotonWorkoutsInfinite';
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import { useWorkoutCache } from '../../hooks/useWorkoutCache';
import { WorkoutCard } from '../molecules/WorkoutCard';

interface InfiniteWorkoutListProps {
  userId: string;
  isPelotonConnected: boolean;
}

export function InfiniteWorkoutList({ userId, isPelotonConnected }: InfiniteWorkoutListProps) {
  // Track if we've already initiated a fetch to prevent duplicate requests
  const isFetchingRef = useRef(false);
  
  // Fetch workouts with infinite scroll support
  const {
    workouts,
    totalWorkouts,
    loadedPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePelotonWorkoutsInfinite(userId, {
    enabled: isPelotonConnected && !!userId,
  });

  // Scroll restoration
  const {
    shouldRestore,
    targetScrollY,
    targetPages,
    markRestored,
    savePosition,
  } = useScrollRestoration(userId);

  // Intersection observer for infinite scroll trigger
  const { ref: infiniteScrollRef, inView } = useInView({
    rootMargin: '400px', // Start fetching 400px before the bottom
    threshold: 0,
  });

  // Get workout IDs for cache checking
  const workoutIds = useMemo(
    () => workouts.map((w) => w.id),
    [workouts]
  );

  // Check cache status and provide fetch functionality
  const { 
    isCached, 
    fetchWorkoutData, 
    isFetching, 
    fetchingWorkoutId, 
    queueLength, 
    isAutoFetching 
  } = useWorkoutCache(workoutIds, { autoFetch: true });

  // Handle scroll restoration on mount - one-time check
  useEffect(() => {
    // If there's restoration data but we're already at the right position,
    // just mark it as restored and move on
    if (shouldRestore && loadedPages === 1 && window.scrollY === 0) {
      // This is a fresh page load, not a back navigation
      // Clear the restoration data so infinite scroll can work
      markRestored();
      return;
    }

    if (!shouldRestore || !targetScrollY || !targetPages) {
      return;
    }

    // If we need more pages, fetch them
    if (loadedPages < targetPages && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
      return;
    }

    // If we have enough pages, restore scroll position
    if (loadedPages >= targetPages) {
      setTimeout(() => {
        window.scrollTo(0, targetScrollY);
        markRestored();
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [shouldRestore, targetScrollY, targetPages, loadedPages, hasNextPage, isFetchingNextPage, fetchNextPage, markRestored]);

  // Handle infinite scroll trigger
  useEffect(() => {
    // Reset ref if we're not fetching and element is no longer in view
    if (!isFetchingNextPage && !inView && isFetchingRef.current) {
      isFetchingRef.current = false;
      return;
    }
    
    // Reset ref if we're not fetching and don't have next page
    if (!isFetchingNextPage && !hasNextPage && isFetchingRef.current) {
      isFetchingRef.current = false;
      return;
    }
    
    // Only trigger fetch if element is in view and we're not already fetching
    if (inView && hasNextPage && !isFetchingNextPage && !shouldRestore && !isFetchingRef.current) {
      isFetchingRef.current = true;
      fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, hasNextPage, isFetchingNextPage, shouldRestore]);

  // Save scroll position on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        savePosition(window.scrollY, loadedPages);
      }
    };
  }, [loadedPages, savePosition]);

  // Show message if not connected
  if (!isPelotonConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title justify-center">Connect Peloton</h2>
            <p className="text-center text-base-content/70 mt-2">
              You haven't connected your Peloton account yet. Connect it to view
              your workout history and power curves.
            </p>
            <div className="card-actions justify-center mt-4">
              <Link to="/preferences" className="btn btn-primary">
                Go to Preferences
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <div className="flex gap-3">
                <div className="skeleton w-16 h-16 rounded shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4"></div>
                  <div className="skeleton h-3 w-1/2"></div>
                  <div className="skeleton h-3 w-1/3"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="alert alert-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex flex-col">
          <span>Failed to load workouts</span>
          <span className="text-sm">{error?.message || 'Please try again later'}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (workouts.length === 0) {
    return (
      <div className="alert">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          No workouts found. Complete a Peloton workout to see it here!
        </span>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Workouts list */}
      <div className="space-y-3">
        {workouts.map((workout) => {
          const cached = isCached(workout.id);
          const isCurrentlyFetching = isFetching && fetchingWorkoutId === workout.id;

          return (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              isCached={cached}
              isFetchingCache={isCurrentlyFetching}
              onCacheFetch={() => fetchWorkoutData(workout.id)}
            />
          );
        })}

        {/* Infinite scroll trigger - always visible when there's more data */}
        {hasNextPage && (
          <div ref={infiniteScrollRef} className="flex justify-center py-4 min-h-[60px]">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                <span className="text-sm text-base-content/70">Loading more workouts...</span>
              </div>
            ) : (
              <div className="text-sm text-base-content/40">
                Scroll to load more...
              </div>
            )}
          </div>
        )}

        {/* End of list message */}
        {!hasNextPage && workouts.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="text-center text-base-content/60">
              <p className="font-medium">All {totalWorkouts} workouts loaded</p>
              <p className="text-sm mt-1">You've reached the end of your workout history</p>
            </div>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn btn-sm btn-ghost"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              Back to Top
            </button>
          </div>
        )}
      </div>

      {/* Floating toast for auto-fetch status */}
      {isAutoFetching && (
        <div className="toast toast-bottom toast-center">
          <div className="alert alert-info shadow-lg">
            <span className="loading loading-spinner loading-sm"></span>
            <span>
              Caching workout data... ({queueLength} remaining)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
