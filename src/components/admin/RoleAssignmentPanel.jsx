// ============================================
// BDCS - Role Assignment Panel
// Manage multi-role assignments for users
// ============================================

import React, { useState, useEffect } from 'react';
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
            admin: 'bg-purple-100 text-purple-800',
            principal: 'bg-blue-100 text-blue-800',
            hod: 'bg-green-100 text-green-800',
            teacher: 'bg-yellow-100 text-yellow-800',
            student: 'bg-gray-100 text-gray-800'
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
                {role.toUpperCase()}
                {isOriginal && <span className="ml-1 text-xs">(Primary)</span>}
            </span>
        );
    };

    const availableRoles = ['principal', 'hod', 'teacher', 'student'].filter(role => {
        if (!currentUser) return false;
        return canAssignRole(currentUser.primaryRole || currentUser.role, role);
    });

    return (
        <div className="space-y-4">
            {/* Active Roles */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Active Role Assignments</h3>
                    {availableRoles.length > 0 && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-3 py-1 text-xs font-medium text-white bg-biyani-red rounded hover:bg-red-700 transition-colors"
                        >
                            + Assign Role
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
                ) : roles.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">No role assignments</div>
                ) : (
                    <div className="space-y-2">
                        {roles.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div>
                                    {getRoleBadge(assignment.role, assignment.metadata?.isOriginalRole)}
                                    {assignment.scope?.departmentId && (
                                        <span className="ml-2 text-xs text-gray-600">
                                            Dept: {assignment.scope.departmentName || assignment.scope.departmentId}
                                        </span>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                        Assigned {assignment.assignedAt && format(assignment.assignedAt.toDate(), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                {!assignment.metadata?.isOriginalRole && (
                                    <button
                                        onClick={() => handleRevokeRole(assignment.id, assignment.role)}
                                        disabled={loading}
                                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Assignment History */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Assignment History</h3>
                {history.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">No history</div>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {history.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-2 text-xs border-l-2 border-gray-300 pl-3">
                                <div>
                                    {getRoleBadge(assignment.role, false)}
                                    <span className={`ml-2 ${assignment.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                                        {assignment.status}
                                    </span>
                                    {assignment.status === 'revoked' && assignment.revokedAt && (
                                        <span className="ml-2 text-gray-500">
                                            ({format(assignment.revokedAt.toDate(), 'MMM d, yyyy')})
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Role Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Assign New Role</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role
                                </label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red"
                                >
                                    <option value="">Select a role</option>
                                    {availableRoles.map(role => (
                                        <option key={role} value={role}>{role.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            {newRole === 'hod' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Department (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Department ID"
                                        value={scope.departmentId || ''}
                                        onChange={(e) => setScope({ ...scope, departmentId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignRole}
                                    disabled={loading || !newRole}
                                    className="flex-1 px-4 py-2 text-white bg-biyani-red rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Assigning...' : 'Assign Role'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
