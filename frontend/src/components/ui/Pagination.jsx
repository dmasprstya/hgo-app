import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export function Pagination({ page, totalPages, onChange }) {
    if (totalPages <= 1) return null

    const pages = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)

    for (let i = start; i <= end; i++) pages.push(i)

    return (
        <div className="flex items-center gap-1 justify-end mt-4">
            <button
                onClick={() => onChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10
                   disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
                <ChevronLeftIcon className="w-4 h-4" />
            </button>
            {start > 1 && (
                <>
                    <button onClick={() => onChange(1)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition">1</button>
                    {start > 2 && <span className="text-gray-600 px-1">…</span>}
                </>
            )}
            {pages.map((p) => (
                <button
                    key={p}
                    onClick={() => onChange(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${p === page
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                >
                    {p}
                </button>
            ))}
            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span className="text-gray-600 px-1">…</span>}
                    <button onClick={() => onChange(totalPages)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition">{totalPages}</button>
                </>
            )}
            <button
                onClick={() => onChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10
                   disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
                <ChevronRightIcon className="w-4 h-4" />
            </button>
        </div>
    )
}
