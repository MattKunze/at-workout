/**
 * AggregatePowerCurveChart Component
 * 
 * Molecule component that displays multiple power curves overlaid for comparison.
 * Shows lifetime bests, yearly progression, monthly trends, etc.
 * 
 * This is similar to PowerCurveChart but supports displaying multiple curves
 * with different colors and a legend for comparison.
 */

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
    payload: Record<string, number | string>;
  }>;
}

/**
 * Custom tooltip to show power values for each curve at a duration
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const durationLabel = payload[0]?.payload.durationLabel as string;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Duration</span>
          <span className="font-bold text-sm">{durationLabel}</span>
        </div>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs">{entry.name}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-sm">{entry.value.toFixed(0)}</span>
              <span className="text-xs text-muted-foreground">W</span>
            </div>
          </div>
        ))}
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
  // Filter out curves with no data
  const validCurves = curves.filter(c => c.curve && c.curve.points.length > 0);

  // Don't render if no valid curves
  if (validCurves.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
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
              No power curve data available. Sync your workout history in preferences
              to enable aggregate power curve analysis.
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

  // Build unified data structure for all curves
  // We need all unique durations across all curves
  const allDurations = new Set<number>();
  curvesWithColors.forEach(({ curve }) => {
    curve.points.forEach(p => allDurations.add(p.duration));
  });

  const sortedDurations = Array.from(allDurations).sort((a, b) => a - b);

  // Build chart data
  const chartData = sortedDurations.map(duration => {
    const dataPoint: Record<string, number | string> = {
      duration,
      durationLabel: formatDuration(duration),
    };

    curvesWithColors.forEach(({ curve, label }) => {
      const point = curve.points.find(p => p.duration === duration);
      dataPoint[label] = point ? point.power : 0;
    });

    return dataPoint;
  });

  // Build chart configuration
  const chartConfig: ChartConfig = {};
  curvesWithColors.forEach(({ label, color }) => {
    chartConfig[label] = {
      label,
      color,
    };
  });

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
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 25 }}
          >
            <defs>
              {curvesWithColors.map(({ color }, idx) => (
                <linearGradient key={idx} id={`fill-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              ))}
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
            
            {/* Render each curve as an Area */}
            {curvesWithColors.map(({ label, color }, idx) => (
              <Area
                key={idx}
                type="monotone"
                dataKey={label}
                stroke={color}
                fill={`url(#fill-${idx})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ChartContainer>

        {/* Legend / Curve Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {curvesWithColors.map(({ curve, label: curveLabel, color }, idx) => {
            // Get key benchmark powers
            const power5s = curve.points.find(p => p.duration === 5)?.power;
            const power1min = curve.points.find(p => p.duration === 60)?.power;
            const power5min = curve.points.find(p => p.duration === 300)?.power;
            const power20min = curve.points.find(p => p.duration === 1200)?.power;

            return (
              <div
                key={idx}
                className="flex flex-col p-3 rounded-md bg-muted/50 border-l-4"
                style={{ borderColor: color }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold">{curveLabel}</span>
                </div>
                <div className="ml-5 space-y-1 text-muted-foreground">
                  {power5s !== undefined && (
                    <div>5s: <span className="font-bold">{power5s.toFixed(0)}W</span></div>
                  )}
                  {power1min !== undefined && (
                    <div>1min: <span className="font-bold">{power1min.toFixed(0)}W</span></div>
                  )}
                  {power5min !== undefined && (
                    <div>5min: <span className="font-bold">{power5min.toFixed(0)}W</span></div>
                  )}
                  {power20min !== undefined && (
                    <div>20min: <span className="font-bold">{power20min.toFixed(0)}W</span></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
