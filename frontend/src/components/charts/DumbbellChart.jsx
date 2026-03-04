import {
    ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, Scatter, ErrorBar,
} from 'recharts'

export function DumbbellChart({ data = [] }) {
    // Transform to Recharts format: show output_score and hgod_index as bars
    const chartData = data.map((d) => ({
        name: d.patient_code,
        fullName: d.name,
        rank: d.rank,
        output_score: parseFloat(d.output_score?.toFixed(4)),
        hgod_index: parseFloat(d.hgod_index?.toFixed(6)),
    }))

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const item = chartData.find((d) => d.name === label) || {}
        return (
            <div className="glass p-3 rounded-xl text-xs space-y-1 text-gray-200">
                <p className="font-bold text-white">#{item.rank} — {item.fullName}</p>
                {payload.map((p) => (
                    <p key={p.dataKey}>
                        {p.name}: <span style={{ color: p.color }}>{p.value}</span>
                    </p>
                ))}
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Bar dataKey="output_score" name="Output Score" fill="#6366f1" fillOpacity={0.8} radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="hgod_index" name="HGOd Index" fill="#a855f7" fillOpacity={0.8} radius={[0, 4, 4, 0]} barSize={8} />
            </ComposedChart>
        </ResponsiveContainer>
    )
}
