// ============================================
// BDCS - Attendance Unlock Requests (Principal)
// Manage requests from teachers to unlock attendance
// Modernized "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { getCollegeDepartments } from '../../services/principalService';

export default function AttendanceUnlockRequests() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);

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
            toast.error('Failed to load access requests');
        } finally {
            setLoading(false);
        }
    };

    const getDeptName = (deptId) => {
        const d = departments.find(dept => dept.id === deptId);
        return d ? d.name : 'Unknown Department';
    };

    const handleAction = async (request, action) => {
        setActionLoading(request.id);
        try {
            const batch = writeBatch(db);
            const requestRef = doc(db, 'attendance_unlock_requests', request.id);

            if (action === 'APPROVE') {
                batch.update(requestRef, {
                    status: 'APPROVED',
                    actionBy: user.uid,
                    actionAt: serverTimestamp()
                });

                if (request.sessionId) {
                    const sessionRef = doc(db, 'attendance_sessions', request.sessionId);
                    batch.update(sessionRef, {
                        status: 'OPEN',
                        unlockedBy: user.uid,
                        unlockedAt: serverTimestamp()
                    });
                }
                toast.success('Access Granted • Session Unlocked');
            } else {
                batch.update(requestRef, {
                    status: 'REJECTED',
                    actionBy: user.uid,
                    actionAt: serverTimestamp()
                });
                toast.info('Access Request Denied');
            }

            await batch.commit();
            setRequests(prev => prev.filter(r => r.id !== request.id));
        } catch (error) {
            console.error('Action error:', error);
            toast.error('Administrative action failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Access Control</h2>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        Institutional Oversight • Attendance Unlock Registry
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-3 bg-white border border-gray-100 shadow-sm rounded-2xl hover:bg-gray-50 transition-all active:scale-95 group"
                >
                    <svg className={`w-5 h-5 text-gray-400 group-hover:text-blue-600 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white/50 rounded-[2.5rem] border border-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white/40 backdrop-blur-md rounded-[3rem] border border-dashed border-gray-200 p-20 text-center">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-100/50">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Protocol Verified</h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">No outstanding unlock requests detected.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {requests.map(request => (
                            <motion.div
                                key={request.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                                className="group relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden flex flex-col"
                            >
                                {/* Header */}
                                <div className="p-8 border-b border-gray-50 flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-600 flex items-center justify-center font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                            {request.teacherName?.[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">{request.teacherName}</h4>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{getDeptName(request.departmentId)}</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-red-50 text-[#E31E24] rounded-lg border border-red-100 text-[9px] font-black uppercase tracking-widest">
                                        Pending
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-8 space-y-5 flex-1 bg-gray-50/10">
                                    <div className="flex flex-col gap-1.5 p-5 bg-white rounded-2xl border border-gray-50 shadow-sm group-hover:bg-blue-50/30 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Academic Target</span>
                                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{request.date ? format(new Date(request.date), 'MMMM yyyy') : 'Term Scope'}</span>
                                        </div>
                                        <p className="text-sm font-black text-gray-900 tracking-tight">{request.batchName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2.5}/></svg>
                                            <span className="text-[11px] font-bold text-gray-600">{request.date ? format(new Date(request.date), 'EEEE, do MMM') : 'Indefinite Date'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1.5 h-6 bg-orange-400 rounded-full" />
                                        <p className="text-[10px] font-bold text-gray-500 italic leading-relaxed">
                                            Access requested {request.createdAt?.seconds ? format(new Date(request.createdAt.seconds * 1000), 'h:mm a') : 'just now'} via faculty terminal.
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-6 bg-gray-50/50 flex gap-3">
                                    <button
                                        onClick={() => handleAction(request, 'REJECT')}
                                        disabled={!!actionLoading}
                                        className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all disabled:opacity-30 border border-transparent hover:border-red-100"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => handleAction(request, 'APPROVE')}
                                        disabled={!!actionLoading}
                                        className="flex-[2] py-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-200 hover:bg-blue-600 hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 group/btn active:scale-95 disabled:opacity-50"
                                    >
                                        {actionLoading === request.id ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                                Authorize
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
