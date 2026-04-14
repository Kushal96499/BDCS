// ============================================
// BDCS - Status Timeline Component
// Display user's status change history
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, or } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { format } from 'date-fns';

export default function StatusTimeline({ userId }) {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchStatusTimeline();
        }
    }, [userId]);

    const fetchStatusTimeline = async () => {
        try {
            setLoading(true);
            // Query audit logs for status-related actions
            const q = query(
                collection(db, 'auditLogs'),
                where('collection', '==', 'users'),
                where('documentId', '==', userId),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            const allLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter for status-related actions
            const statusChanges = allLogs.filter(log =>
                ['enable', 'disable', 'relieve_user', 'archive_user', 'create'].includes(log.action)
            );

            setTimeline(statusChanges);
        } catch (error) {
            console.error('Error fetching status timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (action, afterData) => {
        const configs = {
            create: {
                icon: '✨',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                iconBg: 'bg-green-500',
                label: 'Account Created',
                description: 'User account was created'
            },
            enable: {
                icon: '✅',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                iconBg: 'bg-green-500',
                label: 'Enabled',
                description: 'Account activated'
            },
            disable: {
                icon: '⏸️',
                bgColor: 'bg-gray-50',
                borderColor: 'border-gray-200',
                iconBg: 'bg-gray-500',
                label: 'Disabled',
                description: 'Account temporarily suspended'
            },
            relieve_user: {
                icon: '🚪',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                iconBg: 'bg-orange-500',
                label: 'Relieved',
                description: afterData?.reason ? `Reason: ${afterData.reason}` : 'User relieved from duties'
            },
            archive_user: {
                icon: '📦',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                iconBg: 'bg-red-500',
                label: 'Archived',
                description: 'Account archived for records'
            }
        };
        return configs[action] || configs.create;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-biyani-red"></div>
            </div>
        );
    }

    if (timeline.length === 0) {
        return (
            <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No status changes recorded</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Status Change Timeline</h3>
                <span className="text-xs text-gray-500">{timeline.length} event{timeline.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Timeline Items */}
                <div className="space-y-6">
                    {timeline.map((item, index) => {
                        const config = getStatusConfig(item.action, item.after);
                        const timestamp = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);

                        return (
                            <div key={item.id} className="relative pl-10">
                                {/* Timeline Dot */}
                                <div className={`absolute left-0 top-1 w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center ring-4 ring-white`}>
                                    <span className="text-sm">{config.icon}</span>
                                </div>

                                {/* Content Card */}
                                <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 hover:shadow-md transition-shadow`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-sm text-gray-900">{config.label}</h4>
                                            <p className="text-xs text-gray-600 mt-1">{config.description}</p>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                            {format(timestamp, 'MMM d, yyyy')}
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span>By: {item.performedByName || 'System'}</span>
                                    </div>

                                    {/* Additional metadata for relieved users */}
                                    {item.action === 'relieve_user' && item.after?.lastWorkingDate && (
                                        <div className="mt-3 pt-3 border-t border-orange-200">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-500">Last Working Date:</span>
                                                    <p className="font-medium text-gray-900">
                                                        {format(new Date(item.after.lastWorkingDate), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                                {item.after.successorId && (
                                                    <div>
                                                        <span className="text-gray-500">Successor Assigned:</span>
                                                        <p className="font-medium text-green-700">✓ Yes</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
