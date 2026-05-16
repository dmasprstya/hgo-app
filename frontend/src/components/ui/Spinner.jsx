import { ArrowPathIcon } from '@heroicons/react/24/outline'

export function Spinner({ size = 6, className = '' }) {
    return (
        <ArrowPathIcon
            className={`animate-spin text-primary-400 ${className}`}
            style={{ width: size * 4, height: size * 4 }}
        />
    )
}
