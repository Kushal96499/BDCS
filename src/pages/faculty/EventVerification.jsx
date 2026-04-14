// ============================================
// BDCS - Event Verification (Faculty)
// Verify student participation and assign winners
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/admin/DataTable';
import { toast } from '../../components/admin/Toast';

export default function EventVerification() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMyEvents();
    }, [user]);

    const fetchMyEvents = async () => {
        // Fetch approved events organized by this faculty
        const q = query(
            collection(db, 'events'),
            where('organizerId', '==', user.uid),
            where('status', '==', 'approved')
        );
        const snap = await getDocs(q);
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const loadParticipants = async (eventId) => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'event_participants'),
                where('eventId', '==', eventId)
            );
            const snap = await getDocs(q);
            setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (participant) => {
        if (!window.confirm(`Verify participation for ${participant.studentName}?`)) return;

        try {
            const batch = writeBatch(db);

            // 1. Update Participant Status
            const partRef = doc(db, 'event_participants', participant.id);
            batch.update(partRef, {
                status: 'verified',
                verifiedBy: user.uid,
                verifiedAt: serverTimestamp()
            });

            // 2. Create Timeline Entry
            const timelineRef = doc(collection(db, 'student_timelines'));
            batch.set(timelineRef, {
                studentId: participant.studentId,
                eventId: participant.eventId,
                title: `Participated in ${participant.eventTitle}`,
                category: 'event',
                date: serverTimestamp(),
                description: `Verified participation in ${participant.eventTitle}`,
                verifiedBy: user.name,
                createdAt: serverTimestamp()
            });

            await batch.commit();
            toast.success('Student Access Approved & Verified');

            // Local update
            setParticipants(prev => prev.map(p => p.id === participant.id ? { ...p, status: 'verified' } : p));

        } catch (error) {
            console.error('Verify error:', error);
            toast.error('Verification failed');
        }
    };

    const columns = [
        { key: 'studentName', label: 'Student Name' },
        { key: 'studentRoll', label: 'Roll No.' },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${row.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {row.status}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <button
                    onClick={() => handleVerify(row)}
                    disabled={row.status === 'verified'}
                    className={`px-3 py-1 text-sm font-medium rounded ${row.status === 'verified'
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                >
                    {row.status === 'verified' ? 'Verified' : 'Verify'}
                </button>
            )
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Participation Verification</h2>

            <div className="flex gap-4">
                <select
                    className="border p-2 rounded-lg w-full max-w-md"
                    onChange={(e) => {
                        const evt = events.find(ev => ev.id === e.target.value);
                        setSelectedEvent(evt);
                        if (evt) loadParticipants(evt.id);
                    }}
                >
                    <option value="">-- Select Event to Verify --</option>
                    {events.map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                </select>
            </div>

            {selectedEvent && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <DataTable
                        columns={columns}
                        data={participants}
                        loading={loading}
                        emptyMessage="No registered students yet."
                    />
                </div>
            )}
        </div>
    );
}
