import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { handleCallback } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import { useConnections } from "../contexts/ConnectionsContext";
import { usePelotonProfile } from "../hooks/queries/usePelotonProfile";
import { InfiniteWorkoutList } from "../components/organisms/InfiniteWorkoutList";

export default function Dashboard() {
  const navigate = useNavigate();
  const { session, loading, refreshSession, signIn } = useAuth();
  const { loading: connectionsLoading, isConnected } = useConnections();
  const isPelotonConnected = isConnected("peloton");
  
  // Fetch profile to get user ID (only if logged in and connected)
  const { data: profile, isLoading: isLoadingProfile } =
    usePelotonProfile(!!session && isPelotonConnected);
  
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

  // Show loading state while checking for existing session
  if (loading || connectionsLoading || (session && isPelotonConnected && isLoadingProfile)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // If not logged in, show login form
  if (!session) {
    return <LoginForm signIn={signIn} />;
  }

  return <PelotonWorkoutsSection profile={profile} isPelotonConnected={isPelotonConnected} />;
}

/**
 * Login form component for landing page
 */
function LoginForm({ signIn }: { signIn: (handle: string) => Promise<void> }) {
  const [handle, setHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(handle);
    } catch {
      setError("Failed to sign in. Please check your handle.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center">Sign in with Bluesky</h2>
          <form onSubmit={handleSubmit} className="form-control gap-4 mt-4">
            <div>
              <label className="label">
                <span className="label-text">User Handle</span>
              </label>
              <input
                type="text"
                placeholder="e.g. alice.bsky.social"
                className="input input-bordered w-full"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Redirecting...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to display Peloton workouts if user is connected
 */
function PelotonWorkoutsSection({ 
  profile, 
  isPelotonConnected 
}: { 
  profile: ReturnType<typeof usePelotonProfile>['data']; 
  isPelotonConnected: boolean;
}) {
  // If no profile, user isn't connected
  if (!profile?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title justify-center">Connect Peloton</h2>
            <p className="text-center text-base-content/70 mt-2">
              You haven't connected your Peloton account yet. Connect it to view
              your workout history and power curves.
            </p>
            <div className="card-actions justify-center mt-4">
              <Link to="/preferences" className="btn btn-primary">
                Go to Preferences
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InfiniteWorkoutList
      userId={profile.id}
      isPelotonConnected={isPelotonConnected}
    />
  );
}
