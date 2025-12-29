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
 * Workout summary data from /api/user/{user_id}/workouts endpoint
 */
export interface PelotonWorkout {
  /** Unique workout identifier */
  id: string;

  /** When the workout was created (Unix timestamp) */
  created_at: number;

  /** When the workout started (Unix timestamp) */
  start_time?: number;

  /** When the workout ended (Unix timestamp) */
  end_time?: number;

  /** Device type used (e.g., "home_bike_v1", "fitbit") */
  device_type?: string;

  /** Fitness discipline (e.g., "cycling", "running", "strength") */
  fitness_discipline?: string;

  /** Whether this is a total work personal record */
  is_total_work_personal_record?: boolean;

  /** Whether this is an outdoor workout */
  is_outdoor?: boolean;

  /** Status of the workout */
  status?: string;

  /** Type of workout: "class" or "freestyle" */
  workout_type?: string;

  /** Ride/class details */
  ride?: {
    /** Ride ID */
    id: string;
    /** Ride title */
    title?: string;
    /** Ride description */
    description?: string;
    /** Instructor details */
    instructor?: {
      id?: string;
      name?: string;
      image_url?: string;
    };
    /** Duration in seconds */
    duration?: number;
    /** Difficulty rating */
    difficulty_rating_avg?: number;
    /** Image URL */
    image_url?: string;
    /** Whether this ride is archived */
    is_archived?: boolean;
  };

  /** Heart rate zones / strive score */
  effort_zones?: {
    total_effort_points: number;
    heart_rate_zone_durations?: {
      heart_rate_z1_duration: number;
      heart_rate_z2_duration: number;
      heart_rate_z3_duration: number;
      heart_rate_z4_duration: number;
      heart_rate_z5_duration: number;
    };
  };

  /** Workout metrics */
  total_work?: number;
  distance?: number;
  calories?: number;

  // Add more fields as we discover them
  [key: string]: unknown;
}

/**
 * Response from workouts list endpoint
 */
export interface PelotonWorkoutsResponse {
  /** Array of workout summaries */
  data: PelotonWorkout[];

  /** Total count of workouts */
  count?: number;

  /** Pagination info */
  page?: number;
  page_count?: number;
  limit?: number;
  total?: number;
}

/**
 * Individual metric time series from performance graph
 * Each metric has an array of values that correspond to seconds_since_pedaling_start
 */
export interface PelotonPerformanceMetric {
  /** Display name for the metric (e.g., "Output", "Cadence") */
  display_name: string;

  /** Display unit (e.g., "watts", "rpm", "%") */
  display_unit: string;

  /** Metric slug/identifier (e.g., "output", "cadence", "resistance") */
  slug: string;

  /** Maximum value achieved during workout */
  max_value?: number;

  /** Average value across workout */
  average_value?: number;

  /** Array of values corresponding to seconds_since_pedaling_start timestamps */
  values: number[];

  /** Heart rate zones (only present for heart_rate metric) */
  zones?: Array<{
    display_name: string;
    slug: string;
    range: string;
    duration: number;
    max_value: number;
    min_value: number;
  }>;

  /** Duration of missing data in seconds (for heart rate) */
  missing_data_duration?: number;

  // Add more fields as we discover them
  [key: string]: unknown;
}

/**
 * Response from /api/workout/{workout_id}/performance_graph endpoint
 */
export interface PelotonWorkoutPerformance {
  /** Workout duration in seconds */
  duration?: number;

  /** Array of timestamps (in seconds) corresponding to metric values */
  seconds_since_pedaling_start?: number[];

  /** Array of metric time series (output, cadence, resistance, speed, heart rate, etc.) */
  metrics?: PelotonPerformanceMetric[];

  /** Workout segments (warm up, cycling, cool down, etc.) */
  segment_list?: Array<{
    id: string;
    name: string;
    length: number;
    start_time_offset: number;
    icon_url?: string;
    icon_name?: string;
    icon_slug?: string;
    intensity_in_mets?: number;
    metrics_type?: string;
    is_drill?: boolean;
  }>;

  /** Summary statistics (totals) */
  summaries?: Array<{
    slug: string;
    value: number;
    display_name: string;
    display_unit: string;
  }>;

  /** Average metrics across entire workout */
  average_summaries?: Array<{
    slug: string;
    value: number;
    display_name: string;
    display_unit: string;
  }>;

  /** Whether class plan was shown */
  is_class_plan_shown?: boolean;

  /** Whether performance graph data is available */
  performance_graph_available?: boolean;

  /** Whether summary data is available */
  summary_available?: boolean;

  // Add more fields as we discover them
  [key: string]: unknown;
}
