// ============================================
// BDCS - Premium Form Modal Component
// Reusable modal with glassmorphism & mobile bottom-sheet behavior
// Portal-powered to ensure full-screen coverage
// ============================================

import React from 'react';
import { createPortal } from 'react-dom';
import Button from '../Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../../hooks/useScrollLock';

export default function FormModal({
    isOpen,
    onClose,
    title,
    children,
    onSubmit,
    submitText = 'Save Changes',
    loading = false,
    size = 'md' // sm, md, lg, xl
}) {
    useScrollLock(isOpen);

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit();
        }
    };

    // Render nothing on server-side or if not open (though AnimatePresence handles the latter)
    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
                        onClick={handleBackdropClick}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ y: 20, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className={`relative bg-white w-full ${sizeClasses[size]} sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
                    >
                        {/* Mobile Handle */}
                        <div className="sm:hidden flex justify-center py-4 shrink-0">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-4 sm:pt-8 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                                <div className="h-1 w-12 bg-[#E31E24] rounded-full mt-1" />
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all shrink-0"
                                disabled={loading}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                            <div className="px-8 py-6 overflow-y-auto flex-1 pb-10 custom-scrollbar overscroll-contain">
                                {children}
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-6 mb-safe bg-gray-50/50 border-t border-gray-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="w-full sm:w-auto order-2 sm:order-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={loading}
                                    className="w-full sm:w-auto order-1 sm:order-2"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        submitText
                                    )}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
