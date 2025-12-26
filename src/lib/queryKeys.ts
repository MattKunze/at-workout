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
    // Future: add more peloton-related keys
    // workouts: (filters?: WorkoutFilters) => [...queryKeys.peloton.all, 'workouts', filters] as const,
  },
  // Future: add more service keys as needed
  // bluesky: { ... },
} as const;
