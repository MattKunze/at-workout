/**
 * WorkoutSyncPanel Component
 * 
 * Organism component that manages the workout data backfill process.
 * Allows users to sync their historical workout data into IndexedDB cache
 * for faster access and aggregate power curve calculations.
 * 
 * Features:
 * - Display cache statistics
 * - Initiate sync process
 * - Show progress during sync
 * - Display errors and retry options
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBackfiller, type WorkoutBackfiller } from '../../lib/backfill';
import { getCacheStats, clearUserCache, getCurrentUserId } from '../../lib/db';
import type { BackfillState } from '../../lib/db';

export function WorkoutSyncPanel() {
  const [backfiller, setBackfiller] = useState<WorkoutBackfiller | null>(null);
  const [backfillState, setBackfillState] = useState<BackfillState | null>(null);
  const [cacheStats, setCacheStats] = useState<{
    workoutCount: number;
    powerCurveCount: number;
    aggregateCount: number;
    oldestWorkout?: number;
    newestWorkout?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const userId = getCurrentUserId();

  // Load initial state
  useEffect(() => {
    async function loadState() {
      if (!userId) return;

      const bf = getBackfiller();
      setBackfiller(bf);

      if (bf) {
        const state = await bf.getState();
        setBackfillState(state || null);
      }

      const stats = await getCacheStats(userId);
      setCacheStats(stats);
    }

    loadState();
  }, [userId]);

  // Start sync
  const handleStartSync = async () => {
    if (!backfiller || !userId) return;

    setIsLoading(true);

    try {
      await backfiller.start({
        batchSize: 10,
        delayMs: 1000,
        onProgress: (state) => {
          setBackfillState(state);
        },
      });

      // Reload cache stats after completion
      const stats = await getCacheStats(userId);
      setCacheStats(stats);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Pause sync
  const handlePauseSync = () => {
    if (!backfiller) return;
    backfiller.pause();
  };

  // Resume sync
  const handleResumeSync = async () => {
    if (!backfiller || !userId) return;

    setIsLoading(true);

    try {
      await backfiller.resume({
        batchSize: 10,
        delayMs: 1000,
        onProgress: (state) => {
          setBackfillState(state);
        },
      });

      const stats = await getCacheStats(userId);
      setCacheStats(stats);
    } catch (error) {
      console.error('Resume failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Abort sync
  const handleAbortSync = () => {
    if (!backfiller) return;
    backfiller.abort();
  };

  // Clear cache
  const handleClearCache = async () => {
    if (!userId) return;

    if (!confirm('Are you sure you want to clear all cached workout data? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);

    try {
      await clearUserCache(userId);
      
      // Reset backfill state
      if (backfiller) {
        await backfiller.reset();
        setBackfillState(null);
      }

      const stats = await getCacheStats(userId);
      setCacheStats(stats);
    } catch (error) {
      console.error('Clear cache failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workout Data Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please connect your Peloton account to sync workout data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isRunning = backfillState?.status === 'running';
  const isPaused = backfillState?.status === 'paused';
  const isComplete = backfillState?.status === 'complete';
  const isError = backfillState?.status === 'error';
  const isIdle = !backfillState || backfillState.status === 'idle';

  const progressPercent = backfillState?.totalWorkouts
    ? Math.round((backfillState.fetchedWorkouts / backfillState.totalWorkouts) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout Data Sync</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Statistics */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Cache Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col p-3 rounded-md bg-muted/50">
              <span className="text-xs text-muted-foreground mb-1">Workouts Cached</span>
              <span className="text-2xl font-bold">{cacheStats?.workoutCount || 0}</span>
            </div>
            <div className="flex flex-col p-3 rounded-md bg-muted/50">
              <span className="text-xs text-muted-foreground mb-1">Power Curves</span>
              <span className="text-2xl font-bold">{cacheStats?.powerCurveCount || 0}</span>
            </div>
            <div className="flex flex-col p-3 rounded-md bg-muted/50">
              <span className="text-xs text-muted-foreground mb-1">Aggregates</span>
              <span className="text-2xl font-bold">{cacheStats?.aggregateCount || 0}</span>
            </div>
          </div>

          {cacheStats?.oldestWorkout && cacheStats?.newestWorkout && (
            <div className="mt-3 text-xs text-muted-foreground">
              Date range: {new Date(cacheStats.oldestWorkout).toLocaleDateString()} - {new Date(cacheStats.newestWorkout).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Sync Status */}
        {backfillState && !isIdle && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Sync Status</h3>
            
            {/* Progress bar */}
            {(isRunning || isPaused) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{backfillState.fetchedWorkouts} / {backfillState.totalWorkouts} workouts</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={progressPercent} 
                  max="100"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {progressPercent}% complete
                </div>
              </div>
            )}

            {/* Status messages */}
            {isComplete && (
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Sync completed successfully!</span>
              </div>
            )}

            {isError && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Error: {backfillState.errorMessage || 'Unknown error'}</span>
              </div>
            )}

            {backfillState.failedWorkouts.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Failed to fetch {backfillState.failedWorkouts.length} workout(s)
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {isIdle && (
            <button 
              className="btn btn-primary"
              onClick={handleStartSync}
              disabled={isLoading}
            >
              {isLoading ? 'Starting...' : 'Start Sync'}
            </button>
          )}

          {isRunning && (
            <>
              <button 
                className="btn btn-warning"
                onClick={handlePauseSync}
                disabled={isLoading}
              >
                Pause
              </button>
              <button 
                className="btn btn-error"
                onClick={handleAbortSync}
                disabled={isLoading}
              >
                Cancel
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleResumeSync}
                disabled={isLoading}
              >
                Resume
              </button>
              <button 
                className="btn btn-error"
                onClick={handleAbortSync}
                disabled={isLoading}
              >
                Cancel
              </button>
            </>
          )}

          {(isComplete || isError) && (
            <button 
              className="btn btn-primary"
              onClick={handleStartSync}
              disabled={isLoading}
            >
              Sync Again
            </button>
          )}

          {cacheStats && cacheStats.workoutCount > 0 && (
            <button 
              className="btn btn-ghost"
              onClick={handleClearCache}
              disabled={isLoading}
            >
              Clear Cache
            </button>
          )}
        </div>

        {/* Help text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            Syncing your workout data enables aggregate power curve analysis showing
            your lifetime bests, yearly progression, and monthly trends.
          </p>
          <p>
            This process fetches historical workout data and stores it locally in your browser
            for fast access. It typically takes 1-2 minutes for a few hundred workouts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
