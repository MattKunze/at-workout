import { ThemeSelector } from "../components/molecules/ThemeSelector";
import { ConnectionsPanel } from "../components/organisms/ConnectionsPanel";
import { WorkoutSyncPanel } from "../components/organisms/WorkoutSyncPanel";
import { AggregatePowerCurveChart } from "../components/molecules/AggregatePowerCurveChart";
import { useLifetimePowerCurve, useYearlyPowerCurve } from "../hooks/queries/useAggregatePowerCurves";

export default function Preferences() {
  const currentYear = new Date().getFullYear();
  const { data: lifetimeCurve } = useLifetimePowerCurve();
  const { data: yearCurve } = useYearlyPowerCurve(currentYear);

  return (
    <div className="space-y-8">
      {/* Connected Services Section */}
      <div className="max-w-2xl">
        <ConnectionsPanel />
      </div>

      {/* Workout Data Sync Section */}
      <div className="max-w-2xl">
        <WorkoutSyncPanel />
      </div>

      {/* Power Curve Preview */}
      {lifetimeCurve && lifetimeCurve.points.length > 0 && (
        <div>
          <AggregatePowerCurveChart
            title="Power Curve Overview"
            description="Comparison of your lifetime best and current year performance"
            curves={[
              { curve: lifetimeCurve, label: "Lifetime Best", color: "oklch(var(--p))" },
              ...(yearCurve && yearCurve.points.length > 0 
                ? [{ curve: yearCurve, label: `${currentYear}`, color: "oklch(var(--s))" }]
                : []
              ),
            ]}
          />
        </div>
      )}

      {/* Other Preferences */}
      <div className="prose max-w-2xl">
        <h2>Settings</h2>

        <div className="form-control w-full max-w-xs">
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
