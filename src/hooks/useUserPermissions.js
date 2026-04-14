// ============================================
// BDCS - User Permissions Hook
// Check user permissions for read/write access
// ============================================

import { useMemo } from 'react';

/**
 * Hook to check user permissions based on lifecycle status
 * @param {object} user - User object with status field
 * @returns {object} Permission flags
 */
export function useUserPermissions(user) {
    return useMemo(() => {
        const status = user?.status || 'active';
        const isArchived = ['relieved', 'archived'].includes(status);
        const canWrite = status === 'active';
        const canRead = true; // All users can read their data

        return {
            canWrite,
            canRead,
            isArchived,
            isRelieved: status === 'relieved',
            isActive: status === 'active',
            isInactive: status === 'inactive',
            showReadOnlyBanner: isArchived,
            status
        };
    }, [user?.status]);
}
