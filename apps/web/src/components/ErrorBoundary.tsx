'use client';

import { Component, ReactNode } from 'react';
import { Link } from '@/i18n/routing';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

/**
 * Global Error Boundary to catch runtime JavaScript errors
 * Wrap this around the main UI content in layout.tsx
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to console for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // TODO: Send to error tracking service (Sentry, etc.)
        // if (typeof window !== 'undefined') {
        //     Sentry.captureException(error);
        // }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI - styled to match traditional theme
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#FFF9F0] font-display">
                    <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow-lg border border-amber-200 text-center">
                        {/* Error Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-red-500">error_outline</span>
                        </div>

                        {/* Error Message */}
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            Đã có lỗi xảy ra
                        </h1>
                        <p className="text-gray-600 mb-6">
                            Rất tiếc, trang web gặp sự cố không mong muốn.
                            Vui lòng thử tải lại trang hoặc quay về trang chủ.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">refresh</span>
                                Tải lại trang
                            </button>
                            <Link
                                href="/"
                                className="px-6 py-3 border border-amber-300 text-amber-700 font-bold rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">home</span>
                                Về trang chủ
                            </Link>
                        </div>

                        {/* Technical details (collapsed by default) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                                    Chi tiết lỗi (Dev only)
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-red-600 overflow-auto max-h-40">
                                    {this.state.error.message}
                                    {'\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
