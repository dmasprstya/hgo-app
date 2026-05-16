import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'

export function Modal({ open, onClose, title, children, footer }) {
    const dialogRef = useRef(null)

    useEffect(() => {
        const d = dialogRef.current
        if (!d) return
        if (open) {
            d.showModal()
        } else {
            d.close()
        }
    }, [open])

    if (!open) return null

    return (
        <dialog
            ref={dialogRef}
            className="bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm rounded-2xl max-w-full"
            onClick={(e) => { if (e.target === dialogRef.current) onClose?.() }}
        >
            <div className="glass rounded-2xl p-6 min-w-96 max-w-2xl w-full mx-auto animate-slide-up shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-gray-300">{children}</div>
                {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
            </div>
        </dialog>
    )
}
