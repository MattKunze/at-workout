import { useParams, Link } from "react-router";
import { useMemo } from "react";
import { useWorkoutPerformance } from "../hooks/queries/useWorkoutPerformance";
import { useWorkoutDetails } from "../hooks/queries/useWorkoutDetails";
import { useTopEfforts } from "../hooks/queries/useAggregatePowerCurves";
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

  const {
    data: workoutDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useWorkoutDetails(workoutId);

  // Fetch top efforts for key durations (5s, 1min, 5min, 20min)
  // Used to show PR badges on power curve
  const { data: topEffortsMap } = useTopEfforts(
    [5, 60, 300, 1200],
    10 // Get top 10 to show different badge levels
  );

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

      {/* Loading State */}
      {(isLoading || isLoadingDetails) && (
        <div className="flex items-center gap-2 p-4">
          <span className="loading loading-spinner loading-md"></span>
          <span className="text-base-content/70">Loading workout data...</span>
        </div>
      )}

      {/* Error State */}
      {(error || detailsError) && (
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
                {/* Ride Title */}
                {workoutDetails?.ride?.title && (
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">
                      {workoutDetails.ride.title}
                      {workoutDetails.ride.instructor?.name && (
                        <span className="text-base font-normal text-base-content/70 ml-2">
                          with {workoutDetails.ride.instructor.name}
                        </span>
                      )}
                    </h2>
                    {workoutDetails.created_at && (
                      <p className="text-sm text-base-content/60 mt-1">
                        {new Date(
                          workoutDetails.created_at * 1000
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                )}
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
                  {performanceData.summaries
                    ?.filter(
                      (summary) =>
                        summary.value !== undefined && summary.value !== null
                    )
                    .map((summary, index) => (
                      <div key={index} className="stat p-0">
                        <div className="stat-title text-sm">
                          {summary.display_name || summary.slug}
                        </div>
                        <div className="stat-value text-2xl">
                          {summary.value.toFixed(0)}
                        </div>
                        {summary.display_unit && (
                          <div className="stat-desc">
                            {summary.display_unit}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {performanceData.metrics &&
            performanceData.seconds_since_pedaling_start &&
            performanceData.metrics.length > 0 &&
            performanceData.seconds_since_pedaling_start.length > 0 && (
              <WorkoutPerformanceChart performanceData={performanceData} />
            )}

          {powerCurve && powerCurve.points.length > 0 && (
            <PowerCurveChart
              powerCurve={powerCurve}
              topEffortsMap={topEffortsMap}
              currentWorkoutId={workoutId}
            />
          )}
        </div>
      )}
    </div>
  );
}
