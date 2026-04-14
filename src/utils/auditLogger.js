// ============================================
// BDCS - Enhanced Audit Logger Utility
// Logs all administrative actions with entity metadata
// ============================================

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Build hierarchy path for an entity
 * @param {object} entity - Entity data with campus/college/department info
 * @returns {string} - Formatted path like "Campus > College > Department"
 */
export function buildHierarchyPath(entity) {
    const parts = [];

    if (entity.campusName) parts.push(entity.campusName);
    if (entity.collegeName) parts.push(entity.collegeName);
    if (entity.departmentName) parts.push(entity.departmentName);

    return parts.length > 0 ? parts.join(' > ') : null;
}

/**
 * Get entity label based on collection type
 * @param {string} collection - Collection name
 * @param {object} data - Entity data
 * @returns {string} - Human-readable label
 */
export function getEntityLabel(collection, data) {
    if (!data) return 'Unknown';

    switch (collection) {
        case 'users':
            return data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.email) || 'Unknown User';
        case 'departments':
            return data.name || data.departmentName || 'Unknown Department';
        case 'colleges':
            return data.name || data.collegeName || 'Unknown College';
        case 'campuses':
            return data.name || data.campusName || 'Unknown Campus';
        case 'courses':
            return data.name || data.courseName || 'Unknown Course';
        default:
            return data.name || 'Unknown';
    }
}

/**
 * Enhanced audit logger with entity metadata
 * 
 * @param {string} collectionName - Name of the collection being modified
 * @param {string} documentId - ID of the document being modified
 * @param {string} action - Action type
 * @param {object} beforeData - Previous state of the document
 * @param {object} afterData - New state of the document
 * @param {object} user - Current user object with uid, name, role
 * @param {object} entityMetadata - Optional entity metadata
 * @returns {Promise<string>} - ID of the created audit log document
 */
export async function logAudit(
    collectionName,
    documentId,
    action,
    beforeData,
    afterData,
    user,
    entityMetadata = {}
) {
    try {
        // Determine which data to use for entity label
        const entityData = afterData || beforeData || {};

        const auditLog = {
            // Core fields
            collection: collectionName,
            documentId: documentId,
            action: action,
            timestamp: serverTimestamp(),

            // NEW: Entity metadata for human-readable display
            entityType: collectionName,
            entityLabel: entityMetadata.label || getEntityLabel(collectionName, entityData),
            entityPath: entityMetadata.path || buildHierarchyPath(entityData),

            // NEW: Enhanced performer details
            performedBy: user.uid,
            performedByName: user.name || user.email,
            performedByRole: user.role,
            performerCollege: user.collegeName || user.college || null,
            performerDept: user.departmentName || user.department || null,

            // NEW: Target details (for multi-entity actions like successor assignment)
            targetLabel: entityMetadata.targetLabel || null,
            targetRole: entityMetadata.targetRole || null,

            // Data changes
            before: beforeData || null,
            after: afterData || null,

            // Additional metadata
            metadata: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                ...entityMetadata.extra
            }
        };

        const auditRef = collection(db, 'auditLogs');
        const docRef = await addDoc(auditRef, auditLog);

        console.log('[Audit] Logged:', action, '-', auditLog.entityLabel || collectionName);
        return docRef.id;
    } catch (error) {
        console.error('[Audit] Failed to log action:', error);
        // Don't throw error - audit logging should not break main operations
        return null;
    }
}

/**
 * Convenience function for logging create actions
 */
export async function logCreate(collectionName, documentId, data, user, metadata = {}) {
    return logAudit(collectionName, documentId, 'create', null, data, user, metadata);
}

/**
 * Convenience function for logging update actions
 */
export async function logUpdate(collectionName, documentId, beforeData, afterData, user, metadata = {}) {
    return logAudit(collectionName, documentId, 'update', beforeData, afterData, user, metadata);
}

/**
 * Convenience function for logging delete actions
 */
export async function logDelete(collectionName, documentId, data, user, metadata = {}) {
    return logAudit(collectionName, documentId, 'delete', data, null, user, metadata);
}

/**
 * Convenience function for logging status changes
 */
export async function logStatusChange(collectionName, documentId, beforeData, afterData, user, metadata = {}) {
    const action = afterData.status === 'active' ? 'enable' : 'disable';
    return logAudit(collectionName, documentId, action, beforeData, afterData, user, metadata);
}

/**
 * Generic system action logger
 */
export async function logSystemAction(collectionName, documentId, action, data, user, metadata = {}) {
    return logAudit(collectionName, documentId, action, null, data, user, metadata);
}

/**
 * Log role changes for governance tracking
 */
export async function logRoleChange(userId, oldRole, newRole, userData, user, metadata = {}) {
    const entityMetadata = {
        label: userData.name || userData.email,
        path: buildHierarchyPath(userData),
        targetLabel: `${oldRole} → ${newRole}`,
        ...metadata
    };

    return logAudit(
        'users',
        userId,
        'role_change',
        { role: oldRole, ...userData },
        { role: newRole, ...userData },
        user,
        entityMetadata
    );
}

/**
 * Log user relief/termination events
 */
