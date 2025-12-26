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
import type { PelotonUserProfile } from '../types/peloton';

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
 * @returns User profile data
 * @throws {PelotonApiError} If the request fails
 * 
 * @example
 * ```typescript
 * try {
 *   const profile = await getUserProfile();
 *   console.log(`Hello, ${profile.username}!`);
 * } catch (error) {
 *   if (error instanceof PelotonApiError) {
 *     console.error('Failed to fetch profile:', error.message);
 *   }
 * }
 * ```
 */
export async function getUserProfile(): Promise<PelotonUserProfile> {
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
