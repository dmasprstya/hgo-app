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

    getTemplate: async () => {
        const res = await api.get('/api/import/template', { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'template_import_pasien.xlsx')
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    },

    history: async (params) => {
        const res = await api.get('/api/import/history', { params })
        return res.data
    },
}
