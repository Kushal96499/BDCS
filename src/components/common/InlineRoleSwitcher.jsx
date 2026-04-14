import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { switchActiveRole } from '../../services/roleManagementService';

export default function InlineRoleSwitcher({ sidebarOpen = true }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [switching, setSwitching] = useState(false);

    // Get user's roles - handle both single role and multi-role formats
    let userRoles = [];

    // Check roles array (multi-role format)
    if (user?.roles && Array.isArray(user.roles)) {
        userRoles = [...user.roles];
    }

    // Also check single role field (for backwards compatibility)
    if (user?.role && !userRoles.includes(user.role)) {
        userRoles.push(user.role);
    }

    // Only show if user has multiple roles
    if (userRoles.length <= 1) return null;

    // Define role configurations with display order
    const roleConfig = {
        admin: {
            label: 'Admin',
            path: '/admin',
            color: 'text-red-600',
            order: 1
        },
        principal: {
            label: 'Principal',
            path: '/principal',
            color: 'text-blue-600',
            order: 2
        },
        hod: {
            label: 'HOD',
            path: '/hod',
            color: 'text-purple-600',
            order: 3
        },
        teacher: {
            label: 'Teacher',
            path: '/teacher',
            color: 'text-green-600',
            order: 4
        },
        student: {
            label: 'Student',
            path: '/student',
            color: 'text-yellow-600',
            order: 5
        }
    };

    // Get current role from path
    const getCurrentRole = () => {
        const path = location.pathname;
        if (path.includes('/admin')) return 'admin';
        if (path.includes('/principal')) return 'principal';
        if (path.includes('/hod')) return 'hod';
        if (path.includes('/teacher')) return 'teacher';
        if (path.includes('/student')) return 'student';
        return userRoles[0];
    };

    const currentRole = getCurrentRole();

    const handleRoleSwitch = async (role) => {
        const config = roleConfig[role];
        if (!config || role === currentRole || switching) return;

        setSwitching(true);
        try {
            // 1. Update Firestore
            await switchActiveRole(user.uid, role);
            // 2. Sync sessionStorage
            sessionStorage.setItem('bdcs_activeRole', role);
            // 3. Navigate
            window.location.href = config.path;
        } catch (error) {
            console.error('Role switch failed:', error);
            setSwitching(false);
        }
    };

    // Sort roles by order for consistent display
    const sortedUserRoles = userRoles
        .filter(role => roleConfig[role]) // Only include valid roles
        .sort((a, b) => (roleConfig[a]?.order || 999) - (roleConfig[b]?.order || 999));

    // Sidebar expanded view
    if (sidebarOpen) {
        return (
            <div className="mx-2 mb-6 p-1 bg-gray-100 rounded-lg flex gap-1">
                {sortedUserRoles.map(role => {
                    const config = roleConfig[role];
                    if (!config) return null;

                    const isActive = role === currentRole;

                    return (
                        <button
                            key={role}
                            onClick={() => handleRoleSwitch(role)}
                            className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${isActive
                                ? 'bg-white shadow-sm ' + config.color
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {config.label}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Sidebar collapsed view - circular icon
    return (
        <div
            onClick={() => {
                // Cycle through roles
                const currentIndex = sortedUserRoles.indexOf(currentRole);
                const nextRole = sortedUserRoles[(currentIndex + 1) % sortedUserRoles.length];
                handleRoleSwitch(nextRole);
            }}
            className="mx-auto mb-4 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 hover:text-gray-600 transition-colors"
            title="Switch Role"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
        </div>
    );
}
