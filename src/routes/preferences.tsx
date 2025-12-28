import { useState } from "react";
import { ThemeSelector } from "../components/molecules/ThemeSelector";
import { ConnectionsPanel } from "../components/organisms/ConnectionsPanel";
import { WorkoutSyncPanel } from "../components/organisms/WorkoutSyncPanel";
import { clearAggregateCurveCache, getCurrentUserId } from "../lib/db";
import { useQueryClient } from "@tanstack/react-query";

export default function Preferences() {
  const userId = getCurrentUserId();
  const queryClient = useQueryClient();
  
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  const handleRegenerateAggregates = async () => {
    if (!userId || isRegenerating) return;
    
    setIsRegenerating(true);
    setRegenerateSuccess(false);
    
    try {
      // Clear aggregate curve cache
      await clearAggregateCurveCache(userId);
      
      // Invalidate all aggregate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['aggregatePowerCurve'] });
      
      setRegenerateSuccess(true);
      setTimeout(() => setRegenerateSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to regenerate aggregates:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

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

      {/* Other Preferences */}
      <div className="prose max-w-2xl">
        <h2>Settings</h2>

        <div className="form-control w-full max-w-xs">
          <ThemeSelector />
        </div>
      </div>

      {/* Advanced Options */}
      {userId && (
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Advanced</h2>
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">Regenerate Power Curves</h3>
              <p className="text-sm text-muted-foreground">
                Clear cached aggregate power curves and recalculate from scratch. 
                Use this if you notice data inconsistencies or after app updates.
              </p>
              <div className="card-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleRegenerateAggregates}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate Aggregates'
                  )}
                </button>
                {regenerateSuccess && (
                  <div className="badge badge-success gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-4 h-4 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Regenerated successfully
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
