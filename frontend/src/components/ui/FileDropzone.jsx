import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

export function FileDropzone({ onFile, accept = { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] } }) {
    const onDrop = useCallback((accepted) => {
        if (accepted[0]) onFile(accepted[0])
    }, [onFile])

    const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
        onDrop,
        accept,
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024,
    })

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${isDragActive
                    ? 'border-primary-400 bg-primary-500/10'
                    : 'border-white/20 hover:border-primary-500/50 hover:bg-white/5'
                }`}
        >
            <input {...getInputProps()} />
            <div className="text-5xl mb-3">📁</div>
            {isDragActive ? (
                <p className="text-primary-400 font-semibold">Drop the file here…</p>
            ) : (
                <>
                    <p className="text-gray-300 font-medium">Drag & drop Excel / CSV file here</p>
                    <p className="text-gray-500 text-sm mt-1">or click to browse (max 10MB)</p>
                </>
            )}
            {acceptedFiles[0] && (
                <div className="mt-4 inline-flex items-center gap-2 bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm px-4 py-2 rounded-xl">
                    📎 {acceptedFiles[0].name} ({(acceptedFiles[0].size / 1024).toFixed(1)} KB)
                </div>
            )}
        </div>
    )
}
