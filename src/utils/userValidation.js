// ============================================
// BDCS - User Deletion Validation Utility
// Checks for dependencies that prevent hard deletion
// ============================================

import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Validate if a user can be safely force-deleted
 * 
 * Rules for Safe Deletion:
 * 1. User has created NO child users (createdBy check)
 * 2. User has NO ownership (HOD of department, Principal of College)
 * 3. User has NO pending approvals (future scope)
 * 
 * @param {object} user - User object to validate
 * @returns {Promise<{valid: boolean, reason?: string, details?: object}>}
 */
export async function validateUserDeletion(user) {
    if (!user || !user.id) return { valid: false, reason: 'Invalid user data' };

    try {
        const errors = [];
        const details = {};

        // 1. Check if user has created other users (Child Users)
        const childrenQuery = query(
            collection(db, 'users'),
            where('createdBy', '==', user.id)
        );
        const childrenSnapshot = await getCountFromServer(childrenQuery);
        const childrenCount = childrenSnapshot.data().count;

        if (childrenCount > 0) {
            errors.push(`User has created ${childrenCount} other users.`);
            details.childrenCount = childrenCount;
        }

        // 2. Check Ownership - Department HOD
        if (user.role === 'hod') {
            const deptQuery = query(
                collection(db, 'departments'),
                where('hodId', '==', user.id),
                where('status', '==', 'active') // Only check active departments
            );
            const deptSnapshot = await getDocs(deptQuery);
            if (!deptSnapshot.empty) {
                const deptNames = deptSnapshot.docs.map(d => d.data().name).join(', ');
                errors.push(`User is currently HOD of: ${deptNames}`);
                details.departments = deptSnapshot.docs.map(d => ({ id: d.id, name: d.data().name }));
            }
        }

        // 3. Check Ownership - College Principal
        if (user.role === 'principal') {
            const collegeQuery = query(
                collection(db, 'colleges'),
                where('principalId', '==', user.id),
                where('status', '==', 'active')
            );
            const collegeSnapshot = await getDocs(collegeQuery);
            if (!collegeSnapshot.empty) {
                const collegeNames = collegeSnapshot.docs.map(d => d.data().name).join(', ');
                errors.push(`User is currently Principal of: ${collegeNames}`);
                details.colleges = collegeSnapshot.docs.map(d => ({ id: d.id, name: d.data().name }));
            }
        }

        if (errors.length > 0) {
            return {
                valid: false,
                reason: 'Dependencies detected',
                errors: errors,
                details: details
            };
        }

        return { valid: true };

    } catch (error) {
        console.error('Error validating user deletion:', error);
        // Fail safe - if check fails, assume unsafe
        return { valid: false, reason: 'Validation check failed due to system error' };
    }
}
