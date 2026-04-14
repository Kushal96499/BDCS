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
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
            className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
                }`}
        >
            <div>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                    {loading ? (
                        <span className="text-gray-300 animate-pulse">—</span>
                    ) : (
                        value ?? 0
                    )}
                </h3>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-lg ${color} ${onClick ? 'group-hover:scale-110' : ''} transition-transform`}>
                {icon}
            </div>
        </div>
    );
}
