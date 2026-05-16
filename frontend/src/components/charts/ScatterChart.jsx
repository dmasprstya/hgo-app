import {
    ScatterChart as ReScatter, Scatter, XAxis, YAxis,
    ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'

const COLORS = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#22c55e',
}

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
        <div className="card p-3 rounded-xl text-xs space-y-1 shadow-2xl border-none">
            <p className="font-bold text-gray-900 dark:text-white">{d.name} ({d.patient_code})</p>
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
            <p className="text-gray-600 dark:text-gray-300">Output Score: <span className="text-indigo-600 dark:text-indigo-300 font-mono font-bold">{d.output_score?.toFixed(4)}</span></p>
            <p className="text-gray-600 dark:text-gray-300">HGOd Index: <span className="text-purple-600 dark:text-purple-300 font-mono font-bold">{d.hgod_index?.toFixed(6)}</span></p>
            <p className="text-gray-600 dark:text-gray-300">Priority: <span className="font-bold px-1.5 py-0.5 rounded-md" style={{ color: COLORS[d.priority_level], background: `${COLORS[d.priority_level]}15` }}>{d.priority_level}</span></p>
        </div>
    )
}

export function ScatterChart({ data = [] }) {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const byLevel = ['Critical', 'High', 'Medium', 'Low']
    const axisColor = isDark ? '#9ca3af' : '#4b5563'
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ReScatter margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                    type="number"
                    dataKey="output_score" 
                    name="Output Score" 
                    stroke="#6b7280" 
                    tick={{ fill: axisColor, fontSize: 11 }} 
                    domain={[0, 1]}
                    label={{ value: 'Output Score (Higher is Better)', position: 'insideBottom', fill: axisColor, fontSize: 11, offset: -10 }} 
                />
                <YAxis 
                    type="number"
                    dataKey="hgod_index" 
                    name="HGOd Index" 
                    stroke="#6b7280" 
                    tick={{ fill: axisColor, fontSize: 11 }} 
                    domain={['auto', 'auto']}
                    label={{ value: 'HGOd Index (Lower is Higher Priority)', angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 11, offset: 10 }} 
                />
                <ZAxis range={[60, 60]} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4f46e5', strokeDasharray: '4 4' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                
                {/* Reference Lines for Quadrants */}
                <ReferenceLine x={0.5} stroke={gridColor} strokeWidth={2} label={{ value: 'Threshold', position: 'insideTopLeft', fill: axisColor, fontSize: 10 }} />
                
                {byLevel.map((level) => (
                    <Scatter
                        key={level}
                        name={level}
                        data={data.filter((d) => d.priority_level === level)}
                        fill={COLORS[level]}
                        fillOpacity={0.7}
                    />
                ))}
            </ReScatter>
        </ResponsiveContainer>
    )
}
