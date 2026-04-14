// ============================================
// BDCS - Role History Timeline Component
// Display user's role change history
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { format } from 'date-fns';

export default function RoleHistory({ userId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchRoleHistory();
        }
    }, [userId]);

    const fetchRoleHistory = async () => {
        try {
            setLoading(true);
            // Query audit logs for role_change actions
            const q = query(
                collection(db, 'auditLogs'),
                where('collection', '==', 'users'),
                where('documentId', '==', userId),
                where('action', '==', 'role_change'),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            const roleChanges = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setHistory(roleChanges);
        } catch (error) {
            console.error('Error fetching role history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            admin: 'bg-red-100 text-red-800',
            director: 'bg-purple-100 text-purple-800',
            principal: 'bg-blue-100 text-blue-800',
            hod: 'bg-green-100 text-green-800',
            teacher: 'bg-yellow-100 text-yellow-800',
            student: 'bg-gray-100 text-gray-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-biyani-red"></div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No role changes recorded</p>
                <p className="text-xs text-gray-400 mt-1">This user's role has not been changed</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Role Change Timeline</h3>
                <span className="text-xs text-gray-500">{history.length} change{history.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Timeline Items */}
                <div className="space-y-6">
                    {history.map((item, index) => {
                        const fromRole = item.before?.role || 'Unknown';
                        const toRole = item.after?.role || 'Unknown';
                        const timestamp = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);

                        return (
                            <div key={item.id} className="relative pl-10">
                                {/* Timeline Dot */}
                                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center ring-4 ring-white">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>

                                {/* Content Card */}
                                <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(fromRole)}`}>
                                                {fromRole.toUpperCase()}
                                            </span>
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(toRole)}`}>
                                                {toRole.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {format(timestamp, 'MMM d, yyyy h:mm a')}
                                        </span>
                                    </div>

                                    <div className="text-sm text-gray-600">
                                        <p>Changed by: <span className="font-medium">{item.performedByName || 'System'}</span></p>
                                        {item.after?.departmentName && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Department: {item.after.departmentName}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
