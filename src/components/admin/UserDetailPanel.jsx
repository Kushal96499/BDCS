// ============================================
// BDCS - User Detail Panel Component
// Modern slide-out panel with tabs for user details
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import RoleHistory from './RoleHistory';
import StatusTimeline from './StatusTimeline';
import ConfirmDialog from './ConfirmDialog';
import { toast } from './Toast';
import { logDelete } from '../../utils/auditLogger';
import { validateUserDeletion } from '../../utils/userValidation';
import RoleAssignmentPanel from './RoleAssignmentPanel';

export default function UserDetailPanel({ user: targetUser, onClose, onUserDeleted, onUserUpdated }) {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [auditLogs, setAuditLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [validatingDelete, setValidatingDelete] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [showValidationDialog, setShowValidationDialog] = useState(false);
    const [overrideMode, setOverrideMode] = useState(false);

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchUserAuditLogs();
        }
    }, [activeTab, targetUser?.id]);

    const fetchUserAuditLogs = async () => {
        if (!targetUser?.id) return;

        try {
            setLogsLoading(true);

            // Fetch logs where this user is the SUBJECT (documentId)
            const subjectQuery = query(
                collection(db, 'auditLogs'),
                where('documentId', '==', targetUser.id),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            // Fetch logs where this user PERFORMED the action (performedBy)
            const performerQuery = query(
                collection(db, 'auditLogs'),
                where('performedBy', '==', targetUser.id),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const [subjectSnapshot, performerSnapshot] = await Promise.all([
                getDocs(subjectQuery),
                getDocs(performerQuery)
            ]);

            // Combine both sets of logs
            const subjectLogs = subjectSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                logType: 'subject' // This user was affected
            }));

            const performerLogs = performerSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                logType: 'performer' // This user did the action
            }));

            // Merge and remove duplicates (in case user performed action on themselves)
            const allLogs = [...subjectLogs, ...performerLogs];
            const uniqueLogs = Array.from(
                new Map(allLogs.map(log => [log.id, log])).values()
            );

            // Sort by timestamp descending and limit to 30
            uniqueLogs.sort((a, b) => {
                const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
                return timeB - timeA;
            });

            setAuditLogs(uniqueLogs.slice(0, 30));
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleForceDeleteClick = async () => {
        // Bypass validation if override is enabled
        if (overrideMode) {
            setDeleteDialog(true);
            return;
        }

        setValidatingDelete(true);
        try {
            const result = await validateUserDeletion(targetUser);
            if (!result.valid) {
                setValidationErrors(result.errors || [result.reason]);
                setShowValidationDialog(true);
            } else {
                setDeleteDialog(true);
            }
        } catch (error) {
            console.error('Validation error:', error);
            toast.error('Failed to validate user deletion safety');
        } finally {
            setValidatingDelete(false);
        }
    };

    const handleForceDelete = async () => {
        if (!targetUser?.id) return;

        try {
            setDeleteLoading(true);

            // Log the deletion BEFORE deleting
            await logDelete('users', targetUser.id, targetUser, currentUser);

            // Perform hard delete
            await deleteDoc(doc(db, 'users', targetUser.id));

            toast.success(`User ${targetUser.name} has been permanently deleted`);
            setDeleteDialog(false);
            onUserDeleted?.();
            onClose();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        } finally {
            setDeleteLoading(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'role-assignments', label: 'Role Assignments', icon: '🎭' },
        { id: 'role-history', label: 'Role History', icon: '📊' },
        { id: 'status', label: 'Status Timeline', icon: '⏱️' },
        { id: 'audit', label: 'Audit Logs', icon: '📋' }
    ];

    const getActionColor = (action) => {
        if (action?.includes('delete') || action === 'disable') return 'text-red-600 bg-red-50';
        if (action === 'relieve_user' || action === 'archive_user') return 'text-orange-600 bg-orange-50';
        if (action?.includes('create') || action === 'enable') return 'text-green-600 bg-green-50';
        if (action === 'assign_successor' || action === 'role_change') return 'text-purple-600 bg-purple-50';
        if (action?.includes('update')) return 'text-blue-600 bg-blue-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={onClose}
            ></div>

            {/* Slide-out Panel */}
            <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="bg-gradient-to-r from-biyani-red to-red-700 text-white px-6 py-4 flex items-center justify-between border-b border-red-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                            {targetUser?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{targetUser?.name}</h2>
                            <p className="text-sm text-red-100">{targetUser?.email}</p>
                        </div>
                    </div>


                    <div className="flex items-center gap-3">
                        {/* Admin Override Toggle */}
                        <div className="flex items-center gap-2 mr-2">
                            <span className={`text-xs font-semibold ${overrideMode ? 'text-yellow-300' : 'text-white/60'}`}>
                                {overrideMode ? 'Override Active' : 'Safe Mode'}
                            </span>
                            <button
                                onClick={() => setOverrideMode(!overrideMode)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-red-600 ${overrideMode ? 'bg-yellow-400' : 'bg-red-800'
                                    }`}
                            >
                                <span className="sr-only">Enable Override</span>
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${overrideMode ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-gray-50">
                    <div className="flex overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-biyani-red text-biyani-red bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Basic Info Card */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Full Name</label>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{targetUser?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{targetUser?.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Role</label>
                                        <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                            {targetUser?.role?.toUpperCase() || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${targetUser?.status === 'active' ? 'bg-green-100 text-green-800' :
                                            targetUser?.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                                targetUser?.status === 'relieved' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {targetUser?.status?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                    </div>
                                    {targetUser?.employeeId && (
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase tracking-wide">Employee ID</label>
                                            <p className="text-sm font-mono font-medium text-gray-900 mt-1">{targetUser.employeeId}</p>
                                        </div>
                                    )}
                                    {targetUser?.enrollmentNumber && (
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase tracking-wide">Enrollment No.</label>
                                            <p className="text-sm font-mono font-medium text-gray-900 mt-1">{targetUser.enrollmentNumber}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Organizational Info */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizational Details</h3>
                                <div className="space-y-3">
                                    {targetUser?.campusName && (
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span className="text-sm text-gray-600">Campus: <span className="font-medium text-gray-900">{targetUser.campusName}</span></span>
                                        </div>
                                    )}
                                    {targetUser?.collegeName && (
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <span className="text-sm text-gray-600">College: <span className="font-medium text-gray-900">{targetUser.collegeName}</span></span>
                                        </div>
                                    )}
                                    {targetUser?.departmentName && (
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-sm text-gray-600">Department: <span className="font-medium text-gray-900">{targetUser.departmentName}</span></span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lifecycle Management */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lifecycle Actions</h3>
                                <div className="space-y-3">
                                    {/* Re-instate Button (for Relieved/Archived/Deactivated) */}
                                    {(['relieved', 'archived', 'deactivated'].includes(targetUser?.status)) && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold text-blue-900">Re-instate User</h4>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    Restore this user to active status. They will regain access based on their restored roles.
                                                </p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm(`Are you sure you want to Re-instate ${targetUser.name}? This will restore them to 'Active' status.`)) return;

                                                    try {
                                                        const { restateUser } = await import('../../services/lifecycleService');
                                                        await restateUser(targetUser.id, currentUser);
                                                        toast.success('User re-instated successfully');
                                                        if (onUserUpdated) onUserUpdated();
                                                    } catch (error) {
                                                        console.error('Error reinstating user:', error);
                                                        toast.error('Failed to re-instate user');
                                                    }
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                            >
                                                Re-instate User
                                            </button>
                                        </div>
                                    )}

                                    {/* Relieve Button (for Active Users) - Explicit Relieve Action */}
                                    {targetUser?.status === 'active' && (
                                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold text-orange-900">Relieve User</h4>
                                                <p className="text-xs text-orange-700 mt-1">
                                                    Mark user as alumni/relieved. This revokes login access for employee roles but grants alumni access to history.
                                                </p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    // Basic relieve action (generic)
                                                    const reason = window.prompt("Enter reason for relieving (e.g., Resigned, Graduated):");
                                                    if (!reason) return;

                                                    try {
                                                        const { relieveUser } = await import('../../services/lifecycleService');
                                                        await relieveUser(targetUser.id, reason, currentUser);
                                                        toast.success('User relieved successfully');
                                                        if (onUserUpdated) onUserUpdated();
                                                    } catch (error) {
                                                        console.error('Error relieving user:', error);
                                                        toast.error('Failed to relieve user');
                                                    }
                                                }}
                                                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                                            >
                                                Relieve User
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Danger Zone - Force Delete */}
                            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Danger Zone
                                </h3>
                                <p className="text-sm text-red-700 mb-4">
                                    Permanently delete this user. This action cannot be undone and should only be used in exceptional circumstances.
                                </p>
                                <button
                                    onClick={handleForceDeleteClick}
                                    disabled={validatingDelete}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {validatingDelete ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    )}
                                    Force Delete User
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'role-assignments' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <RoleAssignmentPanel
                                targetUser={targetUser}
                                onUpdate={() => {
                                    if (onUserUpdated) onUserUpdated();
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'role-history' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <RoleHistory userId={targetUser?.id} />
                        </div>
                    )}

                    {activeTab === 'status' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <StatusTimeline userId={targetUser?.id} />
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Audit Logs</h3>
                            <p className="text-xs text-gray-500 mb-4">Showing actions performed by and on this user</p>
                            {logsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-biyani-red"></div>
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-500">No audit logs found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {auditLogs.map(log => {
                                        const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                                        const isPerformer = log.logType === 'performer';

                                        return (
                                            <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                            {log.action?.toUpperCase().replace('_', ' ')}
                                                        </span>
                                                        {isPerformer && (
                                                            <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                                                                PERFORMED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {format(timestamp, 'MMM d, yyyy h:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    By: <span className="font-medium">{log.performedByName || 'System'}</span>
                                                </p>
                                                {log.collection && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Collection: {log.collection}
                                                        {log.documentId && log.documentId !== targetUser.id && (
                                                            <span className="ml-2 text-blue-600">• Affected: {log.documentId.slice(0, 8)}...</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Force Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteDialog}
                onClose={() => setDeleteDialog(false)}
                onConfirm={handleForceDelete}
                title="⚠️ FORCE DELETE USER"
                message={
                    <div className="space-y-3">
                        <p className="font-semibold text-red-900">
                            Are you absolutely sure you want to permanently delete {targetUser?.name}?
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-sm text-yellow-900 font-medium mb-2">⚠️ WARNING:</p>
                            <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                                <li>This will permanently delete all user data</li>
                                <li>This action CANNOT be undone</li>
                                <li>Educational records will be lost</li>
                                <li>Audit trail will be preserved but user data deleted</li>
                            </ul>
                        </div>
                        <p className="text-sm text-gray-600">
                            This option should only be used in exceptional circumstances (e.g., duplicate accounts, test data, legal requirements).
                        </p>
                    </div>
                }
                variant="danger"
                confirmText={deleteLoading ? "Deleting..." : "DELETE PERMANENTLY"}
                loading={deleteLoading}
            />
            {/* Validation Failure Dialog */}
            {showValidationDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Deletion Blocked</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    This user cannot be deleted because they have active dependencies.
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <h4 className="text-sm font-semibold text-red-900 mb-2">Detailed Reasons:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {validationErrors.map((error, idx) => (
                                    <li key={idx} className="text-sm text-red-800">{error}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowValidationDialog(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowValidationDialog(false);
                                    // Could trigger relieve modal here
                                }}
                                className="px-4 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Relieve User Instead
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
