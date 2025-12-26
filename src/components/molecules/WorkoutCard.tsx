import { Link } from 'react-router';
import type { PelotonWorkout } from '../../types/peloton';

interface WorkoutCardProps {
  workout: PelotonWorkout;
}

/**
 * Stateless molecule component that displays a single Peloton workout summary.
 * Prop-driven and contains no business logic or lifecycle methods.
 */
export function WorkoutCard({ workout }: WorkoutCardProps) {
  // Convert Unix timestamp to human-readable date
  const workoutDate = new Date(workout.created_at * 1000);
  const formattedDate = workoutDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = workoutDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Format duration if available
  const durationMinutes = workout.ride?.duration 
    ? Math.round(workout.ride.duration / 60) 
    : null;

  return (
    <Link to={`/workout/${workout.id}`} className="block">
      <div className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="card-body p-4">
          <div className="flex gap-3">
            {/* Workout/Ride Image */}
            {workout.ride?.image_url && (
              <div className="flex-shrink-0">
                <img 
                  src={workout.ride.image_url} 
                  alt={workout.ride.title || 'Workout'} 
                  className="w-16 h-16 rounded object-cover"
                />
              </div>
            )}
            
            {/* Workout Details */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="font-semibold text-base truncate">
                {workout.ride?.title || 'Workout'}
              </h3>
              
              {/* Instructor and Discipline */}
              <div className="text-sm text-base-content/70 mt-0.5">
                {workout.ride?.instructor?.name && (
                  <span>{workout.ride.instructor.name}</span>
                )}
                {workout.fitness_discipline && (
                  <span className="ml-2 capitalize">
                    • {workout.fitness_discipline}
                  </span>
                )}
              </div>
              
              {/* Date and Duration */}
              <div className="text-xs text-base-content/60 mt-1">
                {formattedDate} at {formattedTime}
                {durationMinutes && (
                  <span className="ml-2">• {durationMinutes} min</span>
                )}
              </div>
              
              {/* Metrics */}
              {(workout.calories !== undefined || workout.total_work !== undefined || workout.distance !== undefined) && (
                <div className="flex gap-3 mt-2 text-xs">
                  {workout.calories !== undefined && (
                    <div className="badge badge-outline badge-sm">
                      {Math.round(workout.calories)} cal
                    </div>
                  )}
                  {workout.total_work !== undefined && (
                    <div className="badge badge-outline badge-sm">
                      {Math.round(workout.total_work / 1000)} kJ
                    </div>
                  )}
                  {workout.distance !== undefined && (
                    <div className="badge badge-outline badge-sm">
                      {(workout.distance / 1609.34).toFixed(2)} mi
                    </div>
                  )}
                </div>
              )}
              
              {/* Personal Record Badge */}
              {workout.is_total_work_personal_record && (
                <div className="badge badge-success badge-sm mt-2">
                  Personal Record
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
