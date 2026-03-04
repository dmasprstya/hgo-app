export function ProgressBar({ value = 0, label, showPct = true }) {
    const pct = Math.min(100, Math.max(0, value))
    return (
        <div className="space-y-1">
            {(label || showPct) && (
                <div className="flex justify-between text-xs text-gray-400">
                    {label && <span>{label}</span>}
                    {showPct && <span>{pct.toFixed(1)}%</span>}
                </div>
            )}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}
