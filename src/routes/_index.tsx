import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { handleCallback } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import { useConnections } from "../contexts/ConnectionsContext";
import { usePelotonProfile } from "../hooks/queries/usePelotonProfile";
import { usePelotonWorkouts } from "../hooks/queries/usePelotonWorkouts";
import { WorkoutCard } from "../components/molecules/WorkoutCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const processed = useRef(false);
  const [isFinished, setIsFinished] = useState(false);

  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const p = new URLSearchParams();
    searchParams.forEach((value, key) => p.append(key, value));
    hashParams.forEach((value, key) => p.append(key, value));
    return p;
  }, []);

  const hasAuthParams = useMemo(
    () => params.has("code") && params.has("state"),
    [params]
  );

  useEffect(() => {
    if (hasAuthParams && !processed.current) {
      processed.current = true;

      handleCallback(params)
        .then(() => {
          refreshSession().then(() => {
            // Clear params from URL without refreshing
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            setIsFinished(true);
          });
        })
        .catch((err) => {
          console.error("OAuth callback error:", err);
          setIsFinished(true);
          navigate("/login");
        });
    }
  }, [hasAuthParams, params, navigate, refreshSession]);

  if (hasAuthParams && !isFinished) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Completing sign in...</span>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <PelotonWorkoutsSection />
    </>
  );
}

/**
 * Component to display Peloton workouts if user is connected
 */
function PelotonWorkoutsSection() {
  const { isConnected } = useConnections();
  const isPelotonConnected = isConnected("peloton");

  // Fetch profile to get user ID
  const { data: profile, isLoading: isLoadingProfile } =
    usePelotonProfile(isPelotonConnected);

  // Fetch workouts using the user ID from profile
  const {
    data: workoutsData,
    isLoading: isLoadingWorkouts,
    error: workoutsError,
  } = usePelotonWorkouts(profile?.id, {
    limit: 5,
    enabled: isPelotonConnected && !!profile?.id,
  });

  // Don't show anything if not connected
  if (!isPelotonConnected) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">Recent Workouts</h2>

      {/* Loading State */}
      {(isLoadingProfile || isLoadingWorkouts) && (
        <div className="flex items-center gap-2 p-4">
          <span className="loading loading-spinner loading-sm"></span>
          <span className="text-base-content/70">Loading workouts...</span>
        </div>
      )}

      {/* Error State */}
      {workoutsError && (
        <div className="alert alert-error">
          <span>Failed to load workouts. Please try again later.</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingProfile &&
        !isLoadingWorkouts &&
        workoutsData?.data.length === 0 && (
          <div className="alert">
            <span>
              No workouts found. Complete a Peloton workout to see it here!
            </span>
          </div>
        )}

      {/* Workouts List */}
      {workoutsData && workoutsData.data.length > 0 && (
        <div className="space-y-3">
          {workoutsData.data.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}

          {/* Show total count if available */}
          {workoutsData.total !== undefined &&
            workoutsData.total > workoutsData.data.length && (
              <div className="text-center text-sm text-base-content/60 pt-2">
                Showing {workoutsData.data.length} of {workoutsData.total} total
                workouts
              </div>
            )}
        </div>
      )}
    </div>
  );
}
