import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Optionally inject a global style to disable forms while offline
    useEffect(() => {
        if (isOffline) {
            document.body.classList.add('offline-mode');
        } else {
            document.body.classList.remove('offline-mode');
        }
    }, [isOffline]);

    return (
        <>
            {isOffline && (
                <style dangerouslySetInnerHTML={{__html: `
                    .offline-mode form button[type="submit"],
                    .offline-mode .prevent-offline-click {
                        opacity: 0.6;
                        pointer-events: none;
                        cursor: not-allowed;
                    }
                `}} />
            )}
            
            <AnimatePresence>
                {isOffline && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 20, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none select-none"
                    >
                        <div className="bg-orange-600/90 backdrop-blur-xl text-white px-5 py-2.5 rounded-full shadow-[0_10px_30px_rgba(234,88,12,0.3)] flex items-center gap-3 border border-orange-500/30">
                            <WifiOff size={14} className="animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap">
                                Working Offline
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
