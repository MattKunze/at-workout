import { useParams, Link } from "react-router";
import { useMemo } from "react";
import { useWorkoutPerformance } from "../hooks/queries/useWorkoutPerformance";
import { WorkoutPerformanceChart } from "../components/molecules/WorkoutPerformanceChart";
import { PowerCurveChart } from "../components/molecules/PowerCurveChart";
import { calculatePowerCurve } from "../lib/powerCurveUtils";

export default function WorkoutDetail() {
  const { workoutId } = useParams();

  const {
    data: performanceData,
    isLoading,
    error,
  } = useWorkoutPerformance(workoutId, {
    everyN: 1, // Get second-by-second data
  });

  // Calculate power curve from output data
  const powerCurve = useMemo(() => {
    if (!performanceData?.metrics) {
      return null;
    }

    // Find the output metric (power)
    const outputMetric = performanceData.metrics.find(
      (m) => m.slug === "output"
    );

    if (
      !outputMetric ||
      !outputMetric.values ||
      outputMetric.values.length === 0
    ) {
      return null;
    }

    return calculatePowerCurve(outputMetric.values);
  }, [performanceData]);

  return (
    <div>
      {/* Back Navigation */}
      <div className="mb-4">
        <Link to="/" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Workout Details</h1>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 p-4">
          <span className="loading loading-spinner loading-md"></span>
          <span className="text-base-content/70">Loading workout data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-error">
          <span>Failed to load workout data. Please try again later.</span>
        </div>
      )}

      {performanceData && (
        <div className="space-y-6">
          {/* Duration and Summary Stats */}
          {(performanceData.duration ||
            (performanceData.summaries &&
              performanceData.summaries.length > 0)) && (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Duration Stat */}
                  {performanceData.duration !== undefined && (
                    <div className="stat p-0">
                      <div className="stat-title text-sm">Duration</div>
                      <div className="stat-value text-2xl">
                        {Math.floor(performanceData.duration / 60)}:
                        {String(performanceData.duration % 60).padStart(2, "0")}
                      </div>
                      <div className="stat-desc">minutes</div>
                    </div>
                  )}
                  {/* Other Summary Stats */}
                  {performanceData.summaries?.map((summary, index) => (
                    <div key={index} className="stat p-0">
                      <div className="stat-title text-sm">
                        {summary.display_name || summary.slug}
                      </div>
                      <div className="stat-value text-2xl">
                        {summary.value !== undefined
                          ? summary.value.toFixed(0)
                          : "N/A"}
                      </div>
                      {summary.display_unit && (
                        <div className="stat-desc">{summary.display_unit}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {performanceData.metrics &&
            performanceData.seconds_since_pedaling_start && (
              <WorkoutPerformanceChart performanceData={performanceData} />
            )}

          {powerCurve && powerCurve.points.length > 0 && (
            <PowerCurveChart powerCurve={powerCurve} />
          )}
        </div>
      )}
    </div>
  );
}
