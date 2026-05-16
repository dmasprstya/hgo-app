import { useState, useEffect, useCallback } from 'react'
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    InformationCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline'

export function Toast({ message, type = 'success', onClose, duration = 3500 }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // trigger enter animation
        requestAnimationFrame(() => setVisible(true))
        const timer = setTimeout(() => {
            setVisible(false)
            setTimeout(() => onClose?.(), 300)
        }, duration)
        return () => clearTimeout(timer)
    }, [duration, onClose])

    const Icon = type === 'success' ? CheckCircleIcon : type === 'error' ? ExclamationCircleIcon : InformationCircleIcon

    return (
        <div className={`toast toast-${type} ${visible ? 'toast-enter' : 'toast-exit'} flex items-center gap-3`}>
            <Icon className="w-5 h-5 shrink-0" />
            <span className="toast-msg flex-1">{message}</span>
            <button className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors" onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 300) }}>
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    )
}

export function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
            ))}
        </div>
    )
}

let _toastId = 0
export function useToast() {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'success') => {
        const id = ++_toastId
        setToasts((prev) => [...prev, { id, message, type }])
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return { toasts, addToast, removeToast }
}
