// ============================================
// BDCS - Status Badge Component
// Active/Inactive/Other status indicators
// ============================================

import React from 'react';

export default function StatusBadge({ status }) {
    const styles = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-800',
        pending: 'bg-yellow-100 text-yellow-800',
        disabled: 'bg-red-100 text-red-800'
    };

    const labels = {
        active: 'Active',
        inactive: 'Inactive',
        pending: 'Pending',
        disabled: 'Disabled'
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || styles.inactive}`}>
            {labels[status] || status}
        </span>
    );
}
