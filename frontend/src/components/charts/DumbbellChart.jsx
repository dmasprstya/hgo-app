import {
    ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, Scatter
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'

export function DumbbellChart({ data = [] }) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const axisColor = isDark ? '#9ca3af' : '#4b5563'
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

    const chartData = data.map((d) => {
        const os = parseFloat(d.output_score?.toFixed(4))
        const hi = parseFloat(d.hgod_index?.toFixed(6))
        return {
            name: d.patient_code,
            fullName: d.name,
            rank: d.rank,
            output_score: os,
            hgod_index: hi,
            // Range for the connecting line
            range: [os, hi]
        }
    })

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const item = chartData.find((d) => d.name === label) || {}
        return (
            <div className="card p-4 rounded-xl text-xs space-y-2 shadow-2xl border-none">
                <p className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-1 text-sm">
                    #{item.rank} — {item.fullName}
                </p>
                <div className="space-y-1">
                    <p className="flex justify-between gap-4">
                        <span className="text-gray-500">Output Score:</span>
                        <span className="font-mono text-indigo-500 font-bold">{item.output_score}</span>
                    </p>
                    <p className="flex justify-between gap-4">
                        <span className="text-gray-500">HGOd Index:</span>
                        <span className="font-mono text-purple-500 font-bold">{item.hgod_index}</span>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 25)}>
            <ComposedChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke="#6b7280" tick={{ fill: axisColor, fontSize: 11 }} domain={['auto', 'auto']} padding={{ left: 20, right: 20 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: axisColor, fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: gridColor, strokeWidth: 15 }} />
                <Legend wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                
                {/* The "Bar" acts as the connecting line (Dumbbell bar) */}
                <Bar dataKey="range" fill="#6366f1" fillOpacity={0.2} barSize={2} radius={[10, 10, 10, 10]} name="Score Gap" />
                
                {/* Dots at the ends */}
                <Scatter dataKey="output_score" name="Output Score" fill="#6366f1" shape="circle" />
                <Scatter dataKey="hgod_index" name="HGOd Index" fill="#a855f7" shape="circle" />
            </ComposedChart>
        </ResponsiveContainer>
    )
}
