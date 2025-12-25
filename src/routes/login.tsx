import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [handle, setHandle] = useState('');
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(handle);
    } catch {
      setError('Failed to sign in. Please check your handle.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
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
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
