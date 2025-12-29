import { Link } from "react-router";
import {
  Activity,
  Bike,
  Check,
  Download,
  Dumbbell,
  Flower,
  HeartPulse,
  StretchHorizontal,
} from "lucide-react";
import type { PelotonWorkout } from "../../types/peloton";

interface WorkoutCardProps {
  workout: PelotonWorkout;
  isCached?: boolean;
  isFetchingCache?: boolean;
  onCacheFetch?: () => void;
}

/**
 * Stateless molecule component that displays a single Peloton workout summary.
 * Prop-driven and contains no business logic or lifecycle methods.
 */
export function WorkoutCard({
  workout,
  isCached,
  isFetchingCache,
  onCacheFetch,
}: WorkoutCardProps) {
  // Convert Unix timestamp to human-readable date
  const workoutDate = new Date(workout.created_at * 1000);
  const formattedDate = workoutDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = workoutDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Link to={`/workout/${workout.id}`} className="block">
      <div className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative">
        {/* Cache indicator - top right corner */}
        {(isCached !== undefined || isFetchingCache) && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isCached && !isFetchingCache && onCacheFetch) {
                onCacheFetch();
              }
            }}
            className={`absolute top-2 right-2 btn btn-xs btn-circle btn-ghost z-10 ${
              isCached ? "text-success" : "text-base-content/40"
            }`}
            disabled={isFetchingCache}
            title={
              isCached
                ? "Performance data cached"
                : isFetchingCache
                  ? "Fetching..."
                  : "Click to cache performance data"
            }
          >
            {isFetchingCache ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : isCached ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        )}

        <div className="card-body p-4">
          <div className="flex gap-3">
            {/* Workout/Ride Icon */}
            <div className="flex-shrink-0 w-16 h-16 rounded bg-base-300 flex items-center justify-center">
              {workout.fitness_discipline?.toLowerCase() === "cycling" && (
                <Bike className="w-8 h-8 text-base-content/60" />
              )}
              {workout.fitness_discipline?.toLowerCase() === "strength" && (
                <Dumbbell className="w-8 h-8 text-base-content/60" />
              )}
              {workout.fitness_discipline?.toLowerCase() === "yoga" && (
                <Flower className="w-8 h-8 text-base-content/60" />
              )}
              {workout.fitness_discipline?.toLowerCase() === "stretching" && (
                <StretchHorizontal className="w-8 h-8 text-base-content/60" />
              )}
              {(!workout.fitness_discipline ||
                !["cycling", "strength", "yoga", "stretching"].includes(
                  workout.fitness_discipline.toLowerCase()
                )) && <Activity className="w-8 h-8 text-base-content/60" />}
            </div>

            {/* Workout Details */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="font-semibold text-base truncate">
                {workout.ride?.title || "Workout"}
              </h3>

              {/* Date and Duration */}
              <div className="text-xs text-base-content/60 mt-1">
                {formattedDate} at {formattedTime}
              </div>

              <div className="flex flex-row gap-2 mt-2">
                {/* Metrics */}
                {workout.total_work !== undefined &&
                  workout.total_work !== 0 && (
                    <div className="badge badge-secondary badge-outline badge-sm">
                      {formatAvgPower(
                        workout.total_work,
                        workout.ride?.duration
                      )}
                    </div>
                  )}

                {workout.total_work !== undefined &&
                  workout.total_work !== 0 && (
                    <div className="badge badge-primary badge-outline badge-sm">
                      {Math.round(workout.total_work / 1000)} kJ
                    </div>
                  )}

                {workout.effort_zones && (
                  <div className="badge badge-warning badge-outline badge-sm">
                    {workout.effort_zones.total_effort_points}
                    <HeartPulse className="inline-block w-3 h-3 ml-1" />
                  </div>
                )}

                {/* Personal Record Badge */}
                {workout.is_total_work_personal_record && (
                  <div className="badge badge-success badge-sm m-0">
                    Personal Record
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

const formatAvgPower = (totalWork?: number, duration?: number) => {
  if (totalWork === undefined || totalWork === null || !duration) return "-";
  const avgWatts = totalWork / duration;
  return `${Math.round(avgWatts)} W`;
};
