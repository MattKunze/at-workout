import { Link } from "react-router";
import { Bars3Icon, BellIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export interface NavBarProps {
  onMobileMenuClick: () => void;
}

export const NavBar = ({ onMobileMenuClick }: NavBarProps) => {
  return (
    <div className="navbar bg-base-100 shadow-md">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          Parking App
        </Link>
      </div>
      <div className="flex-none gap-2">
        <button className="btn btn-ghost btn-circle">
          <BellIcon className="h-6 w-6" />
        </button>
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-10 rounded-full">
              <UserCircleIcon className="h-full w-full" />
            </div>
          </div>
          <ul
            tabIndex={0}
            className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
          >
            <li>
              <Link to="/preferences">Profile</Link>
            </li>
            <li>
              <Link to="/preferences">Settings</Link>
            </li>
            <li>
              <a>Logout</a>
            </li>
          </ul>
        </div>
        {/* Mobile Menu Button */}
        <button
          className="btn btn-ghost lg:hidden"
          onClick={onMobileMenuClick}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
