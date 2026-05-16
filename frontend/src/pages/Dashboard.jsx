import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    UsersIcon,
    ExclamationTriangleIcon,
    ExclamationCircleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline'
import { dashboardService } from '../services/dashboardService'
import { KpiCard } from '../components/ui/Card'
import { ScatterChart } from '../components/charts/ScatterChart'
import { DumbbellChart } from '../components/charts/DumbbellChart'
import { ExportButton } from '../components/charts/ExportButton'
import { Spinner } from '../components/ui/Spinner'

export default function Dashboard() {
    const scatterRef = useRef(null)
    const dumbbellRef = useRef(null)

    const { data: summary, isLoading: sLoad } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: () => dashboardService.summary().then(r => r.data),
        refetchInterval: 30000,
    })

    const { data: scatterData = [] } = useQuery({
        queryKey: ['scatter-data'],
        queryFn: () => dashboardService.scatterData().then(r => r.data),
        refetchInterval: 30000,
    })

    const { data: dumbbellData = [] } = useQuery({
        queryKey: ['dumbbell-data'],
        queryFn: () => dashboardService.dumbbellData(20).then(r => r.data),
        refetchInterval: 30000,
    })

    if (sLoad) {
        return <div className="flex items-center justify-center h-64"><Spinner size={10} /></div>
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">HGO Discovery — Inpatient Prioritization Overview</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Total Patients"
                    value={summary?.total_patients?.toLocaleString() ?? 0}
                    color="primary"
                    icon={UsersIcon}
                />
                <KpiCard
                    label="Critical Priority"
                    value={summary?.critical_count ?? 0}
                    color="danger"
                    icon={ExclamationTriangleIcon}
                />
                <KpiCard
                    label="High Priority"
                    value={summary?.high_count ?? 0}
                    color="warning"
                    icon={ExclamationCircleIcon}
                />
                <KpiCard
                    label="Avg HGOd Index"
                    value={summary?.avg_hgod_index?.toFixed(4) ?? '—'}
                    color="success"
                    icon={ChartBarIcon}
                />
            </div>

            {summary?.last_simulation && (
                <p className="text-xs text-gray-500">
                    Last simulation: {new Date(summary.last_simulation).toLocaleString()}
                </p>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Scatter */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Output Score vs HGOd Index</h3>
                            <p className="text-xs text-gray-500">{scatterData.length} patients</p>
                        </div>
                        <ExportButton targetRef={scatterRef} filename="scatter_chart" disabled={!scatterData.length} />
                    </div>
                    <div ref={scatterRef}>
                        <ScatterChart data={scatterData} />
                    </div>
                </div>

                {/* Dumbbell */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top 20 Patients — Score Comparison</h3>
                            <p className="text-xs text-gray-500">Output Score & HGOd Index</p>
                        </div>
                        <ExportButton targetRef={dumbbellRef} filename="dumbbell_chart" disabled={!dumbbellData.length} />
                    </div>
                    <div ref={dumbbellRef}>
                        <DumbbellChart data={dumbbellData} />
                    </div>
                </div>
            </div>

            {/* Priority breakdown */}
            <div className="card">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Priority Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {[
                        { label: 'Critical', count: summary?.critical_count, color: 'bg-red-500' },
                        { label: 'High', count: summary?.high_count, color: 'bg-orange-500' },
                        { label: 'Medium', count: summary?.medium_count, color: 'bg-yellow-500' },
                        { label: 'Low', count: summary?.low_count, color: 'bg-green-500' },
                    ].map(({ label, count, color }) => {
                        const total = (summary?.critical_count || 0) + (summary?.high_count || 0) + (summary?.medium_count || 0) + (summary?.low_count || 0)
                        const pct = total > 0 ? ((count || 0) / total * 100).toFixed(1) : 0
                        return (
                            <div key={label} className="space-y-2">
                                <div className={`h-1 rounded-full ${color} mx-auto`} style={{ width: `${pct}%`, minWidth: 8 }} />
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{count ?? 0}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{label} ({pct}%)</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
