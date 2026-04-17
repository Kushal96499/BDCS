// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Premium Input Component
// ============================================

import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Input = forwardRef(({
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    required = false,
    disabled = false,
    helperText,
    endIcon,
    autoComplete,
    id,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    
    // Generate a unique ID for accessibility if not provided
    const inputId = id || `input-${name}-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label 
                    htmlFor={inputId}
                    className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1 cursor-pointer"
                >
                    {label} {required && <span className="text-[#E31E24]">*</span>}
                </label>
            )}
            
            <div className="relative group">
                <input
                    ref={ref}
                    id={inputId}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className={`
                        w-full px-5 py-3.5
                        text-sm font-semibold text-gray-900
                        bg-gray-50/50 hover:bg-white
                        border rounded-2xl
                        transition-all duration-300
                        placeholder:text-gray-300 placeholder:font-medium
                        disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                        outline-none
                        ${error
                            ? 'border-red-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 shadow-[0_0_0_1px_rgba(239,68,68,0.1)]'
                            : isFocused 
                                ? 'border-[#E31E24] bg-white ring-4 ring-red-500/5 shadow-sm' 
                                : 'border-gray-100'
                        }
                        ${endIcon ? 'pr-12' : ''}
                    `}
                    {...props}
                />

                {/* End Icon */}
                {endIcon && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-600 transition-colors z-10">
                        {endIcon}
                    </div>
                )}
            </div>

            {/* Error or Helper Text */}
            <AnimatePresence mode="wait">
                {error ? (
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
                ) : helperText ? (
                    <p className="text-[10px] font-bold text-gray-400 ml-1 uppercase tracking-tight">
                        {helperText}
                    </p>
                ) : null}
            </AnimatePresence>
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
