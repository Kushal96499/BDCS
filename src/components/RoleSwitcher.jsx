// ============================================
// BDCS - Premium Role Switcher Component
// UI for switching between multiple assigned roles
// Portal-powered backdrop for full-screen coverage
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserRoles, switchActiveRole } from '../services/roleManagementService';
import { toast } from './admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';

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
            const validUserRoles = (user.roles || [user.role]);
            const filteredUserRoles = userRoles.filter(r => validUserRoles.includes(r.role));
            const assignedRoleNames = new Set(filteredUserRoles.map(r => r.role));
            const missingRoles = validUserRoles.filter(r => r && !assignedRoleNames.has(r));

            const virtualRoles = missingRoles.map(role => ({
                id: `virtual_${role}`,
                role: role,
                userId: user.uid,
                status: 'active',
                scope: {},
                metadata: { isOriginalRole: role === (user.primaryRole || user.role) }
            }));

            setRoles([...filteredUserRoles, ...virtualRoles]);
        } catch (error) {
            console.error('Error loading roles:', error);
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
            if (refreshUser) await refreshUser();
            toast.success(`Access level changed to ${getRoleLabel(targetRole)}`);
            setIsOpen(false);
            sessionStorage.setItem('bdcs_activeRole', targetRole);
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
            toast.error('Privilege escalation failed');
        } finally {
            setSwitching(false);
        }
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Global Admin',
            director: 'Executive Director',
            principal: 'Campus Principal',
            hod: 'Dept. Chair',
            teacher: 'Faculty Member',
            student: 'Enrolled Student'
        };
        return labels[role] || role;
    };

    const getRoleStyles = (role) => {
        const styles = {
            admin: 'bg-red-50 text-[#E31E24] border-red-100',
            director: 'bg-indigo-50 text-indigo-700 border-indigo-100',
            principal: 'bg-blue-50 text-blue-700 border-blue-100',
            hod: 'bg-emerald-50 text-emerald-700 border-emerald-100'
        };
        return styles[role] || 'bg-gray-50 text-gray-500 border-gray-100';
    };

    if (!roles || roles.length <= 1) return null;

    const currentRole = user.currentActiveRole || user.primaryRole || user.role;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md hover:border-gray-200 active:scale-95 disabled:opacity-50 ${switching ? 'cursor-wait' : ''}`}
                disabled={switching}
            >
                <div className={`w-2.5 h-2.5 rounded-full ${currentRole === 'admin' ? 'bg-[#E31E24] shadow-[0_0_10px_rgba(227,30,36,0.3)]' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                    {getRoleLabel(currentRole)}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
                                className="fixed inset-0 z-[800] bg-gray-900/10 backdrop-blur-md"
                                onClick={() => setIsOpen(false)}
                            />,
                            document.body
                        )}

                        {/* Dropdown Panel remains absolute to button but above portal-backdrop z-index */}
                        <motion.div
                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 15, scale: 0.95 }}
                            className="absolute right-0 mt-4 w-80 bg-white rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-gray-100 z-[850] overflow-hidden"
                        >
                            <div className="p-4">
                                <div className="px-4 py-4 mb-3 flex items-center justify-between border-b border-gray-50">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Tenures</span>
                                    {switching && <div className="w-4 h-4 border-2 border-[#E31E24]/30 border-t-[#E31E24] rounded-full animate-spin" />}
                                </div>
                                
                                <div className="space-y-2">
                                    {roles.map((roleAssignment) => {
                                        const isActive = roleAssignment.role === currentRole;
                                        const styles = getRoleStyles(roleAssignment.role);
                                        
                                        return (
                                            <button
                                                key={roleAssignment.id}
                                                onClick={() => handleRoleSwitch(roleAssignment.role)}
                                                disabled={switching || isActive}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all relative group
                                                    ${isActive ? styles : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                                            >
                                                <div className="flex flex-col items-start text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold tracking-tight ${isActive ? 'font-black' : ''}`}>
                                                            {getRoleLabel(roleAssignment.role)}
                                                        </span>
                                                        {roleAssignment.metadata?.isOriginalRole && (
                                                            <span className="text-[8px] px-1.5 py-0.5 bg-white/50 rounded-lg font-black uppercase tracking-tighter border border-current opacity-50">
                                                                Root
                                                            </span>
                                                        )}
                                                    </div>
                                                    {roleAssignment.scope?.departmentName && (
                                                        <span className={`text-[9px] font-bold mt-0.5 opacity-60 uppercase tracking-tighter`}>
                                                            {roleAssignment.scope.departmentName}
                                                        </span>
                                                    )}
                                                </div>
                                                {isActive && (
                                                    <div className="w-5 h-5 flex items-center justify-center">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
