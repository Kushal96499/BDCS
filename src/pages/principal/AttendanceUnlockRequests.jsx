// ============================================
// BDCS - Attendance Unlock Requests (Principal)
// Manage requests from teachers to unlock attendance
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { format } from 'date-fns';

import { getCollegeDepartments } from '../../services/principalService';

export default function AttendanceUnlockRequests() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [actionLoading, setActionLoading] = useState(null); // ID of request being processed

    useEffect(() => {
        if (user?.collegeId) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [deptRes, requestsSnap] = await Promise.all([
                getCollegeDepartments(user.collegeId),
                getDocs(query(
                    collection(db, 'attendance_unlock_requests'),
                    where('collegeId', '==', user.collegeId),
                    where('status', '==', 'PENDING')
                ))
            ]);

            setDepartments(deptRes);
            setRequests(requestsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    // Helper
    const getDeptName = (deptId) => {
        const d = departments.find(dept => dept.id === deptId);
        return d ? d.name : deptId; // Fallback to ID if not found
    };

    const handleAction = async (request, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;

        setActionLoading(request.id);
        try {
            const batch = writeBatch(db);
            const requestRef = doc(db, 'attendance_unlock_requests', request.id);

            if (action === 'APPROVE') {
                // 1. Update Request Status
                batch.update(requestRef, {
                    status: 'APPROVED',
                    actionBy: user.uid,
                    actionAt: serverTimestamp()
                });

                // 2. Unlock the Session
                if (request.sessionId) {
                    const sessionRef = doc(db, 'attendance_sessions', request.sessionId);
                    batch.update(sessionRef, {
                        status: 'OPEN',
                        unlockedBy: user.uid,
                        unlockedAt: serverTimestamp()
                    });
                }

                toast.success('Request Approved & Session Unlocked');
            } else {
                // REJECT
                batch.update(requestRef, {
                    status: 'REJECTED',
                    actionBy: user.uid,
                    actionAt: serverTimestamp()
                });
                toast.info('Request Rejected');
            }

            await batch.commit();

            // Remove from local list
            setRequests(prev => prev.filter(r => r.id !== request.id));

        } catch (error) {
            console.error('Error processing request:', error);
            toast.error('Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const columns = [
        {
            header: 'Teacher',
            field: 'teacherName',
            render: (row) => (
                <div>
                    <div className="font-bold text-gray-900">{row.teacherName}</div>
                    <div className="text-xs text-gray-500 font-medium text-indigo-600">{getDeptName(row.departmentId)}</div>
                </div>
            )
        },
        {
            header: 'Batch Information',
            field: 'batchName',
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-800">{row.batchName}</div>
                    <div className="text-xs text-gray-500">Date: {format(new Date(row.date), 'dd MMM yyyy')}</div>
                </div>
            )
        },
        {
            header: 'Requested At',
            field: 'createdAt',
            render: (row) => row.createdAt?.seconds ? format(new Date(row.createdAt.seconds * 1000), 'dd MMM, hh:mm a') : '-'
        },
        {
            header: 'Actions',
            field: 'actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleAction(row, 'APPROVE')}
                        disabled={actionLoading === row.id}
                        className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                        {actionLoading === row.id ? '...' : 'Approve'}
                    </button>
                    <button
                        onClick={() => handleAction(row, 'REJECT')}
                        disabled={actionLoading === row.id}
                        className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                        Reject
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Unlock Requests</h1>
                    <p className="text-gray-500">Manage teacher requests to reopen attendance sessions</p>
                </div>
                <button
                    onClick={fetchData}
                    className="self-start md:self-auto p-2 text-gray-400 hover:text-biyani-red hover:bg-red-50 rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-gray-100"></div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">All Caught Up!</h3>
                    <p className="text-gray-500">No pending unlock requests at the moment.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map(request => (
                        <div key={request.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Request Info */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                    {request.teacherName?.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900">{request.batchName}</h4>
                                        <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                                            {request.date ? format(new Date(request.date), 'MMM d') : 'Unknown Date'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        Requested by <span className="font-semibold text-gray-900">{request.teacherName}</span> • {getDeptName(request.departmentId)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {request.createdAt?.seconds ? format(new Date(request.createdAt.seconds * 1000), 'MMM d, h:mm a') : 'Just now'}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 self-end md:self-center">
                                <button
                                    onClick={() => handleAction(request, 'REJECT')}
                                    disabled={!!actionLoading}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleAction(request, 'APPROVE')}
                                    disabled={!!actionLoading}
                                    className="px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-biyani-red to-orange-600 rounded-lg shadow-sm hover:shadow hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                >
                                    {actionLoading === request.id ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                    )}
                                    Unlock
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
