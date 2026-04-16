// ============================================
// QuickStatCard - Shared Dashboard Stat Card
// Used across Principal, Admin, HOD, Teacher dashboards
// ============================================

import React from 'react';

/**
 * A premium stat card for dashboards.
 *
 * @param {string}   title     - Label above the number (e.g. "Total Students")
 * @param {number|string} value - The prominently displayed stat number
 * @param {React.ReactNode} icon - Emoji or SVG node for the colored circle
 * @param {string}   color     - Tailwind bg color class (e.g. "bg-blue-500")
 * @param {Function} [onClick] - Optional click handler (navigates to related page)
 * @param {boolean}  [loading] - If true, shows a dash instead of the value
 */
export default function QuickStatCard({ title, value, icon, color, onClick, loading = false }) {
    return (
        <div
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
            className={`bg-white p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between group transition-all duration-300 relative overflow-hidden ${
                onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-95' : 'cursor-default'
            }`}
        >
            {/* Subtle glow effect on hover */}
            <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full ${color.replace('bg-', 'bg-')}/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />

            <div className="relative z-10">
                <p className="text-gray-400 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                        {loading ? (
                            <span className="text-gray-200 animate-pulse">—</span>
                        ) : (
                            value ?? 0
                        )}
                    </h3>
                </div>
            </div>
            
            <div className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-[1rem] sm:rounded-[1.3rem] flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg ring-4 ring-white ${color} ${
                onClick ? 'group-hover:scale-110 group-hover:rotate-6' : ''
            } transition-all duration-300`}>
                {icon}
            </div>
        </div>
    );
}
