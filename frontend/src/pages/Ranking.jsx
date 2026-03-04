import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { simulationService } from '../services/simulationService'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Pagination } from '../components/ui/Pagination'
import { Spinner } from '../components/ui/Spinner'

export default function Ranking() {
    const [page, setPage] = useState(1)
    const [sortBy, setSortBy] = useState('rank')
    const [filterPriority, setFilterPriority] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['simulation-results', page, sortBy, filterPriority],
        queryFn: () => simulationService.results({ page, limit: 50, sort: sortBy, priority: filterPriority || undefined }),
    })

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Patient Ranking</h1>
                    <p className="text-gray-400 text-sm">HGO Discovery — Prioritized inpatient list</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => simulationService.export('xlsx')}>
                        📊 Export XLSX
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => simulationService.export('csv')}>
                        📄 Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <select className="input max-w-xs text-sm" value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }}>
                    <option value="">All Priorities</option>
                    {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="input max-w-xs text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="rank">Sort by Rank</option>
                    <option value="hgod_index">Sort by HGOd Index</option>
                    <option value="output_score">Sort by Output Score</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Spinner size={8} /></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Code</th>
                                    <th>Patient Name</th>
                                    <th>Output Score</th>
                                    <th>HGOd Index</th>
                                    <th>Priority</th>
                                    <th>Calculated At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.data?.map((r) => (
                                    <tr key={r.patient_id}>
                                        <td>
                                            <span className={`font-bold text-sm ${r.rank <= 10 ? 'text-yellow-400' : 'text-white'}`}>
                                                #{r.rank}
                                            </span>
                                        </td>
                                        <td className="font-mono text-xs text-primary-400">{r.patient_code}</td>
                                        <td className="font-medium text-white">{r.patient_name}</td>
                                        <td className="font-mono">{r.output_score?.toFixed(6)}</td>
                                        <td className="font-mono text-purple-400">{r.hgod_index?.toFixed(6)}</td>
                                        <td><Badge level={r.priority_level} /></td>
                                        <td className="text-gray-500 text-xs">
                                            {r.calculated_at ? new Date(r.calculated_at).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {!isLoading && !data?.data?.length && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            No results. Run a simulation first.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {data?.meta && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{data.meta.total} patients ranked</span>
                    <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />
                </div>
            )}
        </div>
    )
}
