// ============================================
// useMyBatches - Custom hook for teacher batch data
// Fetches all batches assigned to a teacher (Class Teacher + Subject Teacher)
// ============================================

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useMyBatches = (userId) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBatches = async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);

        try {
            const batchesMap = new Map();

            // 1. Fetch Class Teacher Batches
            const ctQ = query(
                collection(db, 'batches'),
                where('classTeacherId', '==', userId),
                where('status', '==', 'active')
            );
            const ctSnap = await getDocs(ctQ);
            ctSnap.forEach(doc => {
                batchesMap.set(doc.id, { id: doc.id, ...doc.data(), role: 'Class Teacher' });
            });

            setBatches(Array.from(batchesMap.values()));
        } catch (err) {
            console.error('useMyBatches: Error fetching batches', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, [userId]);

    return { batches, loading, error, refetch: fetchBatches };
};
