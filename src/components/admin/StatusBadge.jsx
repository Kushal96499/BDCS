// ============================================
// BDCS - Premium Status Badge Component
// Highly legible, minimal status indicators
// ============================================

import React from 'react';

export default function StatusBadge({ status }) {
    const statusLower = status?.toLowerCase() || 'inactive';
    
    const styles = {
        active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        inactive: 'bg-gray-50 text-gray-400 border-gray-100',
        pending: 'bg-amber-50 text-amber-600 border-amber-100',
        disabled: 'bg-red-50 text-red-600 border-red-100',
        relieved: 'bg-orange-50 text-orange-600 border-orange-100',
        archived: 'bg-slate-50 text-slate-500 border-slate-200'
    };

    const dots = {
        active: 'bg-emerald-500',
        inactive: 'bg-gray-300',
        pending: 'bg-amber-500',
        disabled: 'bg-red-500',
        relieved: 'bg-orange-500',
        archived: 'bg-slate-400'
    };

    const currentStyle = styles[statusLower] || styles.inactive;
    const currentDot = dots[statusLower] || dots.inactive;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />
            {statusLower}
        </span>
    );
}
