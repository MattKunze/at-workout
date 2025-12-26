import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "react-router";

import "./index.css";
import { useState } from "react";
import { NavBar } from "./components/organisms/NavBar";
import { AuthProvider } from "./contexts/AuthProvider";
import { ConnectionsProvider } from "./contexts/ConnectionsProvider";

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (

    <AuthProvider>
      <ConnectionsProvider>
        <html lang="en">
          <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <Meta />
            <Links />
          </head>
          <body>
            <div className="min-h-screen bg-base-100 flex flex-col">
              <NavBar onMobileMenuClick={() => setIsMenuOpen(!isMenuOpen)} />

              {/* Main Content Area */}
              <div className="flex flex-grow relative">
                {/* Page Content */}
                <div className="flex-1 container mx-auto p-6">
                   <Outlet />
                </div>

                {/* Right Sidebar (Desktop) */}
                <div className="hidden lg:block w-80 bg-base-200 p-4 border-l border-base-300">
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <ul className="menu bg-base-100 w-full rounded-box">
                    <li><a>Add Reservation</a></li>
                    <li><a>View Reports</a></li>
                    <li><a>Manage Users</a></li>
                  </ul>
                  
                  <div className="divider"></div>
                  
                  <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                   <div className="alert alert-info text-sm mb-2">
                    <span>New booking for Spot A1.</span>
                  </div>
                </div>
              </div>
            </div>
            <ScrollRestoration />
            <Scripts />
          </body>
        </html>
      </ConnectionsProvider>
    </AuthProvider>
  );
}
