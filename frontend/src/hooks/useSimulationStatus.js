import { useState, useEffect, useRef } from 'react'
import { simulationService } from '../services/simulationService'

const MAX_AUTH_RETRIES = 3

export function useSimulationStatus(jobId) {
    const [status, setStatus] = useState(null)
    const intervalRef = useRef(null)
    const authRetryRef = useRef(0)

    useEffect(() => {
        if (!jobId) return

        const poll = async () => {
            try {
                const data = await simulationService.status(jobId)
                setStatus(data.data || data)
                // Reset retry counter on success
                authRetryRef.current = 0
                if (data?.data?.status === 'completed' || data?.data?.status === 'failed') {
                    clearInterval(intervalRef.current)
                }
            } catch (err) {
                const is401 = err?.response?.status === 401
                if (is401 && authRetryRef.current < MAX_AUTH_RETRIES) {
                    // Auth error — interceptor will try refresh, keep polling
                    authRetryRef.current += 1
                    return
                }
                // Either non-auth error or max retries exceeded — stop cleanly
                clearInterval(intervalRef.current)
            }
        }

        poll()
        intervalRef.current = setInterval(poll, 2000)
        return () => clearInterval(intervalRef.current)
    }, [jobId])

    return status
}
