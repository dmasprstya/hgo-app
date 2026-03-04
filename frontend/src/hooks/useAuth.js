import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { authService } from '../services/authService'

export function useAuth() {
    const navigate = useNavigate()
    const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()

    const login = useCallback(async (email, password) => {
        const data = await authService.login(email, password)
        setAuth(data.access_token, {
            id: data.user_id,
            name: data.name,
            email: data.email,
            role: data.role,
        })
        return data
    }, [setAuth])

    const logout = useCallback(async () => {
        try {
            await authService.logout()
        } catch (_) { }
        clearAuth()
        navigate('/login')
    }, [clearAuth, navigate])

    return { user, isAuthenticated, login, logout }
}
