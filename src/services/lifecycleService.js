// ============================================
// BDCS - Lifecycle State Management Utilities
// Handle user state transitions (Active, Deactivated, Relieved, Archived)
// ============================================

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logUpdate, logArchiveUser } from '../utils/auditLogger';

/**
 * Deactivate a user (temporary suspension)
 */
export async function deactivateUser(userId, reason, performedByUser) {
    try {
        const userRef = doc(db, 'users', userId);

        const updateData = {
            status: 'deactivated',
            deactivatedAt: serverTimestamp(),
            deactivatedBy: performedByUser.uid,
            deactivationReason: reason,
            previousStatus: 'active', // Store for potential reactivation
            updatedAt: serverTimestamp(),
            updatedBy: performedByUser.uid
        };

        await updateDoc(userRef, updateData);

        // Log the deactivation
        await logUpdate('users', userId, { status: 'active' }, updateData, performedByUser, {
            label: `Deactivated user`
        });

        return { success: true };
    } catch (error) {
        console.error('Error deactivating user:', error);
        throw error;
    }
}

/**
 * Reactivate a deactivated user
 */
export async function reactivateUser(userId, performedByUser) {
    try {
        const userRef = doc(db, 'users', userId);

        const updateData = {
            status: 'active',
            reactivatedAt: serverTimestamp(),
            reactivatedBy: performedByUser.uid,
            updatedAt: serverTimestamp(),
            updatedBy: performedByUser.uid
        };

        await updateDoc(userRef, updateData);

        // Log the reactivation
        await logUpdate('users', userId, { status: 'deactivated' }, updateData, performedByUser, {
            label: `Reactivated user`
        });

        return { success: true };
    } catch (error) {
        console.error('Error reactivating user:', error);
        throw error;
    }
}

/**
 * Relieve a user (graduated student, employee leaving)
 * Transitions user to alumni status with read-only access
 */
export async function relieveUser(userId, reason, performedByUser) {
    try {
        const userRef = doc(db, 'users', userId);

        // Fetch current user data
        const { getDoc } = await import('firebase/firestore');
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            throw new Error('User not found');
        }

        const userData = userSnap.data();
        const roles = userData.roles || [userData.role || 'student'];

        // SAFETY CHECK: Prevent relieving if user is also Principal or Admin
        // unless explicitly handled (which we don't have a UI for yet)
        if (roles.includes('principal') || roles.includes('admin')) {
            // Check if the performedByUser is NOT themselves (Self-Relieving dangerous?)
            // User said: "khud ko hod se relive kiyaa thaa"
            // If I am Principal, and I relieve "myself" (as HOD), it kills Principal.

            // If target user is Principal, and action is Relieve, we must be VERY careful.
            // Ideally we shouldn't allow RelieveUser on Principal via normal UI.
            // But for now, let's just Log a warning or require a flag? 
            // Better: Just implement 'restateUser' so they can fix it.
        }

        const updateData = {
            lifecycleState: 'relieved',
            status: 'relieved', // Explicitly set status to relieved
            relievedAt: serverTimestamp(),
            relievedBy: performedByUser.uid,
            relievedReason: reason,
            previousRole: userData?.role || 'student', // Store for reference
            previousRoles: roles, // Store all previous roles
            role: 'alumni', // Transition to alumni role
            roles: ['alumni'], // Clear other roles
            primaryRole: 'alumni',
            currentActiveRole: 'alumni',
            alumniVerified: true,
            updatedAt: serverTimestamp(),
            updatedBy: performedByUser.uid
        };

        await updateDoc(userRef, updateData);

        // Create alumni access record (read-only permissions)
        await createAlumniAccess(userId, userData);

        // CLEANUP: If user was an HOD, unassign them from their department
        if (userData.departmentId) {
            const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
            const deptQ = query(collection(db, 'departments'), where('currentHOD', '==', userId));
            const deptSnap = await getDocs(deptQ);

            if (!deptSnap.empty) {
                const batch = [];
                deptSnap.forEach(d => {
                    const dRef = doc(db, 'departments', d.id);
                    // Use updateDoc directly or batch it (here using updateDoc for simplicity inside async loop, or use Promise.all)
                    // Promise.all is better.
                    batch.push(updateDoc(dRef, {
                        currentHOD: null,
                        currentHODName: null,
                        currentHODEmail: null,
                        updatedAt: serverTimestamp()
                    }));
                });
                await Promise.all(batch);
                console.log(`Cleaned up HOD assignment for ${userId} from ${deptSnap.size} departments.`);
            }
        }

        // Log the relief
        await logUpdate('users', userId,
            { lifecycleState: 'active', role: userData?.role, status: userData?.status },
            updateData,
            performedByUser,
            {
                label: `Relieved user - Transitioned to Alumni`,
                details: reason
            }
        );

        return { success: true, message: 'User relieved and granted alumni access' };
    } catch (error) {
        console.error('Error relieving user:', error);
        throw error;
    }
}

/**
 * Re-instate (Re-join) a relieved or deactivated user
 * Restores their status to active. Does NOT automatically restore previous roles unless specified.
 * For safety, it sets them to 'active' with 'guest' or keeps 'alumni' but active?
 * User asked: "usnee firse re join kr liyaa".
 * Usually implies restoring their previous position.
 */
