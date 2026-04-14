// ============================================
// BDCS - Role Change Audit Logger
// Tracks all role assignment, promotion, demotion events
// ============================================

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

/**
 * Log a role change event
 * @param {string} eventType - Type of event (assign_self_role, promote_to_hod, demote_to_teacher, etc.)
 * @param {object} userData - User whose role is changing
 * @param {object} changes - Details about the change
 */
export async function logRoleChange(eventType, userData, changes) {
    try {
        const currentUser = auth.currentUser;

        const auditEntry = {
            event: eventType,
            category: 'role_management',

            // User being affected
            userId: userData.uid || userData.id,
            userName: userData.name || userData.displayName,
            userEmail: userData.email,

            // Role changes
            oldRoles: changes.oldRoles || [],
            newRoles: changes.newRoles || [],
            roleAdded: changes.roleAdded || null,
            roleRemoved: changes.roleRemoved || null,

            // Context
            collegeId: userData.collegeId || changes.collegeId,
            collegeName: userData.collegeName || changes.collegeName,
            departmentId: changes.departmentId || userData.departmentId,
            departmentName: changes.departmentName || userData.departmentName,

            // Who performed the action
            performedBy: currentUser?.uid || 'system',
            performedByName: currentUser?.displayName || currentUser?.email || 'System',
            performedByEmail: currentUser?.email,

            // Additional details
            details: changes.details || '',
            reason: changes.reason || '',
            effectiveDate: changes.effectiveDate || new Date(),

            // Metadata
            timestamp: serverTimestamp(),
            ipAddress: null, // Can be added if needed
            userAgent: navigator?.userAgent || null
        };

        await addDoc(collection(db, 'audit_logs'), auditEntry);

        console.log(`✅ Role change logged: ${eventType}`, auditEntry);
        return { success: true };
    } catch (error) {
        console.error('❌ Error logging role change:', error);
        // Don't throw - audit logging failures shouldn't block operations
        return { success: false, error };
    }
}

/**
 * Log self-assignment event (Principal assigns self as HOD)
 */
export async function logSelfAssignment(userData, departmentData) {
    return logRoleChange('assign_self_role', userData, {
        oldRoles: userData.roles || [userData.role],
        newRoles: [...(userData.roles || [userData.role]), 'hod'],
        roleAdded: 'hod',
        departmentId: departmentData.id,
        departmentName: departmentData.name,
        details: `${userData.name} assigned themselves as HOD of ${departmentData.name}`,
        effectiveDate: new Date()
    });
}

/**
 * Log Teacher → HOD promotion
 */
export async function logPromotion(userData, departmentData, oldRoles) {
    const newRoles = oldRoles.includes('hod') ? oldRoles : [...oldRoles, 'hod'];

    return logRoleChange('promote_to_hod', userData, {
        oldRoles,
        newRoles,
        roleAdded: 'hod',
        departmentId: departmentData.id,
        departmentName: departmentData.name,
        collegeId: userData.collegeId,
        collegeName: userData.collegeName,
        details: `${userData.name} promoted from Teacher to HOD of ${departmentData.name}`,
        effectiveDate: new Date()
    });
}

/**
 * Log HOD → Teacher demotion
 */
export async function logDemotion(userData, departmentData, oldRoles, reason = '') {
    const newRoles = oldRoles.filter(r => r !== 'hod');

    return logRoleChange('demote_to_teacher', userData, {
        oldRoles,
        newRoles,
        roleRemoved: 'hod',
        departmentId: departmentData.id,
        departmentName: departmentData.name,
        collegeId: userData.collegeId,
        collegeName: userData.collegeName,
        details: `${userData.name} demoted from HOD to Teacher`,
        reason,
        effectiveDate: new Date()
    });
}

/**
 * Log generic role assignment
 */
export async function logRoleAssignment(userData, role, context = {}) {
    const oldRoles = userData.roles || [userData.role];
    const newRoles = oldRoles.includes(role) ? oldRoles : [...oldRoles, role];

    return logRoleChange('assign_role', userData, {
        oldRoles,
        newRoles,
        roleAdded: role,
        ...context,
        details: context.details || `Role '${role}' assigned to ${userData.name}`
    });
}

/**
 * Log generic role removal
 */
export async function logRoleRemoval(userData, role, context = {}) {
    const oldRoles = userData.roles || [userData.role];
    const newRoles = oldRoles.filter(r => r !== role);

    return logRoleChange('remove_role', userData, {
        oldRoles,
        newRoles,
        roleRemoved: role,
        ...context,
        details: context.details || `Role '${role}' removed from ${userData.name}`
    });
}

/**
 * Get role change history for a user
 */
export async function getUserRoleHistory(userId) {
    try {
        const { getDocs, query, where, orderBy: fbOrderBy } = await import('firebase/firestore');

        const historyQuery = query(
            collection(db, 'audit_logs'),
            where('userId', '==', userId),
            where('category', '==', 'role_management'),
            fbOrderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(historyQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching role history:', error);
        return [];
    }
}
