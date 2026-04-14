// ============================================
// BDCS - Event List (Faculty)
// Manage events created by the faculty member
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import { toast } from '../../components/admin/Toast';
import EventForm from './EventForm';

export default function EventList() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    useEffect(() => {
        if (user) fetchEvents();
    }, [user]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            // Fetch events organized by this faculty
            const q = query(
                collection(db, 'events'),
                where('organizerId', '==', user.uid),
                orderBy('updatedAt', 'desc')
            );
            const snap = await getDocs(q);
            setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            await deleteDoc(doc(db, 'events', id));
            toast.success('Event deleted');
            fetchEvents();
        } catch (error) {
            toast.error('Failed to delete event');
        }
    };

    const columns = [
        { key: 'title', label: 'Event Title' },
        { key: 'category', label: 'Category', render: (row) => <span className="capitalize">{row.category}</span> },
        { key: 'date', label: 'Date', render: (row) => row.startDate ? new Date(row.startDate.toDate()).toLocaleDateString() : 'N/A' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'actions', label: 'Actions', render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => { setEditingEvent(row); setShowForm(true); }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        disabled={row.status === 'approved' || row.status === 'completed'} // Locked if approved
                    >
                        {row.status === 'draft' || row.status === 'rejected' ? 'Edit' : 'View'}
                    </button>
                    {row.status === 'draft' && (
                        <button
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                            Delete
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">My Events</h2>
                    <p className="text-sm text-gray-600">Manage academic and co-curricular events</p>
                </div>
                <button
                    onClick={() => { setEditingEvent(null); setShowForm(true); }}
                    className="bg-biyani-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                    + Create Event
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={events}
                    loading={loading}
                    emptyMessage="No events found. Create one to get started!"
                />
            </div>

            {showForm && (
                <EventForm
                    isOpen={showForm}
                    onClose={() => setShowForm(false)}
                    initialData={editingEvent}
                    onSuccess={() => {
                        setShowForm(false);
                        fetchEvents();
                    }}
                />
            )}
        </div>
    );
}
