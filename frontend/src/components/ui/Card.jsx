import { clsx } from 'clsx'

export function Card({ children, className, ...props }) {
    return (
        <div className={clsx('card animate-fade-in', className)} {...props}>
            {children}
        </div>
    )
}

export function CardTitle({ children, className }) {
    return <h3 className={clsx('text-base font-semibold text-gray-900 dark:text-white mb-1', className)}>{children}</h3>
}

export function KpiCard({ label, value, sub, icon: Icon, color = 'primary' }) {
    const colors = {
        primary: 'from-primary-100 to-primary-50 dark:from-primary-600/20 dark:to-primary-900/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400 shadow-sm',
        danger: 'from-red-100 to-red-50 dark:from-red-600/20 dark:to-red-900/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 shadow-sm',
        warning: 'from-yellow-100 to-yellow-50 dark:from-yellow-600/20 dark:to-yellow-900/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400 shadow-sm',
        success: 'from-green-100 to-green-50 dark:from-green-600/20 dark:to-green-900/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 shadow-sm',
    }
    return (
        <div className={clsx('relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br animate-slide-up', colors[color])}>
            {Icon && (
                <div className="absolute right-4 top-4 opacity-20 text-gray-900 dark:text-white">
                    <Icon className="w-12 h-12" />
                </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
    )
}
