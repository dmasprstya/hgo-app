import { useState } from 'react'
import { PlayIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useSimulationStatus } from '../hooks/useSimulationStatus'
import { simulationService } from '../services/simulationService'
import { runFullHgo, convertToCrisp, normalizeMatrix, calculateOutput, calculateHgodIndex, WEIGHTS, TYPES, ORDER } from '../utils/hgo'

const SAMPLE_PATIENTS_DEMO = [
    { id: 'demo1', patient_code: 'P-DEMO-01', name: 'Sample A', Cr1: 'independent', Cr2: 'no', Cr3: 'vvip', Cr4: 'emergency', Cr5: 'critical', Cr6: 'abnormal' },
    { id: 'demo2', patient_code: 'P-DEMO-02', name: 'Sample B', Cr1: 'governance insurance', Cr2: 'yes', Cr3: 'class3', Cr4: 'urgent', Cr5: 'mild', Cr6: 'normal' },
    { id: 'demo3', patient_code: 'P-DEMO-03', name: 'Sample C', Cr1: 'independent', Cr2: 'no', Cr3: 'vip', Cr4: 'emergency', Cr5: 'severe', Cr6: 'abnormal' },
]

const STEP_LABELS = ['Stage H: Crisp Values', 'Stage G: Normalization', 'Stage O: Output Score', 'HGOd Index', 'Ranking']

