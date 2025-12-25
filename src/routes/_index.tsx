import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { handleCallback } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const processed = useRef(false);
  const [isFinished, setIsFinished] = useState(false);

  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const p = new URLSearchParams();
    searchParams.forEach((value, key) => p.append(key, value));
    hashParams.forEach((value, key) => p.append(key, value));
    return p;
  }, []);

  const hasAuthParams = useMemo(() => params.has('code') && params.has('state'), [params]);

  useEffect(() => {
    if (hasAuthParams && !processed.current) {
      processed.current = true;

      handleCallback(params)
        .then(() => {
          refreshSession().then(() => {
             // Clear params from URL without refreshing
             window.history.replaceState({}, document.title, window.location.pathname);
             setIsFinished(true);
          });
        })
        .catch((err) => {
          console.error('OAuth callback error:', err);
          setIsFinished(true);
          navigate('/login');
        });
    }
  }, [hasAuthParams, params, navigate, refreshSession]);

  if (hasAuthParams && !isFinished) {
     return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-2">Completing sign in...</span>
        </div>
      );
  }

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
