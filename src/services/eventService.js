// ============================================
// BDCS - Event Service
// Handles event proposals, approvals, scoped queries, and registrations
// ============================================

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    deleteDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Event scope levels:
 *   'department' → visible to students in same department only
 *   'college'    → visible to all students in same college
 *   'campus'     → visible to ALL students across all colleges/departments
 */

// ─────────────────────────────────────────────
// STUDENT: Get visible approved events
// ─────────────────────────────────────────────
export async function getStudentEvents(user) {
    try {
        const snap = await getDocs(
            query(collection(db, 'events'), where('status', '==', 'approved'))
        );

        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Client-side scope filter (avoids composite Firestore indexes)
        return all.filter(ev => {
            switch (ev.scope) {
                case 'campus':
                    return true; // Everyone sees campus-level events
                case 'college':
                    return ev.collegeId === user.collegeId;
                case 'department':
                    return ev.departmentId === user.departmentId;
                default:
                    // Legacy events without scope: show if same department or public visibility
                    if (ev.visibility === 'Public') return true;
                    if (ev.visibility === 'Department' && ev.departmentId === user.departmentId) return true;
                    if (ev.visibility === 'Batch' && ev.batchId === user.batchId) return true;
                    return false;
            }
        }).sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : (a.startDate?.toDate?.() ?? new Date(0));
            const dateB = b.date ? new Date(b.date) : (b.startDate?.toDate?.() ?? new Date(0));
            return dateA - dateB;
        });
    } catch (error) {
        console.error('eventService.getStudentEvents:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────
// PRESIDENT: Propose an event
// ─────────────────────────────────────────────
export async function proposeEvent(formData, user) {
    const { title, type, description, date, venue, scope } = formData;
    try {
        const payload = {
            title: title.trim(),
            type,
            description: description.trim(),
            date,                            // stored as yyyy-mm-dd string
            venue: venue?.trim() || 'TBA',
            scope,                           // 'department' | 'college' | 'campus'

            // Organizer info
            organizerId: user.uid,
            organizerName: user.name,
            organizerRole: 'Student President',

            // Scoping keys — always populated so HOD/Principal can filter
            batchId: user.batchId || null,
            batchName: user.batchName || null,
            departmentId: user.departmentId || null,
            departmentName: user.departmentName || null,
            collegeId: user.collegeId || null,
            collegeName: user.collegeName || null,

            // Approval fields
            status: 'pending',
            approvedBy: null,
            approverName: null,
            rejectionReason: null,
            approvedAt: null,

            createdAt: serverTimestamp()
        };

        const ref = await addDoc(collection(db, 'events'), payload);
        return ref.id;
    } catch (error) {
        console.error('eventService.proposeEvent:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────
// STUDENT: Register for an event
// ─────────────────────────────────────────────
export async function registerForEvent(eventId, eventTitle, user) {
    try {
        // Check if already registered
        const existing = await getDocs(
            query(
                collection(db, 'event_participants'),
                where('eventId', '==', eventId),
                where('studentId', '==', user.uid)
            )
        );
        if (!existing.empty) return; // idempotent

        await addDoc(collection(db, 'event_participants'), {
            eventId,
            eventTitle,
            studentId: user.uid,
            studentName: user.name,
            enrollmentNumber: user.enrollmentNumber || null,
            batchId: user.batchId || null,
            departmentId: user.departmentId || null,
            status: 'joined',
            joinedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('eventService.registerForEvent:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────
// STUDENT: Unregister from an event
// ─────────────────────────────────────────────
export async function unregisterFromEvent(eventId, userId) {
    try {
        const snap = await getDocs(
            query(
                collection(db, 'event_participants'),
                where('eventId', '==', eventId),
                where('studentId', '==', userId)
            )
        );
        for (const d of snap.docs) {
            await deleteDoc(doc(db, 'event_participants', d.id));
        }
    } catch (error) {
        console.error('eventService.unregisterFromEvent:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────
// STUDENT: Get list of event IDs they registered for
// ─────────────────────────────────────────────
export async function getMyRegistrations(userId) {
    try {
        const snap = await getDocs(
            query(collection(db, 'event_participants'), where('studentId', '==', userId))
        );
        return snap.docs.map(d => d.data().eventId);
    } catch (error) {
        console.error('eventService.getMyRegistrations:', error);
        return [];
    }
}

// ─────────────────────────────────────────────
// STUDENT: Get proposals submitted by this student
// ─────────────────────────────────────────────
export async function getMyProposals(userId) {
    try {
        const snap = await getDocs(
            query(collection(db, 'events'), where('organizerId', '==', userId))
        );
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
        console.error('eventService.getMyProposals:', error);
        return [];
    }
}
