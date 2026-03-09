import { useState, useEffect, useCallback } from 'react'

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

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'

    return (
        <div className={`toast toast-${type} ${visible ? 'toast-enter' : 'toast-exit'}`}>
            <span className="toast-icon">{icon}</span>
            <span className="toast-msg">{message}</span>
            <button className="toast-close" onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 300) }}>✕</button>
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
