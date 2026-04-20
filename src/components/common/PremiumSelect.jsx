import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PremiumSelect - A BDCS "Neo-Campus" Custom Dropdown
 * High craft, glassmorphic, and smooth.
 */
export default function PremiumSelect({ 
    label, 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select Option",
    icon,
    className = "",
    error,
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const selectedOption = options.find(opt => opt.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        if (disabled) return;
        onChange({ target: { value: val } });
        setIsOpen(false);
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">
                    {label}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between px-6 py-4 rounded-2xl
                        bg-white border border-gray-100 shadow-sm
                        transition-all duration-300 outline-none
                        ${isOpen ? 'ring-4 ring-gray-50 border-gray-300 scale-[1.01]' : 'hover:border-gray-200 hover:bg-gray-50/50'}
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
                        ${error ? 'border-red-300 ring-red-50' : ''}
                    `}
                >
                    <div className="flex items-center gap-3">
                        {icon && <div className={`w-5 h-5 ${isOpen ? 'text-gray-900' : 'text-gray-400'} transition-colors`}>{icon}</div>}
                        <span className={`text-sm font-black tracking-tight ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>

                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        className="text-gray-300"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </motion.div>
                </button>

                <AnimatePresence>
                    {isOpen && !disabled && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeOut" }}
                            className="absolute z-[100] w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden py-2"
                        >
                            <div className="max-h-60 overflow-y-auto no-scrollbar">
                                {options.length > 0 ? (
                                    options.map((opt, idx) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleSelect(opt.value)}
                                            className={`
                                                w-full flex items-center gap-3 px-5 py-3 text-left transition-all
                                                ${value === opt.value ? 'bg-gray-50 text-gray-900 font-black' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                                            `}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full transition-all ${value === opt.value ? 'bg-red-500' : 'bg-transparent'}`} />
                                            <span className="text-xs font-bold tracking-tight">
                                                {opt.label}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
                                        No Options Available
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && (
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-2 mt-1">
                    {error}
                </p>
            )}
        </div>
    );
}