export async function logUserRelieve(userId, relieveData, userData, user, metadata = {}) {
    const entityMetadata = {
        label: userData.name || userData.email,
        path: buildHierarchyPath(userData),
        extra: {
            reason: relieveData.reason,
            lastWorkingDate: relieveData.lastWorkingDate
        },
        ...metadata
    };

    return logAudit(
        'users',
        userId,
        'relieve_user',
        { status: 'active', ...userData },
        {
            status: 'relieved',
            lastWorkingDate: relieveData.lastWorkingDate,
            reason: relieveData.reason,
            successorId: relieveData.successorId || null,
            successorName: relieveData.successorName || null
        },
        user,
        entityMetadata
    );
}

/**
 * Log successor assignment events
 */
export async function logSuccessorAssignment(userId, successorData, userData, user, metadata = {}) {
    const entityMetadata = {
        label: userData.name || userData.email,
        path: buildHierarchyPath(userData),
        targetLabel: successorData.successorName,
        targetRole: successorData.successorRole,
        ...metadata
    };

    return logAudit(
        'users',
        userId,
        'assign_successor',
        { successorId: null },
        {
            successorId: successorData.successorId,
            successorName: successorData.successorName,
            successorRole: successorData.successorRole,
            transferredOwnership: successorData.ownership || []
        },
        user,
        entityMetadata
    );
}

/**
 * NEW: Log ownership transfer events
 */
export async function logOwnershipTransfer(fromUserId, toUserId, transferData, user, metadata = {}) {
    const entityMetadata = {
        label: `${transferData.fromUserName} → ${transferData.toUserName}`,
        targetLabel: transferData.entityLabel,
        targetRole: transferData.roleType,
        extra: {
            entityType: transferData.entityType,
            entityCount: transferData.entityCount || 1
        },
        ...metadata
    };

    return logAudit(
        'ownership_transfers',
        `${fromUserId}_${toUserId}_${Date.now()}`,
        'ownership_transfer',
        { ownerId: fromUserId, ownerName: transferData.fromUserName },
        { ownerId: toUserId, ownerName: transferData.toUserName },
        user,
        entityMetadata
    );
}

/**
 * Log archive actions
 */
export async function logArchiveUser(userId, userData, user, metadata = {}) {
    const entityMetadata = {
        label: userData.name || userData.email,
        path: buildHierarchyPath(userData),
        ...metadata
    };

    return logAudit(
        'users',
        userId,
        'archive_user',
        { status: userData.previousStatus || 'relieved', ...userData },
        { status: 'archived', ...userData },
        user,
        entityMetadata
    );
}

/**
 * Log role assignment action
 */
export async function logRoleAssign(userId, roleData, currentUser) {
    const metadata = {
        role: roleData.role,
        scope: roleData.scope,
        assignmentId: roleData.assignmentId
    };
    return logAudit('users', userId, 'role_assign', null, metadata, currentUser, { label: `Role: ${roleData.role}` });
}

/**
 * Log role removal action
 */
export async function logRoleRemove(userId, removalData, currentUser) {
    const metadata = {
        role: removalData.role,
        reason: removalData.reason,
        assignmentId: removalData.assignmentId
    };
    return logAudit('users', userId, 'role_remove', null, metadata, currentUser, { label: `Role: ${removalData.role}` });
}

/**
 * Log HOD assignment/change with department context
 * Example: "Department: IT, Old: Reema Choudhary, New: Pinky Sankhla"
 */
export async function logHODChange(departmentId, departmentName, oldHOD, newHOD, currentUser) {
    const entityMetadata = {
        label: `HOD Changed: ${departmentName}`,
        path: departmentName,
        extra: {
            departmentId: departmentId,
            oldHODName: oldHOD?.name || 'None',
            newHODName: newHOD?.name || 'None',
            changeType: !oldHOD ? 'assignment' : !newHOD ? 'removal' : 'replacement'
        }
    };

    const beforeData = oldHOD ? {
        hodId: oldHOD.uid,
        hodName: oldHOD.name,
        hodEmail: oldHOD.email
    } : null;

    const afterData = newHOD ? {
        hodId: newHOD.uid,
        hodName: newHOD.name,
        hodEmail: newHOD.email
    } : null;

    return logAudit(
        'departments',
        departmentId,
        'hod_change',
        beforeData,
        afterData,
        currentUser,
        entityMetadata
    );
}

/**
 * Log teacher assignment to department
 */
export async function logTeacherAssignment(departmentId, departmentName, teacherData, currentUser) {
    const entityMetadata = {
        label: `Teacher Added: ${teacherData.name} to ${departmentName}`,
        path: departmentName,
        targetLabel: teacherData.name,
        targetRole: 'teacher',
        extra: {
            teacherId: teacherData.uid,
            subjects: teacherData.subjects || []
        }
    };

    return logAudit(
        'departments',
        departmentId,
        'teacher_assign',
        null,
        {
            teacherId: teacherData.uid,
            teacherName: teacherData.name,
            teacherEmail: teacherData.email,
            subjects: teacherData.subjects || []
        },
        currentUser,
        entityMetadata
    );
}

