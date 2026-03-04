import { create } from 'zustand'

const useAuthStore = create((set, get) => ({
    accessToken: null,
    user: null,
    isAuthenticated: false,

    setAuth: (token, user) => set({
        accessToken: token,
        user,
        isAuthenticated: true,
    }),

    clearAuth: () => set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
    }),

    updateToken: (token) => set({ accessToken: token }),

    getToken: () => get().accessToken,
}))

export default useAuthStore
