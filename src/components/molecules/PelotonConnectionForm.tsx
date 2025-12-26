interface PelotonConnectionFormProps {
  username: string;
  password: string;
  loading: boolean;
  error: string | null;
  onUsernameChange: (username: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Stateless molecule component for Peloton connection form.
 * Prop-driven and contains no business logic or lifecycle methods.
 */
export function PelotonConnectionForm({
  username,
  password,
  loading,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: PelotonConnectionFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Username or Email</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Password</span>
        </label>
        <input
          type="password"
          className="input input-bordered"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="card-actions justify-end">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !username || !password}
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </form>
  );
}
