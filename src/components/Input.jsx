// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Input Component - Fixed Layout
// ============================================

import React, { useState, forwardRef } from 'react';

const Input = forwardRef(({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    required = false,
    disabled = false,
    helperText,
    endIcon,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    // Use props.value if controlled, otherwise check if internal value exists
    const hasValue = value && value.length > 0;

    return (
        <div className="w-full">
            <div className="relative pt-1">
                {/* Floating Label */}
                <label
                    className={`
            absolute left-3 px-1 transition-all duration-200 pointer-events-none z-10
            ${isFocused || hasValue || props.defaultValue
                            ? '-top-2 text-xs font-semibold bg-white text-biyani-red'
                            : 'top-3.5 text-gray-500 text-base bg-transparent'
                        }
            ${error ? 'text-red-600' : ''}
          `}
                >
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>

                {/* Input Field */}
                <input
                    ref={ref}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    placeholder={isFocused ? placeholder : ''}
                    className={`
            w-full px-4 py-3 
            text-base text-gray-800
            bg-white bg-opacity-50 backdrop-blur-sm
            border rounded-xl
            transition-all duration-300
            placeholder:text-gray-400
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
            ${error
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                            : isFocused
                                ? 'border-biyani-red focus:border-biyani-red focus:ring-4 focus:ring-red-500/10 shadow-sm'
                                : 'border-gray-300 hover:border-gray-400'
                        }
            outline-none
            ${endIcon ? 'pr-10' : ''}
          `}
                    {...props}
                />

                {/* End Icon */}
                {endIcon && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5 text-gray-400 hover:text-gray-600 cursor-pointer z-20">
                        {endIcon}
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1 animate-slide-in">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
