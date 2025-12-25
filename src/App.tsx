import { useState } from 'react'
import { Bars3Icon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-md">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Parking App</a>
        </div>
        <div className="flex-none gap-2">
          <button className="btn btn-ghost btn-circle">
            <BellIcon className="h-6 w-6" />
          </button>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full">
                <UserCircleIcon className="h-full w-full" />
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li><a>Profile</a></li>
              <li><a>Settings</a></li>
              <li><a>Logout</a></li>
            </ul>
          </div>
          {/* Mobile Menu Button */}
          <button className="btn btn-ghost lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
             <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-grow relative">
        {/* Page Content */}
        <div className="flex-1 container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample Content Cards */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Parking Spot A1</h2>
                <p>Status: Occupied</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary btn-sm">View</button>
                </div>
              </div>
            </div>
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Parking Spot A2</h2>
                <p>Status: Available</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-success btn-sm">Reserve</button>
                </div>
              </div>
            </div>
             <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Revenue</h2>
                <p>Today: $120.00</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-ghost btn-sm">Details</button>
                </div>
              </div>
            </div>
          </div>
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
  )
}

export default App