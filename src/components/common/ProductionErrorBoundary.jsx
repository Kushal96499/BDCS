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
            return (
                <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 font-sans">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full text-center space-y-8"
                    >
                        {/* Error Icon */}
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-red-100 rounded-[2rem] animate-pulse" />
                            <div className="relative flex items-center justify-center h-full text-4xl">
                                🛡️
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">System Shield Active</h1>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                A critical error occurred. To protect your data, the application has been suspended.
                            </p>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Diagnostic Code</p>
                            <code className="text-[11px] font-mono font-bold text-red-500 break-words line-clamp-2">
                                {this.state.error?.toString() || "Unknown Internal Exception"}
                            </code>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95"
                            >
                                Re-initialize Application
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                            >
                                Return to Hub
                            </button>
                        </div>

                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
                            Biyani Digital Campus System • Institutional Core v1.0
                        </p>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ProductionErrorBoundary;
