// ============================================
// BDCS - HOD Event Approvals
// Manage Event Proposals — "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/admin/DataTable';
import StatusPill from '../../components/common/StatusPill';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventApprovals() {
    const { user, loading: authLoading } = useAuth();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFilter, setCurrentFilter] = useState('pending');

    useEffect(() => {
        if (!authLoading && user) fetchRequests();
    }, [user, authLoading]);

    useEffect(() => {
        if (currentFilter === 'all') {
            setFilteredEvents(events);
        } else {
            setFilteredEvents(events.filter(e => e.status === currentFilter));
        }
    }, [events, currentFilter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            let q;
            if (user.departmentId) {
                q = query(collection(db, 'events'), where('departmentId', '==', user.departmentId));
            } else {
                q = query(collection(db, 'events'));
            }

            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setEvents(data);
        } catch (error) {
            console.error('Error fetching event requests:', error);
            toast.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        const reason = status === 'rejected' ? window.prompt('Enter rejection reason:') : null;
        if (status === 'rejected' && !reason) return;

        try {
            await updateDoc(doc(db, 'events', id), {
                status,
                approverId: user.uid,
                approverName: user.name,
                rejectionReason: reason || null,
                approvedAt: serverTimestamp()
            });
            toast.success(`Manifest ${status.toUpperCase()} Successfully`);
            setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        } catch (error) {
            console.error('Error updating event:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        {
            header: 'Event Identity',
            field: 'title',
            render: (row) => (
                <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E31E24] flex items-center justify-center font-black text-[10px] border border-red-100 shadow-sm">
                        {row.title?.[0]}
                    </div>
                    <div>
                        <div className="font-black text-gray-900 tracking-tight">{row.title}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{row.type}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Origin (Organizer)',
            field: 'organizerName',
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <div className="font-bold text-gray-800 tracking-tight text-sm">{row.organizerName}</div>
                    <div className="text-[10px] font-black text-violet-600 uppercase tracking-widest">{row.batchName || row.organizerRole}</div>
                </div>
            )
        },
        {
            header: 'Jurisdiction',
            field: 'scope',
            render: (row) => {
                const scope = row.scope || 'department';
                const colors = {
                    department: 'bg-violet-50 text-violet-600 border-violet-100',
                    college: 'bg-blue-50 text-blue-600 border-blue-100',
                    campus: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                };
                return (
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${colors[scope] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {scope}
                    </span>
                );
            }
        },
        {
            header: 'Schedule & Sector',
            field: 'date',
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <div className="text-sm font-bold text-gray-700">{row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.venue || 'Global Campus'}</div>
                </div>
            )
        },
        {
            header: 'Protocol Status',
            field: 'status',
            render: (row) => <StatusPill status={row.status} />
        },
        {
            header: 'Operations',
            field: 'actions',
            render: (row) => row.status === 'pending' || row.status === 'pending_hod' ? (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleAction(row.id, 'approved')}
                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button
                        onClick={() => handleAction(row.id, 'rejected')}
                        className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-black hover:text-white transition-all border border-red-100 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            ) : (
                <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">
                    Resolved
                </div>
            )
        }
    ];

    if (authLoading) return null;

    return (
        <div className="space-y-8 pb-12">
            {/* Executive Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Event List</h2>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        Manage Event Permissions • {user?.departmentName}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/50 backdrop-blur-xl p-2 rounded-[2rem] border border-gray-100 flex flex-wrap items-center gap-1">
                        {['pending', 'approved', 'rejected', 'all'].map(f => (
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

            {/* Tabular Event Ledger */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-blue-500/5 min-h-[400px]">
                <DataTable
                    columns={columns}
                    data={filteredEvents}
                    loading={loading}
                    actions={false}
                    emptyMessage={`Event archive is void for isolated sector: ${currentFilter}`}
                />
            </div>
        </div>
    );
}

