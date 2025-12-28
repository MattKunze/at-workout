/**
 * Power History Page
 *
 * Displays aggregate power curve analysis showing lifetime bests
 * and recent performance trends.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { AggregatePowerCurveChart } from "../components/molecules/AggregatePowerCurveChart";
import {
  useLifetimePowerCurve,
  useRecentDaysPowerCurve,
  useTopEfforts,
} from "../hooks/queries/useAggregatePowerCurves";
import { getCacheStats, getCurrentUserId } from "../lib/db";

export default function PowerHistory() {
  const userId = getCurrentUserId();

  const [cacheStats, setCacheStats] = useState<{
    workoutCount: number;
    powerCurveCount: number;
  } | null>(null);

  // Load cache stats
  useEffect(() => {
    async function loadStats() {
      if (!userId) return;
      const stats = await getCacheStats(userId);
      setCacheStats(stats);
    }
    loadStats();
  }, [userId]);

  // Fetch power curves
  const { data: lifetimeCurve, isLoading: lifetimeLoading } =
    useLifetimePowerCurve();
  const { data: last30DaysCurve, isLoading: last30Loading } =
    useRecentDaysPowerCurve(30);
  const { data: last60DaysCurve, isLoading: last60Loading } =
    useRecentDaysPowerCurve(60);
  const { data: last365DaysCurve, isLoading: last365Loading } =
    useRecentDaysPowerCurve(365);

  // Fetch top efforts for PR durations
  const prDurations = [5, 60, 300, 1200];
  const { data: topEffortsMap } = useTopEfforts(prDurations, 3);

  if (!userId) {
    return (
      <div className="space-y-8">
        <div className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <p className="font-semibold">Connect your Peloton account</p>
            <p className="text-sm">
              Connect your Peloton account and sync your workout history to view
              power curve analysis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!cacheStats || cacheStats.powerCurveCount === 0) {
    return (
      <div className="space-y-8">
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            ></path>
          </svg>
          <div>
            <p className="font-semibold">No workout data synced</p>
            <p className="text-sm">
              Visit the{" "}
              <a href="/preferences" className="link link-primary">
                preferences page
              </a>{" "}
              to sync your workout history and enable power curve analysis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isLoading =
    lifetimeLoading || last30Loading || last60Loading || last365Loading;

  return (
    <div className="space-y-8">
      {/* Loading State */}
      {isLoading && (
        <div className="alert alert-info">
          <span className="loading loading-spinner"></span>
          <span>Loading power curves...</span>
        </div>
      )}

      {/* Power Curve Chart */}
      {lifetimeCurve && lifetimeCurve.points.length > 0 && (
        <AggregatePowerCurveChart
          title="Power Curve Analysis"
          description={
            cacheStats
              ? `Analyzing ${cacheStats.powerCurveCount} workout ${cacheStats.powerCurveCount !== 1 ? "s" : ""}`
              : ""
          }
          curves={[
            {
              curve: lifetimeCurve,
              label: "Lifetime Best",
              color: "oklch(var(--p))",
            },
            ...(last365DaysCurve && last365DaysCurve.points.length > 0
              ? [
                  {
                    curve: last365DaysCurve,
                    label: "Last Year",
                    color: "oklch(var(--in))",
                  },
                ]
              : []),
            ...(last60DaysCurve && last60DaysCurve.points.length > 0
              ? [
                  {
                    curve: last60DaysCurve,
                    label: "Last 60 Days",
                    color: "oklch(var(--a))",
                  },
                ]
              : []),
            ...(last30DaysCurve && last30DaysCurve.points.length > 0
              ? [
                  {
                    curve: last30DaysCurve,
                    label: "Last 30 Days",
                    color: "oklch(var(--s))",
                  },
                ]
              : []),
          ]}
        />
      )}

      {/* Personal Records */}
      {lifetimeCurve && lifetimeCurve.points.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Personal Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { duration: 5, label: "5 Second" },
              { duration: 60, label: "1 Minute" },
              { duration: 300, label: "5 Minute" },
              { duration: 1200, label: "20 Minute" },
            ].map(({ duration, label }) => {
              const power = lifetimeCurve.points.find(
                (p) => p.duration === duration
              )?.power;
              const topEfforts = topEffortsMap?.get(duration) || [];

              return power ? (
                <div key={duration} className="card bg-base-200">
                  <div className="card-body p-4">
                    <h3 className="text-sm text-muted-foreground">
                      {label} PR
                    </h3>
                    <p className="text-3xl font-bold">
                      {power.toFixed(0)}
                      <span className="text-lg text-muted-foreground ml-1">
                        W
                      </span>
                    </p>

                    {topEfforts.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold uppercase">
                          Top Efforts
                        </p>
                        {topEfforts.map((effort, idx) => (
                          <Link
                            key={`${effort.workoutId}-${idx}`}
                            to={`/workout/${effort.workoutId}`}
                            className="block text-sm hover:text-primary transition-colors"
                          >
                            {effort.power.toFixed(0)}W @{" "}
                            {new Date(effort.workoutDate).toLocaleDateString()}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
