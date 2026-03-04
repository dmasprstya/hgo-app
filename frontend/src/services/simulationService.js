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

    export: (format = 'xlsx') => {
        const token = api.defaults.headers.common?.Authorization
        window.open(
            `${import.meta.env.VITE_API_URL || ''}/api/simulation/export?format=${format}`,
            '_blank'
        )
    },
}
