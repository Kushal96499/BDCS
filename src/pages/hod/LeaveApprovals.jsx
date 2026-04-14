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
            // Fallback for indexing errors
            toast.error("Could not fetch requests. Index might be building.");
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
            toast.success(`Leave request ${action.toLowerCase()} for ${teacherName}`);
        } catch (error) {
            console.error('Error updating leave request:', error);
            toast.error("Action failed");
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Sick Leave': return 'bg-red-100 text-red-700';
            case 'Casual Leave': return 'bg-blue-100 text-blue-700';
            case 'Duty Leave': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Leave Approvals</h1>
                    <p className="text-gray-500 font-medium">Manage faculty leave applications</p>
                </div>

                <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                    {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === status
                                    ? 'bg-black text-white shadow-md'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-gray-400 font-medium">Loading requests...</div>
            ) : requests.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
                    <span className="text-4xl block mb-2">✨</span>
                    <h3 className="text-lg font-bold text-gray-900">No {filter.toLowerCase()} requests</h3>
                    <p className="text-gray-500 text-sm">You're all caught up!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {requests.map((req) => (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                                            {req.teacherName?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 leading-tight">{req.teacherName}</h3>
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${getTypeColor(req.leaveType)}`}>
                                                {req.leaveType}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-500">Duration</p>
                                        <p className="font-bold text-gray-900">{req.days} Day{req.days > 1 ? 's' : ''}</p>
                                    </div>
                                </div>

                                <div className="flex-1 bg-gray-50 rounded-xl p-4 mb-6">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500 font-medium">From</span>
                                        <span className="font-bold text-gray-900">{req.startDate}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="text-gray-500 font-medium">To</span>
                                        <span className="font-bold text-gray-900">{req.endDate}</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-3">
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">Reason</p>
                                        <p className="text-sm text-gray-700 leading-relaxed italic">"{req.reason}"</p>
                                    </div>
                                </div>

                                {filter === 'PENDING' && (
                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        <button
                                            onClick={() => handleAction(req.id, 'REJECTED', req.teacherName)}
                                            className="px-4 py-3 rounded-xl border border-red-100 text-red-600 font-bold hover:bg-red-50 transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'APPROVED', req.teacherName)}
                                            className="px-4 py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-shadow shadow-lg shadow-gray-200"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                )}

                                {filter !== 'PENDING' && (
                                    <div className={`mt-auto text-center py-2 rounded-lg font-bold text-sm ${filter === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {filter} by {req.actionedByName || 'HOD'}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