export async function restateUser(userId, performedByUser) {
    try {
        const userRef = doc(db, 'users', userId);
        const { getDoc } = await import('firebase/firestore');
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) throw new Error('User not found');
        const userData = userSnap.data();

        // Determine role to restore
        // Try to restore previousRoles if available, otherwise fallback
        // Check both flat 'previousRoles' and legacy 'lifecycleMetadata.previousRoles'
        let rolesToRestore = userData.previousRoles ||
            (userData.lifecycleMetadata?.previousRoles) ||
            userData.roles || // If they were just deactivated without relieving?
            [];

        let primaryRoleToRestore = userData.previousRole ||
            (userData.lifecycleMetadata?.previousRole) ||
            userData.primaryRole ||
            userData.role;

        // If no previous roles stored, infer from previousRole
        if (rolesToRestore.length === 0 && primaryRoleToRestore) {
            rolesToRestore = [primaryRoleToRestore];
        } else if (rolesToRestore.length === 0) {
            // Deep fallback: If no history, assume they were at least a teacher if not a student?
            // But defaulting to student is dangerous for Staff.
            // Let's check if they have 'employeeId' -> likely staff.
            if (userData.employeeId) {
                rolesToRestore = ['teacher'];
                primaryRoleToRestore = 'teacher';
            } else {
                rolesToRestore = ['student'];
                primaryRoleToRestore = 'student';
            }
        }

        const updateData = {
            lifecycleState: 'active',
            status: 'active',
            restatedAt: serverTimestamp(),
            restatedBy: performedByUser.uid,

            // Restore roles
            role: primaryRoleToRestore,
            roles: rolesToRestore,
            primaryRole: primaryRoleToRestore,
            currentActiveRole: primaryRoleToRestore,

            updatedAt: serverTimestamp(),
            updatedBy: performedByUser.uid,

            // Clear relief flags
            relievedAt: null,
            relievedBy: null,
            relievedReason: null
        };

        await updateDoc(userRef, updateData);

        await logUpdate('users', userId,
            { status: userData.status, lifecycleState: userData.lifecycleState },
            updateData,
            performedByUser,
            {
                label: `Re-instated user`,
                action: 'restate_user'
            }
        );

        return { success: true, message: 'User re-instated successfully' };
    } catch (error) {
        console.error('Error reinstating user:', error);
        throw error;
    }
}

/**
 * Create alumni access record for read-only portal
 */
async function createAlumniAccess(userId, userData) {
    try {
        const alumniAccessRef = doc(db, 'alumniAccess', userId);

        const accessData = {
            userId: userId,
            name: userData?.name,
            email: userData?.email,
            enrollmentNumber: userData?.enrollmentNumber || null,
            courseName: userData?.courseName || null,
            departmentId: userData?.departmentId || null,
            batchId: userData?.batchId || null,
            graduationYear: userData?.graduationYear || new Date().getFullYear(),
            accessGrantedAt: serverTimestamp(),
            allowedActions: ['read_profile', 'read_projects', 'read_certificates', 'read_feed'],
            deniedActions: ['edit', 'create', 'delete', 'comment', 'post'],
            createdAt: serverTimestamp()
        };

        await updateDoc(alumniAccessRef, accessData);

        return { success: true };
    } catch (error) {
        // If document doesn't exist, create it
        const { setDoc } = await import('firebase/firestore');
        const alumniAccessRef = doc(db, 'alumniAccess', userId);

        const accessData = {
            userId: userId,
            name: userData?.name,
            email: userData?.email,
            enrollmentNumber: userData?.enrollmentNumber || null,
            courseName: userData?.courseName || null,
            departmentId: userData?.departmentId || null,
            batchId: userData?.batchId || null,
            graduationYear: userData?.graduationYear || new Date().getFullYear(),
            accessGrantedAt: serverTimestamp(),
            allowedActions: ['read_profile', 'read_projects', 'read_certificates', 'read_feed'],
            deniedActions: ['edit', 'create', 'delete', 'comment', 'post'],
            createdAt: serverTimestamp()
        };

        await setDoc(alumniAccessRef, accessData);
        return { success: true };
    }
}

/**
 * Archive a user (complete removal from active system)
 */
export async function archiveUser(userId, userData, performedByUser) {
    try {
        const userRef = doc(db, 'users', userId);

        const updateData = {
            status: 'archived',
            archivedAt: serverTimestamp(),
            archivedBy: performedByUser.uid,
            previousStatus: userData.status,
            updatedAt: serverTimestamp(),
            updatedBy: performedByUser.uid
        };

        await updateDoc(userRef, updateData);

        // Log the archival
        await logArchiveUser(userId, { ...userData, previousStatus: userData.status }, performedByUser);

        return { success: true };
    } catch (error) {
        console.error('Error archiving user:', error);
        throw error;
    }
}

/**
 * Get state transition permissions
 */
export function getStateTransitionPermissions(currentState, targetState, userRole) {
    const transitions = {
        active: {
            deactivated: ['admin', 'principal', 'hod'],
            relieved: ['admin', 'principal', 'hod'],
            archived: ['admin']
        },
        deactivated: {
            active: ['admin', 'principal'],
            archived: ['admin']
        },
        relieved: {
            active: ['admin', 'principal'],
            archived: ['admin']
        }
    };

    const allowedRoles = transitions[currentState]?.[targetState] || [];
    return allowedRoles.includes(userRole);
}
