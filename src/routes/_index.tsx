import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { handleCallback } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import { useConnections } from "../contexts/ConnectionsContext";
import { usePelotonProfile } from "../hooks/queries/usePelotonProfile";
import { usePelotonWorkouts } from "../hooks/queries/usePelotonWorkouts";

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

  return <PelotonWorkoutsSection />;
}

/**
 * Component to display Peloton workouts if user is connected
 */
function PelotonWorkoutsSection() {
  const { isConnected } = useConnections();
  const isPelotonConnected = isConnected("peloton");
  const [searchParams, setSearchParams] = useSearchParams();

  // Pagination state - read from URL or default to 0
  const page = parseInt(searchParams.get("page") || "0", 10);
  const [limit] = useState(15);

  // Helper to update page in URL
  const setPage = (newPage: number | ((prev: number) => number)) => {
    const nextPage = typeof newPage === "function" ? newPage(page) : newPage;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextPage === 0) {
          next.delete("page");
        } else {
          next.set("page", nextPage.toString());
        }
        return next;
      },
      { replace: true }
    );
  };

  // Fetch profile to get user ID
  const { data: profile, isLoading: isLoadingProfile } =
    usePelotonProfile(isPelotonConnected);

  // Fetch workouts using the user ID from profile
  const {
    data: workoutsData,
    isLoading: isLoadingWorkouts,
    error: workoutsError,
  } = usePelotonWorkouts(profile?.id, {
    limit,
    page,
    enabled: isPelotonConnected && !!profile?.id,
  });

  // Don't show anything if not connected
  if (!isPelotonConnected) {
    return null;
  }

  // Format date helper
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Format duration helper (convert seconds to mm:ss format)
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format power helper (average watts calculated from total work and duration)
  const formatAvgPower = (totalWork?: number, duration?: number) => {
    if (totalWork === undefined || totalWork === null || !duration) return "-";
    const avgWatts = totalWork / duration;
    return `${Math.round(avgWatts)} W`;
  };

  // Format output helper (convert joules to kilojoules)
  const formatOutput = (joules?: number) => {
    if (joules === undefined || joules === null || joules === 0) return "-";
    return `${Math.round(joules / 1000)} kJ`;
  };

  // Calculate pagination info
  const totalPages = workoutsData?.total
    ? Math.ceil(workoutsData.total / limit)
    : 0;
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;

  return (
    <div className="mb-8">
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

      {/* Workouts Table */}
      {workoutsData && workoutsData.data.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Workout Type</th>
                  <th>Duration</th>
                  <th>Avg Power</th>
                  <th>Total Output</th>
                </tr>
              </thead>
              <tbody>
                {workoutsData.data.map((workout) => {
                  return (
                    <tr key={workout.id} className="hover cursor-pointer">
                      <td>
                        <Link to={`/workout/${workout.id}`} className="block">
                          {formatDate(workout.created_at)}
                        </Link>
                      </td>
                      <td>
                        <Link to={`/workout/${workout.id}`} className="block">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {workout.ride?.title || "Workout"}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Link to={`/workout/${workout.id}`} className="block">
                          {formatDuration(workout.ride?.duration)}
                        </Link>
                      </td>
                      <td>
                        <Link to={`/workout/${workout.id}`} className="block">
                          {formatAvgPower(
                            workout.total_work,
                            workout.ride?.duration
                          )}
                        </Link>
                      </td>
                      <td>
                        <Link to={`/workout/${workout.id}`} className="block">
                          {formatOutput(workout.total_work)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-base-content/60">
              Showing {page * limit + 1}-
              {Math.min((page + 1) * limit, workoutsData.total || 0)} of{" "}
              {workoutsData.total || 0} workouts
            </div>

            <div className="join">
              <button
                className="join-item btn btn-sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!hasPrevPage}
              >
                Previous
              </button>
              <button className="join-item btn btn-sm btn-disabled">
                Page {page + 1} of {totalPages}
              </button>
              <button
                className="join-item btn btn-sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
