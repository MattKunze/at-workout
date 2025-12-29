import type { PelotonWorkoutPerformance } from '../types/peloton';

/**
 * Represents a single data point in time with all metric values
 */
export interface ChartDataPoint {
  /** Time in minutes since workout start */
  time: number;
  
  /** Segment indicator value (100 for warmup/cooldown, 0 for main workout) */
  segmentBackground?: number;
  
  /** All metric values at this timestamp (e.g., output: 264, cadence: 96) */
  [metricSlug: string]: number | undefined;
}

/**
 * Normalized chart data point with values scaled to 0-100
 */
export interface NormalizedChartDataPoint {
  /** Time in minutes since workout start */
  time: number;
  
  /** Segment indicator for warm up phase */
  segmentWarmUp?: number;
  
  /** Segment indicator for cool down phase */
  segmentCoolDown?: number;
  
  /** Normalized metric values (0-100 scale) */
  [metricSlug: string]: number | undefined;
}

/**
 * Metadata about metric normalization for display purposes
 */
export interface MetricNormalizationInfo {
  slug: string;
  displayName: string;
  unit: string;
  min: number;
  max: number;
  avgOriginal: number;
  avgCyclingOnly: number;
}

/**
 * Transforms Peloton performance data from separate arrays into chart format
 * 
 * Input format: 
 * {
 *   seconds_since_pedaling_start: [0, 60, 120],
 *   metrics: [{ slug: "output", values: [100, 110, 105] }]
 * }
 * 
 * Output format:
 * [
 *   { time: 0, output: 100, cadence: 80 },
 *   { time: 1, output: 110, cadence: 85 },
 *   { time: 2, output: 105, cadence: 82 }
 * ]
 */
export function transformPerformanceDataForChart(
  performanceData: PelotonWorkoutPerformance
): ChartDataPoint[] {
  const { seconds_since_pedaling_start, metrics } = performanceData;
  
  if (!seconds_since_pedaling_start || !metrics || seconds_since_pedaling_start.length === 0) {
    return [];
  }
  
  // Transform the data: each timestamp becomes a data point with all metric values
  return seconds_since_pedaling_start.map((seconds, index) => {
    const dataPoint: ChartDataPoint = {
      time: Number((seconds / 60).toFixed(2)), // Convert seconds to minutes with 2 decimals
    };
    
    // Add each metric's value at this timestamp
    metrics.forEach((metric) => {
      if (metric.values[index] !== undefined && metric.values[index] !== null) {
        dataPoint[metric.slug] = metric.values[index];
      }
    });
    
    return dataPoint;
  });
}

/**
 * Normalizes chart data to 0-100 scale for combined visualization
 * Excludes speed metric and normalizes remaining metrics based on their min/max values
 * Also adds segment information for background coloring
 * 
 * @returns Tuple of [normalizedData, metricInfo]
 */
export function normalizeChartData(
  chartData: ChartDataPoint[],
  performanceData: PelotonWorkoutPerformance
): [NormalizedChartDataPoint[], MetricNormalizationInfo[]] {
  if (chartData.length === 0 || !performanceData.metrics) {
    return [[], []];
  }
  
  // Get segment information
  const segments = performanceData.segment_list || [];
  
  // Filter out speed metric and metrics with no valid data
  const metricsToInclude = performanceData.metrics.filter(m => {
    if (m.slug === 'speed') return false;
    
    // Check if metric has any valid values
    const validValues = m.values.filter(v => v !== undefined && v !== null);
    return validValues.length > 0;
  });
  
  // If no metrics remain after filtering, return empty arrays
  if (metricsToInclude.length === 0) {
    return [[], []];
  }
  
  // Calculate min/max for each metric
  const metricStats = metricsToInclude.map(metric => {
    const values = metric.values.filter(v => v !== undefined && v !== null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // Calculate cycling-only average (excluding warmup and cooldown)
    const cyclingOnlyValues: number[] = [];
    metric.values.forEach((value, index) => {
      if (value === undefined || value === null) return;
      
      const timeInSeconds = performanceData.seconds_since_pedaling_start?.[index];
      if (timeInSeconds === undefined) return;
      
      // Check if this point is in warmup or cooldown
      let isWarmUpOrCoolDown = false;
      segments.forEach(segment => {
        const segmentStart = segment.start_time_offset;
        const segmentEnd = segment.start_time_offset + segment.length;
        
        if (timeInSeconds >= segmentStart && timeInSeconds <= segmentEnd) {
          if (segment.name === 'Warm Up' || segment.name === 'Cool Down') {
            isWarmUpOrCoolDown = true;
          }
        }
      });
      
      if (!isWarmUpOrCoolDown) {
        cyclingOnlyValues.push(value);
      }
    });
    
    const avgCyclingOnly = cyclingOnlyValues.length > 0
      ? cyclingOnlyValues.reduce((sum, v) => sum + v, 0) / cyclingOnlyValues.length
      : avg; // Fallback to overall average if no cycling-only data
    
    return {
      slug: metric.slug,
      displayName: metric.display_name,
      unit: metric.display_unit,
      min,
      max,
      avgOriginal: avg,
      avgCyclingOnly,
    };
  });
  
  // Normalize the data
  const normalizedData = chartData.map(point => {
    const normalized: NormalizedChartDataPoint = {
      time: point.time,
    };
    
    // Add segment indicators (100 = show background, 0 = hide)
    const timeInSeconds = point.time * 60;
    
    // Check if this point is in warm up or cool down
    segments.forEach(segment => {
      const segmentStart = segment.start_time_offset;
      const segmentEnd = segment.start_time_offset + segment.length;
      
      if (timeInSeconds >= segmentStart && timeInSeconds <= segmentEnd) {
        if (segment.name === 'Warm Up') {
          normalized.segmentWarmUp = 100;
        } else if (segment.name === 'Cool Down') {
          normalized.segmentCoolDown = 100;
        }
      }
    });
    
    // Set to 0 if not in segment
    if (normalized.segmentWarmUp === undefined) normalized.segmentWarmUp = 0;
    if (normalized.segmentCoolDown === undefined) normalized.segmentCoolDown = 0;
    
    metricStats.forEach(stat => {
      const value = point[stat.slug];
      if (value !== undefined && value !== null) {
        // Resistance is already 0-100%, so use raw values
        if (stat.slug === 'resistance') {
          normalized[stat.slug] = value;
        } else {
          // For other metrics, normalize from 0 to max (preserving zero baseline)
          if (stat.max > 0) {
            normalized[stat.slug] = (value / stat.max) * 100;
          } else {
            normalized[stat.slug] = 0;
          }
        }
      }
    });
    
    return normalized;
  });
  
  return [normalizedData, metricStats];
}

/**
 * Gets the list of available metric configurations for the chart
 * Returns display names, units, and colors for each metric
 */
export function getMetricConfigurations(metrics: PelotonWorkoutPerformance['metrics']) {
  if (!metrics) return [];
  
  // Color palette for different metrics (using Tremor's color system)
  const colorMap: Record<string, string> = {
    output: 'blue',
    cadence: 'green',
    resistance: 'orange',
    speed: 'purple',
    heart_rate: 'red',
  };
  
  return metrics.map((metric) => ({
    key: metric.slug,
    name: metric.display_name,
    unit: metric.display_unit,
    color: colorMap[metric.slug] || 'gray',
  }));
}
