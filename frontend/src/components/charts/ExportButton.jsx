import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
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
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={disabled} className="flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export PNG</span>
        </Button>
    )
}
