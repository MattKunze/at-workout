/**
 * Aggregate Power Curve Utilities
 * 
 * Provides functions to combine multiple power curves into aggregate curves
 * showing lifetime bests, yearly progression, monthly trends, etc.
 * 
 * The core algorithm is simple: for each duration, take the maximum power
 * value across all input curves. This gives you the best sustained power
 * at each duration across all selected workouts.
 */

import { db, type PowerCurveCache, type AggregatePowerCurveCache } from './db';
import type { PowerCurve, PowerCurvePoint } from './powerCurveUtils';
import { BASE_DURATIONS } from './powerCurveUtils';

// Re-export BASE_DURATIONS for use in aggregation
export { BASE_DURATIONS };

/**
 * Combine multiple power curves into a single aggregate curve
 * by taking the maximum value at each duration.
 * 
 * This creates a "best of" curve showing the highest sustained power
 * achieved at each duration across all provided curves.
 * 
 * Only standard BASE_DURATIONS are included in the aggregate to avoid
 * odd workout-specific durations that create artifacts in the visualization.
 * 
 * @param curves - Array of power curves to combine
 * @returns Aggregate power curve with max values at each duration
 */
export function combinePowerCurves(curves: PowerCurve[]): PowerCurve {
  if (curves.length === 0) {
    return {
      points: [],
      maxPower: 0,
      durations: [],
    };
  }

  if (curves.length === 1) {
    return curves[0];
  }

  // Build a map of duration -> max power across all curves
  // Only include standard BASE_DURATIONS to avoid odd workout-specific durations
  const durationMaxMap = new Map<number, PowerCurvePoint>();

  for (const curve of curves) {
    for (const point of curve.points) {
      // Only include points that are in BASE_DURATIONS
      if (!BASE_DURATIONS.includes(point.duration)) {
        continue;
      }
      
      const existing = durationMaxMap.get(point.duration);
      
      if (!existing || point.power > existing.power) {
        durationMaxMap.set(point.duration, point);
      }
    }
  }

  // Convert map to sorted array
  const points = Array.from(durationMaxMap.values()).sort(
    (a, b) => a.duration - b.duration
  );

  const maxPower = points.length > 0 
    ? Math.max(...points.map(p => p.power))
    : 0;

  const durations = points.map(p => p.duration);

  return {
    points,
    maxPower,
    durations,
  };
}

/**
 * Time range filter options for aggregate curves
 */
export interface TimeRangeFilter {
  /** Start of time range (Unix timestamp in ms) */
  start?: number;
  
  /** End of time range (Unix timestamp in ms) */
  end?: number;
}

/**
 * Get all power curves for a user within a time range
 * 
 * @param userId - Peloton user ID
 * @param timeRange - Optional time range filter
 * @returns Array of power curve caches
 */
export async function getPowerCurvesInRange(
  userId: string,
  timeRange?: TimeRangeFilter
): Promise<PowerCurveCache[]> {
  const query = db.powerCurves.where('userId').equals(userId);

  if (timeRange?.start || timeRange?.end) {
    const curves = await query.toArray();
    
    return curves.filter(curve => {
      const date = curve.metadata.workoutDate;
      
      if (timeRange.start && date < timeRange.start) {
        return false;
      }
      
      if (timeRange.end && date > timeRange.end) {
        return false;
      }
      
      return true;
    });
  }

  return query.toArray();
}

/**
 * Calculate or retrieve cached aggregate power curve
 * 
 * @param userId - Peloton user ID
 * @param type - Type of aggregation
 * @param options - Additional options (year, month for time-based aggregates)
 * @returns Aggregate power curve
 */
export async function getAggregatePowerCurve(
  userId: string,
  type: 'lifetime' | 'year' | 'month' | 'custom' | 'days',
  options?: {
    year?: number;
    month?: number; // 1-12
    days?: number; // Number of days back from now
    timeRange?: TimeRangeFilter;
    forceRecalculate?: boolean;
  }
): Promise<PowerCurve> {
  // Generate cache ID
  const cacheId = generateAggregateCacheId(userId, type, options);

  // Check if we have a cached version (unless force recalculate)
  if (!options?.forceRecalculate) {
    const cached = await db.aggregateCurves.get(cacheId);
    
    if (cached) {
      // Cache hit! Return the stored curve
      return cached.curve;
    }
  }

  // Cache miss or forced recalculation - compute the aggregate
  const timeRange = getTimeRangeForAggregate(type, options);
  const curveCaches = await getPowerCurvesInRange(userId, timeRange);
  
  if (curveCaches.length === 0) {
    // No workouts in this range
    return {
      points: [],
      maxPower: 0,
      durations: [],
    };
  }

  // Extract the curves and combine them
  const curves = curveCaches.map(c => c.curve);
  const aggregateCurve = combinePowerCurves(curves);

  // Store in cache for future use
  const cacheEntry: AggregatePowerCurveCache = {
    id: cacheId,
    userId,
    aggregateType: type,
    timeRange,
    curve: aggregateCurve,
    workoutIds: curveCaches.map(c => c.workoutId),
    calculatedAt: Date.now(),
  };

  await db.aggregateCurves.put(cacheEntry);

  return aggregateCurve;
}

