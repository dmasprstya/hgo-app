import { clsx } from 'clsx'

export function Card({ children, className, ...props }) {
    return (
        <div className={clsx('card animate-fade-in', className)} {...props}>
            {children}
        </div>
    )
}

export function CardTitle({ children, className }) {
    return <h3 className={clsx('text-base font-semibold text-white mb-1', className)}>{children}</h3>
}

export function KpiCard({ label, value, sub, icon: Icon, color = 'primary' }) {
    const colors = {
        primary: 'from-primary-600/20 to-primary-900/10 border-primary-500/30 text-primary-400',
        danger: 'from-red-600/20  to-red-900/10  border-red-500/30  text-red-400',
        warning: 'from-yellow-600/20 to-yellow-900/10 border-yellow-500/30 text-yellow-400',
        success: 'from-green-600/20 to-green-900/10 border-green-500/30 text-green-400',
    }
    return (
        <div className={clsx('relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br animate-slide-up', colors[color])}>
            {Icon && (
                <div className="absolute right-4 top-4 opacity-20">
                    <Icon size={48} />
                </div>
            )}
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    )
}
