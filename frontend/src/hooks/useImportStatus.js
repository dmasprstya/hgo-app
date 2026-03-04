import { useState, useEffect, useRef } from 'react'
import { importService } from '../services/importService'

export function useImportStatus(jobId) {
    const [status, setStatus] = useState(null)
    const intervalRef = useRef(null)

    useEffect(() => {
        if (!jobId) return

        const poll = async () => {
            try {
                const data = await importService.status(jobId)
                setStatus(data)
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(intervalRef.current)
                }
            } catch {
                clearInterval(intervalRef.current)
            }
        }

        poll()
        intervalRef.current = setInterval(poll, 2000)
        return () => clearInterval(intervalRef.current)
    }, [jobId])

    return status
}
