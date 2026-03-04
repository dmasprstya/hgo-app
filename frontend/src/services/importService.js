import api from './api'

export const importService = {
    upload: async (file, onProgress) => {
        const form = new FormData()
        form.append('file', file)
        const res = await api.post('/api/import/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: onProgress,
        })
        return res.data
    },

    status: async (jobId) => {
        const res = await api.get(`/api/import/status/${jobId}`)
        return res.data
    },

    getTemplate: () => {
        window.open(`${import.meta.env.VITE_API_URL || ''}/api/import/template`, '_blank')
    },

    history: async (params) => {
        const res = await api.get('/api/import/history', { params })
        return res.data
    },
}
