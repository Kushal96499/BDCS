// ============================================
// BDCS - Leave Approvals (HOD)
// Manage faculty leave applications with premium UI
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeaveApprovals() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING'); // PENDING, APPROVED, REJECTED

    useEffect(() => {
        if (user) fetchRequests();
    }, [user, filter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'leave_requests'),
                where('departmentId', '==', user.departmentId),
                where('status', '==', filter),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            toast.error("Could not fetch requests. Please check your network.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, action, teacherName) => {
        try {
            await updateDoc(doc(db, 'leave_requests', requestId), {
                status: action,
                actionedBy: user.uid,
                actionedByName: user.name,
                actionedAt: serverTimestamp()
            });

            setRequests(prev => prev.filter(r => r.id !== requestId));
            toast.success(`Leave ${action.toLowerCase()} for ${teacherName}`);
        } catch (error) {
            console.error('Error updating leave request:', error);
            toast.error("Failed to save changes");
        }
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Leave Requests</h2>
                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        Management • Teacher Leaves
                    </p>
                </div>
                
                <div className="flex bg-white/70 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-gray-100">
                    {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filter === status
                                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-200'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-80 rounded-[2.5rem] bg-white animate-pulse border border-gray-50" />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-gray-50/50 rounded-[3rem] p-24 text-center border-4 border-dashed border-gray-100 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm text-gray-300 mb-6 font-black uppercase tracking-widest text-[10px]">
                        Cleared
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">No {filter.toLowerCase()} requests</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">No leave requests found in the system at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {requests.map((req, idx) => (
                            <LeaveCard 
                                key={req.id} 
                                req={req} 
                                idx={idx} 
                                onAction={handleAction} 
                                isPending={filter === 'PENDING'} 
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function LeaveCard({ req, idx, onAction, isPending }) {
    const getTypeStyle = (type) => {
        switch (type) {
            case 'Sick Leave': return { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' };
            case 'Casual Leave': return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' };
            case 'Duty Leave': return { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-500' };
            default: return { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-500' };
        }
    };

    const style = getTypeStyle(req.leaveType);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-xl hover:border-violet-100 transition-all relative overflow-hidden group"
        >
            <div className="relative z-10 flex flex-col h-full gap-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-sm font-black text-gray-600 border border-gray-100 shadow-inner group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                            {req.teacherName?.[0]}
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 tracking-tight leading-none mb-1">{req.teacherName}</h3>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.bg} ${style.text} text-[8px] font-black uppercase tracking-widest border border-current opacity-70`}>
                                <span className={`w-1 h-1 rounded-full ${style.dot} animate-pulse`} />
                                {req.leaveType}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Duration</p>
                        <p className="text-lg font-black text-gray-900 tracking-tighter">{req.days} Day{req.days > 1 ? 's' : ''}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-5 rounded-[1.5rem] border border-gray-100">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Start Date</p>
                        <p className="text-xs font-black text-gray-900 tracking-tight">{req.startDate}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">End Date</p>
                        <p className="text-xs font-black text-gray-900 tracking-tight">{req.endDate}</p>
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Leave</p>
                    <div className="bg-white border border-gray-50 p-4 rounded-2xl shadow-inner min-h-[80px]">
                        <p className="text-xs font-bold text-gray-600 leading-relaxed italic">
                            "{req.reason || 'No justification provided'}"
                        </p>
                    </div>
                </div>

                {isPending ? (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <button
                            onClick={() => onAction(req.id, 'REJECTED', req.teacherName)}
                            className="px-6 py-3.5 rounded-2xl border border-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => onAction(req.id, 'APPROVED', req.teacherName)}
                            className="px-6 py-3.5 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-black active:scale-95 transition-all"
                        >
                            Approve
                        </button>
                    </div>
                ) : (
                    <div className={`mt-2 py-3.5 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border ${
                        req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${req.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        Actioned by {req.actionedByName || 'Admin'}
                    </div>
                )}
            </div>
            
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-5 blur-3xl transition-transform duration-1000 group-hover:scale-150 ${style.bg}`} />
        </motion.div>
    );
}
