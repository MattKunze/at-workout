/**
 * Workout Backfill Service
 * 
 * Handles progressive backfilling of historical workout performance data
 * and power curve calculations. This service fetches workout data in batches
 * to avoid overwhelming the API and provides progress tracking.
 */

import { db, type BackfillState, getCurrentUserId } from './db';
import { getUserWorkouts, getWorkoutPerformance } from '../services/peloton';
import { calculatePowerCurve } from './powerCurveUtils';
import { invalidateAggregatesForWorkout } from './aggregatePowerCurves';
import type { PelotonWorkout } from '../types/peloton';

/**
 * Configuration options for backfill operation
 */
export interface BackfillOptions {
  /** Number of workouts to fetch in each batch (default: 10) */
  batchSize?: number;
  
  /** Delay in milliseconds between batches (default: 1000ms) */
  delayMs?: number;
  
  /** Maximum number of workouts to backfill (default: unlimited) */
  maxWorkouts?: number;
  
  /** Only backfill workouts of specific types (e.g., ['cycling']) */
  fitnessTypes?: string[];
  
  /** Callback for progress updates */
  onProgress?: (state: BackfillState) => void;
  
  /** Callback for each workout processed */
  onWorkoutProcessed?: (workoutId: string, success: boolean) => void;
}

/**
 * Workout Backfiller class
 * Handles progressive fetching and caching of historical workout data
 */
export class WorkoutBackfiller {
  private userId: string;
  private aborted = false;
  private paused = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Start the backfill process
   */
  async start(options: BackfillOptions = {}): Promise<BackfillState> {
    const {
      batchSize = 10,
      delayMs = 1000,
      maxWorkouts,
      fitnessTypes,
      onProgress,
      onWorkoutProcessed,
    } = options;

    this.aborted = false;
    this.paused = false;

    try {
      // Initialize backfill state
      const state = await this.initializeBackfillState();
      
      if (onProgress) {
        onProgress(state);
      }

      // Step 1: Get list of all workouts
      const allWorkouts = await this.getAllWorkouts(maxWorkouts, fitnessTypes);
      
      // Step 2: Filter out workouts we already have
      const workoutsToFetch = await this.filterMissingWorkouts(allWorkouts);
      
      // Update state with actual counts
      state.totalWorkouts = workoutsToFetch.length;
      state.fetchedWorkouts = 0;
      state.failedWorkouts = [];
      await db.backfillState.put(state);
      
      if (onProgress) {
        onProgress(state);
      }

      if (workoutsToFetch.length === 0) {
        // Nothing to fetch - mark as complete
        state.status = 'complete';
        state.completedAt = Date.now();
        await db.backfillState.put(state);
        
        if (onProgress) {
          onProgress(state);
        }
        
        return state;
      }

      // Step 3: Process workouts in batches
      for (let i = 0; i < workoutsToFetch.length; i += batchSize) {
        // Check for abort/pause
        if (this.aborted) {
          state.status = 'error';
          state.errorMessage = 'Backfill aborted by user';
          await db.backfillState.put(state);
          return state;
        }

        if (this.paused) {
          state.status = 'paused';
          await db.backfillState.put(state);
          return state;
        }

        const batch = workoutsToFetch.slice(i, i + batchSize);
        
        // Process batch in parallel
        await Promise.all(
          batch.map(async (workout) => {
            try {
              await this.processWorkout(workout);
              state.fetchedWorkouts++;
              
              if (onWorkoutProcessed) {
                onWorkoutProcessed(workout.id, true);
              }
            } catch (error) {
              console.error(`Failed to process workout ${workout.id}:`, error);
              state.failedWorkouts.push(workout.id);
              
              if (onWorkoutProcessed) {
                onWorkoutProcessed(workout.id, false);
              }
            }
          })
        );

        // Update state and notify
        await db.backfillState.put(state);
        
        if (onProgress) {
          onProgress(state);
        }

        // Delay before next batch (except for last batch)
        if (i + batchSize < workoutsToFetch.length) {
          await this.sleep(delayMs);
        }
      }

      // Mark as complete
      state.status = 'complete';
      state.completedAt = Date.now();
      await db.backfillState.put(state);
      
      if (onProgress) {
        onProgress(state);
      }

      return state;
    } catch (error) {
      // Handle unexpected errors
      const state = await db.backfillState.get(this.userId);
      
      if (state) {
        state.status = 'error';
        state.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await db.backfillState.put(state);
        
        if (onProgress) {
          onProgress(state);
        }
        
        return state;
      }

      throw error;
    }
  }

