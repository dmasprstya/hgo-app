import { clsx } from 'clsx'

export function Button({ children, variant = 'primary', size = 'md', className, ...props }) {
    const base = 'btn'
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger',
        ghost: 'btn bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10',
    }
    const sizes = {
        sm: 'text-xs px-3 py-1.5',
        md: '',
        lg: 'text-base px-6 py-3',
    }
    return (
        <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
            {children}
        </button>
    )
}
