// ============================================
// BDCS - Common Role Switcher Component
// Allows users with multiple roles to switch between dashboards
// Portal-powered backdrop for full-screen coverage
// ============================================

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoleSwitcher() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    if (userRoles.length <= 1) return null;

    const roleConfig = {
        admin: { label: 'Admin', icon: '🔐', color: 'bg-red-600', path: '/admin' },
        principal: { label: 'Principal', icon: '👔', color: 'bg-blue-600', path: '/principal' },
        hod: { label: 'HOD', icon: '👨‍💼', color: 'bg-purple-600', path: '/hod' },
        teacher: { label: 'Teacher', icon: '👨‍🏫', color: 'bg-green-600', path: '/teacher' },
        student: { label: 'Student', icon: '🎓', color: 'bg-yellow-600', path: '/student' }
    };

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
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${currentRoleConfig?.color || 'bg-gray-600'} text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95`}
            >
                <span className="text-lg">{currentRoleConfig?.icon}</span>
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] uppercase font-black opacity-60">Switch Access</span>
                    <span className="text-sm font-bold tracking-tight">{currentRoleConfig?.label}</span>
                </div>
                <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Portaled Backdrop untuk Full Screen Blur */}
                        {typeof document !== 'undefined' && createPortal(
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[800] bg-gray-900/20 backdrop-blur-md"
                                onClick={() => setIsOpen(false)}
                            />,
                            document.body
                        )}

                        {/* Dropdown Menu */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[850] overflow-hidden"
                        >
                            <div className="px-5 py-3 border-b border-gray-50 mb-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authorized Domains</p>
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
                                        className={`w-full px-5 py-4 text-left flex items-center gap-4 transition-colors ${isCurrent
                                                ? 'bg-gray-50/50 cursor-not-allowed text-gray-400'
                                                : 'hover:bg-red-50 hover:text-red-600 text-gray-600'
                                            }`}
                                    >
                                        <span className="text-2xl opacity-80">{config.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-black tracking-tight">{config.label}</p>
                                            {isCurrent && <p className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Current Session</p>}
                                        </div>
                                        {!isCurrent && (
                                            <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} /></svg>
                                        )}
                                    </button>
                                );
                            })}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
