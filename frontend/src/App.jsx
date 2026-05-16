import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { clsx } from 'clsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
    HomeIcon,
    UsersIcon,
    ArrowUpTrayIcon,
    BoltIcon,
    TrophyIcon,
    ChartBarIcon,
    SunIcon,
    MoonIcon,
    Bars3Icon,
    ArrowRightOnRectangleIcon,
    PlusIcon
} from '@heroicons/react/24/outline'
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
import { useTheme } from './context/ThemeContext'
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
    { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { to: '/patients', label: 'Patients', icon: UsersIcon },
    { to: '/import', label: 'Import', icon: ArrowUpTrayIcon },
    { to: '/simulation', label: 'Simulation', icon: BoltIcon },
    { to: '/ranking', label: 'Ranking', icon: TrophyIcon },
    { to: '/visualization', label: 'Visualization', icon: ChartBarIcon },
]

function AppLayout({ children }) {
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    return (
        <div className="min-h-screen text-gray-900 dark:text-white md:flex transition-colors duration-300">
            {/* Sidebar */}
            <aside
                className={clsx(
                    'fixed inset-y-0 left-0 z-40 w-64 shrink-0 glass border-r border-gray-200 dark:border-white/10 flex flex-col transform transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                {/* Logo */}
                <div className="p-5 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center shadow-lg">
                                <PlusIcon className="w-5 h-5 text-white stroke-[2.5]" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">SPK HGO</p>
                                <p className="text-xs text-gray-500">Discovery</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors"
                            title="Toggle theme"
                        >
                            {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {NAV_LINKS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => clsx('sidebar-link flex items-center gap-3', isActive && 'active')}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/30 flex items-center justify-center text-sm">
                            {user?.name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        <span>Sign out</span>
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
                <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-200"
                            aria-label="Open navigation"
                        >
                            <Bars3Icon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center shadow-lg">
                            <PlusIcon className="w-4 h-4 text-white stroke-[2.5]" />
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">SPK HGO</p>
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
                <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
                    <AppRoutes />
                </BrowserRouter>
            </QueryClientProvider>
        </ErrorBoundary>
    )
}