/**
 * Generate a unique cache ID for an aggregate curve
 */
function generateAggregateCacheId(
  userId: string,
  type: 'lifetime' | 'year' | 'month' | 'custom' | 'days',
  options?: {
    year?: number;
    month?: number;
    days?: number;
    timeRange?: TimeRangeFilter;
  }
): string {
  switch (type) {
    case 'lifetime':
      return `${userId}-lifetime`;
    
    case 'year':
      return `${userId}-${options?.year || new Date().getFullYear()}`;
    
    case 'month': {
      const year = options?.year || new Date().getFullYear();
      const month = options?.month || (new Date().getMonth() + 1);
      return `${userId}-${year}-${String(month).padStart(2, '0')}`;
    }
    
    case 'days': {
      const days = options?.days || 30;
      // Use current date (rounded to start of day) for cache stability
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return `${userId}-last${days}days-${dateKey}`;
    }
    
    case 'custom': {
      const start = options?.timeRange?.start || 0;
      const end = options?.timeRange?.end || Date.now();
      return `${userId}-custom-${start}-${end}`;
    }
  }
}

/**
 * Convert aggregate type and options to a time range filter
 */
function getTimeRangeForAggregate(
  type: 'lifetime' | 'year' | 'month' | 'custom' | 'days',
  options?: {
    year?: number;
    month?: number;
    days?: number;
    timeRange?: TimeRangeFilter;
  }
): TimeRangeFilter {
  switch (type) {
    case 'lifetime':
      // No filter - include all workouts
      return {};
    
    case 'year': {
      const year = options?.year || new Date().getFullYear();
      const start = new Date(year, 0, 1).getTime();
      const end = new Date(year + 1, 0, 1).getTime();
      return { start, end };
    }
    
    case 'month': {
      const year = options?.year || new Date().getFullYear();
      const month = (options?.month || (new Date().getMonth() + 1)) - 1; // 0-indexed
      const start = new Date(year, month, 1).getTime();
      const end = new Date(year, month + 1, 1).getTime();
      return { start, end };
    }
    
    case 'days': {
      const days = options?.days || 30;
      const now = Date.now();
      const start = now - (days * 24 * 60 * 60 * 1000);
      return { start, end: now };
    }
    
    case 'custom':
      return options?.timeRange || {};
  }
}

/**
 * Invalidate aggregate caches that include a specific workout
 * Call this when a new workout is added to trigger recalculation
 * 
 * @param userId - Peloton user ID
 * @param workoutId - Workout ID that was added/updated
 * @param workoutDate - Date of the workout (Unix timestamp)
 */
export async function invalidateAggregatesForWorkout(
  userId: string,
  _workoutId: string,
  workoutDate: number
): Promise<void> {
  const year = new Date(workoutDate).getFullYear();
  const month = new Date(workoutDate).getMonth() + 1;

  // Invalidate lifetime, year, and month aggregates
  const idsToInvalidate = [
    `${userId}-lifetime`,
    `${userId}-${year}`,
    `${userId}-${year}-${String(month).padStart(2, '0')}`,
  ];

  await db.aggregateCurves.bulkDelete(idsToInvalidate);
  
  // Also invalidate any custom ranges that might include this workout
  // (This is less precise but ensures consistency)
  const customAggregates = await db.aggregateCurves
    .where('userId')
    .equals(userId)
    .and(agg => agg.aggregateType === 'custom')
    .toArray();

  const customIdsToDelete = customAggregates
    .filter(agg => {
      const inRange = 
        (!agg.timeRange.start || workoutDate >= agg.timeRange.start) &&
        (!agg.timeRange.end || workoutDate <= agg.timeRange.end);
      return inRange;
    })
    .map(agg => agg.id);

  if (customIdsToDelete.length > 0) {
    await db.aggregateCurves.bulkDelete(customIdsToDelete);
  }
}

/**
 * Get available years for which we have workout data
 * Useful for populating year selector dropdowns
 * 
 * @param userId - Peloton user ID
 * @returns Array of years (descending order)
 */
