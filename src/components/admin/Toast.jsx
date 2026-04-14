// ============================================
// BDCS - Toast Notification Component
// Success/Error/Info toast messages
// ============================================

import React, { useState, useEffect } from 'react';

let toastQueue = [];
let toastSubscribers = [];

// Toast manager for programmatic usage
export const toast = {
    success: (message) => addToast('success', message),
    error: (message) => addToast('error', message),
    info: (message) => addToast('info', message),
    warning: (message) => addToast('warning', message)
};

function addToast(type, message) {
    const id = Date.now() + Math.random();
    const newToast = { id, type, message };

    toastQueue = [...toastQueue, newToast];
    notifySubscribers();

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        removeToast(id);
    }, 5000);
}

function removeToast(id) {
    toastQueue = toastQueue.filter(t => t.id !== id);
    notifySubscribers();
}

function notifySubscribers() {
    toastSubscribers.forEach(callback => callback(toastQueue));
}

// Toast Container Component
export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const subscribe = (newToasts) => {
            setToasts(newToasts);
        };

        toastSubscribers.push(subscribe);

        return () => {
            toastSubscribers = toastSubscribers.filter(s => s !== subscribe);
        };
    }, []);

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }) {
    const variants = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            icon: 'text-green-600',
            text: 'text-green-800',
            iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: 'text-red-600',
            text: 'text-red-800',
            iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            icon: 'text-yellow-600',
            text: 'text-yellow-800',
            iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: 'text-blue-600',
            text: 'text-blue-800',
            iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        }
    };

    const variant = variants[toast.type] || variants.info;

    return (
        <div className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg ${variant.bg} ${variant.border} min-w-[300px] max-w-md animate-slide-in`}>
            <svg className={`w-5 h-5 flex-shrink-0 ${variant.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={variant.iconPath} />
            </svg>
            <p className={`flex-1 text-sm font-medium ${variant.text}`}>
                {toast.message}
            </p>
            <button
                onClick={onClose}
                className={`flex-shrink-0 ${variant.icon} hover:opacity-70`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
