import { Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigate } from "react-router";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import "./index.css";
import { FloatingActionButton } from "./components/molecules/FloatingActionButton";
import { AuthProvider } from "./contexts/AuthProvider";
import { ConnectionsProvider } from "./contexts/ConnectionsProvider";
import { PreferencesProvider } from "./contexts/PreferencesProvider";
import { useAuth } from "./contexts/AuthContext";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

function AppContent() {
  const { session, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await signOut();
    // Clear React Query cache
    queryClient.clear();
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
    <>
      <div className="min-h-screen bg-base-100">
        {/* Main Content Area */}
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </div>
      
      {/* Floating Action Button - only show when logged in */}
      {session && (
        <FloatingActionButton
          userAvatar={userProfile?.avatar}
          userDisplayName={userProfile?.displayName}
          userHandle={userProfile?.handle}
          userInitials={getUserInitials()}
          onDashboardClick={() => navigate("/")}
          onPowerHistoryClick={() => navigate("/power-history")}
          onPreferencesClick={() => navigate("/preferences")}
          onLogoutClick={handleLogout}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AuthProvider>
          <ConnectionsProvider>
            <html lang="en">
              <head>
                <meta charSet="utf-8" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1"
                />
                <Meta />
                <Links />
              </head>
              <body>
                <AppContent />
                <ScrollRestoration />
                <Scripts />
              </body>
            </html>
          </ConnectionsProvider>
        </AuthProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
