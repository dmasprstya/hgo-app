import api from './api'

export const patientService = {
    list: async (params) => {
        const res = await api.get('/api/patients', { params })
        return res.data
    },
    listArchived: async (params) => {
        const res = await api.get('/api/patients/archived', { params })
        return res.data
    },
    get: async (id) => {
        const res = await api.get(`/api/patients/${id}`)
        return res.data
    },
    create: async (data) => {
        const res = await api.post('/api/patients', data)
        return res.data
    },
    update: async (id, data) => {
        const res = await api.put(`/api/patients/${id}`, data)
        return res.data
    },
    delete: async (id) => {
        await api.delete(`/api/patients/${id}`)
    },
    archive: async (id) => {
        const res = await api.patch(`/api/patients/${id}/archive`)
        return res.data
    },
    restore: async (id) => {
        const res = await api.patch(`/api/patients/${id}/restore`)
        return res.data
    },
    bulkAction: async (ids, action) => {
        const res = await api.patch('/api/patients/bulk', { ids, action })
        return res.data
    },
}
