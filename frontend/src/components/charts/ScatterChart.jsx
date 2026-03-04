import {
    ScatterChart as ReScatter, Scatter, XAxis, YAxis,
    ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'

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
        <div className="glass p-3 rounded-xl text-xs space-y-1 text-gray-200">
            <p className="font-bold text-white">{d.name} ({d.patient_code})</p>
            <p>Output Score: <span className="text-primary-300">{d.output_score?.toFixed(4)}</span></p>
            <p>HGOd Index: <span className="text-purple-300">{d.hgod_index?.toFixed(6)}</span></p>
            <p>Priority: <span style={{ color: COLORS[d.priority_level] }}>{d.priority_level}</span></p>
        </div>
    )
}

export function ScatterChart({ data = [] }) {
    const byLevel = ['Critical', 'High', 'Medium', 'Low']
    return (
        <ResponsiveContainer width="100%" height={350}>
            <ReScatter>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="output_score" name="Output Score" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} label={{ value: 'Output Score', position: 'bottom', fill: '#9ca3af', fontSize: 11, dy: 10 }} />
                <YAxis dataKey="hgod_index" name="HGOd Index" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} label={{ value: 'HGOd Index', angle: -90, position: 'left', fill: '#9ca3af', fontSize: 11, dx: -10 }} />
                <ZAxis range={[40, 40]} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4f46e5', strokeDasharray: '4 4' }} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                {byLevel.map((level) => (
                    <Scatter
                        key={level}
                        name={level}
                        data={data.filter((d) => d.priority_level === level)}
                        fill={COLORS[level]}
                        fillOpacity={0.8}
                    />
                ))}
            </ReScatter>
        </ResponsiveContainer>
    )
}
