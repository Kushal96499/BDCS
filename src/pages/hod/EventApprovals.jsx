import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { toast } from '../../components/admin/Toast';

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
                // Preferred: filter by department
                q = query(
                    collection(db, 'events'),
                    where('departmentId', '==', user.departmentId)
                );
            } else if (user.collegeId) {
                // Fallback: filter by college
                q = query(
                    collection(db, 'events'),
                    where('collegeId', '==', user.collegeId)
                );
            } else {
                // Last resort: fetch all events
                q = query(collection(db, 'events'));
            }

            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort by Date (Newest First)
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

        if (!confirm(`Are you sure you want to ${status.toUpperCase()} this event?`)) return;

        try {
            await updateDoc(doc(db, 'events', id), {
                status,
                approverId: user.uid,
                approverName: user.name,
                rejectionReason: reason || null,
                approvedAt: serverTimestamp()
            });
            toast.success(`Event ${status.toUpperCase()} Successfully`);
            setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        } catch (error) {
            console.error('Error updating event:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        {
            header: 'Event Details',
            field: 'title',
            render: (row) => (
                <div>
                    <div className="font-bold text-gray-900">{row.title}</div>
                    <div className="text-xs text-biyani-red font-medium">{row.type}</div>
                </div>
            )
        },
        {
            header: 'Organizer',
            field: 'organizerName',
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-800">{row.organizerName}</div>
                    <div className="text-xs text-gray-500">{row.batchName || row.organizerRole}</div>
                </div>
            )
        },
        {
            header: 'Scope',
            field: 'scope',
            render: (row) => {
                const scopeColors = {
                    department: 'bg-violet-100 text-violet-700',
                    college: 'bg-blue-100 text-blue-700',
                    campus: 'bg-emerald-100 text-emerald-700',
                };
                const scopeLabels = { department: '🏛️ Dept', college: '🏫 College', campus: '🌐 Campus' };
                const scope = row.scope || 'department';
                return (
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${scopeColors[scope] || 'bg-gray-100 text-gray-600'}`}>
                        {scopeLabels[scope] || scope}
                    </span>
                );
            }
        },
        {
            header: 'Date & Venue',
            field: 'date',
            render: (row) => (
                <div className="text-sm">
                    <div>{row.date ? new Date(row.date).toLocaleDateString() : 'TBD'}</div>
                    <div className="text-gray-500 text-xs">{row.venue}</div>
                </div>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Actions',
            field: 'actions',
            render: (row) => row.status === 'pending' ? (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction(row.id, 'approved')}
                        className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        title="Approve"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button
                        onClick={() => handleAction(row.id, 'rejected')}
                        className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        title="Reject"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            ) : (
                <span className="text-xs text-gray-400 font-mono">
                    {row.status === 'approved' ? `Approved by ${row.approverName || 'HOD'}` : 'Resolved'}
                </span>
            )
        }
    ];

    // Don't attempt to render until auth is resolved
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-biyani-red"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Event Approvals & History</h2>
                    <p className="text-sm text-gray-600">
                        Manage event proposals for {user?.departmentName || user?.collegeName || 'your department'}
                    </p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    {['pending', 'approved', 'rejected', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setCurrentFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${currentFilter === f ? 'bg-white shadow-sm text-biyani-red' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {f}
                            {f !== 'all' && (
                                <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {events.filter(e => e.status === f).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={filteredEvents}
                    loading={loading}
                    actions={false}
                    emptyMessage={`No ${currentFilter === 'all' ? '' : currentFilter + ' '}events found.`}
                />

            </div>
        </div>
    );
}

