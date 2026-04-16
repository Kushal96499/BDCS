// ============================================
// BDCS - Premium Confirm Dialog Component
// Modern confirmation prompts with Portals
// ============================================

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false
}) {
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
                        onClick={handleBackdropClick}
                    />

                    {/* Dialog Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            {/* Icon Wrapper */}
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 ${
                                variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                            }`}>
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={
                                        variant === 'danger'
                                        ? "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    } />
                                </svg>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                                <p className="text-sm font-bold text-gray-400 leading-relaxed uppercase tracking-widest text-[10px]">VERIFICATION REQUIRED</p>
                            </div>

                            <p className="text-sm text-gray-600 font-medium">
                                {message}
                            </p>

                            <div className="flex flex-col w-full gap-3 pt-4">
                                <Button
                                    variant={variant === 'danger' ? 'primary' : 'secondary'}
                                    onClick={onConfirm}
                                    loading={loading}
                                    className="w-full h-14 rounded-2xl"
                                >
                                    {confirmText}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="w-full text-gray-400 hover:text-gray-900"
                                >
                                    {cancelText}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
