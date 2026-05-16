import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { FileDropzone } from '../components/ui/FileDropzone'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { ArrowDownTrayIcon, PaperClipIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { importService } from '../services/importService'
import { useImportStatus } from '../hooks/useImportStatus'

export default function Import() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [jobId, setJobId] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')

    const status = useImportStatus(jobId)

    const handleFile = (f) => {
        setFile(f)
        setError('')
        setJobId(null)
        // Preview first 10 rows
        const reader = new FileReader()
        reader.onload = (e) => {
            const wb = XLSX.read(e.target.result, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(0, 11)
            setPreview(rows)
        }
        reader.readAsArrayBuffer(f)
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        setError('')
        try {
            const res = await importService.upload(file)
            setJobId(res.data.job_id)
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    const isDone = status?.status === 'completed' || status?.status === 'failed'

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Patient Data</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Upload Excel or CSV file with patient criteria data</p>
            </div>

            <div className="card space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Upload File</h3>
                    <Button variant="ghost" size="sm" onClick={() => importService.getTemplate()} className="flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Download Template</span>
                    </Button>
                </div>

                {!jobId && <FileDropzone onFile={handleFile} />}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                        {error}
                    </div>
                )}

                {file && !jobId && (
                    <div className="flex items-center justify-between pt-2">
                        <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <PaperClipIcon className="w-4 h-4" />
                            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        </p>
                        <Button onClick={handleUpload} disabled={uploading}>
                            {uploading ? 'Uploading…' : 'Upload & Import'}
                        </Button>
                    </div>
                )}

                {/* Progress */}
                {status && (
                    <div className="space-y-3 pt-2">
                        <ProgressBar value={status.progress_pct ?? 0} label={`Status: ${status.status}`} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm">
                            <div className="bg-gray-50 dark:glass rounded-xl p-3 border border-gray-100 dark:border-none">
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Total Rows</p>
                                <p className="font-bold text-gray-900 dark:text-white text-lg">{status.total_rows}</p>
                            </div>
                            <div className="bg-gray-50 dark:glass rounded-xl p-3 border border-gray-100 dark:border-none">
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Processed</p>
                                <p className="font-bold text-green-600 dark:text-green-400 text-lg">{status.processed_rows}</p>
                            </div>
                            <div className="bg-gray-50 dark:glass rounded-xl p-3 border border-gray-100 dark:border-none">
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Failed</p>
                                <p className="font-bold text-red-600 dark:text-red-400 text-lg">{status.failed_rows}</p>
                            </div>
                        </div>
                        {status.error_log && (
                            <pre className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 max-h-32 overflow-y-auto">
                                {status.error_log}
                            </pre>
                        )}
                        {isDone && status.status === 'completed' && (
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl">
                                <CheckCircleIcon className="w-5 h-5 shrink-0" />
                                <span>Import completed successfully!</span>
                                <button className="ml-auto underline" onClick={() => { setJobId(null); setFile(null); setPreview(null) }}>
                                    Upload another
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Preview */}
            {preview && (
                <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Preview (first 10 rows)</h3>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>{preview[0]?.map((h, i) => <th key={i}>{String(h)}</th>)}</tr>
                            </thead>
                            <tbody>
                                {preview.slice(1).map((row, ri) => (
                                    <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{String(cell ?? '')}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
