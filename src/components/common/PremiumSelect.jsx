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
    const selectedOption = options.find(opt => String(opt.value) === String(value));

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
        <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                    {label}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        console.log(`Opening Select [${label || 'No Label'}]:`, options);
                        setIsOpen(!isOpen);
                    }}
                    className={`
                        w-full flex items-center justify-between px-6 py-3.5 rounded-[1.25rem] md:rounded-[1.5rem]
                        bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]
                        transition-all duration-500 outline-none
                        ${isOpen ? 'ring-4 ring-slate-50 border-slate-300 scale-[1.01]' : 'hover:border-slate-200 hover:bg-slate-50/50'}
                        ${disabled ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}
                        ${error ? 'border-red-300 ring-red-50' : ''}
                    `}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {icon && <div className={`w-4 h-4 shrink-0 ${isOpen ? 'text-slate-900' : 'text-slate-400'} transition-colors`}>{icon}</div>}
                        <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest truncate ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>

                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        className="text-slate-300 shrink-0 ml-2"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </motion.div>
                </button>

                <AnimatePresence>
                    {isOpen && !disabled && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            className="absolute z-[100] w-full mt-2 bg-white/95 backdrop-blur-3xl border border-slate-100 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden py-3"
                        >
                            <div className="max-h-64 overflow-y-auto no-scrollbar scroll-smooth">
                                {options.length > 0 ? (
                                    options.map((opt, idx) => {
                                        const isActive = String(value) === String(opt.value);
                                        return (
                                            <button
                                                key={opt.value || idx}
                                                type="button"
                                                onClick={() => handleSelect(opt.value)}
                                                className={`
                                                    w-full flex items-center gap-4 px-6 py-4 text-left transition-all duration-300 min-h-[50px]
                                                    ${isActive ? 'bg-slate-900 text-white font-black' : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}
                                                `}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isActive ? 'bg-red-500 scale-125' : 'bg-slate-200'}`} />
                                                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none">
                                                    {opt.label || opt.value || 'Unnamed Segment'}
                                                </span>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="px-6 py-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] text-center">
                                        Empty Sector
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