export default function Simulation() {
    const [jobId, setJobId] = useState(null)
    const [launching, setLaunching] = useState(false)
    const [activeStep, setActiveStep] = useState(0)
    const [error, setError] = useState('')
    const simStatus = useSimulationStatus(jobId)

    // Run demo HGO transparently for the 5-step view
    const demoResults = runFullHgo(SAMPLE_PATIENTS_DEMO)
    const crispRows = SAMPLE_PATIENTS_DEMO.map(p => Object.fromEntries(ORDER.map(c => [c, convertToCrisp(c, p[c])])))
    const normRows = normalizeMatrix(crispRows, TYPES)

    const handleRun = async () => {
        setLaunching(true)
        setError('')
        try {
            const res = await simulationService.run()
            setJobId(res.data.job_id)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to start simulation')
        } finally {
            setLaunching(false)
        }
    }

    const isDone = simStatus?.status === 'completed' || simStatus?.status === 'failed'

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HGO Simulation</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">3-stage transparent model: Hierarchy → Governance → Outlook</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleRun} disabled={launching || (jobId && !isDone)} className="flex items-center gap-2">
                        {launching ? (
                            <span>Starting…</span>
                        ) : jobId && !isDone ? (
                            <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                <span>Running…</span>
                            </>
                        ) : (
                            <>
                                <PlayIcon className="w-4 h-4" />
                                <span>Run Full Simulation</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

            {simStatus && (
                <div className={`rounded-xl p-4 border text-sm flex flex-col gap-3 ${simStatus.status === 'completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                    simStatus.status === 'failed' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        'bg-primary-500/10 border-primary-500/30 text-primary-400'
                    }`}>
                    <div className="flex items-center gap-3">
                        {simStatus.status === 'running' && <Spinner size={4} />}
                        <span>
                            Simulation {simStatus.status} — {simStatus.total_patients} patients
                            {simStatus.status === 'completed' && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span>View results in Ranking page.</span>
                                </span>
                            )}
                        </span>
                    </div>
                    {simStatus.status === 'running' && simStatus.total_patients > 0 && (
                        <div className="w-full mt-2">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Processing...</span>
                                <span>{simStatus.processed_patients || 0} / {simStatus.total_patients} ({Math.round(((simStatus.processed_patients || 0) / simStatus.total_patients) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.round(((simStatus.processed_patients || 0) / simStatus.total_patients) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 5-step tabs */}
            <div className="card space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Transparent Algorithm View (Demo: {SAMPLE_PATIENTS_DEMO.length} patients)</h3>

                {/* Step nav */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {STEP_LABELS.map((label, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveStep(i)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${activeStep === i ? 'bg-primary-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {i + 1}. {label}
                        </button>
                    ))}
                </div>

                {/* Step 0: Crisp */}
                {activeStep === 0 && (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Patient</th>{ORDER.map(c => <th key={c}>{c}</th>)}</tr></thead>
                            <tbody>
                                {SAMPLE_PATIENTS_DEMO.map((p, i) => (
                                    <tr key={p.id}>
                                        <td className="text-gray-900 dark:text-white font-medium">{p.name}</td>
                                        {ORDER.map(c => <td key={c} className="font-mono text-primary-600 dark:text-primary-400">{crispRows[i][c]}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Step 1: Normalized */}
                {activeStep === 1 && (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Patient</th>{ORDER.map(c => <th key={c}>{c} ({TYPES[c][0].toUpperCase()})</th>)}</tr></thead>
                            <tbody>
                                {SAMPLE_PATIENTS_DEMO.map((p, i) => (
                                    <tr key={p.id}>
                                        <td className="text-gray-900 dark:text-white font-medium">{p.name}</td>
                                        {ORDER.map(c => <td key={c} className="font-mono text-yellow-600 dark:text-yellow-400">{normRows[i][c].toFixed(4)}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Step 2: Output scores */}
                {activeStep === 2 && (
                    <div className="space-y-2">
                        {demoResults.map(r => (
                            <div key={r.patientId} className="flex justify-between items-center bg-gray-50 dark:glass rounded-xl px-4 py-3 border border-gray-100 dark:border-none">
                                <span className="text-gray-900 dark:text-white font-medium">{r.patientName}</span>
                                <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">Output = {r.outputScore.toFixed(6)}</span>
                            </div>
                        ))}
                        <p className="text-xs text-gray-500 pt-1">Formula: Output = Σ(Wj × rij) where rij = normalized value</p>
                    </div>
                )}

                {/* Step 3: HGOd */}
                {activeStep === 3 && (
                    <div className="space-y-2">
                        {demoResults.map(r => (
                            <div key={r.patientId} className="flex justify-between items-center bg-gray-50 dark:glass rounded-xl px-4 py-3 border border-gray-100 dark:border-none">
                                <span className="text-gray-900 dark:text-white font-medium">{r.patientName}</span>
                                <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">HGOd = {r.hgodIndex.toFixed(6)}</span>
                            </div>
                        ))}
                        <p className="text-xs text-gray-500 pt-1">Formula: HGOd = 1 / Σ(Wj × Xj) — lower index = higher priority</p>
                    </div>
                )}

                {/* Step 4: Ranking */}
                {activeStep === 4 && (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Rank</th><th>Patient</th><th>Output Score</th><th>HGOd Index</th><th>Priority</th></tr></thead>
                            <tbody>
                                {demoResults.map(r => (
                                    <tr key={r.patientId}>
                                        <td className="font-bold text-gray-900 dark:text-white">#{r.rank}</td>
                                        <td>{r.patientName}</td>
                                        <td className="font-mono text-primary-600 dark:text-primary-400">{r.outputScore.toFixed(6)}</td>
                                        <td className="font-mono text-purple-600 dark:text-purple-400">{r.hgodIndex.toFixed(6)}</td>
                                        <td>
                                            <span className={r.priorityLevel === 'Critical' ? 'badge-critical' : r.priorityLevel === 'High' ? 'badge-high' : r.priorityLevel === 'Medium' ? 'badge-medium' : 'badge-low'}>
                                                {r.priorityLevel}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Criteria weights reference */}
            <div className="card">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Criteria Weights Reference</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[['Cr1', 'Insurance', 'positive', 0.10], ['Cr2', 'Surgery', 'negative', 0.20], ['Cr3', 'Room Class', 'positive', 0.075], ['Cr4', 'Admission', 'positive', 0.125], ['Cr5', 'Severity', 'positive', 0.20], ['Cr6', 'Test Result', 'positive', 0.15]].map(([code, name, type, weight]) => (
                        <div key={code} className="bg-gray-50 dark:glass rounded-xl p-3 text-center border border-gray-100 dark:border-none">
                            <p className="text-xs text-primary-600 dark:text-primary-400 font-mono font-bold">{code}</p>
                            <p className="text-xs text-gray-900 dark:text-white mt-1">{name}</p>
                            <p className="text-xs text-gray-500 capitalize">{type}</p>
                            <p className="text-sm font-bold text-primary-700 dark:text-primary-300 mt-1">W={weight}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