export async function getAvailableYears(userId: string): Promise<number[]> {
  const curves = await db.powerCurves
    .where('userId')
    .equals(userId)
    .toArray();

  if (curves.length === 0) {
    return [];
  }

  const years = new Set<number>();
  
  for (const curve of curves) {
    const year = new Date(curve.metadata.workoutDate).getFullYear();
    years.add(year);
  }

  return Array.from(years).sort((a, b) => b - a); // Descending
}

/**
 * Get available months for a specific year
 * Useful for populating month selector dropdowns
 * 
 * @param userId - Peloton user ID
 * @param year - Year to get months for
 * @returns Array of month numbers (1-12, descending order)
 */
export async function getAvailableMonthsForYear(
  userId: string,
  year: number
): Promise<number[]> {
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year + 1, 0, 1).getTime();

  const curves = await getPowerCurvesInRange(userId, {
    start: yearStart,
    end: yearEnd,
  });

  if (curves.length === 0) {
    return [];
  }

  const months = new Set<number>();
  
  for (const curve of curves) {
    const month = new Date(curve.metadata.workoutDate).getMonth() + 1;
    months.add(month);
  }

  return Array.from(months).sort((a, b) => b - a); // Descending
}

/**
 * Represents a single power effort with workout context
 */
export interface PowerEffort {
  /** Duration in seconds */
  duration: number;
  /** Power output in watts */
  power: number;
  /** Workout ID where this effort occurred */
  workoutId: string;
  /** Date of the workout (Unix timestamp) */
  workoutDate: number;
}

/**
 * Get top N power efforts for a specific duration
 * 
 * @param userId - Peloton user ID
 * @param duration - Duration in seconds (e.g., 5, 60, 300, 1200)
 * @param limit - Number of top efforts to return (default: 3)
 * @param timeRange - Optional time range filter
 * @returns Array of top power efforts sorted by power (descending)
 */
export async function getTopEffortsForDuration(
  userId: string,
  duration: number,
  limit: number = 3,
  timeRange?: TimeRangeFilter
): Promise<PowerEffort[]> {
  // Get all power curves for the user
  const curveCaches = await getPowerCurvesInRange(userId, timeRange);
  
  if (curveCaches.length === 0) {
    return [];
  }

  // Extract efforts for the specified duration from each workout
  const efforts: PowerEffort[] = [];
  
  for (const cache of curveCaches) {
    // Find the point for this duration in the workout's power curve
    const point = cache.curve.points.find(p => p.duration === duration);
    
    if (point && point.power > 0) {
      efforts.push({
        duration,
        power: point.power,
        workoutId: cache.workoutId,
        workoutDate: cache.metadata.workoutDate,
      });
    }
  }

  // Sort by power descending and take top N
  efforts.sort((a, b) => b.power - a.power);
  
  return efforts.slice(0, limit);
}

/**
 * Get top N efforts for multiple durations at once
 * More efficient than calling getTopEffortsForDuration multiple times
 * 
 * @param userId - Peloton user ID
 * @param durations - Array of durations in seconds
 * @param limit - Number of top efforts per duration (default: 3)
 * @param timeRange - Optional time range filter
 * @returns Map of duration to array of top efforts
 */
export async function getTopEffortsForDurations(
  userId: string,
  durations: number[],
  limit: number = 3,
  timeRange?: TimeRangeFilter
): Promise<Map<number, PowerEffort[]>> {
  // Get all power curves for the user once
  const curveCaches = await getPowerCurvesInRange(userId, timeRange);
  
  if (curveCaches.length === 0) {
    return new Map();
  }

  // Build a map of duration -> array of efforts
  const effortsByDuration = new Map<number, PowerEffort[]>();
  
  // Initialize empty arrays for each duration
  for (const duration of durations) {
    effortsByDuration.set(duration, []);
  }

  // Extract efforts from each workout
  for (const cache of curveCaches) {
    for (const duration of durations) {
      const point = cache.curve.points.find(p => p.duration === duration);
      
      if (point && point.power > 0) {
        const efforts = effortsByDuration.get(duration)!;
        efforts.push({
          duration,
          power: point.power,
          workoutId: cache.workoutId,
          workoutDate: cache.metadata.workoutDate,
        });
      }
    }
  }

  // Sort and limit each duration's efforts
  for (const [duration, efforts] of effortsByDuration.entries()) {
    efforts.sort((a, b) => b.power - a.power);
    effortsByDuration.set(duration, efforts.slice(0, limit));
  }

  return effortsByDuration;
}

/**
 * Get power curve for the last N days
 * Convenience wrapper around getAggregatePowerCurve
 * 
 * @param userId - Peloton user ID
 * @param days - Number of days to look back
 * @returns Power curve for the specified time period
 */
export async function getRecentDaysPowerCurve(
  userId: string,
  days: number
): Promise<PowerCurve> {
  return await getAggregatePowerCurve(userId, 'days', { days });
}
