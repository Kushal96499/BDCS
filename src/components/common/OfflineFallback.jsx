import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OfflineFallback() {
    return (
        <div className="fixed inset-0 z-[9999] bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] flex items-center justify-center border border-gray-100 mb-8 relative"
            >
                <img src="/assets/biyani-logo.png" className="w-14 h-14 object-contain" alt="BDCS Logo" />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-red-100 rounded-[2rem] -z-10"
                ></motion.div>
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="flex items-center justify-center gap-2 mb-4 text-orange-600">
                    <WifiOff size={20} className="animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-widest italic">Connection Interrupted</span>
                </div>

                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
                    You're currently <br /> <span className="text-[#E31E24]">Offline</span>
                </h1>

                <p className="text-gray-500 text-sm font-medium max-w-[280px] mx-auto mb-10 leading-relaxed">
                    We can't reach the server right now. Some data might be out of sync until you reconnect.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-[#E31E24] text-white rounded-3xl font-black text-sm shadow-[0_15px_35px_rgba(227,30,36,0.25)] active:scale-95 transition-transform hover:shadow-[0_20px_45px_rgba(227,30,36,0.35)]"
                    >
                        <RefreshCw size={18} />
                        <span>Try Reconnecting</span>
                    </button>

                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-4">
                        BDCS — Institutional Management System
                    </p>
                </div>
            </motion.div>


        </div>
    );
}
