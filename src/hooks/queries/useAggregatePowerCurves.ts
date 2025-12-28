/**
 * React Query Hooks for Aggregate Power Curves
 * 
 * Provides hooks for fetching and managing aggregate power curves
 * that combine multiple workouts to show lifetime bests, yearly progression,
 * monthly trends, etc.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserId } from '../../lib/db';
import {
  getAggregatePowerCurve,
  getAvailableYears,
  getAvailableMonthsForYear,
  getTopEffortsForDurations,
  type PowerEffort,
} from '../../lib/aggregatePowerCurves';

/**
 * Query keys for aggregate power curves
 */
export const aggregatePowerCurveKeys = {
  all: ['aggregatePowerCurve'] as const,
  lifetime: (userId: string) => [...aggregatePowerCurveKeys.all, 'lifetime', userId] as const,
  year: (userId: string, year: number) => [...aggregatePowerCurveKeys.all, 'year', userId, year] as const,
  month: (userId: string, year: number, month: number) => 
    [...aggregatePowerCurveKeys.all, 'month', userId, year, month] as const,
  days: (userId: string, days: number) =>
    [...aggregatePowerCurveKeys.all, 'days', userId, days] as const,
  availableYears: (userId: string) => [...aggregatePowerCurveKeys.all, 'availableYears', userId] as const,
  availableMonths: (userId: string, year: number) => 
    [...aggregatePowerCurveKeys.all, 'availableMonths', userId, year] as const,
  topEfforts: (userId: string, durations: number[]) =>
    [...aggregatePowerCurveKeys.all, 'topEfforts', userId, ...durations] as const,
};

/**
 * Hook to fetch lifetime aggregate power curve
 * 
 * This shows the best power values achieved at each duration across
 * all workouts ever recorded.
 * 
 * @param options - Query options
 * @returns Query result with lifetime power curve
 */
