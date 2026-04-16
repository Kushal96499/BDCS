// ============================================
// BDCS - Premium Custom Select Component
// Replaces native browser selects with a 
// smooth, glassmorphic dropdown.
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Select({
    label,
    name,
    value,
    options = [],
    onChange,
    placeholder = 'Select option',
    error,
    required = false,
    className = '',
    id
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    
    // Generate a unique ID for accessibility if not provided
    const selectId = id || `select-${name}-${Math.random().toString(36).substr(2, 9)}`;
    const labelId = `label-${selectId}`;

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (val) => {
        onChange({ target: { name, value: val } });
        setIsOpen(false);
    };

    return (
        <div className={`w-full space-y-1.5 ${className}`} ref={containerRef}>
            {label && (
                <label 
                    id={labelId}
                    htmlFor={selectId}
                    className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {label} {required && <span className="text-[#E31E24]">*</span>}
                </label>
            )}

            <div className="relative">
                {/* Trigger Button */}
                <button
                    id={selectId}
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-labelledby={labelId}
                    className={`
                        w-full flex items-center justify-between
                        px-5 py-3.5 text-sm font-semibold
                        bg-gray-50/50 hover:bg-white rounded-2xl
                        border transition-all duration-300
                        ${error 
                            ? 'border-red-200 focus:ring-4 focus:ring-red-500/5' 
                            : isOpen 
                                ? 'border-[#E31E24] bg-white ring-4 ring-red-500/5 shadow-sm' 
                                : 'border-gray-100'
                        }
                    `}
                >
                    <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <motion.svg 
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        className={`w-4 h-4 transition-colors ${isOpen ? 'text-[#E31E24]' : 'text-gray-400'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 5, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute z-[100] w-full bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden py-1.5"
                        >
                            <div 
                                className="max-h-60 overflow-y-auto no-scrollbar"
                                role="listbox"
                                aria-labelledby={labelId}
                            >
                                {options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="option"
                                        aria-selected={opt.value === value}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`
                                            w-full flex items-center justify-between
                                            px-4 py-3 text-sm transition-all
                                            ${opt.value === value 
                                                ? 'bg-red-50 text-[#E31E24] font-bold' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-semibold'
                                            }
                                        `}
                                    >
                                        <span>{opt.label}</span>
                                        {opt.value === value && (
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                                {options.length === 0 && (
                                    <div className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
                                        No options available
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 ml-1"
                    >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
