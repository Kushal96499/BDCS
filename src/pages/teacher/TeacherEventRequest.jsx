import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { motion } from 'framer-motion';
import StatusBadge from '../../components/admin/StatusBadge';

export default function TeacherEventExplorer() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.departmentId) fetchEvents();
    }, [user]);

    const fetchEvents = async () => {
        try {
            // Fetch ALL events for the department (Pending, Approved, Rejected)
            // Note: complex queries like 'orderBy' with 'where' might need index.
            // Using client-side sort for safety now.
            const q = query(
                collection(db, 'events'),
                where('departmentId', '==', user.departmentId)
            );

            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Client-side sort by date (newest first)
            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="p-10 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-biyani-red border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Loading Department Events...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Department Events</h1>
                    <p className="text-gray-500 font-medium">Overview of all student events in {user.departmentName}</p>
                </div>
                <button
                    onClick={fetchEvents}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-bold text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh
                </button>
            </div>

            {events.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-16 text-center border border-gray-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-4">📅</div>
                    <p className="text-xl font-bold text-gray-900">No Events Found</p>
                    <p className="text-gray-500 mt-2 max-w-sm">There are currently no event proposals or history for this department.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${event.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        event.status === 'rejected' ? 'bg-red-50 text-red-700' :
                                            'bg-yellow-50 text-yellow-700'
                                    }`}>
                                    {event.status === 'pending_hod' || event.status === 'pending' ? 'Under Review' : event.status}
                                </span>
                                <span className="text-xs font-mono text-gray-400">
                                    {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-biyani-red transition-colors line-clamp-2">
                                {event.title}
                            </h3>

                            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 font-medium">
                                <span className="bg-gray-100 px-2 py-1 rounded">{event.type}</span>
                                <span>•</span>
                                <span>{event.venue}</span>
                            </div>

                            <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
                                {event.description}
                            </p>

                            <div className="pt-4 border-t border-gray-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                                    {(event.organizerName || 'SC')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate">{event.organizerName}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">
                                        {event.organizerRole || 'Organizer'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
