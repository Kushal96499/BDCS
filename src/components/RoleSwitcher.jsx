// ============================================
// BDCS - Role Switcher Component
// UI for switching between multiple assigned roles
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserRoles, switchActiveRole } from '../services/roleManagementService';
import { toast } from './admin/Toast';

export default function RoleSwitcher() {
    const { user, refreshUser } = useAuth();
    const [roles, setRoles] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            loadRoles();
        }
    }, [user?.uid]);

    const loadRoles = async () => {
        try {
            const userRoles = await getUserRoles(user.uid);

            // Verify against user.roles to ensure we don't show stale/revoked roles
            const validUserRoles = (user.roles || [user.role]);
            const filteredUserRoles = userRoles.filter(r => validUserRoles.includes(r.role));

            // robustness: If roleAssignments is missing some roles that are in user.roles, add them virtually
            const assignedRoleNames = new Set(filteredUserRoles.map(r => r.role));
            const missingRoles = validUserRoles.filter(r => r && !assignedRoleNames.has(r));

            const virtualRoles = missingRoles.map(role => ({
                id: `virtual_${role}`,
                role: role,
                userId: user.uid,
                status: 'active',
                scope: {}, // Default empty scope
                metadata: { isOriginalRole: role === (user.primaryRole || user.role) }
            }));

            setRoles([...filteredUserRoles, ...virtualRoles]);
        } catch (error) {
            console.error('Error loading roles:', error);
            // Fallback to user.roles if service fails
            const fallbackRoles = (user.roles || [user.role]).map(role => ({
                id: `fallback_${role}`,
                role: role,
                userId: user.uid,
                status: 'active',
                scope: {},
                metadata: {}
            }));
            setRoles(fallbackRoles);
        }
    };

    const handleRoleSwitch = async (targetRole) => {
        if (targetRole === (user.currentActiveRole || user.primaryRole || user.role)) {
            setIsOpen(false);
            return;
        }

        setSwitching(true);
        try {
            await switchActiveRole(user.uid, targetRole);

            // Refresh user data
            if (refreshUser) {
                await refreshUser();
            }

            toast.success(`Switched to ${getRoleLabel(targetRole)} view`);
            setIsOpen(false);

            // Sync sessionStorage
            sessionStorage.setItem('bdcs_activeRole', targetRole);

            // navigate to the target role's dashboard
            const rolePaths = {
                admin: '/admin',
                director: '/director',
                principal: '/principal',
                hod: '/hod',
                teacher: '/teacher',
                student: '/student'
            };

            window.location.href = rolePaths[targetRole] || '/';
        } catch (error) {
            console.error('Error switching role:', error);
            toast.error('Failed to switch role');
        } finally {
            setSwitching(false);
        }
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Admin',
            director: 'Director',
            principal: 'Principal',
            hod: 'Head of Department',
            teacher: 'Teacher',
            student: 'Student'
        };
        return labels[role] || role;
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            admin: 'bg-purple-100 text-purple-800 border-purple-200',
            director: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            principal: 'bg-blue-100 text-blue-800 border-blue-200',
            hod: 'bg-green-100 text-green-800 border-green-200',
            teacher: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            student: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    // Only show if user has multiple roles
    if (!roles || roles.length <= 1) {
        return null;
    }

    const currentRole = user.currentActiveRole || user.primaryRole || user.role;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${getRoleBadgeColor(currentRole)} hover:opacity-80`}
                disabled={switching}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{getRoleLabel(currentRole)}</span>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-40 animate-fade-in">
                        <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Switch Role
                            </div>
                            {roles.map((roleAssignment) => {
                                const isActive = roleAssignment.role === currentRole;
                                return (
                                    <button
                                        key={roleAssignment.id}
                                        onClick={() => handleRoleSwitch(roleAssignment.role)}
                                        disabled={switching || isActive}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${isActive
                                            ? 'bg-biyani-red text-white cursor-default'
                                            : 'text-gray-700 hover:bg-gray-100 disabled:opacity-50'
                                            }`}
                                    >
                                        <div className="flex flex-col items-start text-left">
                                            <div className="flex items-center gap-2">
                                                <span>{getRoleLabel(roleAssignment.role)}</span>
                                                {roleAssignment.metadata?.isOriginalRole && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                            {roleAssignment.scope?.departmentName && (
                                                <span className={`text-xs ${isActive ? 'text-red-100' : 'text-gray-500'}`}>
                                                    {roleAssignment.scope.departmentName}
                                                </span>
                                            )}
                                        </div>
                                        {isActive && (
                                            <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