export function useLifetimePowerCurve(options?: { enabled?: boolean }) {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: aggregatePowerCurveKeys.lifetime(userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return await getAggregatePowerCurve(userId, 'lifetime');
    },
    enabled: options?.enabled !== false && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes (aggregates change less frequently)
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch yearly aggregate power curve
 * 
 * Shows the best power values achieved at each duration during a specific year.
 * 
 * @param year - Year to fetch (e.g., 2025)
 * @param options - Query options
 * @returns Query result with yearly power curve
 */
export function useYearlyPowerCurve(
  year: number,
  options?: { enabled?: boolean }
) {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: aggregatePowerCurveKeys.year(userId || '', year),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return await getAggregatePowerCurve(userId, 'year', { year });
    },
    enabled: options?.enabled !== false && !!userId && !!year,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch monthly aggregate power curve
 * 
 * Shows the best power values achieved at each duration during a specific month.
 * 
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param options - Query options
 * @returns Query result with monthly power curve
 */
export function useMonthlyPowerCurve(
  year: number,
  month: number,
  options?: { enabled?: boolean }
) {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: aggregatePowerCurveKeys.month(userId || '', year, month),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return await getAggregatePowerCurve(userId, 'month', { year, month });
    },
    enabled: options?.enabled !== false && !!userId && !!year && !!month,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch power curve for the last N days
 * 
 * Shows the best power values achieved at each duration during the last N days.
 * 
 * @param days - Number of days to look back
 * @param options - Query options
 * @returns Query result with recent days power curve
 */
export function useRecentDaysPowerCurve(
  days: number,
  options?: { enabled?: boolean }
) {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: aggregatePowerCurveKeys.days(userId || '', days),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return await getAggregatePowerCurve(userId, 'days', { days });
    },
    enabled: options?.enabled !== false && !!userId && !!days,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch list of years with workout data
 * 
 * Useful for populating year selector dropdowns.
 * 
 * @param options - Query options
 * @returns Query result with array of years
 */
export function useAvailableYears(options?: { enabled?: boolean }) {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: aggregatePowerCurveKeys.availableYears(userId || ''),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return await getAvailableYears(userId);
    },
    enabled: options?.enabled !== false && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch list of months with workout data for a specific year
 * 
 * Useful for populating month selector dropdowns.
 * 
 * @param year - Year to get months for
 * @param options - Query options
 * @returns Query result with array of month numbers (1-12)
 */
export function useAvailableMonths(
  year: number,
  options?: { enabled?: boolean }
) {
  const userId = getCurrentUserId();
  
  return useQuery({
    queryKey: aggregatePowerCurveKeys.availableMonths(userId || '', year),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return await getAvailableMonthsForYear(userId, year);
    },
    enabled: options?.enabled !== false && !!userId && !!year,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to force recalculation of aggregate power curves
 * 
 * Use this when you want to invalidate caches and recompute aggregates
 * (e.g., after adding new workouts or fixing a calculation bug).
 * 
 * @returns Mutation object with recalculate function
 */
export function useRecalculateAggregates() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (options?: {
      type?: 'lifetime' | 'year' | 'month';
      year?: number;
      month?: number;
    }) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { type = 'lifetime', year, month } = options || {};

      // Force recalculation by passing forceRecalculate flag
      await getAggregatePowerCurve(userId, type, {
        year,
        month,
        forceRecalculate: true,
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to trigger refetch
      const { type = 'lifetime', year, month } = variables || {};

      switch (type) {
        case 'lifetime':
          queryClient.invalidateQueries({
            queryKey: aggregatePowerCurveKeys.lifetime(userId || ''),
          });
          break;
        case 'year':
          if (year) {
            queryClient.invalidateQueries({
              queryKey: aggregatePowerCurveKeys.year(userId || '', year),
            });
          }
          break;
        case 'month':
          if (year && month) {
            queryClient.invalidateQueries({
              queryKey: aggregatePowerCurveKeys.month(userId || '', year, month),
            });
          }
          break;
      }
    },
  });
}

/**
 * Hook to compare multiple power curves
 * 
 * Fetches multiple aggregate curves simultaneously for comparison.
 * Note: This is a simplified version that works for up to 3 comparisons.
 * For more complex scenarios, consider using useQueries from @tanstack/react-query.
 * 
 * @param comparisons - Array of curve specifications to fetch (max 3)
 * @returns Object with all requested curves and loading states
 */
export function useComparePowerCurves(
  comparisons: Array<
    | { type: 'lifetime' }
    | { type: 'year'; year: number }
    | { type: 'month'; year: number; month: number }
  >
) {
  const userId = getCurrentUserId();

  // Build query configs for each comparison
  const queryConfigs = comparisons.map(comparison => {
    if (comparison.type === 'lifetime') {
      return {
        key: aggregatePowerCurveKeys.lifetime(userId || ''),
        fn: async () => {
          if (!userId) throw new Error('User ID is required');
          const curve = await getAggregatePowerCurve(userId, 'lifetime');
          return { curve, label: 'Lifetime' };
        },
      };
    } else if (comparison.type === 'year') {
      return {
        key: aggregatePowerCurveKeys.year(userId || '', comparison.year),
        fn: async () => {
          if (!userId) throw new Error('User ID is required');
          const curve = await getAggregatePowerCurve(userId, 'year', { year: comparison.year });
          return { curve, label: `${comparison.year}` };
        },
      };
    } else {
      return {
        key: aggregatePowerCurveKeys.month(userId || '', comparison.year, comparison.month),
        fn: async () => {
          if (!userId) throw new Error('User ID is required');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const curve = await getAggregatePowerCurve(userId, 'month', {
            year: comparison.year,
            month: comparison.month,
          });
          return { curve, label: `${monthNames[comparison.month - 1]} ${comparison.year}` };
        },
      };
    }
  });

  // Call useQuery for each config (hooks must be called unconditionally)
  // We call up to 3 queries unconditionally, but disable the ones we don't need
  const query1 = useQuery({
    queryKey: queryConfigs[0]?.key || ['empty', '0'],
    queryFn: queryConfigs[0]?.fn || (async () => ({ curve: { points: [], maxPower: 0, durations: [] }, label: '' })),
    enabled: !!userId && !!queryConfigs[0],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const query2 = useQuery({
    queryKey: queryConfigs[1]?.key || ['empty', '1'],
    queryFn: queryConfigs[1]?.fn || (async () => ({ curve: { points: [], maxPower: 0, durations: [] }, label: '' })),
    enabled: !!userId && !!queryConfigs[1],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const query3 = useQuery({
    queryKey: queryConfigs[2]?.key || ['empty', '2'],
    queryFn: queryConfigs[2]?.fn || (async () => ({ curve: { points: [], maxPower: 0, durations: [] }, label: '' })),
    enabled: !!userId && !!queryConfigs[2],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const queries = [query1, query2, query3].slice(0, comparisons.length);

  return {
    curves: queries.map(r => r.data).filter(Boolean),
    isLoading: queries.some(r => r.isLoading),
    isError: queries.some(r => r.isError),
    errors: queries.map(r => r.error),
  };
}

/**
 * Hook to fetch top N power efforts for specific durations
 * 
 * Returns the best efforts across all workouts for key durations
 * (e.g., 5s, 1min, 5min, 20min) with workout context for linking.
 * 
 * @param durations - Array of durations in seconds to fetch top efforts for
 * @param limit - Number of top efforts per duration (default: 3)
 * @param options - Query options
 * @returns Query result with map of duration to top efforts
 */
export function useTopEfforts(
  durations: number[],
  limit: number = 3,
  options?: { enabled?: boolean }
) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: aggregatePowerCurveKeys.topEfforts(userId || '', durations),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return await getTopEffortsForDurations(userId, durations, limit);
    },
    enabled: options?.enabled !== false && !!userId && durations.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Re-export PowerEffort type for convenience
export type { PowerEffort };
