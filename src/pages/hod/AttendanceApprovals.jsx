// ============================================
// BDCS - HOD Attendance Approvals
// Manage Unlock Requests
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';

export default function AttendanceApprovals() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        if (!user?.departmentId) return;
        try {
            // HOD sees requests for their department
            // We assume requests have departmentId or we query by user role? 
            // Teacher Marking put departmentId in request.
            const q = query(
                collection(db, 'attendance_edit_requests'),
                where('status', '==', 'PENDING'),
                where('departmentId', '==', user.departmentId)
            );
            const snap = await getDocs(q);
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request, action) => {
        try {
            const batch = writeBatch(db);

            // 1. Update Request
            const reqRef = doc(db, 'attendance_edit_requests', request.id);
            batch.update(reqRef, {
                status: action,
                actionedBy: user.uid,
                actionedAt: serverTimestamp()
            });

            // 2. If Approved, Unlock Session
            if (action === 'APPROVED') {
                const sessionRef = doc(db, 'attendance_sessions', request.sessionId);
                batch.update(sessionRef, {
                    status: 'OPEN',
                    unlockedBy: user.uid,
                    unlockedAt: serverTimestamp()
                });
            }

            await batch.commit();

            setRequests(prev => prev.filter(r => r.id !== request.id));
            toast.success(`Request ${action.toLowerCase()}`);
        } catch (error) {
            console.error('Error action:', error);
            toast.error('Failed to update request');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Attendance Unlock Requests</h2>
                <p className="text-sm text-gray-600">Approve requests to modify locked attendance sessions</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {requests.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        {loading ? 'Loading...' : 'No pending requests'}
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session Info</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {requests.map(req => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{req.teacherName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{req.subjectName}</div>
                                        <div className="text-xs text-gray-500">
                                            {req.date} • Period {req.period}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 italic">
                                        "{req.reason}"
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleAction(req, 'APPROVED')}
                                            className="text-green-600 hover:text-green-900 font-medium text-sm"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(req, 'REJECTED')}
                                            className="text-red-600 hover:text-red-900 font-medium text-sm"
                                        >
                                            Reject
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
