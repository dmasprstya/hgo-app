import { Component } from 'react'

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-950">
                    <div className="card max-w-md text-center space-y-4">
                        <div className="text-5xl">⚠️</div>
                        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                        <p className="text-gray-400 text-sm">{this.state.error?.message}</p>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="btn-primary btn"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
