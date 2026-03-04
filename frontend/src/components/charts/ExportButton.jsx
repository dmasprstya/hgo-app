import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { Button } from '../ui/Button'

export function ExportButton({ targetRef, filename = 'chart', disabled }) {
    const handleExport = async () => {
        if (!targetRef.current) return
        const canvas = await html2canvas(targetRef.current, {
            backgroundColor: '#030712',
            scale: 2,
        })
        const link = document.createElement('a')
        link.download = `${filename}_${Date.now()}.png`
        link.href = canvas.toDataURL()
        link.click()
    }

    return (
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={disabled}>
            📥 Export PNG
        </Button>
    )
}
