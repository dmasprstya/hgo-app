import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { clsx } from 'clsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import useAuthStore from './store/authStore'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Import from './pages/Import'
import Patients from './pages/Patients'
import Simulation from './pages/Simulation'
import Ranking from './pages/Ranking'
import Visualization from './pages/Visualization'
import './index.css'

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

function ProtectedRoute({ children }) {
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return children
}

const NAV_LINKS = [
    { to: '/dashboard', label: '🏠 Dashboard' },
    { to: '/patients', label: '👥 Patients' },
    { to: '/import', label: '📥 Import' },
    { to: '/simulation', label: '⚡ Simulation' },
    { to: '/ranking', label: '🏆 Ranking' },
    { to: '/visualization', label: '📊 Visualization' },
]

function AppLayout({ children }) {
    const { user, logout } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    return (
        <div className="min-h-screen bg-gray-950 md:flex">
            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed inset-y-0 left-0 z-40 w-64 shrink-0 glass border-r border-white/10 flex flex-col transform transition-transform duration-200 md:static md:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                {/* Logo */}
                <div className="p-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="text-base">🏥</span>
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm leading-none">SPK HGO</p>
                            <p className="text-xs text-gray-500">Discovery</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {NAV_LINKS.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/30 flex items-center justify-center text-sm">
                            {user?.name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full text-left text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                        → Sign out
                    </button>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main */}
            <main className="flex-1 overflow-auto">
                {/* Mobile top bar */}
                <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-950/95 backdrop-blur">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200"
                        aria-label="Open navigation"
                    >
                        ☰
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="text-sm">🏥</span>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-white">SPK HGO</p>
                            <p className="text-[11px] text-gray-500">Discovery</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}

function AppRoutes() {
    const isAuthenticated = useAuthStore(s => s.isAuthenticated)
    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Routes>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/patients" element={<Patients />} />
                                <Route path="/import" element={<Import />} />
                                <Route path="/simulation" element={<Simulation />} />
                                <Route path="/ranking" element={<Ranking />} />
                                <Route path="/visualization" element={<Visualization />} />
                                <Route path="*" element={<Navigate to="/dashboard" />} />
                            </Routes>
                        </AppLayout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    )
}

export default function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                    <AppRoutes />
                </BrowserRouter>
            </QueryClientProvider>
        </ErrorBoundary>
    )
}
