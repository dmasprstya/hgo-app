import { useState, useEffect, useRef } from 'react'
import { simulationService } from '../services/simulationService'

export function useSimulationStatus(jobId) {
    const [status, setStatus] = useState(null)
    const intervalRef = useRef(null)

    useEffect(() => {
        if (!jobId) return

        const poll = async () => {
            try {
                const data = await simulationService.status(jobId)
                setStatus(data.data || data)
                if (data?.data?.status === 'completed' || data?.data?.status === 'failed') {
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
