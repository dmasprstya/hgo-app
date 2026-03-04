import api from './api'

export const authService = {
    login: async (email, password) => {
        const res = await api.post('/api/auth/login', { email, password })
        return res.data
    },

    refresh: async () => {
        const res = await api.post('/api/auth/refresh')
        return res.data
    },

    logout: async () => {
        await api.post('/api/auth/logout')
    },

    me: async () => {
        const res = await api.get('/api/auth/me')
        return res.data
    },
}
