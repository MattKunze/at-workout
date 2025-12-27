/**
 * Power Curve Utilities
 * 
 * Calculates maximum average power over various durations to create a power curve.
 * The power curve shows the greatest sustained power output for different time windows,
 * which is useful for understanding athlete capabilities across different effort durations.
 */

export interface PowerCurvePoint {
  /** Duration in seconds */
  duration: number;
  /** Maximum average power sustained for this duration (watts) */
  power: number;
  /** Start time in workout where this max occurred (seconds) */
  startTime: number;
}

export interface PowerCurve {
  /** Array of power curve data points, sorted by duration ascending */
  points: PowerCurvePoint[];
  /** Overall max power seen in workout */
  maxPower: number;
  /** Duration array used for analysis (in seconds) */
  durations: number[];
}

/**
 * Base duration intervals for power curve analysis.
 * Provides fine granularity for short efforts, medium for mid-range, coarser for long efforts.
 */
export const BASE_DURATIONS = [
  // Fine granularity for short efforts (every 5 seconds)
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
  
  // Medium granularity for 1-5 minutes (every 15 seconds)
  60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300,
  
  // Coarser granularity for longer efforts (every 30-60 seconds)
  360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200,
  1320, 1440, 1560, 1680, 1800, 1920, 2040, 2160, 2280, 2400, 2520, 2640, 2760, 2880, 3000,
  3300, 3600, 3900, 4200, 4500, 4800, 5100, 5400
];

/**
 * Calculate maximum average power for a specific duration window.
 * Uses a sliding window approach to find the highest average power.
 * 
 * @param powerData - Array of power values (watts)
 * @param duration - Duration window in seconds
 * @returns PowerCurvePoint with max average power and its location
 */
function calculateMaxAveragePower(
  powerData: number[],
  duration: number
): PowerCurvePoint | null {
  if (powerData.length < duration) {
    return null; // Not enough data for this duration
  }

  let maxAverage = 0;
  let maxStartIndex = 0;
  let currentSum = 0;

  // Initialize first window
  for (let i = 0; i < duration; i++) {
    currentSum += powerData[i];
  }
  maxAverage = currentSum / duration;

  // Slide the window
  for (let i = duration; i < powerData.length; i++) {
    // Remove leftmost value, add rightmost value
    currentSum = currentSum - powerData[i - duration] + powerData[i];
    const currentAverage = currentSum / duration;

    if (currentAverage > maxAverage) {
      maxAverage = currentAverage;
      maxStartIndex = i - duration + 1;
    }
  }

  return {
    duration,
    power: maxAverage,
    startTime: maxStartIndex,
  };
}

/**
 * Calculate power curve from workout power data.
 * 
 * Analyzes power output across multiple duration windows to create a curve showing
 * maximum sustained power at different time intervals.
 * 
 * @param powerData - Array of power values in watts (one per second typically)
 * @returns PowerCurve object with all calculated points
 */
export function calculatePowerCurve(powerData: number[]): PowerCurve {
  // Filter out null/undefined/zero values and create clean power array
  const cleanPowerData: number[] = [];
  
  for (let i = 0; i < powerData.length; i++) {
    const power = powerData[i];
    if (power !== null && power !== undefined && !isNaN(power) && power > 0) {
      cleanPowerData.push(power);
    }
  }

  if (cleanPowerData.length === 0) {
    return {
      points: [],
      maxPower: 0,
      durations: [],
    };
  }

  // Determine max duration based on available data
  const maxDuration = cleanPowerData.length;
  
  // Filter durations to only those we have enough data for
  const applicableDurations = BASE_DURATIONS.filter(d => d <= maxDuration);
  
  // Always include the full duration if not already in the list
  if (maxDuration > 5 && !applicableDurations.includes(maxDuration)) {
    applicableDurations.push(maxDuration);
    applicableDurations.sort((a, b) => a - b);
  }

  // Calculate power curve points
  const points: PowerCurvePoint[] = [];
  let maxPower = 0;

  for (const duration of applicableDurations) {
    const point = calculateMaxAveragePower(cleanPowerData, duration);
    if (point) {
      points.push(point);
      maxPower = Math.max(maxPower, point.power);
    }
  }

  return {
    points,
    maxPower,
    durations: applicableDurations,
  };
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "30s", "1m 30s", "1h 5m")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get key duration markers for highlighting on charts
 * Common benchmark durations: 5s, 30s, 1min, 5min, 20min, FTP (full duration)
 */
export function getKeyDurations(maxDuration: number): number[] {
  const standardDurations = [5, 30, 60, 300, 1200];
  return standardDurations.filter(d => d <= maxDuration);
}
