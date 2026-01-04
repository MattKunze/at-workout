import { useState } from "react";
import {
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PowerCurve } from "../../lib/powerCurveUtils";
import { formatDuration, getKeyDurations } from "../../lib/powerCurveUtils";
import type { PowerEffort } from "../../hooks/queries/useAggregatePowerCurves";
import { useRecentDaysPowerCurve } from "../../hooks/queries/useAggregatePowerCurves";

interface PowerCurveChartProps {
  /** Power curve data calculated from workout */
  powerCurve: PowerCurve;
  /** Map of duration to top efforts (for showing PR badges) */
  topEffortsMap?: Map<number, PowerEffort[]>;
  /** Current workout ID (to determine which efforts belong to this workout) */
  currentWorkoutId?: string;
}

type ComparisonPeriod = "30d" | "60d" | "1y" | null;

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
      comparisonPower?: number | null;
      startTime: number;
      durationLabel: string;
    };
  }>;
  comparisonLabel: string | null;
}

/**
 * Custom tooltip to show duration, power, comparison data, and when it occurred
 */
function CustomTooltip({
  active,
  payload,
  comparisonLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const comparisonData = payload.find((p) => p.dataKey === "comparisonPower");

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
        {comparisonData && data.comparisonPower != null && (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {comparisonLabel}
            </span>
            <div className="flex items-baseline gap-2">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-base">
                  {data.comparisonPower.toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">watts</span>
              </div>
              {data.power !== data.comparisonPower && (
                <span
                  className={`text-xs ${data.power > data.comparisonPower ? "text-success" : "text-error"}`}
                >
                  ({data.power > data.comparisonPower ? "+" : ""}
                  {(data.power - data.comparisonPower).toFixed(0)}W)
                </span>
              )}
            </div>
          </div>
        )}
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
  currentWorkoutId,
}: PowerCurveChartProps) {
  // State for comparison period selection
  const [comparisonPeriod, setComparisonPeriod] =
    useState<ComparisonPeriod>(null);

  // Fetch comparison data based on selected period
  const { data: comparison30d } = useRecentDaysPowerCurve(30, {
    enabled: comparisonPeriod === "30d",
  });
  const { data: comparison60d } = useRecentDaysPowerCurve(60, {
    enabled: comparisonPeriod === "60d",
  });
  const { data: comparison1y } = useRecentDaysPowerCurve(365, {
    enabled: comparisonPeriod === "1y",
  });

  // Select the active comparison curve
  const comparisonCurve =
    comparisonPeriod === "30d"
      ? comparison30d
      : comparisonPeriod === "60d"
        ? comparison60d
        : comparisonPeriod === "1y"
          ? comparison1y
          : null;

  const comparisonLabel =
    comparisonPeriod === "30d"
      ? "30 Day"
      : comparisonPeriod === "60d"
        ? "60 Day"
        : comparisonPeriod === "1y"
          ? "1 Year"
          : null;

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
      return <span className="badge badge-sm badge-primary font-bold">PR</span>;
    } else if (rank <= 3) {
      return <span className="badge badge-sm badge-accent">Top {rank}</span>;
    } else if (rank <= 5) {
      return <span className="badge badge-sm badge-ghost">Top {rank}</span>;
    } else if (rank <= 10) {
      return (
        <span className="badge badge-sm badge-ghost text-xs">#{rank}</span>
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

  // Transform data for chart with comparison data
  const chartData = powerCurve.points.map((point) => {
    const comparisonPoint = comparisonCurve?.points.find(
      (cp) => cp.duration === point.duration
    );
    return {
      duration: point.duration,
      power: point.power,
      comparisonPower: comparisonPoint?.power ?? null,
      startTime: point.startTime,
      durationLabel: formatDuration(point.duration),
    };
  });

  const chartConfig: ChartConfig = {
    power: {
      label: "Power",
      color: "oklch(var(--p))",
    },
    comparisonPower: {
      label: comparisonLabel || "Comparison",
      color: "oklch(var(--s))",
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

  // Get comparison values for benchmark durations
  const comparison5s = comparisonCurve?.points.find(
    (p) => p.duration === 5
  )?.power;
  const comparison1min = comparisonCurve?.points.find(
    (p) => p.duration === 60
  )?.power;
  const comparison5min = comparisonCurve?.points.find(
    (p) => p.duration === 300
  )?.power;
  const comparison20min = comparisonCurve?.points.find(
    (p) => p.duration === 1200
  )?.power;

  return (
    <div className="w-full">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Power Curve</CardTitle>
          {/* Comparison period selector */}
          <div className="join">
            <button
              className={`btn btn-xs join-item ${comparisonPeriod === "30d" ? "btn-primary" : "btn-ghost"}`}
              onClick={() =>
                setComparisonPeriod(comparisonPeriod === "30d" ? null : "30d")
              }
            >
              30d
            </button>
            <button
              className={`btn btn-xs join-item ${comparisonPeriod === "60d" ? "btn-primary" : "btn-ghost"}`}
              onClick={() =>
                setComparisonPeriod(comparisonPeriod === "60d" ? null : "60d")
              }
            >
              60d
            </button>
            <button
              className={`btn btn-xs join-item ${comparisonPeriod === "1y" ? "btn-primary" : "btn-ghost"}`}
              onClick={() =>
                setComparisonPeriod(comparisonPeriod === "1y" ? null : "1y")
              }
            >
              1y
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ComposedChart
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
              <ChartTooltip
                content={<CustomTooltip comparisonLabel={comparisonLabel} />}
              />
              <Area
                type="monotone"
                dataKey="power"
                stroke="oklch(var(--p))"
                fill="url(#fillPower)"
                strokeWidth={3}
                isAnimationActive={false}
              />
              {/* Render comparison as dotted line if present */}
              {comparisonPeriod && comparisonCurve && (
                <Line
                  type="monotone"
                  dataKey="comparisonPower"
                  stroke="oklch(var(--s))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
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
                {comparison5s !== undefined && comparisonPeriod && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-baseline gap-1">
                      <span>{comparisonLabel}:</span>
                      <span className="font-semibold">
                        {comparison5s.toFixed(0)}W
                      </span>
                      <div
                        className={`font-semibold ${power5s / comparison5s >= 0.9 ? "text-success" : "text-warning"}`}
                      >
                        ({((power5s / comparison5s) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                )}
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
                {comparison1min !== undefined && comparisonPeriod && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-baseline gap-1">
                      <span>{comparisonLabel}:</span>
                      <span className="font-semibold">
                        {comparison1min.toFixed(0)}W
                      </span>
                      <div
                        className={`font-semibold ${power1min / comparison1min >= 0.9 ? "text-success" : "text-warning"}`}
                      >
                        ({((power1min / comparison1min) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                )}
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
                {comparison5min !== undefined && comparisonPeriod && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-baseline gap-1">
                      <span>{comparisonLabel}:</span>
                      <span className="font-semibold">
                        {comparison5min.toFixed(0)}W
                      </span>
                      <div
                        className={`font-semibold ${power5min / comparison5min >= 0.9 ? "text-success" : "text-warning"}`}
                      >
                        ({((power5min / comparison5min) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                )}
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
                {comparison20min !== undefined && comparisonPeriod && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-baseline gap-1">
                      <span>{comparisonLabel}:</span>
                      <span className="font-semibold">
                        {comparison20min.toFixed(0)}W
                      </span>
                      <div
                        className={`font-semibold ${power20min / comparison20min >= 0.9 ? "text-success" : "text-warning"}`}
                      >
                        ({((power20min / comparison20min) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                )}
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
