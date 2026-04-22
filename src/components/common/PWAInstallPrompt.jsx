import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PWA Install Prompt — Minimalist Slim Design
 * - Non-intrusive horizontal pill
 * - Clean typography and branding
 * - Professional institutional look
 */
export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            const lastDismissed = localStorage.getItem('pwaPromptLastDismissed');
            const now = new Date().getTime();
            if (!lastDismissed || (now - parseInt(lastDismissed)) > (24 * 60 * 60 * 1000)) {
                setTimeout(() => setShowPrompt(true), 3000);
            }
        };

        const handleAppInstalled = () => {
            setShowPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowPrompt(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwaPromptLastDismissed', new Date().getTime().toString());
    };

    if (!showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-[360px] z-[9999]"
            >
                <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-3 pr-4 flex items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-50 flex items-center justify-center p-1.5 shrink-0">
                            <img src="/assets/biyani-logo.png" alt="BDCS" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-wider leading-none">BDCS Mobile</h3>
                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest truncate">Official Campus App</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                        >
                            Get App
                        </button>
                        <button 
                            onClick={handleDismiss}
                            className="p-2 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
