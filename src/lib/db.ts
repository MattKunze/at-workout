/**
 * IndexedDB Database for Peloton Workout Data
 * 
 * Uses Dexie.js as an abstraction layer over IndexedDB for easier management
 * of workout performance data, power curves, and aggregate statistics.
 * 
 * This provides persistent storage across browser sessions and reduces API calls
 * by caching workout performance time-series data.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { PelotonWorkoutPerformance } from '../types/peloton';
import type { PowerCurve } from './powerCurveUtils';

/**
 * Stored workout performance data with metadata
 */
export interface WorkoutPerformanceCache {
  /** Primary key: Peloton workout ID */
  workoutId: string;
  
  /** Peloton user ID who performed the workout */
  userId: string;
  
  /** When this data was fetched from the API (Unix timestamp) */
  fetchedAt: number;
  
  /** Sampling rate used (1 = every second, 5 = every 5 seconds) */
  everyN: number;
  
  /** The full performance data from Peloton API */
  rawData: PelotonWorkoutPerformance;
}

/**
 * Calculated power curve for a single workout
 */
export interface PowerCurveCache {
  /** Primary key: Peloton workout ID */
  workoutId: string;
  
  /** Peloton user ID who performed the workout */
  userId: string;
  
  /** When this power curve was calculated (Unix timestamp) */
  calculatedAt: number;
  
  /** The calculated power curve */
  curve: PowerCurve;
  
  /** Metadata about the workout for filtering/sorting */
  metadata: {
    /** Workout date (Unix timestamp from created_at) */
    workoutDate: number;
    
    /** Type of workout (e.g., "cycling") */
    fitnessDiscipline?: string;
    
    /** Duration in seconds */
    duration: number;
    
    /** Total work in kJ */
    totalWork?: number;
  };
}

/**
 * Aggregate power curve combining multiple workouts
 */
export interface AggregatePowerCurveCache {
  /** Primary key: composite identifier (e.g., "user123-lifetime", "user123-2025", "user123-2025-03") */
  id: string;
  
  /** Peloton user ID */
  userId: string;
  
  /** Type of aggregation */
  aggregateType: 'lifetime' | 'year' | 'month' | 'custom' | 'days';
  
  /** Time range for this aggregate */
  timeRange: {
    /** Start time (Unix timestamp, undefined for lifetime) */
    start?: number;
    
    /** End time (Unix timestamp, undefined for lifetime/ongoing) */
    end?: number;
  };
  
  /** The composite power curve (max values across all workouts in range) */
  curve: PowerCurve;
  
  /** List of workout IDs included in this aggregate */
  workoutIds: string[];
  
  /** When this aggregate was calculated (Unix timestamp) */
  calculatedAt: number;
}

/**
 * Backfill progress tracking
 */
export interface BackfillState {
  /** Primary key: user ID */
  userId: string;
  
  /** Current status of backfill operation */
  status: 'idle' | 'running' | 'paused' | 'complete' | 'error';
  
  /** Total number of workouts to backfill */
  totalWorkouts: number;
  
  /** Number of workouts successfully fetched */
  fetchedWorkouts: number;
  
  /** List of workout IDs that failed to fetch */
  failedWorkouts: string[];
  
  /** When backfill started (Unix timestamp) */
  startedAt?: number;
  
  /** When backfill completed (Unix timestamp) */
  completedAt?: number;
  
  /** Last error message if status is 'error' */
  errorMessage?: string;
}

/**
 * Main database class
 */
class PelotonDatabase extends Dexie {
  // Typed tables
  workoutPerformance!: EntityTable<WorkoutPerformanceCache, 'workoutId'>;
  powerCurves!: EntityTable<PowerCurveCache, 'workoutId'>;
  aggregateCurves!: EntityTable<AggregatePowerCurveCache, 'id'>;
  backfillState!: EntityTable<BackfillState, 'userId'>;

  constructor() {
    super('PelotonDatabase');
    
    // Define schema
    // Version 1: Initial schema
    this.version(1).stores({
      workoutPerformance: 'workoutId, userId, fetchedAt',
      powerCurves: 'workoutId, userId, metadata.workoutDate',
      aggregateCurves: 'id, userId, aggregateType, calculatedAt',
      backfillState: 'userId',
    });
  }
}

// Export singleton instance
// Only instantiate on the client to avoid SSR issues with IndexedDB
export const db = typeof window !== 'undefined' 
  ? new PelotonDatabase()
  : ({} as PelotonDatabase); // Dummy object for SSR (will never be used due to enabled guards)

/**
 * Get the current user ID from the connections context
 * This is a helper to avoid passing userId everywhere
 * 
 * Note: Returns null during SSR since localStorage is not available on the server
 */
export function getCurrentUserId(): string | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  
  // In a real app, this would get the current user from auth context
  // For now, we'll use localStorage as a simple solution
  return localStorage.getItem('peloton_user_id');
}

/**
 * Set the current user ID
 * 
 * Note: No-op during SSR since localStorage is not available on the server
 */
export function setCurrentUserId(userId: string): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  localStorage.setItem('peloton_user_id', userId);
}

/**
 * Clear all cached data for a user
 * Useful for testing or if user wants to reset
 */
export async function clearUserCache(userId: string): Promise<void> {
  await db.transaction('rw', [
    db.workoutPerformance,
    db.powerCurves,
    db.aggregateCurves,
    db.backfillState,
  ], async () => {
    await db.workoutPerformance.where('userId').equals(userId).delete();
    await db.powerCurves.where('userId').equals(userId).delete();
    await db.aggregateCurves.where('userId').equals(userId).delete();
    await db.backfillState.where('userId').equals(userId).delete();
  });
}

/**
 * Clear only aggregate curve caches for a user
 * Useful when aggregate calculation logic changes and needs regeneration
 */
export async function clearAggregateCurveCache(userId: string): Promise<void> {
  await db.aggregateCurves.where('userId').equals(userId).delete();
}

/**
 * Clear all aggregate curve caches for all users
 * Use this when the aggregate calculation logic changes
 */
export async function clearAllAggregateCurves(): Promise<void> {
  await db.aggregateCurves.clear();
}

/**
 * Get cache statistics for display
 */
export async function getCacheStats(userId: string): Promise<{
  workoutCount: number;
  powerCurveCount: number;
  aggregateCount: number;
  oldestWorkout?: number;
  newestWorkout?: number;
}> {
  const workoutCount = await db.workoutPerformance.where('userId').equals(userId).count();
  const powerCurveCount = await db.powerCurves.where('userId').equals(userId).count();
  const aggregateCount = await db.aggregateCurves.where('userId').equals(userId).count();
  
  // Get date range
  const curves = await db.powerCurves
    .where('userId')
    .equals(userId)
    .sortBy('metadata.workoutDate');
  
  const oldestWorkout = curves[0]?.metadata.workoutDate;
  const newestWorkout = curves[curves.length - 1]?.metadata.workoutDate;
  
  return {
    workoutCount,
    powerCurveCount,
    aggregateCount,
    oldestWorkout,
    newestWorkout,
  };
}
