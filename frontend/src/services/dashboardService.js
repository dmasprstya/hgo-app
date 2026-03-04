import api from './api'

export const dashboardService = {
    summary: async () => {
        const res = await api.get('/api/dashboard/summary')
        return res.data
    },

    scatterData: async () => {
        const res = await api.get('/api/dashboard/scatter-data')
        return res.data
    },

    dumbbellData: async (sample = 20) => {
        const res = await api.get('/api/dashboard/dumbbell-data', { params: { sample } })
        return res.data
    },

    ranking: async (limit = 50) => {
        const res = await api.get('/api/dashboard/ranking', { params: { limit } })
        return res.data
    },
}
