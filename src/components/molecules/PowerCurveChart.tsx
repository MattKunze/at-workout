import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PowerCurve } from "../../lib/powerCurveUtils";
import { formatDuration, getKeyDurations } from "../../lib/powerCurveUtils";
import type { PowerEffort } from "../../hooks/queries/useAggregatePowerCurves";

interface PowerCurveChartProps {
  /** Power curve data calculated from workout */
  powerCurve: PowerCurve;
  /** Map of duration to top efforts (for showing PR badges) */
  topEffortsMap?: Map<number, PowerEffort[]>;
  /** Current workout ID (to determine which efforts belong to this workout) */
  currentWorkoutId?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: {
      duration: number;
      power: number;
      startTime: number;
      durationLabel: string;
    };
  }>;
}

/**
 * Custom tooltip to show duration, power, and when it occurred
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Duration</span>
          <span className="font-bold text-sm">{data.durationLabel}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Max Avg Power</span>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-lg">{data.power.toFixed(0)}</span>
            <span className="text-xs text-muted-foreground">watts</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Occurred at</span>
          <span className="text-sm">
            {Math.floor(data.startTime / 60)}:
            {String(data.startTime % 60).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * PowerCurveChart - Displays power curve showing max sustained power over various durations
 *
 * A stateless molecule component that renders a descending curve visualization showing
 * the maximum average power that can be sustained for different time periods.
 * This is useful for understanding peak power capabilities across sprint, anaerobic,
 * and aerobic efforts.
 *
 * The chart uses a log scale on the X-axis to better display the wide range of durations
 * from seconds to potentially hours.
 *
 * @example
 * ```tsx
 * const powerCurve = calculatePowerCurve(outputData);
 * <PowerCurveChart powerCurve={powerCurve} />
 * ```
 */
export function PowerCurveChart({ 
  powerCurve, 
  topEffortsMap,
  currentWorkoutId 
}: PowerCurveChartProps) {
  // Helper function to get PR rank for a given duration
  const getPRRank = (duration: number, power: number): number | null => {
    if (!topEffortsMap || !currentWorkoutId) {
      return null;
    }

    const efforts = topEffortsMap.get(duration);
    if (!efforts || efforts.length === 0) {
      return null;
    }

    // Find the rank of the current workout's effort
    // Efforts are already sorted by power descending
    const rank = efforts.findIndex(
      (e) => e.workoutId === currentWorkoutId && Math.abs(e.power - power) < 0.1
    );

    return rank >= 0 ? rank + 1 : null; // Convert to 1-based rank
  };

  // Helper function to render PR badge based on rank
  const renderPRBadge = (rank: number | null) => {
    if (rank === null) return null;

    if (rank === 1) {
      return (
        <span className="badge badge-sm badge-primary font-bold">
          PR
        </span>
      );
    } else if (rank <= 3) {
      return (
        <span className="badge badge-sm badge-accent">
          Top {rank}
        </span>
      );
    } else if (rank <= 5) {
      return (
        <span className="badge badge-sm badge-ghost">
          Top {rank}
        </span>
      );
    } else if (rank <= 10) {
      return (
        <span className="badge badge-sm badge-ghost text-xs">
          #{rank}
        </span>
      );
    }
    return null;
  };

  // Don't render if no data available
  if (powerCurve.points.length === 0) {
    return (
      <div className="alert alert-warning">
        <span>No power data available to generate curve.</span>
      </div>
    );
  }

  // Transform data for chart
  const chartData = powerCurve.points.map((point) => ({
    duration: point.duration,
    power: point.power,
    startTime: point.startTime,
    durationLabel: formatDuration(point.duration),
  }));

  const chartConfig: ChartConfig = {
    power: {
      label: "Power",
      color: "oklch(var(--p))",
    },
  };

  // Get key durations for x-axis ticks
  const maxDuration = powerCurve.points[powerCurve.points.length - 1].duration;
  const keyDurations = getKeyDurations(maxDuration);

  // Add the max duration if it's not too close to the last key duration
  if (maxDuration - keyDurations[keyDurations.length - 1] > 60) {
    keyDurations.push(maxDuration);
  }

  // Custom tick formatter for X-axis
  const formatXAxisTick = (value: number) => formatDuration(value);

  // Calculate some summary stats
  const power5s = powerCurve.points.find((p) => p.duration === 5)?.power;
  const power1min = powerCurve.points.find((p) => p.duration === 60)?.power;
  const power5min = powerCurve.points.find((p) => p.duration === 300)?.power;
  const power20min = powerCurve.points.find((p) => p.duration === 1200)?.power;
  const powerMax = powerCurve.points[powerCurve.points.length - 1]?.power;

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Power Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 25 }}
            >
              <defs>
                <linearGradient id="fillPower" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(var(--p))"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(var(--p))"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="duration"
                domain={["dataMin", "dataMax"]}
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                ticks={keyDurations}
                tickFormatter={formatXAxisTick}
                label={{
                  value: "Duration",
                  position: "insideBottom",
                  offset: -20,
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                label={{
                  value: "Power (watts)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="power"
                stroke="oklch(var(--p))"
                fill="url(#fillPower)"
                strokeWidth={3}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>

          {/* Key power benchmarks */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {power5s !== undefined && (
              <div className="flex flex-col p-2 rounded-md bg-muted/50 relative">
                {renderPRBadge(getPRRank(5, power5s)) && (
                  <div className="absolute -top-2 -right-2">
                    {renderPRBadge(getPRRank(5, power5s))}
                  </div>
                )}
                <span className="text-muted-foreground mb-0.5">5 sec</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-base">
                    {power5s.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">W</span>
                </div>
              </div>
            )}
            {power1min !== undefined && (
              <div className="flex flex-col p-2 rounded-md bg-muted/50 relative">
                {renderPRBadge(getPRRank(60, power1min)) && (
                  <div className="absolute -top-2 -right-2">
                    {renderPRBadge(getPRRank(60, power1min))}
                  </div>
                )}
                <span className="text-muted-foreground mb-0.5">1 min</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-base">
                    {power1min.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">W</span>
                </div>
              </div>
            )}
            {power5min !== undefined && (
              <div className="flex flex-col p-2 rounded-md bg-muted/50 relative">
                {renderPRBadge(getPRRank(300, power5min)) && (
                  <div className="absolute -top-2 -right-2">
                    {renderPRBadge(getPRRank(300, power5min))}
                  </div>
                )}
                <span className="text-muted-foreground mb-0.5">5 min</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-base">
                    {power5min.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">W</span>
                </div>
              </div>
            )}
            {power20min !== undefined && (
              <div className="flex flex-col p-2 rounded-md bg-muted/50 relative">
                {renderPRBadge(getPRRank(1200, power20min)) && (
                  <div className="absolute -top-2 -right-2">
                    {renderPRBadge(getPRRank(1200, power20min))}
                  </div>
                )}
                <span className="text-muted-foreground mb-0.5">20 min</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-base">
                    {power20min.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">W</span>
                </div>
              </div>
            )}
            {powerMax !== undefined && (
              <div className="flex flex-col p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground mb-0.5">Average</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-base">
                    {powerMax.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">W</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
