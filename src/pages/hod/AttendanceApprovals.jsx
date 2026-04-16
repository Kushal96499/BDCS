// ============================================
// BDCS - HOD Attendance Approvals
// Manage Unlock Requests — "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import DataTable from '../../components/admin/DataTable';
import { motion } from 'framer-motion';

export default function AttendanceApprovals() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.departmentId) fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'attendance_edit_requests'),
                where('status', '==', 'PENDING'),
                where('departmentId', '==', user.departmentId)
            );
            const snap = await getDocs(q);
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load authorization queue');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (request, action) => {
        try {
            const batch = writeBatch(db);
            const reqRef = doc(db, 'attendance_edit_requests', request.id);
            
            batch.update(reqRef, {
                status: action,
                actionedBy: user.uid,
                actionedAt: serverTimestamp()
            });

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
            toast.success(`Manifest ${action.toLowerCase()} successfully`);
        } catch (error) {
            console.error('Error actioning request:', error);
            toast.error('Identity authorization failed');
        }
    };

    const columns = [
        {
            header: 'Faculty Origin',
            field: 'teacherName',
            render: (row) => (
                <div className="flex items-center gap-4 py-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-black text-[10px] border border-violet-100 shadow-sm">
                        {row.teacherName?.[0]}
                    </div>
                    <div>
                        <div className="font-black text-gray-900 tracking-tight">{row.teacherName}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Academic Staff</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Session Identity',
            field: 'subjectName',
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-gray-800 tracking-tight">{row.subjectName}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                             {row.date}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Period {row.period}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Reasoning',
            field: 'reason',
            render: (row) => (
                <div className="max-w-xs group relative">
                    <p className="text-xs text-gray-600 italic font-medium leading-relaxed line-clamp-2">"{row.reason}"</p>
                </div>
            )
        },
        {
            header: 'Operations',
            field: 'actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleAction(row, 'APPROVED')}
                        className="px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm active:scale-95"
                    >
                        Approve
                    </button>
                    <button
                        onClick={() => handleAction(row, 'REJECTED')}
                        className="px-6 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-black hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-red-100 shadow-sm active:scale-95"
                    >
                        Reject
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Authorization Queue</h2>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        Attendance Unlock Requests • {user?.departmentName}
                    </p>
                </div>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={requests}
                    loading={loading}
                    emptyMessage="Queue clear. No pending authorization requests."
                    actions={false}
                />
            </div>
        </div>
    );
}
