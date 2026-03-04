export function Badge({ level }) {
    const classes = {
        Critical: 'badge-critical',
        High: 'badge-high',
        Medium: 'badge-medium',
        Low: 'badge-low',
    }
    const dots = {
        Critical: 'bg-red-400',
        High: 'bg-orange-400',
        Medium: 'bg-yellow-400',
        Low: 'bg-green-400',
    }
    return (
        <span className={classes[level] || 'badge-low'}>
            <span className={`w-1.5 h-1.5 rounded-full ${dots[level] || 'bg-green-400'}`} />
            {level}
        </span>
    )
}
