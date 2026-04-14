import React from 'react';

export default function StatusPill({ status, type = 'default' }) {
    // Map status strings to standardized types if needed
    const getStatusType = (s) => {
        if (!s) return 'default';
        const lower = s.toLowerCase();
        if (['active', 'approved', 'present', 'completed'].includes(lower)) return 'success';
        if (['pending', 'review', 'warning', 'late'].includes(lower)) return 'warning';
        if (['inactive', 'locked', 'rejected', 'absent', 'critical'].includes(lower)) return 'danger';
        if (['hod', 'admin', 'principal'].includes(lower)) return 'info';
        return 'default';
    };

    const finalType = type === 'default' ? getStatusType(status) : type;

    const styles = {
        success: 'bg-green-100 text-green-700 ring-green-600/20',
        warning: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
        danger: 'bg-red-100 text-red-700 ring-red-600/10',
        info: 'bg-purple-100 text-purple-700 ring-purple-600/20',
        default: 'bg-gray-100 text-gray-700 ring-gray-500/10'
    };

    return (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[finalType]}`}>
            {status}
        </span>
    );
}
