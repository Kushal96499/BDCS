// ============================================
// BDCS - Role Switcher Component
// Allows users with multiple roles to switch between dashboards
// ============================================

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function RoleSwitcher() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    // Get user's roles
    const userRoles = user?.roles || (user?.role ? [user.role] : []);

    // Only show if user has multiple roles
    if (userRoles.length <= 1) return null;

    // Define role configurations
    const roleConfig = {
        admin: {
            label: 'Admin',
            icon: '🔐',
            color: 'bg-red-600 hover:bg-red-700',
            path: '/admin/dashboard'
        },
        principal: {
            label: 'Principal',
            icon: '👔',
            color: 'bg-blue-600 hover:bg-blue-700',
            path: '/principal/dashboard'
        },
        hod: {
            label: 'HOD',
            icon: '👨‍💼',
            color: 'bg-purple-600 hover:bg-purple-700',
            path: '/hod/dashboard'
        },
        teacher: {
            label: 'Teacher',
            icon: '👨‍🏫',
            color: 'bg-green-600 hover:bg-green-700',
            path: '/teacher/dashboard'
        },
        student: {
            label: 'Student',
            icon: '🎓',
            color: 'bg-yellow-600 hover:bg-yellow-700',
            path: '/student/dashboard'
        }
    };

    // Get current role from path
    const getCurrentRole = () => {
        const path = window.location.pathname;
        if (path.includes('/admin')) return 'admin';
        if (path.includes('/principal')) return 'principal';
        if (path.includes('/hod')) return 'hod';
        if (path.includes('/teacher')) return 'teacher';
        if (path.includes('/student')) return 'student';
        return userRoles[0];
    };

    const currentRole = getCurrentRole();
    const currentRoleConfig = roleConfig[currentRole];

    const handleRoleSwitch = (role) => {
        const config = roleConfig[role];
        if (config) {
            navigate(config.path);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            {/* Current Role Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${currentRoleConfig?.color} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:shadow-xl`}
                title="Switch Role"
            >
                <span className="text-lg">{currentRoleConfig?.icon}</span>
                <div className="flex flex-col items-start">
                    <span className="text-xs opacity-80">Switch Role</span>
                    <span className="text-sm font-semibold">{currentRoleConfig?.label}</span>
                </div>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Overlay to close dropdown */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                        <div className="px-4 py-2 border-b border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Your Roles</p>
                        </div>
                        {userRoles.map(role => {
                            const config = roleConfig[role];
                            if (!config) return null;

                            const isCurrent = role === currentRole;

                            return (
                                <button
                                    key={role}
                                    onClick={() => handleRoleSwitch(role)}
                                    disabled={isCurrent}
                                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${isCurrent
                                            ? 'bg-gray-100 cursor-not-allowed'
                                            : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="text-2xl">{config.icon}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900">{config.label}</p>
                                        {isCurrent && (
                                            <p className="text-xs text-green-600 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Current
                                            </p>
                                        )}
                                    </div>
                                    {!isCurrent && (
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
