// ============================================
// BDCS - Role Management Service
// Handle multi-role assignments, permissions, and role switching
// ============================================

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logRoleAssign, logRoleRemove } from '../utils/auditLogger';

// Role hierarchy - who can create which roles
const ROLE_CREATION_PERMISSIONS = {
    admin: ['admin', 'director', 'principal', 'exam_cell', 'placement', 'hr', 'sports', 'warden', 'transport'],
    director: ['principal', 'exam_cell', 'hr'],
    principal: ['hod'], // Principal can create HODs
    hod: ['teacher'],
    teacher: ['student'],
    exam_cell: [],
    placement: [],
    hr: [],
    sports: [],
    warden: [],
    transport: []
};

// Role hierarchy levels (higher number = more authority)
const ROLE_HIERARCHY = {
    admin: 100,
    director: 90,
    principal: 80,
    hod: 70,
    teacher: 60,
    exam_cell: 55,
    placement: 55,
    hr: 55,
    sports: 50,
    warden: 50,
    transport: 50,
    student: 10
};

/**
 * Assign a new role to a user
 */
export async function assignRole(userId, role, scope, assignedByUser) {
    try {
        // Validate permission
        if (!canAssignRole(assignedByUser.primaryRole || assignedByUser.role, role)) {
            throw new Error(`${assignedByUser.primaryRole || assignedByUser.role} cannot assign ${role} role`);
        }

        // Check if assignment already exists
        const existingQuery = query(
            collection(db, 'roleAssignments'),
            where('userId', '==', userId),
            where('role', '==', role),
            where('status', '==', 'active'),
            where('scope.departmentId', '==', scope.departmentId || null),
            where('scope.collegeId', '==', scope.collegeId || null)
        );
        const existingSnap = await getDocs(existingQuery);

        if (!existingSnap.empty) {
            throw new Error('This role assignment already exists for this user');
        }

        // Get user's current roles to determine if this is original role
        const userRolesQuery = query(
            collection(db, 'roleAssignments'),
            where('userId', '==', userId),
            where('status', '==', 'active')
        );
        const userRolesSnap = await getDocs(userRolesQuery);
        const isOriginalRole = userRolesSnap.empty;

        // Create role assignment
        const assignment = {
            userId,
            role,
            scope: {
                campusId: scope.campusId || null,
                collegeId: scope.collegeId || null,
                departmentId: scope.departmentId || null
            },
            assignedBy: assignedByUser.uid,
            assignedAt: serverTimestamp(),
            status: 'active',
            metadata: {
                isOriginalRole,
                effectiveFrom: serverTimestamp(),
                effectiveTo: null
            }
        };

        const assignmentRef = await addDoc(collection(db, 'roleAssignments'), assignment);

        // Update user document
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        const updatedRoles = [...new Set([...(userData.roles || [userData.role]), role])];

        await updateDoc(userRef, {
            roles: updatedRoles,
            primaryRole: isOriginalRole ? role : (userData.primaryRole || userData.role),
            currentActiveRole: userData.currentActiveRole || role,
            updatedAt: serverTimestamp(),
            updatedBy: assignedByUser.uid
        });

        // Log the assignment
        await logRoleAssign(userId, {
            role,
            scope,
            assignmentId: assignmentRef.id
        }, assignedByUser);

        return { success: true, assignmentId: assignmentRef.id };

    } catch (error) {
        console.error('Error assigning role:', error);
        throw error;
    }
}

/**
 * Revoke a role assignment
 */
export async function revokeRole(assignmentId, revokedByUser, reason = '') {
    try {
        const assignmentRef = doc(db, 'roleAssignments', assignmentId);
        const assignmentDoc = await getDoc(assignmentRef);

        if (!assignmentDoc.exists()) {
            throw new Error('Assignment not found');
        }

        const assignment = assignmentDoc.data();

        // Prevent revoking original role if it's the last role
        if (assignment.metadata.isOriginalRole) {
            const userRolesQuery = query(
                collection(db, 'roleAssignments'),
                where('userId', '==', assignment.userId),
                where('status', '==', 'active')
            );
            const activeRoles = await getDocs(userRolesQuery);

            if (activeRoles.size <= 1) {
                throw new Error('Cannot revoke the only role. Use relieve/deactivate user instead.');
            }
        }

        // Update assignment status
        await updateDoc(assignmentRef, {
            status: 'revoked',
            revokedBy: revokedByUser.uid,
            revokedAt: serverTimestamp(),
            revokeReason: reason,
            'metadata.effectiveTo': serverTimestamp()
        });

        // Update user's roles array
        const userRef = doc(db, 'users', assignment.userId);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Get all active assignments after this revocation
        const remainingRolesQuery = query(
            collection(db, 'roleAssignments'),
            where('userId', '==', assignment.userId),
            where('status', '==', 'active')
        );
        const remainingSnap = await getDocs(remainingRolesQuery);
        const remainingRoles = remainingSnap.docs
            .map(d => d.data().role)
            .filter(r => r !== assignment.role);

        await updateDoc(userRef, {
            roles: remainingRoles,
            currentActiveRole: userData.currentActiveRole === assignment.role
                ? remainingRoles[0]
                : userData.currentActiveRole,
            updatedAt: serverTimestamp(),
            updatedBy: revokedByUser.uid
        });

        // Log the revocation
        await logRoleRemove(assignment.userId, {
            role: assignment.role,
            reason,
            assignmentId
        }, revokedByUser);

        return { success: true };

    } catch (error) {
        console.error('Error revoking role:', error);
        throw error;
    }
}

/**
 * Get all active role assignments for a user
 */
export async function getUserRoles(userId) {
    try {
        const rolesQuery = query(
            collection(db, 'roleAssignments'),
            where('userId', '==', userId),
            where('status', '==', 'active')
        );
        const snapshot = await getDocs(rolesQuery);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching user roles:', error);
        return [];
    }
}


/**
 * Check if a role can assign another role
 */
export function canAssignRole(assignerRole, targetRole) {
    const allowedRoles = ROLE_CREATION_PERMISSIONS[assignerRole] || [];
    return allowedRoles.includes(targetRole);
}

/**
 * Get role hierarchy level
 */
export function getRoleLevel(role) {
    return ROLE_HIERARCHY[role] || 999;
}

/**
 * Check if role A is senior to role B
 */
export function isSeniorRole(roleA, roleB) {
    return getRoleLevel(roleA) < getRoleLevel(roleB);
}

/**
 * Get assignment history for a user
 */
export async function getRoleAssignmentHistory(userId) {
    try {
        const historyQuery = query(
            collection(db, 'roleAssignments'),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(historyQuery);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => {
            const timeA = a.assignedAt?.toMillis() || 0;
            const timeB = b.assignedAt?.toMillis() || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error('Error fetching role history:', error);
        return [];
    }
}