  /**
   * Pause the backfill process
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume a paused backfill
   */
  async resume(options: BackfillOptions = {}): Promise<BackfillState> {
    this.paused = false;
    return this.start(options);
  }

  /**
   * Abort the backfill process
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Get current backfill state
   */
  async getState(): Promise<BackfillState | undefined> {
    return db.backfillState.get(this.userId);
  }

  /**
   * Reset backfill state
   */
  async reset(): Promise<void> {
    await db.backfillState.delete(this.userId);
  }

  /**
   * Initialize or get existing backfill state
   */
  private async initializeBackfillState(): Promise<BackfillState> {
    const existing = await db.backfillState.get(this.userId);
    
    if (existing && existing.status === 'running') {
      // Continue from where we left off
      return existing;
    }

    // Create new state
    const state: BackfillState = {
      userId: this.userId,
      status: 'running',
      totalWorkouts: 0,
      fetchedWorkouts: 0,
      failedWorkouts: [],
      startedAt: Date.now(),
    };

    await db.backfillState.put(state);
    return state;
  }

  /**
   * Fetch all workouts for the user (paginated)
   */
  private async getAllWorkouts(
    maxWorkouts?: number,
    fitnessTypes?: string[]
  ): Promise<PelotonWorkout[]> {
    const allWorkouts: PelotonWorkout[] = [];
    let page = 0;
    const limit = 50; // Fetch in larger pages from workout list API
    let hasMore = true;

    while (hasMore) {
      const response = await getUserWorkouts(this.userId, limit, page);
      
      let workouts = response.data || [];

      // Filter by fitness type if specified
      if (fitnessTypes && fitnessTypes.length > 0) {
        workouts = workouts.filter(
          w => w.fitness_discipline && fitnessTypes.includes(w.fitness_discipline)
        );
      }

      allWorkouts.push(...workouts);

      // Check if we have more pages
      hasMore = workouts.length === limit;
      page++;

      // Check max workouts limit
      if (maxWorkouts && allWorkouts.length >= maxWorkouts) {
        return allWorkouts.slice(0, maxWorkouts);
      }

      // Safety check to avoid infinite loops
      if (page > 1000) {
        console.warn('Reached maximum page limit');
        break;
      }
    }

    return allWorkouts;
  }

  /**
   * Filter out workouts that are already cached
   */
  private async filterMissingWorkouts(
    workouts: PelotonWorkout[]
  ): Promise<PelotonWorkout[]> {
    const missing: PelotonWorkout[] = [];

    for (const workout of workouts) {
      const cached = await db.workoutPerformance.get(workout.id);
      
      if (!cached) {
        missing.push(workout);
      }
    }

    return missing;
  }

  /**
   * Process a single workout: fetch performance data and calculate power curve
   */
  private async processWorkout(workout: PelotonWorkout): Promise<void> {
    // Fetch performance data
    const performanceData = await getWorkoutPerformance(workout.id, 1);

    // Store performance data
    await db.workoutPerformance.put({
      workoutId: workout.id,
      userId: this.userId,
      fetchedAt: Date.now(),
      everyN: 1,
      rawData: performanceData,
    });

    // Calculate power curve
    const outputMetric = performanceData.metrics?.find(m => m.slug === 'output');
    
    if (outputMetric && outputMetric.values.length > 0) {
      const powerCurve = calculatePowerCurve(outputMetric.values);

      // Store power curve
      await db.powerCurves.put({
        workoutId: workout.id,
        userId: this.userId,
        calculatedAt: Date.now(),
        curve: powerCurve,
        metadata: {
          workoutDate: workout.created_at * 1000, // Convert to ms
          fitnessDiscipline: workout.fitness_discipline,
          duration: workout.ride?.duration || 0,
          totalWork: workout.total_work,
        },
      });

      // Invalidate aggregate caches that include this workout
      await invalidateAggregatesForWorkout(
        this.userId,
        workout.id,
        workout.created_at * 1000
      );
    }
  }

  /**
   * Sleep utility for delays between batches
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Get or create a backfiller instance for the current user
 */
export function getBackfiller(): WorkoutBackfiller | null {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return null;
  }

  return new WorkoutBackfiller(userId);
}

/**
 * Start backfill process with default options
 * Convenience function for simple use cases
 */
export async function startBackfill(
  options?: BackfillOptions
): Promise<BackfillState | null> {
  const backfiller = getBackfiller();
  
  if (!backfiller) {
    console.error('Cannot start backfill: No user ID found');
    return null;
  }

  return backfiller.start(options);
}
