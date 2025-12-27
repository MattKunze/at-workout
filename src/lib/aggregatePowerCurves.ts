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
  const durationMaxMap = new Map<number, PowerCurvePoint>();

  for (const curve of curves) {
    for (const point of curve.points) {
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
  type: 'lifetime' | 'year' | 'month' | 'custom',
  options?: {
    year?: number;
    month?: number; // 1-12
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
  type: 'lifetime' | 'year' | 'month' | 'custom',
  options?: {
    year?: number;
    month?: number;
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
  type: 'lifetime' | 'year' | 'month' | 'custom',
  options?: {
    year?: number;
    month?: number;
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
