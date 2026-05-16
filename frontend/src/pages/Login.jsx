import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login(email, password)
            navigate('/dashboard')
        } catch (err) {
            const detail = err.response?.data?.detail
            if (Array.isArray(detail)) {
                setError(detail.map(d => d.msg || String(d)).join(', '))
            } else {
                setError(typeof detail === 'string' ? detail : 'Invalid email or password')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Background gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-slide-up">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-purple-600 mb-4 shadow-xl shadow-primary-900/50">
                        <PlusIcon className="w-8 h-8 text-white stroke-[2.5]" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SPK HGO Discovery</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Hospital Inpatient Prioritization System</p>
                </div>

                {/* Card */}
                <div className="card max-w-md w-full shadow-2xl">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Sign in to continue</h2>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 animate-fade-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="admin@spk-hgo.local"
                                required
                                id="login-email"
                            />
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pr-12"
                                    placeholder="••••••••"
                                    required
                                    id="login-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary btn w-full mt-2"
                            id="login-submit"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    Signing in…
                                </span>
                            ) : 'Sign in'}
                        </button>
                    </form>

                    <p className="text-xs text-gray-600 mt-6 text-center">
                        Default: admin@spk-hgo.local / Admin@123
                    </p>
                </div>

                <p className="text-center text-xs text-gray-600 mt-4">
                    HGO Discovery Model — RSUD Inpatient Priority System v1.0
                </p>
            </div>
        </div>
    )
}
