import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboardService'
import { ScatterChart } from '../components/charts/ScatterChart'
import { DumbbellChart } from '../components/charts/DumbbellChart'
import { ExportButton } from '../components/charts/ExportButton'
import { Spinner } from '../components/ui/Spinner'

export default function Visualization() {
    const scatterRef = useRef(null)
    const dumbbellRef = useRef(null)
    const [sample, setSample] = useState(20)

    const { data: scatterData = [], isLoading: sLoad } = useQuery({
        queryKey: ['scatter-data'],
        queryFn: () => dashboardService.scatterData().then(r => r.data),
    })

    const { data: dumbbellData = [], isLoading: dLoad } = useQuery({
        queryKey: ['dumbbell-data', sample],
        queryFn: () => dashboardService.dumbbellData(sample).then(r => r.data),
    })

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-white">Visualization</h1>
                <p className="text-gray-400 text-sm">Interactive charts for HGO Discovery results</p>
            </div>

            {/* Scatter */}
            <div className="card">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                        <h3 className="font-semibold text-white">Scatter: Output Score vs HGOd Index</h3>
                        <p className="text-xs text-gray-500">All {scatterData.length} patients — color coded by priority</p>
                    </div>
                    <ExportButton targetRef={scatterRef} filename="scatter_hgo" disabled={!scatterData.length} />
                </div>
                {sLoad ? <div className="flex justify-center h-80 items-center"><Spinner size={8} /></div> :
                    scatterData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                            No data. Run a simulation first.
                        </div>
                    ) : (
                        <div ref={scatterRef}>
                            <ScatterChart data={scatterData} />
                        </div>
                    )
                }

                {/* Legend */}
                {scatterData.length > 0 && (
                    <div className="flex gap-4 mt-3 text-xs text-gray-400 flex-wrap">
                        {[['Critical', '#ef4444'], ['High', '#f97316'], ['Medium', '#eab308'], ['Low', '#22c55e']].map(([l, c]) => (
                            <span key={l} className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                                {l} ({scatterData.filter(d => d.priority_level === l).length})
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Dumbbell */}
            <div className="card">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                        <h3 className="font-semibold text-white">Top Patients — Score Comparison</h3>
                        <p className="text-xs text-gray-500">Output Score vs HGOd Index for top N patients</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-400">Show top</label>
                            <input
                                type="range"
                                min={5} max={100} step={5}
                                value={sample}
                                onChange={e => setSample(Number(e.target.value))}
                                className="w-24 accent-primary-500"
                            />
                            <span className="text-xs text-primary-400 font-mono w-8">{sample}</span>
                        </div>
                        <ExportButton targetRef={dumbbellRef} filename="dumbbell_hgo" disabled={!dumbbellData.length} />
                    </div>
                </div>
                {dLoad ? <div className="flex justify-center h-80 items-center"><Spinner size={8} /></div> :
                    dumbbellData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                            No data. Run a simulation first.
                        </div>
                    ) : (
                        <div ref={dumbbellRef}>
                            <DumbbellChart data={dumbbellData} />
                        </div>
                    )
                }
            </div>

            {/* Interpretation */}
            <div className="card bg-primary-950/30 border-primary-800/30">
                <h3 className="font-semibold text-white mb-3">📊 Chart Interpretation Guide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                    <div>
                        <p className="text-primary-400 font-medium mb-1">Output Score (SAW)</p>
                        <p>Higher output score indicates better patient condition overall. Range: 0–1. Calculated via weighted sum of normalized criteria.</p>
                    </div>
                    <div>
                        <p className="text-purple-400 font-medium mb-1">HGOd Index</p>
                        <p>Lower HGOd index = higher inpatient priority. Formula: 1 / Σ(Wj × Xj). Patients in top-left scatter quadrant need immediate attention.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
