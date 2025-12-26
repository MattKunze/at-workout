/**
 * Peloton API Client (Browser-side)
 * 
 * This service provides type-safe methods for calling Peloton API endpoints
 * from the browser via backend proxy routes. The proxy routes are necessary
 * because Peloton's API does not support CORS for browser requests.
 * 
 * All methods call proxy endpoints on your backend (e.g., /api/peloton/me)
 * and pass the access token via the Authorization header.
 */

import { getValidAccessToken } from './pelotonTokens';
import type { PelotonUserProfile, PelotonWorkoutsResponse, PelotonWorkoutPerformance } from '../types/peloton';

/**
 * Error thrown when Peloton API requests fail
 */
export class PelotonApiError extends Error {
  statusCode?: number;
  response?: unknown;
  
  constructor(
    message: string,
    statusCode?: number,
    response?: unknown
  ) {
    super(message);
    this.name = 'PelotonApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Fetch the authenticated user's profile information
 * 
 * @param signal - Optional AbortSignal to cancel the request
 * @returns User profile data
 * @throws {PelotonApiError} If the request fails
 * 
 * @example
 * ```typescript
 * const abortController = new AbortController();
 * try {
 *   const profile = await getUserProfile(abortController.signal);
 *   console.log(`Hello, ${profile.username}!`);
 * } catch (error) {
 *   if (error instanceof PelotonApiError) {
 *     console.error('Failed to fetch profile:', error.message);
 *   }
 * }
 * // Later: abortController.abort();
 * ```
 */
export async function getUserProfile(signal?: AbortSignal): Promise<PelotonUserProfile> {
  try {
    // Get a valid access token (will refresh if needed)
    const accessToken = await getValidAccessToken('peloton');
    
    if (!accessToken) {
      throw new PelotonApiError(
        'Not authenticated with Peloton. Please connect your account first.'
      );
    }
    
    const response = await fetch('/api/peloton/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: string }).error || `Request failed with status ${response.status}`;
      throw new PelotonApiError(errorMessage, response.status, errorData);
    }
    
    const data = await response.json();
    return data as PelotonUserProfile;
  } catch (error) {
    if (error instanceof PelotonApiError) {
      throw error;
    }
    
    // Don't treat abort errors as failures
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new PelotonApiError(`Failed to fetch profile: ${error.message}`);
    }
    
    throw new PelotonApiError('Unknown error occurred while fetching profile');
  }
}

// Future API methods can be added here as we expand functionality.
// Each method should call a backend proxy endpoint (e.g., /api/peloton/workouts)
// rather than calling Peloton's API directly due to CORS restrictions.
//
// Examples:
// - export async function getWorkouts(...)
// - export async function getWorkoutById(...)
// - export async function getFollowers(...)

/**
 * Fetch a user's workout history
 * 
 * @param userId - The Peloton user ID
 * @param limit - Maximum number of workouts to return (default: 10)
 * @param page - Page number for pagination (default: 0)
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Paginated workout data
 * @throws {PelotonApiError} If the request fails
 * 
 * @example
 * ```typescript
 * try {
 *   const workouts = await getUserWorkouts('user123', 10);
 *   console.log(`Found ${workouts.count} total workouts`);
 *   workouts.data.forEach(workout => {
 *     console.log(`${workout.ride.title} - ${new Date(workout.created_at * 1000).toLocaleDateString()}`);
 *   });
 * } catch (error) {
 *   if (error instanceof PelotonApiError) {
 *     console.error('Failed to fetch workouts:', error.message);
 *   }
 * }
 * ```
 */
export async function getUserWorkouts(
  userId: string,
  limit: number = 10,
  page: number = 0,
  signal?: AbortSignal
): Promise<PelotonWorkoutsResponse> {
  try {
    // Get a valid access token (will refresh if needed)
    const accessToken = await getValidAccessToken('peloton');
    
    if (!accessToken) {
      throw new PelotonApiError(
        'Not authenticated with Peloton. Please connect your account first.'
      );
    }
    
    const url = `/api/peloton/workouts/${userId}?limit=${limit}&page=${page}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: string }).error || `Request failed with status ${response.status}`;
      throw new PelotonApiError(errorMessage, response.status, errorData);
    }
    
    const data = await response.json();
    return data as PelotonWorkoutsResponse;
  } catch (error) {
    if (error instanceof PelotonApiError) {
      throw error;
    }
    
    // Don't treat abort errors as failures
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new PelotonApiError(`Failed to fetch workouts: ${error.message}`);
    }
    
    throw new PelotonApiError('Unknown error occurred while fetching workouts');
  }
}

/**
 * Fetch detailed performance data for a specific workout
 * 
 * @param workoutId - The Peloton workout ID
 * @param everyN - Time series sampling rate (1 = every second, 5 = every 5 seconds, etc.)
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Workout performance time series data
 * @throws {PelotonApiError} If the request fails
 * 
 * @example
 * ```typescript
 * try {
 *   // Get second-by-second data
 *   const performance = await getWorkoutPerformance('workout123', 1);
 *   console.log(`${performance.metrics?.length || 0} data points`);
 *   
 *   // Or sample every 5 seconds for larger datasets
 *   const sampledPerformance = await getWorkoutPerformance('workout123', 5);
 * } catch (error) {
 *   if (error instanceof PelotonApiError) {
 *     console.error('Failed to fetch performance data:', error.message);
 *   }
 * }
 * ```
 */
export async function getWorkoutPerformance(
  workoutId: string,
  everyN: number = 1,
  signal?: AbortSignal
): Promise<PelotonWorkoutPerformance> {
  try {
    // Get a valid access token (will refresh if needed)
    const accessToken = await getValidAccessToken('peloton');
    
    if (!accessToken) {
      throw new PelotonApiError(
        'Not authenticated with Peloton. Please connect your account first.'
      );
    }
    
    const url = `/api/peloton/workout/${workoutId}/performance?every_n=${everyN}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: string }).error || `Request failed with status ${response.status}`;
      throw new PelotonApiError(errorMessage, response.status, errorData);
    }
    
    const data = await response.json();
    return data as PelotonWorkoutPerformance;
  } catch (error) {
    if (error instanceof PelotonApiError) {
      throw error;
    }
    
    // Don't treat abort errors as failures
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new PelotonApiError(`Failed to fetch workout performance: ${error.message}`);
    }
    
    throw new PelotonApiError('Unknown error occurred while fetching workout performance');
  }
}


