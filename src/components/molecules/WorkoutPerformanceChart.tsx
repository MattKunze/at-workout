import { ComposedChart, Area, Line, CartesianGrid, XAxis } from "recharts";
import type { PelotonWorkoutPerformance } from "../../types/peloton";
import {
  transformPerformanceDataForChart,
  normalizeChartData,
  type MetricNormalizationInfo,
} from "../../lib/chartUtils";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkoutPerformanceChartProps {
  /** Performance data from Peloton API */
  performanceData: PelotonWorkoutPerformance;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: Record<string, number>;
  }>;
  metricInfo: MetricNormalizationInfo[];
}

/**
 * Custom tooltip component to show both normalized and actual values
 */
function CustomTooltip({ active, payload, metricInfo }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <div className="grid gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Time</span>
          <span className="font-bold text-sm">
            {payload[0]?.payload.time.toFixed(2)} min
          </span>
        </div>
        {payload.map((entry, index) => {
          const metricData = metricInfo.find((m) => m.slug === entry.dataKey);
          if (!metricData) return null;

          // Resistance is already in raw percentage form
          // Other metrics are normalized from 0 to max (not min to max)
          const displayValue =
            entry.dataKey === "resistance"
              ? entry.value
              : (entry.value / 100) * metricData.max;

          const normalizedPercent =
            entry.dataKey === "resistance"
              ? null // Don't show normalized % for resistance since it's already a %
              : entry.value;

          return (
            <div key={index} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs font-medium">{entry.name}</span>
              </div>
              <div className="ml-4 flex items-baseline gap-1">
                <span className="font-bold text-sm">
                  {displayValue.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {metricData.unit}
                </span>
                {normalizedPercent !== null && (
                  <span className="text-xs text-muted-foreground">
                    ({normalizedPercent.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * WorkoutPerformanceChart - Displays workout metrics over time
 *
 * A stateless molecule component that renders a single normalized line chart showing
 * all key metrics (output, cadence, resistance, heart rate) on a 0-100 scale.
 *
 * Speed metric is excluded for clarity. All metrics are normalized to the same scale
 * so they can be compared visually.
 *
 * Uses shadcn/ui chart components built on Recharts with Tailwind integration.
 *
 * @example
 * ```tsx
 * <WorkoutPerformanceChart performanceData={performanceData} />
 * ```
 */
export function WorkoutPerformanceChart({
  performanceData,
}: WorkoutPerformanceChartProps) {
  const chartData = transformPerformanceDataForChart(performanceData);
  const [normalizedData, metricInfo] = normalizeChartData(
    chartData,
    performanceData
  );

  // Don't render if no data available
  if (normalizedData.length === 0 || metricInfo.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workout Performance</CardTitle>
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
              No performance metrics available to chart. This workout may not
              have been recorded on Peloton equipment.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Map metrics to DaisyUI colors
  const metricColorMap: Record<string, string> = {
    resistance: "oklch(var(--in))", // info (blue)
    heart_rate: "oklch(var(--s))", // secondary
    output: "oklch(var(--p))", // primary
    cadence: "oklch(var(--pc))", // primary-content
  };

  // Build chart configuration dynamically based on available metrics
  const chartConfig: ChartConfig = {};
  metricInfo.forEach((metric) => {
    chartConfig[metric.slug] = {
      label: metric.displayName,
      color: metricColorMap[metric.slug] || "oklch(var(--p))",
    };
  });

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Workout Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ComposedChart
              data={normalizedData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="fillResistance" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(var(--in))"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(var(--b1))"
                    stopOpacity={1}
                  />
                </linearGradient>
                <linearGradient id="fillWarmUp" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(var(--b3))"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(var(--b1))"
                    stopOpacity={1}
                  />
                </linearGradient>
                <linearGradient id="fillCoolDown" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(var(--b3))"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(var(--b1))"
                    stopOpacity={1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                label={{
                  value: "Time (minutes)",
                  position: "insideBottom",
                  offset: -5,
                }}
                ticks={Array.from(
                  {
                    length:
                      Math.floor(
                        normalizedData[normalizedData.length - 1].time / 10
                      ) + 1,
                  },
                  (_, i) => i * 10
                )}
                domain={[0, "dataMax"]}
              />
              <ChartTooltip
                content={<CustomTooltip metricInfo={metricInfo} />}
              />

              {/* Render workout segment backgrounds as area charts */}
              <Area
                type="stepAfter"
                dataKey="segmentWarmUp"
                fill="url(#fillWarmUp)"
                stroke="none"
                fillOpacity={1}
                isAnimationActive={false}
                stackId="segments"
              />
              <Area
                type="stepAfter"
                dataKey="segmentCoolDown"
                fill="url(#fillCoolDown)"
                stroke="none"
                fillOpacity={1}
                isAnimationActive={false}
                stackId="segments"
              />

              {/* Render resistance as area (background layer) */}
              {metricInfo.find((m) => m.slug === "resistance") && (
                <Area
                  type="monotone"
                  dataKey="resistance"
                  stroke="oklch(var(--in))"
                  fill="url(#fillResistance)"
                  strokeWidth={2}
                  name={
                    metricInfo.find((m) => m.slug === "resistance")?.displayName
                  }
                  isAnimationActive={false}
                />
              )}

              {/* Render other metrics as lines (foreground layers) */}
              {/* Order: cadence (back), output (middle), heart_rate (front) */}
              {metricInfo.find((m) => m.slug === "cadence") && (
                <Line
                  type="monotone"
                  dataKey="cadence"
                  stroke={metricColorMap["cadence"]}
                  strokeWidth={2}
                  dot={false}
                  name={
                    metricInfo.find((m) => m.slug === "cadence")?.displayName
                  }
                  isAnimationActive={false}
                />
              )}
              {metricInfo.find((m) => m.slug === "output") && (
                <Line
                  type="monotone"
                  dataKey="output"
                  stroke={metricColorMap["output"]}
                  strokeWidth={2}
                  dot={false}
                  name={
                    metricInfo.find((m) => m.slug === "output")?.displayName
                  }
                  isAnimationActive={false}
                />
              )}
              {metricInfo.find((m) => m.slug === "heart_rate") && (
                <Line
                  type="monotone"
                  dataKey="heart_rate"
                  stroke={metricColorMap["heart_rate"]}
                  strokeWidth={2}
                  dot={false}
                  name={
                    metricInfo.find((m) => m.slug === "heart_rate")?.displayName
                  }
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ChartContainer>

          {/* Metric reference info */}
          {/* Use 3 columns if no heart rate, 4 columns if heart rate present */}
          <div className={`mt-4 grid gap-3 text-xs ${
            metricInfo.find((m) => m.slug === "heart_rate")
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-2 md:grid-cols-3"
          }`}>
            {metricInfo.map((metric) => {
              return (
                <div
                  key={metric.slug}
                  className="flex flex-col p-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          metricColorMap[metric.slug] || "oklch(var(--p))",
                      }}
                    />
                    <span className="font-medium">{metric.displayName}</span>
                  </div>
                  <div className="text-muted-foreground ml-3.5">
                    <div>
                      Avg: {metric.avgOriginal.toFixed(1)} {metric.unit}
                    </div>
                    <div>
                      Cycling: {metric.avgCyclingOnly.toFixed(1)} {metric.unit}
                    </div>
                    <div>
                      Range: {metric.min.toFixed(0)}-{metric.max.toFixed(0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
