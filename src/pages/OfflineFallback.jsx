import React from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const OfflineFallback = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 max-w-md w-full"
            >
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100">
                    <WifiOff className="w-10 h-10 text-[#E31E24]" />
                </div>
                
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none">
                    You're Offline<span className="text-[#E31E24]">.</span>
                </h1>
                
                <p className="text-slate-500 font-medium text-lg leading-relaxed mb-10">
                    It looks like your connection is down. Don't worry, you can still view previously loaded content.
                </p>
                
                <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-5 rounded-2xl bg-slate-950 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-[#E31E24] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                >
                    <RotateCcw className="w-4 h-4" /> Try Again
                </button>
                
                <p className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    Biyani Digital Campus System
                </p>
            </motion.div>
        </div>
    );
};

export default OfflineFallback;
