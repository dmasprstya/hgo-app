import axios from 'axios'
import useAuthStore from '../store/authStore'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    withCredentials: true, // send httpOnly refresh cookie
    headers: { 'Content-Type': 'application/json' },
})

// ── Request Interceptor — attach Bearer token ─────────────────────────────────
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── Response Interceptor — handle 401 with silent refresh ────────────────────
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        return api(originalRequest)
                    })
                    .catch((err) => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                const res = await api.post('/api/auth/refresh')
                const { access_token, ...user } = res.data
                useAuthStore.getState().setAuth(access_token, user)
                processQueue(null, access_token)
                originalRequest.headers.Authorization = `Bearer ${access_token}`
                return api(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                useAuthStore.getState().clearAuth()
                window.location.href = '/login'
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

export default api
