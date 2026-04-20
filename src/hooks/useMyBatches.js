// ============================================
// useMyBatches - Custom hook for teacher batch data
// Fetches all batches assigned to a teacher (Class Teacher + Subject Teacher)
// ============================================

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useMyBatches = (userId) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBatches = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const batchesMap = new Map();

            // 1. Fetch Class Teacher Batches (Primary Responsibility)
            const ctQ = query(
                collection(db, 'batches'),
                where('classTeacherId', '==', userId),
                where('status', '==', 'active')
            );
            const ctSnap = await getDocs(ctQ);
            ctSnap.forEach(doc => {
                batchesMap.set(doc.id, { id: doc.id, ...doc.data(), role: 'Class Teacher' });
            });

            // 2. Fetch Subject Teacher Assignments (Allocated via HOD)
            const saQ = query(
                collection(db, 'class_assignments'),
                where('teacherId', '==', userId)
            );
            const saSnap = await getDocs(saQ);
            
            // For each assignment, we need the latest batch state to check for 'historical' status
            const assignmentResults = await Promise.all(saSnap.docs.map(async (assignDoc) => {
                const assignData = assignDoc.data();
                const batchDoc = await getDoc(doc(db, 'batches', assignData.batchId));
                if (batchDoc.exists()) {
                    const batchData = batchDoc.data();
                    const isHistorical = parseInt(assignData.semester) < parseInt(batchData.currentSemester || 0);
                    
                    return {
                        id: `assign_${assignDoc.id}`,
                        assignmentId: assignDoc.id,
                        batchId: assignData.batchId,
                        name: assignData.batchName, // Only batch name for consistency in filters
                        subjectName: assignData.subjectName,
                        subjectCode: assignData.subjectCode,
                        currentSemester: batchData.currentSemester,
                        assignedSemester: assignData.semester,
                        role: 'Subject Teacher',
                        isHistorical
                    };
                }
                return null;
            }));

            const finalAssignments = assignmentResults.filter(a => a !== null);
            
            // Combine Class Teacher roles and Subject Teacher assignments
            const combined = [
                ...Array.from(batchesMap.values()),
                ...finalAssignments
            ];

            setBatches(combined);
        } catch (err) {
            console.error('useMyBatches: Error fetching combined assignments', err);
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
