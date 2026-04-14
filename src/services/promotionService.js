// ============================================
// BDCS - Promote Teacher to HOD Service
// Handles teacher promotion while preserving teaching data
// ============================================

import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logPromotion } from '../utils/roleAuditLogger';
import { logAudit } from '../utils/auditLogger';

/**
 * Promote a teacher to HOD role
 * @param {string} userId - User ID to promote
 * @param {string} departmentId - Department to assign as HOD
 * @param {object} currentPrincipal - Principal performing the action
 */
export async function promoteTeacherToHOD(userId, departmentId, currentPrincipal) {
    try {
        const userRef = doc(db, 'users', userId);
        const departmentRef = doc(db, 'departments', departmentId);

        // Get user and department data
        const [userDoc, deptDoc] = await Promise.all([
            getDoc(userRef),
            getDoc(departmentRef)
        ]);

        if (!userDoc.exists() || !deptDoc.exists()) {
            throw new Error('User or department not found');
        }

        const user = { id: userDoc.id, ...userDoc.data() };
        const department = { id: deptDoc.id, ...deptDoc.data() };

        // Check if department already has an HOD
        if (department.currentHOD && department.currentHOD !== userId) {
            throw new Error(`${department.name} already has an HOD. Please demote or transfer first.`);
        }

        // Get current roles
        const currentRoles = user.roles || [user.role];
        const oldRoles = [...currentRoles];

        // Add HOD role if not already present
        const updatedRoles = currentRoles.includes('hod')
            ? currentRoles
            : [...currentRoles, 'hod'];

        // Update user document
        await updateDoc(userRef, {
            roles: updatedRoles,
            departmentId: departmentId,
            departmentName: department.name,
            isHOD: true,
            hodSince: new Date(),
            hodPromotedBy: currentPrincipal.uid,
            hodPromotedAt: new Date()
        });

        // Update department document
        await updateDoc(departmentRef, {
            currentHOD: userId,
            currentHODName: user.name,
            hodAssignedDate: new Date()
        });

        // Log standard audit
        await logAudit({
            action: 'promote_to_hod',
            performedBy: currentPrincipal.uid,
            performedByName: currentPrincipal.displayName || currentPrincipal.email,
            targetUser: userId,
            targetUserName: user.name,
            departmentId: departmentId,
            departmentName: department.name,
            details: `Promoted ${user.name} from Teacher to HOD of ${department.name}`,
            timestamp: new Date()
        });

        // Log role change for tracking
        await logPromotion(user, department, oldRoles);

        return {
            success: true,
            message: `${user.name} promoted to HOD successfully`,
            userData: {
                ...user,
                roles: updatedRoles,
                isHOD: true
            }
        };
    } catch (error) {
        console.error('Error promoting teacher to HOD:', error);
        throw error;
    }
}

/**
 * Demote HOD to Teacher role
 * @param {string} userId - User ID to demote
 * @param {string} departmentId - Department they are HOD of
 * @param {string} reason - Reason for demotion (optional)
 * @param {object} currentPrincipal - Principal performing the action
 */
export async function demoteHODToTeacher(userId, departmentId, reason = '', currentPrincipal) {
    try {
        const userRef = doc(db, 'users', userId);
        const departmentRef = doc(db, 'departments', departmentId);

        // Get user and department data
        const [userDoc, deptDoc] = await Promise.all([
            getDoc(userRef),
            getDoc(departmentRef)
        ]);

        if (!userDoc.exists() || !deptDoc.exists()) {
            throw new Error('User or department not found');
        }

        const user = { id: userDoc.id, ...userDoc.data() };
        const department = { id: deptDoc.id, ...deptDoc.data() };

        // Verify user is current HOD
        if (department.currentHOD !== userId) {
            throw new Error(`${user.name} is not the current HOD of ${department.name}`);
        }

        // Get current roles and remove HOD
        const currentRoles = user.roles || [user.role];
        const oldRoles = [...currentRoles];
        const updatedRoles = currentRoles.filter(r => r !== 'hod');

        // If no roles left after removing HOD, keep teacher
        if (updatedRoles.length === 0) {
            updatedRoles.push('teacher');
        }

        // Update user document - remove HOD role but keep teaching assignments
        await updateDoc(userRef, {
            roles: updatedRoles,
            isHOD: false,
            hodDemotedAt: new Date(),
            hodDemotedBy: currentPrincipal.uid,
            hodDemotionReason: reason
            // Keep departmentId if still teaching there
            // Keep all teaching assignments intact
        });

        // Update department document - remove HOD assignment
        await updateDoc(departmentRef, {
            currentHOD: null,
            currentHODName: null,
            previousHOD: userId,
            previousHODName: user.name,
            hodRemovedDate: new Date()
        });

        // Log standard audit
        await logAudit({
            action: 'demote_to_teacher',
            performedBy: currentPrincipal.uid,
            performedByName: currentPrincipal.displayName || currentPrincipal.email,
            targetUser: userId,
            targetUserName: user.name,
            departmentId: departmentId,
            departmentName: department.name,
            details: `Demoted ${user.name} from HOD to Teacher. Reason: ${reason || 'Not specified'}`,
            timestamp: new Date()
        });

        // Log role change for tracking
        const { logDemotion } = await import('../utils/roleAuditLogger');
        await logDemotion(user, department, oldRoles, reason);

        return {
            success: true,
            message: `${user.name} demoted from HOD. Department ownership removed.`,
            userData: {
                ...user,
                roles: updatedRoles,
                isHOD: false
            },
            requiresNewHOD: true,
            departmentId: departmentId,
            departmentName: department.name
        };
    } catch (error) {
        console.error('Error demoting HOD to teacher:', error);
        throw error;
    }
}
