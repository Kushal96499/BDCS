// ============================================
// useStudents - Custom hook for fetching students in a batch
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useStudents = (batchId) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStudents = useCallback(async () => {
        if (!batchId) {
            setStudents([]);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const q = query(
                collection(db, 'users'),
                where('batchId', '==', batchId),
                where('role', '==', 'student')
            );
            const snap = await getDocs(q);
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('useStudents: Error fetching students', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    return { students, loading, error, refetch: fetchStudents };
};
