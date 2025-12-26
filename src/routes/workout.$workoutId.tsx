import { useParams, Link } from 'react-router';
import { useWorkoutPerformance } from '../hooks/queries/useWorkoutPerformance';

export default function WorkoutDetail() {
  const { workoutId } = useParams();
  
  const {
    data: performanceData,
    isLoading,
    error,
  } = useWorkoutPerformance(workoutId, {
    everyN: 1, // Get second-by-second data
  });
  
  return (
    <div>
      {/* Back Navigation */}
      <div className="mb-4">
        <Link to="/" className="btn btn-ghost btn-sm">
          ← Back to Dashboard
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Workout Details</h1>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 p-4">
          <span className="loading loading-spinner loading-md"></span>
          <span className="text-base-content/70">Loading workout data...</span>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="alert alert-error">
          <span>Failed to load workout data. Please try again later.</span>
        </div>
      )}
      
      {/* Performance Data Display */}
      {performanceData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          {performanceData.summaries && performanceData.summaries.length > 0 && (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {performanceData.summaries.map((summary, index) => (
                    <div key={index} className="stat p-0">
                      <div className="stat-title text-sm">{summary.display_name || summary.slug}</div>
                      <div className="stat-value text-2xl">
                        {summary.value !== undefined ? summary.value.toFixed(0) : 'N/A'}
                      </div>
                      {summary.display_unit && (
                        <div className="stat-desc">{summary.display_unit}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Average Stats */}
          {performanceData.average_summaries && performanceData.average_summaries.length > 0 && (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Averages</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {performanceData.average_summaries.map((summary, index) => (
                    <div key={index} className="stat p-0">
                      <div className="stat-title text-sm">{summary.display_name || summary.slug}</div>
                      <div className="stat-value text-2xl">
                        {summary.value !== undefined ? summary.value.toFixed(1) : 'N/A'}
                      </div>
                      {summary.display_unit && (
                        <div className="stat-desc">{summary.display_unit}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Time Series Data Info */}
          {performanceData.metrics && performanceData.seconds_since_pedaling_start && (
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Performance Data</h2>
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <div className="font-semibold">Time Series Data Available</div>
                    <div className="text-sm">
                      {performanceData.seconds_since_pedaling_start.length} data points captured • {performanceData.metrics.length} metrics tracked
                    </div>
                  </div>
                </div>
                
                {/* Metrics Overview */}
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Available Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {performanceData.metrics.map((metric) => (
                      <div key={metric.slug} className="bg-base-300 p-3 rounded">
                        <div className="font-medium">{metric.display_name}</div>
                        <div className="text-sm text-base-content/70 mt-1">
                          {metric.values.length} values • 
                          {metric.average_value !== undefined && ` Avg: ${metric.average_value.toFixed(1)} ${metric.display_unit}`}
                          {metric.max_value !== undefined && ` • Max: ${metric.max_value.toFixed(0)} ${metric.display_unit}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Sample Data Preview */}
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Sample Data Points (First 5 Timestamps)</h3>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Time (s)</th>
                          {performanceData.metrics.map((metric) => (
                            <th key={metric.slug}>
                              {metric.display_name}
                              <div className="text-xs font-normal text-base-content/60">({metric.display_unit})</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.seconds_since_pedaling_start.slice(0, 5).map((time, index) => (
                          <tr key={index}>
                            <td className="font-mono">{time}</td>
                            {performanceData.metrics!.map((metric) => (
                              <td key={metric.slug} className="font-mono">
                                {metric.values[index] !== undefined ? metric.values[index] : 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Debug Info */}
          <details className="collapse collapse-arrow bg-base-200">
            <summary className="collapse-title text-lg font-medium">
              Raw API Response (Debug)
            </summary>
            <div className="collapse-content">
              <pre className="text-xs overflow-x-auto bg-base-300 p-4 rounded">
                {JSON.stringify(performanceData, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
