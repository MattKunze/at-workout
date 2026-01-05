import { Link, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "../molecules/UserAvatar";

export const NavBar = () => {
  const { session, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (userProfile?.displayName) {
      return userProfile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2);
    }
    return userProfile?.handle?.slice(0, 2) || "";
  };

  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          @Workout
        </Link>
        {session && (
          <div className="hidden md:flex ml-4">
            <Link to="/power-history" className="btn btn-ghost">
              Power History
            </Link>
          </div>
        )}
      </div>
      <div className="flex-none gap-2">
        {loading ? (
          <div className="skeleton w-10 h-10 rounded-full shrink-0"></div>
        ) : session ? (
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar"
            >
              <UserAvatar
                src={userProfile?.avatar}
                alt={userProfile?.displayName || userProfile?.handle}
                placeholder={getUserInitials()}
                size="md"
              />
            </div>
            <ul
              tabIndex={0}
              className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
            >
              <li className="menu-title text-opacity-100 text-base-content">
                <div className="flex flex-col gap-1 py-2 px-0">
                  <span className="font-bold truncate text-base">
                    {userProfile?.displayName || "User"}
                  </span>
                  <span className="text-xs font-normal opacity-70 truncate">
                    @{userProfile?.handle || "handle"}
                  </span>
                </div>
              </li>
              <div className="divider my-0"></div>
              <li>
                <Link to="/power-history">Power History</Link>
              </li>
              <li>
                <Link to="/preferences">Profile</Link>
              </li>
              <li>
                <a onClick={handleLogout}>Logout</a>
              </li>
            </ul>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
};
