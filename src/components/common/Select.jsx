// ============================================
// BDCS - Premium Select Component
// Stylized standard select for consistent aesthetics
// ============================================

import React from 'react';

export default function Select({ 
    label, 
    value, 
    onChange, 
    options = [], 
    className = "", 
    placeholder,
    containerClassName = ""
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
            {label && (
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <select
                    value={value}
                    onChange={onChange}
                    className={`
                        w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl 
                        text-sm font-black text-gray-900 appearance-none
                        focus:bg-white focus:border-[#E31E24] focus:ring-4 focus:ring-red-50
                        transition-all outline-none cursor-pointer
                        hover:bg-white hover:border-gray-200
                        ${className}
                    `}
                >
                    {placeholder && <option value="" disabled>{placeholder}</option>}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="font-bold py-2">
                            {opt.label}
                        </option>
                    ))}
                </select>
                
                {/* Custom Arrow */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300 group-hover:text-[#E31E24] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
