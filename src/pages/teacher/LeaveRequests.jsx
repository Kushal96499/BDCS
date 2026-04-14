import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { motion } from 'framer-motion';

export default function LeaveRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        type: 'Sick Leave', // Sick, Casual, Duty, Other
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        if (user) fetchMyRequests();
    }, [user]);

    const fetchMyRequests = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'leave_requests'),
                where('teacherId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error("Could not fetch requests");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'leave_requests'), {
                ...formData,
                teacherId: user.uid,
                teacherName: user.name,
                departmentId: user.departmentId || '', // Important for HOD filtering
                status: 'PENDING',
                createdAt: serverTimestamp(),
                days: calculateDays(formData.startDate, formData.endDate)
            });
            toast.success("Leave Request Submitted");
            setShowForm(false);
            setFormData({ type: 'Sick Leave', startDate: '', endDate: '', reason: '' });
            fetchMyRequests();
        } catch (error) {
            console.error('Submit error:', error);
            toast.error("Submission failed");
        }
    };

    const calculateDays = (start, end) => {
        const diff = new Date(end) - new Date(start);
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // Inclusive
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'APPROVED': return { color: 'bg-green-100 text-green-700', icon: '✅' };
            case 'REJECTED': return { color: 'bg-red-100 text-red-700', icon: '❌' };
            default: return { color: 'bg-yellow-100 text-yellow-700', icon: '⏳' };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Leaves</h1>
                    <p className="text-gray-500 font-medium">History & Applications</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-shadow shadow-lg shadow-gray-200 flex items-center gap-2"
                >
                    {showForm ? 'Cancel Application' : '+ New Leave Request'}
                </button>
            </div>

            {/* Application Form */}
            {showForm && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100"
                >
                    <h3 className="text-xl font-bold mb-6">New Application</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Leave Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                >
                                    <option>Sick Leave</option>
                                    <option>Casual Leave</option>
                                    <option>Duty Leave (OD)</option>
                                    <option>Emergency Leave</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">From</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">To</label>
                                    <input
                                        type="date"
                                        required
                                        min={formData.startDate}
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Reason (Required)</label>
                            <textarea
                                required
                                rows="3"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Please detail the reason for your absence..."
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                            ></textarea>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" className="px-8 py-3 bg-biyani-red text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                                Submit Request →
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            {/* List */}
            {loading ? (
                <div className="py-20 text-center text-gray-400 font-medium">Loading history...</div>
            ) : requests.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
                    <span className="text-4xl block mb-2">🏖️</span>
                    <h3 className="text-lg font-bold text-gray-900">No Leave History</h3>
                    <p className="text-gray-500 text-sm">You haven't applied for any leaves yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {requests.map((req) => {
                        const status = getStatusInfo(req.status);
                        return (
                            <div key={req.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-lg text-gray-900">{req.type}</h3>
                                        <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-widest flex items-center gap-1 ${status.color}`}>
                                            {status.icon} {req.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm font-medium mb-4 line-clamp-2">" {req.reason} "</p>
                                </div>
                                <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm">
                                    <div className="font-bold text-gray-900">
                                        {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                    </div>
                                    <div className="text-gray-400 font-bold">{req.days} Days</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
