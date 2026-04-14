// ============================================
// BDCS - Ownership Transfer Utility
// transferring authority (HOD, Principal) to successors
// ============================================

import { doc, updateDoc, serverTimestamp, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Transfer ownership of institutional entities from one user to another.
 * Handles HOD -> Department and Principal -> College transfers.
 * 
 * @param {object} currentUser - The admin performing the action
 * @param {object} relievedUser - The user being relieved
 * @param {object} successorUser - The successor user taking over
 * @returns {Promise<object>} - Result summary { transferred: [], errors: [] }
 */
export async function transferOwnership(currentUser, relievedUser, successorUser) {
    const result = { transferred: [], errors: [] };

    if (!relievedUser || !successorUser) {
        throw new Error('Relieved user and successor are required');
    }

    try {
        const batch = writeBatch(db);
        let batchCount = 0;

        // 1. HOD Transfer (Department Ownership)
        if (relievedUser.role === 'hod') {
            // Find departments where this user is HOD
            const deptQuery = query(
                collection(db, 'departments'),
                where('hodId', '==', relievedUser.id),
                where('status', '==', 'active')
            );
            const deptSnap = await getDocs(deptQuery);

            deptSnap.forEach(docSnap => {
                const deptRef = doc(db, 'departments', docSnap.id);
                // We use updateDoc usually, but for batch we need the ref
                // However, mixing batch and unrelated updates is tricky if they are in different functions.
                // We'll try to do it transactionally or just await sequentially for simplicity if batching is complex across modules.
                // Here we will use sequential updates for clarity and better error handling per item.
            });

            // Actually, let's use Promise.all for parallel updates
            const updatePromises = deptSnap.docs.map(async (docSnap) => {
                const deptRef = doc(db, 'departments', docSnap.id);
                await updateDoc(deptRef, {
                    hodId: successorUser.id,
                    hodName: successorUser.name,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser.uid
                });
                result.transferred.push(`Department: ${docSnap.data().name}`);
            });
            await Promise.all(updatePromises);
        }

        // 2. Principal Transfer (College Ownership)
        if (relievedUser.role === 'principal') {
            const collegeQuery = query(
                collection(db, 'colleges'),
                where('principalId', '==', relievedUser.id),
                where('status', '==', 'active')
            );
            const collegeSnap = await getDocs(collegeQuery);

            const updatePromises = collegeSnap.docs.map(async (docSnap) => {
                const collegeRef = doc(db, 'colleges', docSnap.id);
                await updateDoc(collegeRef, {
                    principalId: successorUser.id,
                    principalName: successorUser.name,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser.uid
                });
                result.transferred.push(`College: ${docSnap.data().name}`);
            });
            await Promise.all(updatePromises);
        }

        // 3. Director Transfer (Campus Ownership - Future Scope?)
        // Currently Director might not be explicitly linked in Campus doc schema in this conversation context, 
        // but if it were, we'd handle it here.

        return result;

    } catch (error) {
        console.error('Error transferring ownership:', error);
        throw error;
    }
}
