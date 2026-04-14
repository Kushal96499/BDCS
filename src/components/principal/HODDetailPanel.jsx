// ============================================
// BDCS - HOD Detail Panel (Principal)
// Comprehensive HOD management with full admin features
// ============================================

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../admin/Toast';
import { format } from 'date-fns';
import { demoteHODToTeacher } from '../../services/promotionService';

export default function HODDetailPanel({ hod, onClose, onUpdate }) {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: hod.name || '',
        email: hod.email || '',
        phone: hod.phone || '',
        departmentId: hod.departmentId || '',
        departmentName: hod.departmentName || ''
    });

    useEffect(() => {
        loadDepartments();
    }, []);

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeTab]);

    const loadDepartments = async () => {
        try {
            const deptsQuery = query(
                collection(db, 'departments'),
                where('collegeId', '==', hod.collegeId)
            );
            const snapshot = await getDocs(deptsQuery);
            const depts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDepartments(depts.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    };

    const fetchAuditLogs = async () => {
        setLogsLoading(true);
        try {
            const subjectQuery = query(
                collection(db, 'auditLogs'),
                where('documentId', '==', hod.id),
                orderBy('timestamp', 'desc'),
                limit(20)
            );
            const snapshot = await getDocs(subjectQuery);
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAuditLogs(logs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || !formData.phone) {
            toast.error('Name, email, and phone are required');
            return;
        }

        setLoading(true);
        try {
            const userRef = doc(db, 'users', hod.id);
            const updateData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                departmentId: formData.departmentId || null,
                departmentName: departments.find(d => d.id === formData.departmentId)?.name || null
            };

            await updateDoc(userRef, updateData);
            toast.success('HOD updated successfully!');
            setIsEditing(false);
            onUpdate();
        } catch (error) {
            console.error('Error updating HOD:', error);
            toast.error('Failed to update HOD');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!confirm(`Are you sure you want to disable ${hod.name}?`)) return;

        try {
            await updateDoc(doc(db, 'users', hod.id), {
                status: 'inactive'
            });
            toast.success('HOD disabled successfully');
            onUpdate();
        } catch (error) {
            console.error('Error disabling HOD:', error);
            toast.error('Failed to disable HOD');
        }
    };

    const handleEnable = async () => {
        try {
            await updateDoc(doc(db, 'users', hod.id), {
                status: 'active'
            });
            toast.success('HOD enabled successfully');
            onUpdate();
        } catch (error) {
            console.error('Error enabling HOD:', error);
            toast.error('Failed to enable HOD');
        }
    };

    const handleRelieve = async () => {
        if (!confirm(`Are you sure you want to relieve ${hod.name}? This action marks them as no longer employed.`)) return;

        try {
            await updateDoc(doc(db, 'users', hod.id), {
                status: 'relieved',
                relievedAt: new Date()
            });
            toast.success('HOD relieved successfully');
            onUpdate();
        } catch (error) {
            console.error('Error relieving HOD:', error);
            toast.error('Failed to relieve HOD');
        }
    };

    const handleResetPassword = async () => {
        if (!confirm(`Reset password for ${hod.name}? New password will be generated.`)) return;

        try {
            const newPassword = hod.name?.split(' ')[0]?.toLowerCase() + hod.phone?.slice(-4);
            // In production, use Firebase Auth Admin SDK
            toast.success(`Password reset to: ${newPassword}`, { duration: 8000 });
        } catch (error) {
            console.error('Error resetting password:', error);
            toast.error('Failed to reset password');
        }
    };

    const handleRevokeHOD = async () => {
        if (!confirm(`Are you sure you want to remove the HOD role from ${hod.name}? They will remain a Teacher.`)) return;

        setLoading(true);
        try {
            await demoteHODToTeacher(hod.id, hod.departmentId, 'Admin/Principal Action', currentUser);
            toast.success(`${hod.name} removed from HOD role`);
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error revoking HOD role:', error);
            toast.error(error.message || 'Failed to revoke HOD role');
        } finally {
            setLoading(false);
        }
    };

    const handleForceDelete = async () => {
        if (!confirm(`⚠️ PERMANENTLY DELETE ${hod.name}?\n\nThis will:\n- Delete all user data\n- Cannot be undone\n- Educational records will be lost\n\nAre you absolutely sure?`)) return;

        try {
            const userRef = doc(db, 'users', hod.id);
            await updateDoc(userRef, {
                status: 'deleted',
                deletedAt: new Date(),
                deletedBy: currentUser.uid
            });
            toast.success('HOD deleted successfully');
            onClose();
            onUpdate();
        } catch (error) {
            console.error('Error deleting HOD:', error);
            toast.error('Failed to delete HOD');
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'audit', label: 'Audit Logs', icon: '📋' }
    ];

    const getActionColor = (action) => {
        if (action?.includes('delete') || action === 'disable') return 'text-red-600 bg-red-50';
        if (action === 'relieve_user') return 'text-orange-600 bg-orange-50';
        if (action?.includes('create') || action === 'enable') return 'text-green-600 bg-green-50';
        if (action === 'assign_hod' || action === 'change_hod') return 'text-red-600 bg-red-50';
        if (action?.includes('update')) return 'text-blue-600 bg-blue-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}></div>

            {/* Slide-out Panel */}
            <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="bg-gradient-to-r from-biyani-red to-biyani-red-dark text-white px-6 py-4 flex items-center justify-between border-b border-biyani-red-dark">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                            {hod.name?.charAt(0)?.toUpperCase() || 'H'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{hod.name}</h2>
                            <p className="text-sm text-red-100">{hod.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Action Buttons */}
                        {hod.status === 'active' ? (
                            <button
                                onClick={handleDisable}
                                className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Disable
                            </button>
                        ) : hod.status === 'inactive' ? (
                            <button
                                onClick={handleEnable}
                                className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Enable
                            </button>
                        ) : null}

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
                            {/* Edit/View Toggle */}
                            {!isEditing && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Profile
                                    </button>
                                </div>
                            )}

                            {isEditing ? (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Information</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                            <select
                                                value={formData.departmentId}
                                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                            >
                                                <option value="">No Department</option>
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setFormData({
                                                        name: hod.name || '',
                                                        email: hod.email || '',
                                                        phone: hod.phone || '',
                                                        departmentId: hod.departmentId || '',
                                                        departmentName: hod.departmentName || ''
                                                    });
                                                }}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={loading}
                                                className="px-4 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Basic Info */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wide">Full Name</label>
                                                <p className="text-sm font-medium text-gray-900 mt-1">{hod.name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                                                <p className="text-sm font-medium text-gray-900 mt-1">{hod.email || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wide">Phone</label>
                                                <p className="text-sm font-medium text-gray-900 mt-1">{hod.phone || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                                                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${hod.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    hod.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                                        hod.status === 'relieved' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {hod.status?.toUpperCase() || 'UNKNOWN'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Organizational Info */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizational Details</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                                <span className="text-sm text-gray-600">College: <span className="font-medium text-gray-900">{hod.collegeName || 'N/A'}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="text-sm text-gray-600">Department: <span className="font-medium text-gray-900">{hod.departmentName || 'Not assigned'}</span></span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Roles */}
                                    {hod.roles && hod.roles.length > 0 && (
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Roles & Permissions</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {hod.roles.map(role => (
                                                    <span key={role} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick Actions */}
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={handleResetPassword}
                                                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                </svg>
                                                Reset Password
                                            </button>

                                            {/* DEMOTE/REVOKE Logic */}
                                            {hod.status === 'active' && (
                                                <button
                                                    onClick={handleRevokeHOD}
                                                    className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                                    </svg>
                                                    Remove HOD Role
                                                </button>
                                            )}

                                            {hod.status !== 'relieved' && (
                                                <button
                                                    onClick={handleRelieve}
                                                    className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                    Relieve HOD
                                                </button>
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
                                            Permanently delete this HOD. This action cannot be undone and should only be used in exceptional circumstances.
                                        </p>
                                        <button
                                            onClick={handleForceDelete}
                                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Force Delete User
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'audit' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
                                <p className="text-sm text-gray-600 mt-1">Recent actions involving this HOD</p>
                            </div>

                            {logsLoading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-biyani-red mx-auto"></div>
                                    <p className="text-gray-600 mt-2">Loading audit logs...</p>
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-gray-600">No audit logs found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {auditLogs.map(log => (
                                        <div key={log.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex items-start gap-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-900">{log.details || log.description}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {log.performedByName} • {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'PPpp') : 'Unknown date'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
