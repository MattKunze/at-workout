/**
 * AggregatePowerCurveChart Component
 *
 * Molecule component that displays multiple power curves overlaid for comparison.
 * Shows lifetime bests, yearly progression, monthly trends, etc.
 *
 * This is similar to PowerCurveChart but supports displaying multiple curves
 * with different colors and a legend for comparison.
 */

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PowerCurve } from "../../lib/powerCurveUtils";
import { formatDuration, getKeyDurations } from "../../lib/powerCurveUtils";

export interface PowerCurveComparison {
  curve: PowerCurve;
  label: string;
  color?: string;
}

interface AggregatePowerCurveChartProps {
  /** Array of power curves to display */
  curves: PowerCurveComparison[];

  /** Chart title */
  title?: string;

  /** Optional subtitle/description */
  description?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: Record<string, number | string | null>;
  }>;
}

/**
 * Custom tooltip to show power values for each curve at a duration
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const durationLabel = payload[0]?.payload.durationLabel as string;
  const data = payload[0]?.payload;
  
  // Check if delta data is present
  const hasDelta = data.delta !== undefined && data.delta !== null;
  const delta = data.delta as number;
  const percentChange = data.percentChange as number;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Duration</span>
          <span className="font-bold text-sm">{durationLabel}</span>
        </div>
        {payload
          .filter((entry) => !entry.dataKey.startsWith('delta')) // Filter out delta series
          .map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs">{entry.name}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-sm">
                  {entry.value.toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">W</span>
              </div>
            </div>
          ))}
        
        {/* Show delta information if present */}
        {hasDelta && (
          <div className="pt-2 mt-2 border-t border-border">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs">Delta</span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-bold text-sm ${
                    delta > 0
                      ? "text-success"
                      : delta < 0
                      ? "text-error"
                      : ""
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">W</span>
                <span
                  className={`text-xs ml-1 ${
                    delta > 0
                      ? "text-success"
                      : delta < 0
                      ? "text-error"
                      : "text-muted-foreground"
                  }`}
                >
                  ({delta > 0 ? "+" : ""}
                  {percentChange.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Default colors for curves (DaisyUI color scheme)
 */
const DEFAULT_COLORS = [
  "oklch(var(--p))", // primary
  "oklch(var(--s))", // secondary
  "oklch(var(--a))", // accent
  "oklch(var(--in))", // info
  "oklch(var(--su))", // success
  "oklch(var(--wa))", // warning
];

/**
 * Calculate deltas between two power curves
 */
interface DeltaComparison {
  baseline: PowerCurveComparison;
  comparison: PowerCurveComparison;
  deltas: Array<{
    duration: number;
    durationLabel: string;
    baselinePower: number;
    comparisonPower: number;
    delta: number;
    percentChange: number;
  }>;
}

function calculateDeltas(
  baseline: PowerCurveComparison,
  comparison: PowerCurveComparison
): DeltaComparison {
  // Get all common durations
  const baselineMap = new Map(
    baseline.curve.points.map((p) => [p.duration, p.power])
  );
  const comparisonMap = new Map(
    comparison.curve.points.map((p) => [p.duration, p.power])
  );

  const commonDurations = Array.from(baselineMap.keys()).filter((d) =>
    comparisonMap.has(d)
  );

  const deltas = commonDurations
    .map((duration) => {
      const baselinePower = baselineMap.get(duration)!;
      const comparisonPower = comparisonMap.get(duration)!;
      const delta = comparisonPower - baselinePower;
      const percentChange = (delta / baselinePower) * 100;

      return {
        duration,
        durationLabel: formatDuration(duration),
        baselinePower,
        comparisonPower,
        delta,
        percentChange,
      };
    })
    .sort((a, b) => a.duration - b.duration);

  return {
    baseline,
    comparison,
    deltas,
  };
}

/**
 * AggregatePowerCurveChart - Displays multiple power curves for comparison
 *
 * A stateless molecule component that renders overlaid power curves showing
 * how power output changes over time or across different time periods.
 *
 * @example
 * ```tsx
 * <AggregatePowerCurveChart
 *   title="Power Curve Progression"
 *   curves={[
 *     { curve: lifetimeCurve, label: "Lifetime Best" },
 *     { curve: yearCurve, label: "2025" },
 *     { curve: monthCurve, label: "January 2025" }
 *   ]}
 * />
 * ```
 */
export function AggregatePowerCurveChart({
  curves,
  title = "Power Curve Comparison",
  description,
}: AggregatePowerCurveChartProps) {
  // State to track which curves are visible
  const [visibleCurves, setVisibleCurves] = useState<Set<string>>(() => {
    // Initialize with all curves visible
    return new Set(curves.map((c) => c.label));
  });

  // Toggle curve visibility
  const toggleCurve = (label: string) => {
    setVisibleCurves((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Filter out curves with no data
  const validCurves = curves.filter(
    (c) => c.curve && c.curve.points.length > 0
  );

  // Filter to only visible curves for rendering
  const visibleValidCurves = validCurves.filter((c) =>
    visibleCurves.has(c.label)
  );

  // Calculate deltas when exactly two curves are selected
  // Assume curves are ordered from older to newer, so compare [1] - [0]
  const showDeltas = visibleValidCurves.length === 2;
  const deltaData = showDeltas 
    ? calculateDeltas(visibleValidCurves[0], visibleValidCurves[1]) 
    : null;

  // Don't render if no valid curves
  if (validCurves.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>
              No power curve data available. Sync your workout history in
              preferences to enable aggregate power curve analysis.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Assign colors to curves
  const curvesWithColors = validCurves.map((c, idx) => ({
    ...c,
    color: c.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  // Build unified data structure for visible curves only
  // We need all unique durations across all visible curves
  const allDurations = new Set<number>();
  visibleValidCurves.forEach(({ curve }) => {
    curve.points.forEach((p) => allDurations.add(p.duration));
  });

  const sortedDurations = Array.from(allDurations).sort((a, b) => a - b);

  // Build chart data
  const chartData = sortedDurations.map((duration) => {
    const dataPoint: Record<string, number | string | null> = {
      duration,
      durationLabel: formatDuration(duration),
    };

    visibleValidCurves.forEach(({ curve, label }) => {
      const point = curve.points.find((p) => p.duration === duration);
      // Use null instead of 0 for missing data to prevent phantom connections
      dataPoint[label] = point ? point.power : null;
    });

    // Add delta data if comparing two curves
    if (deltaData) {
      const deltaPoint = deltaData.deltas.find((d) => d.duration === duration);
      if (deltaPoint) {
        dataPoint.delta = deltaPoint.delta;
        dataPoint.deltaPositive = deltaPoint.delta > 0 ? deltaPoint.delta : null;
        dataPoint.deltaNegative = deltaPoint.delta < 0 ? deltaPoint.delta : null;
        dataPoint.baselinePower = deltaPoint.baselinePower;
        dataPoint.comparisonPower = deltaPoint.comparisonPower;
        dataPoint.percentChange = deltaPoint.percentChange;
      }
    }

    return dataPoint;
  });

  // Build chart configuration for all curves (not just visible)
  const chartConfig: ChartConfig = {};
  curvesWithColors.forEach(({ label, color }) => {
    chartConfig[label] = {
      label,
      color,
    };
  });

  // Add delta configuration if showing deltas
  if (showDeltas && deltaData) {
    chartConfig.deltaPositive = {
      label: `${deltaData.comparison.label} - ${deltaData.baseline.label} (Gain)`,
      color: "oklch(var(--su))",
    };
    chartConfig.deltaNegative = {
      label: `${deltaData.comparison.label} - ${deltaData.baseline.label} (Loss)`,
      color: "oklch(var(--er))",
    };
  }

  // Get key durations for x-axis ticks
  const maxDuration = sortedDurations[sortedDurations.length - 1];
  const keyDurations = getKeyDurations(maxDuration);

  // Add the max duration if it's not too close to the last key duration
  if (maxDuration - keyDurations[keyDurations.length - 1] > 60) {
    keyDurations.push(maxDuration);
  }

  const formatXAxisTick = (value: number) => formatDuration(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 25 }}
          >
            <defs>
              {curvesWithColors.map(({ color }, idx) => (
                <linearGradient
                  key={idx}
                  id={`fill-${idx}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              ))}
              {/* Delta gradients */}
              {showDeltas && (
                <>
                  <linearGradient
                    id="fill-delta-positive"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="oklch(var(--su))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(var(--su))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient
                    id="fill-delta-negative"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="oklch(var(--er))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(var(--er))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </>
              )}
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
              domain={showDeltas ? ['auto', 'auto'] : [0, 'auto']}
              label={{
                value: "Power (watts)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <ChartTooltip content={<CustomTooltip />} />

            {/* Render each visible curve as an Area */}
            {visibleValidCurves.map(({ label, color }, idx) => (
              <Area
                key={idx}
                type="monotone"
                dataKey={label}
                stroke={color}
                fill={`url(#fill-${validCurves.findIndex((c) => c.label === label)})`}
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}

            {/* Render delta areas when comparing two curves */}
            {showDeltas && (
              <>
                <ReferenceLine y={0} stroke="oklch(var(--bc)/0.2)" strokeWidth={1} strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="deltaPositive"
                  stroke="oklch(var(--su))"
                  fill="url(#fill-delta-positive)"
                  strokeWidth={2}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="deltaNegative"
                  stroke="oklch(var(--er))"
                  fill="url(#fill-delta-negative)"
                  strokeWidth={2}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </>
            )}
          </AreaChart>
        </ChartContainer>

        {/* Legend / Curve Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {curvesWithColors.map(({ curve, label: curveLabel, color }, idx) => {
            const isVisible = visibleCurves.has(curveLabel);

            // Get key benchmark powers
            const power5s = curve.points.find((p) => p.duration === 5)?.power;
            const power1min = curve.points.find(
              (p) => p.duration === 60
            )?.power;
            const power5min = curve.points.find(
              (p) => p.duration === 300
            )?.power;
            const power20min = curve.points.find(
              (p) => p.duration === 1200
            )?.power;

            return (
              <button
                key={idx}
                onClick={() => toggleCurve(curveLabel)}
                className={`flex flex-col p-3 rounded-md border-l-4 text-left transition-all hover:shadow-md ${
                  isVisible
                    ? "bg-muted/50 opacity-100"
                    : "bg-muted/20 opacity-50"
                }`}
                style={{ borderColor: isVisible ? color : "transparent" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-3 w-3 rounded-full transition-all"
                    style={{
                      backgroundColor: isVisible
                        ? color
                        : "oklch(var(--bc)/0.3)",
                    }}
                  />
                  <span className="font-semibold">{curveLabel}</span>
                </div>
                <div className="ml-5 space-y-1 text-muted-foreground">
                  {power5s !== undefined && (
                    <div>
                      5s:{" "}
                      <span className="font-bold">{power5s.toFixed(0)}W</span>
                    </div>
                  )}
                  {power1min !== undefined && (
                    <div>
                      1min:{" "}
                      <span className="font-bold">{power1min.toFixed(0)}W</span>
                    </div>
                  )}
                  {power5min !== undefined && (
                    <div>
                      5min:{" "}
                      <span className="font-bold">{power5min.toFixed(0)}W</span>
                    </div>
                  )}
                  {power20min !== undefined && (
                    <div>
                      20min:{" "}
                      <span className="font-bold">
                        {power20min.toFixed(0)}W
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
