// ============================================
// BDCS - HOD Assignment Modal Component
// Assign or change HOD with self-assignment support
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { assignHOD, changeHOD } from '../../services/principalService';
import { toast } from '../../components/admin/Toast';

export default function HODAssignmentModal({ department, currentUser, onClose, onSuccess }) {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadEligibleUsers();
    }, [department]);

    const loadEligibleUsers = async () => {
        setLoading(true);
        try {
            // Get all users in the college who could be HOD
            const usersQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', department.collegeId),
                where('status', '==', 'active')
            );
            const snapshot = await getDocs(usersQuery);
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter to show only teachers, existing HODs, and the current principal
            const eligible = allUsers.filter(u =>
                u.role === 'teacher' ||
                (u.roles && u.roles.includes('hod')) ||
                (u.roles && u.roles.includes('principal')) ||
                u.id === currentUser.uid
            );

            setUsers(eligible);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedUserId) {
            toast.error('Please select a user');
            return;
        }

        setSubmitting(true);
        try {
            if (department.currentHOD) {
                // Change HOD (succession)
                await changeHOD(
                    department.id,
                    selectedUserId,
                    department.currentHOD,
                    new Date(effectiveDate),
                    currentUser
                );
                toast.success('HOD changed successfully!');
            } else {
                // First-time assignment
                await assignHOD(
                    department.id,
                    selectedUserId,
                    new Date(effectiveDate),
                    currentUser
                );
                toast.success('HOD assigned successfully!');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error assigning HOD:', error);
            toast.error(error.message || 'Failed to assign HOD');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-biyani-red to-red-600 px-6 py-5 flex items-center justify-between flex-shrink-0">
                    <div className="text-white">
                        <h2 className="text-2xl font-bold">
                            {department.currentHOD ? 'Change HOD' : 'Assign HOD'}
                        </h2>
                        <p className="text-sm text-white/90 mt-1">{department.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Current HOD Info */}
                {department.currentHOD && (
                    <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-yellow-900">Current HOD: {department.currentHODName}</p>
                                <p className="text-xs text-yellow-700">Selecting a new HOD will revoke the current HOD's role</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 min-h-0">
                    <div className="space-y-6">
                        {/* User Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-3">
                                Select HOD *
                            </label>

                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4 h-16"></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                    {users.map(user => (
                                        <label
                                            key={user.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedUserId === user.id
                                                ? 'bg-biyani-red text-white shadow-md'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="hodSelection"
                                                value={user.id}
                                                checked={selectedUserId === user.id}
                                                onChange={(e) => setSelectedUserId(e.target.value)}
                                                className="w-4 h-4"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-medium ${selectedUserId === user.id ? 'text-white' : 'text-gray-900'}`}>
                                                        {user.name}
                                                        {user.id === currentUser.uid && (
                                                            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                                                You
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <p className={`text-sm ${selectedUserId === user.id ? 'text-white/80' : 'text-gray-600'}`}>
                                                    {user.email}
                                                </p>
                                                {user.departmentName && (
                                                    <p className={`text-xs ${selectedUserId === user.id ? 'text-white/70' : 'text-gray-500'}`}>
                                                        {user.departmentName}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {user.roles && user.roles.includes('hod') && (
                                                    <span className={`text-xs px-2 py-1 rounded ${selectedUserId === user.id
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        Current HOD
                                                    </span>
                                                )}
                                                {(user.role === 'teacher' || (user.roles && user.roles.includes('teacher'))) && (
                                                    <span className={`text-xs px-2 py-1 rounded ${selectedUserId === user.id
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        Teacher
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Effective Date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Effective Date *
                            </label>
                            <input
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Info Alert */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="text-sm text-blue-900">
                                    <p className="font-medium mb-1">Assignment Notes:</p>
                                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                                        <li>You can assign yourself as HOD if needed</li>
                                        <li><strong>Promote Teacher to HOD:</strong> Select any teacher - they'll gain HOD access while keeping all their teacher data and classes</li>
                                        <li>Teachers promoted to HOD get multi-role access (Teacher + HOD panels)</li>
                                        <li>All changes are logged in audit trail</li>
                                        {department.currentHOD && (
                                            <li className="text-yellow-700 font-medium">Previous HOD's HOD role will be revoked (but teacher data is preserved if applicable)</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between gap-3 flex-shrink-0">
                    <div>
                        {department.currentHOD && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!window.confirm('Are you sure you want to UNASSIGN the current HOD?\n\nThis will remove the HOD from this department. Use this if the previous HOD has left or was relieved.')) return;
                                    setSubmitting(true);
                                    try {
                                        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
                                        const deptRef = doc(db, 'departments', department.id);
                                        await updateDoc(deptRef, {
                                            currentHOD: null,
                                            currentHODName: null,
                                            currentHODEmail: null,
                                            updatedAt: serverTimestamp()
                                        });
                                        toast.success('HOD unassigned successfully');
                                        onSuccess();
                                        onClose();
                                    } catch (err) {
                                        console.error(err);
                                        toast.error('Failed to unassign HOD');
                                        setSubmitting(false);
                                    }
                                }}
                                disabled={submitting}
                                className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Unassign Header
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !selectedUserId}
                            className="px-6 py-2.5 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {department.currentHOD ? 'Change HOD' : 'Assign HOD'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
