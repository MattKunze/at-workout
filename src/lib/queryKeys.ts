/**
 * Centralized query keys for React Query
 * 
 * This provides type-safe, hierarchical query keys that follow best practices
 * for cache invalidation and management.
 * 
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

export const queryKeys = {
  peloton: {
    all: ['peloton'] as const,
    profile: () => [...queryKeys.peloton.all, 'profile'] as const,
    workouts: (userId: string, params?: { limit?: number; page?: number }) => 
      [...queryKeys.peloton.all, 'workouts', userId, params] as const,
    workout: (workoutId: string) => [...queryKeys.peloton.all, 'workout', workoutId] as const,
    workoutPerformance: (workoutId: string) => [...queryKeys.peloton.all, 'workout-performance', workoutId] as const,
  },
  // Future: add more service keys as needed
  // bluesky: { ... },
} as const;
