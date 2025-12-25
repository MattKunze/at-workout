export default function Dashboard() {
  return (
    <>
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
    </>
  );
}
