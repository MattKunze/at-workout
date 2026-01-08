import { useState } from "react";
import { Menu } from "lucide-react";

interface FloatingActionButtonProps {
  userAvatar?: string;
  userDisplayName?: string;
  userHandle?: string;
  userInitials?: string;
  onDashboardClick: () => void;
  onPowerHistoryClick: () => void;
  onPreferencesClick: () => void;
  onLogoutClick: () => void;
}

export const FloatingActionButton = ({
  userAvatar,
  userDisplayName,
  userHandle,
  userInitials,
  onDashboardClick,
  onPowerHistoryClick,
  onPreferencesClick,
  onLogoutClick,
}: FloatingActionButtonProps) => {
  const [imageError, setImageError] = useState(false);

  const handleMenuClick = (callback: () => void) => {
    callback();
    // Blur the active element to close the dropdown
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const renderAvatar = () => {
    if (!userAvatar || imageError) {
      if (userInitials) {
        return (
          <div className="w-full h-full rounded-full overflow-hidden bg-base-300 flex items-center justify-center text-base-content font-bold text-lg">
            {userInitials.slice(0, 2).toUpperCase()}
          </div>
        );
      }
      return (
        <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
          <Menu className="w-6 h-6 text-primary-content" />
        </div>
      );
    }

    return (
      <div className="w-full h-full rounded-full overflow-hidden bg-base-300 flex items-center justify-center">
        <img
          src={userAvatar}
          alt={userDisplayName || userHandle || 'User Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="dropdown dropdown-top dropdown-end">
        <div
          tabIndex={0}
          role="button"
          className="w-14 h-14 rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform ring-2 ring-base-content/10 hover:ring-base-content/20"
        >
          {renderAvatar()}
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box w-56 p-2 shadow-xl mb-2"
        >
          <li className="menu-title text-opacity-100 text-base-content">
            <div className="flex flex-col gap-1 py-2 px-0">
              <span className="font-bold truncate text-base">
                {userDisplayName || "User"}
              </span>
              <span className="text-xs font-normal opacity-70 truncate">
                @{userHandle || "handle"}
              </span>
            </div>
          </li>
          <div className="divider my-0"></div>
          <li>
            <a 
              onClick={() => handleMenuClick(onDashboardClick)}
              className="py-3"
            >
              Dashboard
            </a>
          </li>
          <li>
            <a 
              onClick={() => handleMenuClick(onPowerHistoryClick)}
              className="py-3"
            >
              Power History
            </a>
          </li>
          <li>
            <a 
              onClick={() => handleMenuClick(onPreferencesClick)}
              className="py-3"
            >
              Preferences
            </a>
          </li>
          <li>
            <a 
              onClick={() => handleMenuClick(onLogoutClick)}
              className="py-3"
            >
              Logout
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};
