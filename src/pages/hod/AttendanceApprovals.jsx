// ============================================
// BDCS - HOD Attendance Unlock Approvals
// Manage Unlock Requests from Faculty
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/admin/DataTable';
import StatusPill from '../../components/common/StatusPill';
import { toast } from '../../components/admin/Toast';
import { logAudit } from '../../utils/auditLogger';

export default function AttendanceApprovals() {
    const { user, loading: authLoading } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFilter, setCurrentFilter] = useState('PENDING');

    useEffect(() => {
        if (!authLoading && user) fetchRequests();
    }, [user, authLoading]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            let q;
            
            // Filter by department if user is HOD
            if (user.departmentId) {
                q = query(
                    collection(db, 'attendance_unlock_requests'), 
                    where('departmentId', '==', user.departmentId)
                );
            } else {
                q = query(collection(db, 'attendance_unlock_requests'));
            }

            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort by creation date
            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setRequests(data);
        } catch (error) {
            console.error('Error fetching unlock requests:', error);
            toast.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request, status) => {
        try {
            const batch = writeBatch(db);
            const requestRef = doc(db, 'attendance_unlock_requests', request.id);

            // 1. Update Request Status
            batch.update(requestRef, {
                status,
                processedAt: serverTimestamp(),
                processedBy: user.uid,
                processedByName: user.name
            });

            // 2. If Approved, UNLOCK the attendance session
            if (status === 'APPROVED' && request.sessionId) {
                const sessionRef = doc(db, 'attendance_sessions', request.sessionId);
                batch.update(sessionRef, {
                    status: 'OPEN', // Reset to OPEN allows editing
                    unlockedAt: serverTimestamp(),
                    unlockedBy: user.uid
                });
            }

            await batch.commit();

            // 3. Log Audit
            await logAudit(
                user, 
                `ATTENDANCE_UNLOCK_${status}`, 
                request.sessionId, 
                'ATTENDANCE', 
                request.batchName, 
                { requestId: request.id }, 
                `${status} unlock request for ${request.batchName} (${request.date})`
            );

            toast.success(`Request ${status} Successfully`);
            setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status } : r));
        } catch (error) {
            console.error('Error processing unlock request:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        {
            header: 'Faculty / Batch',
            field: 'teacherName',
            render: (row) => (
                <div className="flex items-center gap-4 py-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black text-xs border border-violet-100 shadow-sm">
                        {row.teacherName?.[0]}
                    </div>
                    <div>
                        <div className="font-extrabold text-gray-900 tracking-tight leading-tight">{row.teacherName}</div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{row.batchName}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Request Date',
            field: 'date',
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <div className="font-bold text-gray-800 text-sm">{row.date}</div>
                    <div className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Attendance Session</div>
                </div>
            )
        },
        {
            header: 'Reason for Unlock',
            field: 'reason',
            render: (row) => (
                <div className="max-w-[200px]">
                    <div className="text-xs font-medium text-gray-600 italic line-clamp-2">
                        "{row.reason || 'No reason provided'}"
                    </div>
                </div>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusPill status={row.status} />
        },
        {
            header: 'Authorize',
            field: 'actions',
            render: (row) => row.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleAction(row, 'APPROVED')}
                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button
                        onClick={() => handleAction(row, 'REJECTED')}
                        className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-black hover:text-white transition-all border border-red-100 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            ) : (
                <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">
                    Resolved by {row.processedByName?.split(' ')[0]}
                </div>
            )
        }
    ];

    const filteredRequests = currentFilter === 'ALL' 
        ? requests 
        : requests.filter(r => r.status === currentFilter);

    if (authLoading) return null;

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Attendance Unlocks</h2>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                        Departmental Override Queue • {user?.departmentName}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/50 backdrop-blur-xl p-2 rounded-[2rem] border border-gray-100 flex flex-wrap items-center gap-1">
                        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
                            <button
                                key={f}
                                onClick={() => setCurrentFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    currentFilter === f 
                                        ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
                                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Request Ledger */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-emerald-500/5 min-h-[400px]">
                <DataTable
                    columns={columns}
                    data={filteredRequests}
                    loading={loading}
                    actions={false}
                    emptyMessage={`No pending unlock signatures for: ${currentFilter}`}
                />
            </div>
        </div>
    );
}
