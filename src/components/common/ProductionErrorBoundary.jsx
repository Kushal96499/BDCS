// ============================================
// BDCS - Production Error Boundary
// Premium "Neo-Campus" Emergency State UI
// ============================================

import React from 'react';
import { motion } from 'framer-motion';

class ProductionErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Here you would typically log the error to a service like Sentry or LogRocket
        console.error("Critical Application Failure:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const errorStr = this.state.error?.toString() || "";
            const isOfflineChunkError = !navigator.onLine && (
                errorStr.includes('Failed to fetch dynamically imported module') ||
                errorStr.includes('Importing a module script failed') ||
                errorStr.includes('module script') ||
                errorStr.includes('fetch')
            );

            if (isOfflineChunkError) {
                return (
                    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 font-sans">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md w-full text-center space-y-8"
                        >
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 bg-orange-50 rounded-[2rem] animate-pulse" />
                                <div className="relative flex items-center justify-center h-full text-4xl">
                                    📡
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Offline Route</h1>
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 font-bold leading-relaxed px-4">
                                        You are currently offline and haven't accessed this specific view before.
                                    </p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-8">
                                        Please reconnect to the internet to load this module, or return home to view cached data.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (navigator.onLine) {
                                            window.location.reload();
                                        } else {
                                            alert("Still offline. Please reconnect first.");
                                        }
                                    }}
                                    className="w-full py-4 bg-orange-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-orange-600 transition-all active:scale-95 border border-white/10"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => window.history.back()}
                                    className="w-full py-4 bg-gray-100 text-gray-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Go Back
                                </button>
                            </div>
                        </motion.div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 font-sans">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full text-center space-y-8"
                    >
                        {/* Friendly Status Icon */}
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-blue-50 rounded-[2rem] animate-pulse" />
                            <div className="relative flex items-center justify-center h-full text-4xl">
                                🔑
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Session Interrupted</h1>
                            <div className="space-y-2">
                                <p className="text-sm text-gray-500 font-bold leading-relaxed px-4">
                                    Your session has encountered an unexpected interruption. To protect your work and data, we need you to restart your session.
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-8">
                                    Please click the button below to sign in again and continue securely.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Diagnostic Code</p>
                            <code className="text-[11px] font-mono font-bold text-red-500 break-words line-clamp-2">
                                {errorStr || "Unknown Internal Exception"}
                            </code>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.href = '/login'}
                                className="w-full py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-[#E31E24] transition-all active:scale-95 border border-white/10"
                            >
                                Login Again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                            >
                                Return to Hub
                            </button>
                        </div>

                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
                            Biyani Digital Campus System • Institutional
                        </p>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ProductionErrorBoundary;
