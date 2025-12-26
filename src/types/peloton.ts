/**
 * Peloton API Type Definitions
 * 
 * These types are manually maintained based on observed API responses.
 * As the Peloton API does not provide official TypeScript types or OpenAPI specs,
 * we maintain these definitions incrementally as we integrate new endpoints.
 * 
 * API Base URL: https://api.onepeloton.com
 * Documentation: No official public documentation available
 * 
 * When adding new endpoints:
 * 1. Make a test request to observe the response structure
 * 2. Define the response type here
 * 3. Export the type for use in the client service
 * 4. Add JSDoc comments with example values where helpful
 */

/**
 * User profile data from /api/me endpoint
 * 
 * This represents the authenticated user's profile information
 */
export interface PelotonUserProfile {
  /** User's unique identifier */
  id: string;
  
  /** Display username */
  username: string;
  
  /** User's first name */
  first_name?: string;
  
  /** User's last name */
  last_name?: string;
  
  /** User's location (e.g., "New York, NY") */
  location?: string;
  
  /** Profile image URL */
  image_url?: string;
  
  /** Whether this user is a Peloton instructor */
  is_profile_private?: boolean;
  
  /** Whether the profile is private */
  is_instructor?: boolean;
  
  /** Total number of workouts completed */
  total_workouts?: number;
  
  /** Total number of followers */
  total_followers?: number;
  
  /** Total number of users this user is following */
  total_following?: number;
  
  /** User's birthday in ISO format */
  birthday?: string;
  
  /** User's gender */
  gender?: string;
  
  /** User's preferred workout metrics (imperial/metric) */
  workout_counts?: Record<string, number>;
  
  /** When the user was created (Unix timestamp) */
  created_at?: number;
  
  // Add more fields as we discover them
  [key: string]: unknown;
}

/**
 * Standard API response wrapper used by some Peloton endpoints
 */
export interface PelotonApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Workout summary data
 * Placeholder for future workout-related endpoints
 */
export interface PelotonWorkout {
  id: string;
  // Add fields as needed when we implement workout endpoints
  [key: string]: unknown;
}
