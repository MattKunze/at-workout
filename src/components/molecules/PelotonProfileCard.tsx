import type { PelotonUserProfile } from '../../types/peloton';

interface PelotonProfileCardProps {
  profile: PelotonUserProfile;
}

/**
 * Stateless molecule component that displays Peloton user profile information.
 * Prop-driven and contains no business logic or lifecycle methods.
 */
export function PelotonProfileCard({ profile }: PelotonProfileCardProps) {
  const displayName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile.username;

  return (
    <div className="flex items-center gap-3 py-2">
      {profile.image_url && (
        <div className="avatar">
          <div className="w-12 h-12 rounded-full">
            <img src={profile.image_url} alt={profile.username} />
          </div>
        </div>
      )}
      <div className="flex-1">
        <div className="font-semibold">{displayName}</div>
        <div className="text-sm text-base-content/70">@{profile.username}</div>
        {profile.total_workouts !== undefined && (
          <div className="text-xs text-base-content/60 mt-1">
            {profile.total_workouts} workouts completed
          </div>
        )}
      </div>
    </div>
  );
}
