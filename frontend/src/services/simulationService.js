import api from './api'

export const simulationService = {
    run: async (notes = '') => {
        const res = await api.post('/api/simulation/run', { notes })
        return res.data
    },

    status: async (jobId) => {
        const res = await api.get(`/api/simulation/status/${jobId}`)
        return res.data
    },

    results: async (params) => {
        const res = await api.get('/api/simulation/results', { params })
        return res.data
    },

    export: async (format = 'xlsx') => {
        const res = await api.get(`/api/simulation/export?format=${format}`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `hasil_simulasi.${format}`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    },
}
