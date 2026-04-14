// ============================================
// BDCS - Role Selection Page
// Shown after login when user has multiple roles
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { switchActiveRole } from '../services/roleManagementService';

const ROLE_CONFIG = {
    admin: {
        label: 'Admin Panel',
        description: 'System-wide administration & configuration',
        path: '/admin',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        ),
        color: '#7C3AED'
    },
    director: {
        label: 'Director Panel',
        description: 'Institutional oversight & governance',
        path: '/director',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        ),
        color: '#4F46E5'
    },
    principal: {
        label: 'Principal Panel',
        description: 'College management & executive control',
        path: '/principal',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
        ),
        color: '#2563EB'
    },
    hod: {
        label: 'HOD Panel',
        description: 'Department management & faculty oversight',
        path: '/hod',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        ),
        color: '#059669'
    },
    teacher: {
        label: 'Teacher Panel',
        description: 'Classes, attendance & student management',
        path: '/teacher',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        ),
        color: '#D97706'
    },
    student: {
        label: 'Student Panel',
        description: 'Academics, attendance & results',
        path: '/student',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        ),
        color: '#6B7280'
    }
};

export default function RoleSelectionPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [switching, setSwitching] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);

    // Get roles from navigation state (passed from Login) or from user object
    const rolesFromState = location.state?.roles;
    const userRoles = rolesFromState || user?.roles || (user?.role ? [user.role] : []);

    // If not logged in, redirect to login
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true });
        }
    }, [user, loading, navigate]);

    // If user has only 1 role, skip this page
    useEffect(() => {
        if (!loading && user && userRoles.length <= 1) {
            const role = userRoles[0] || user?.role || 'student';
            const config = ROLE_CONFIG[role];
            navigate(config?.path || '/', { replace: true });
        }
    }, [user, loading, userRoles, navigate]);

    const handleRoleSelect = async (role) => {
        if (switching) return;
        setSwitching(true);
        setSelectedRole(role);

        try {
            // 1. Update Firestore currentActiveRole
            await switchActiveRole(user.uid, role);

            // 2. Store in sessionStorage as fallback
            sessionStorage.setItem('bdcs_activeRole', role);

            // 3. Navigate to that role's dashboard
            const config = ROLE_CONFIG[role];
            window.location.href = config?.path || '/';
        } catch (error) {
            console.error('Error selecting role:', error);
            setSwitching(false);
            setSelectedRole(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E31E24]" />
            </div>
        );
    }

    // Sort roles by priority
    const rolePriority = ['admin', 'director', 'principal', 'hod', 'teacher', 'student'];
    const sortedRoles = [...userRoles]
        .filter(r => ROLE_CONFIG[r])
        .sort((a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
            {/* Background accents */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#E31E24]" />

            <div className="w-full max-w-lg">
                {/* Logo + Greeting */}
                <div className="text-center mb-8">
                    <img
                        src="/assets/biyani-logo.png"
                        alt="BDCS"
                        className="w-16 h-16 mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Welcome, {user?.name?.split(' ')[0] || 'User'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Select a panel to continue
                    </p>
                </div>

                {/* Role Cards */}
                <div className="space-y-3">
                    {sortedRoles.map(role => {
                        const config = ROLE_CONFIG[role];
                        if (!config) return null;

                        const isSelected = selectedRole === role;
                        const isPrimary = role === (user?.primaryRole || user?.role);

                        return (
                            <button
                                key={role}
                                onClick={() => handleRoleSelect(role)}
                                disabled={switching}
                                className={`w-full flex items-center gap-4 p-4 bg-white rounded-xl border-2 transition-all duration-200 text-left group
                                    ${isSelected
                                        ? 'border-[#E31E24] shadow-lg shadow-red-100 scale-[0.98]'
                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                    }
                                    ${switching && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: config.color + '12', color: config.color }}
                                >
                                    {isSelected ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: config.color }} />
                                    ) : (
                                        config.icon
                                    )}
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-gray-900">{config.label}</p>
                                        {isPrimary && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                                Primary
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                                </div>

                                {/* Arrow */}
                                <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    Biyani Digital Campus System
                </p>
            </div>
        </div>
    );
}
