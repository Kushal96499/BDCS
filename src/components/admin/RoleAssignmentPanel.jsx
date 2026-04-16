// ============================================
// BDCS - Role Assignment Panel
// Manage multi-role assignments for users
// Portal-powered for reliable screen coverage
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../hooks/useAuth';
import {
    getUserRoles,
    assignRole,
    revokeRole,
    getRoleAssignmentHistory,
    canAssignRole
} from '../../services/roleManagementService';
import { toast } from '../admin/Toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';

export default function RoleAssignmentPanel({ targetUser, onUpdate }) {
    const { user: currentUser } = useAuth();
    const [roles, setRoles] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [scope, setScope] = useState({
        campusId: null,
        collegeId: null,
        departmentId: null
    });

    useEffect(() => {
        if (targetUser?.id) {
            loadData();
        }
    }, [targetUser?.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [userRoles, roleHistory] = await Promise.all([
                getUserRoles(targetUser.id),
                getRoleAssignmentHistory(targetUser.id)
            ]);
            setRoles(userRoles);
            setHistory(roleHistory);
        } catch (error) {
            console.error('Error loading role data:', error);
            toast.error('Failed to load role assignments');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignRole = async () => {
        if (!newRole) {
            toast.error('Please select a role');
            return;
        }

        if (!currentUser) {
            toast.error('User session not found');
            return;
        }

        if (!canAssignRole(currentUser.primaryRole || currentUser.role, newRole)) {
            toast.error(`You cannot assign ${newRole} role`);
            return;
        }

        setLoading(true);
        try {
            await assignRole(targetUser.id, newRole, scope, currentUser);
            toast.success(`${newRole} role assigned successfully`);
            setShowAddModal(false);
            setNewRole('');
            setScope({ campusId: null, collegeId: null, departmentId: null });
            await loadData();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error assigning role:', error);
            toast.error(error.message || 'Failed to assign role');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeRole = async (assignmentId, role) => {
        if (!confirm(`Are you sure you want to revoke ${role} role?`)) {
            return;
        }

        if (!currentUser) {
            toast.error('User session not found');
            return;
        }

        setLoading(true);
        try {
            await revokeRole(assignmentId, currentUser, 'Revoked by admin');
            toast.success(`${role} role revoked successfully`);
            await loadData();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error revoking role:', error);
            toast.error(error.message || 'Failed to revoke role');
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = (role, isOriginal) => {
        const colors = {
            admin: 'bg-red-50 text-red-700 border-red-100',
            principal: 'bg-blue-50 text-blue-700 border-blue-100',
            hod: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            teacher: 'bg-amber-50 text-amber-700 border-amber-100',
            student: 'bg-gray-50 text-gray-700 border-gray-100'
        };
        return (
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${colors[role] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                {role}
                {isOriginal && <span className="ml-1 opacity-50">(Primary)</span>}
            </span>
        );
    };

    const availableRoles = ['principal', 'hod', 'teacher', 'student'].filter(role => {
        if (!currentUser) return false;
        return canAssignRole(currentUser.primaryRole || currentUser.role, role);
    });

    return (
        <div className="space-y-8">
            {/* Active Roles */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Active Tenures</h3>
                    {availableRoles.length > 0 && (
                        <Button
                            variant="primary"
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 text-[10px]"
                        >
                            + Assign New Domain
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl" />)}
                    </div>
                ) : roles.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active role assignments found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {roles.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-gray-200">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        {getRoleBadge(assignment.role, assignment.metadata?.isOriginalRole)}
                                        {assignment.scope?.departmentName && (
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                Dept: {assignment.scope.departmentName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest pl-1">
                                        Enrolled {assignment.assignedAt && format(assignment.assignedAt.toDate(), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                {!assignment.metadata?.isOriginalRole && (
                                    <button
                                        onClick={() => handleRevokeRole(assignment.id, assignment.role)}
                                        disabled={loading}
                                        className="px-4 py-2 text-[10px] font-black text-red-600 hover:text-white hover:bg-red-600 rounded-xl transition-all uppercase tracking-widest border border-red-100"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* History */}
            <div className="pt-6 border-t border-gray-50">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Historical Log</h3>
                {history.length === 0 ? (
                    <p className="text-[10px] font-bold text-gray-300 uppercase pl-1">No historical data available</p>
                ) : (
                    <div className="space-y-4">
                        {history.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-transparent hover:border-gray-100 transition-all group">
                                <div className="flex items-center gap-4">
                                     <div className={`w-2 h-2 rounded-full ${assignment.status === 'active' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                     <div>
                                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{assignment.role}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {assignment.status} {assignment.revokedAt && `• ${format(assignment.revokedAt.toDate(), 'MMM d, yyyy')}`}
                                        </p>
                                     </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Role Modal (Portaled) */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showAddModal && (
                        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                                onClick={() => setShowAddModal(false)}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 overflow-hidden"
                            >
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Assign Domain</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Elevate user privileges</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Rank</label>
                                            <select
                                                value={newRole}
                                                onChange={(e) => setNewRole(e.target.value)}
                                                className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#E31E24] transition-all"
                                            >
                                                <option value="">Operational Roles</option>
                                                {availableRoles.map(role => <option key={role} value={role}>{role.toUpperCase()}</option>)}
                                            </select>
                                        </div>

                                        {newRole === 'hod' && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department Identifier</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. DEPT-CS"
                                                    value={scope.departmentId || ''}
                                                    onChange={(e) => setScope({ ...scope, departmentId: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#E31E24] transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3 pt-4">
                                        <Button
                                            onClick={handleAssignRole}
                                            disabled={loading || !newRole}
                                            className="w-full h-14 rounded-2xl"
                                        >
                                            {loading ? 'Initializing...' : 'Commit Assignment'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowAddModal(false)}
                                            disabled={loading}
                                            className="w-full text-gray-400"
                                        >
                                            Discard
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
