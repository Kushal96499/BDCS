// ============================================
// BDCS - Principal Service
// College-level governance and department management
// ============================================

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp,
    addDoc,
    setDoc,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { assignRole, revokeRole } from './roleManagementService';
import { logCreate, logUpdate, logAudit } from '../utils/auditLogger';
import { logSelfAssignment, logRoleAssignment } from '../utils/roleAuditLogger';

/**
 * Get all departments for a specific college
 */
export async function getCollegeDepartments(collegeId) {
    try {
        const deptQuery = query(
            collection(db, 'departments'),
            where('collegeId', '==', collegeId)
        );

        const snapshot = await getDocs(deptQuery);
        const depts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort by name in JavaScript instead of Firestore
        return depts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error('Error fetching college departments:', error);
        throw error;
    }
}

/**
 * Get department statistics (teachers, students)
 */
export async function getDepartmentStats(departmentId) {
    try {
        // Get teachers count
        const teachersQuery = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('role', '==', 'teacher'),
            where('status', '==', 'active')
        );
        const teachersSnapshot = await getDocs(teachersQuery);

        // Get students count
        const studentsQuery = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('role', '==', 'student'),
            where('status', '==', 'active')
        );
        const studentsSnapshot = await getDocs(studentsQuery);

        return {
            teachers: teachersSnapshot.size,
            students: studentsSnapshot.size
        };
    } catch (error) {
        console.error('Error fetching department stats:', error);
        return { teachers: 0, students: 0 };
    }
}

/**
 * Get college-level KPI statistics
 */
/**
 * Subscribe to college-level KPI statistics (Real-time)
 */
export function subscribeToCollegeStats(collegeId, callback) {
    if (!collegeId) return () => { };

    try {
        const unsubscribers = [];
        const stats = {
            departments: 0,
            hods: 0,
            teachers: 0,
            students: 0
        };

        const updateStats = () => callback({ ...stats });

        // 1. Departments Listener (Keep separate as it's a different collection)
        const deptQuery = query(
            collection(db, 'departments'),
            where('collegeId', '==', collegeId)
        );

        unsubscribers.push(onSnapshot(deptQuery, (snap) => {
            stats.departments = snap.size;
            updateStats();
        }, (error) => {
            console.error("Error listening to departments:", error);
        }));

        // 2. All Users Listener (Single Source of Truth)
        // This handles mixed schemas (role vs roles) and prevents double-counting/missing data
        const usersQuery = query(
            collection(db, 'users'),
            where('collegeId', '==', collegeId)
        );

        unsubscribers.push(onSnapshot(usersQuery, (snap) => {
            let studentCount = 0;
            let teacherCount = 0;
            let hodCount = 0;

            snap.docs.forEach(doc => {
                const data = doc.data();
                const roles = data.roles || [];
                const role = data.role;

                // Check for Student
                // Legacy: role === 'student', Modern: roles.includes('student')
                if (role === 'student' || roles.includes('student')) {
                    studentCount++;
                }

                // Check for HOD
                if (roles.includes('hod')) {
                    hodCount++;
                }

                // Check for Teacher/Faculty
                // Definition: role='teacher' OR roles includes 'teacher' OR is an HOD (HODs are faculty)
                if (role === 'teacher' || roles.includes('teacher') || roles.includes('hod')) {
                    teacherCount++;
                }
            });

            stats.students = studentCount;
            stats.teachers = teacherCount;
            stats.hods = hodCount;
            updateStats();
        }, (error) => {
            console.error("Error listening to college users:", error);
        }));

        return () => unsubscribers.forEach(unsub => unsub());

    } catch (error) {
        console.error('Error setting up stats subscription:', error);
        return () => { };
    }
}

/**
 * Get college-level KPI statistics (Legacy - usage replaced by subscription)
 */
export async function getCollegeStats(collegeId) {
    // ... existing implementation kept for fallback ...
    try {
        // Get departments
        const departments = await getCollegeDepartments(collegeId);

        // Get HODs count
        const hodsQuery = query(
            collection(db, 'users'),
            where('collegeId', '==', collegeId),
            where('roles', 'array-contains', 'hod'),
            where('status', '==', 'active')
        );
        const hodsSnapshot = await getDocs(hodsQuery);

        // Get teachers count
        const teachersQuery = query(
            collection(db, 'users'),
            where('collegeId', '==', collegeId),
            where('role', '==', 'teacher'),
            where('status', '==', 'active')
        );
        const teachersSnapshot = await getDocs(teachersQuery);

        // Get students count
        const studentsQuery = query(
            collection(db, 'users'),
            where('collegeId', '==', collegeId),
            where('role', '==', 'student'),
            where('status', '==', 'active')
        );
        const studentsSnapshot = await getDocs(studentsQuery);

        return {
            departments: departments.length,
            hods: hodsSnapshot.size,
            teachers: teachersSnapshot.size,
            students: studentsSnapshot.size
        };
    } catch (error) {
        console.error('Error fetching college stats:', error);
        throw error;
    }
}

/**
 * Get college alerts (departments without HOD, unassigned teachers, etc.)
 */
export async function getCollegeAlerts(collegeId) {
    const alerts = [];

    try {
        // Get all departments
        const departments = await getCollegeDepartments(collegeId);

        // Check departments without HOD
        for (const dept of departments) {
            if (!dept.currentHOD) {
                alerts.push({
                    type: 'warning',
                    category: 'department',
                    message: `${dept.name} has no assigned HOD`,
                    departmentId: dept.id,
                    departmentName: dept.name
                });
            }
        }

        // Check for teachers without department assignment
        const unassignedTeachersQuery = query(
            collection(db, 'users'),
            where('collegeId', '==', collegeId),
            where('role', '==', 'teacher'),
            where('departmentId', '==', null),
            where('status', '==', 'active')
        );
        const unassignedSnapshot = await getDocs(unassignedTeachersQuery);

        if (unassignedSnapshot.size > 0) {
            alerts.push({
                type: 'info',
                category: 'teacher',
                message: `${unassignedSnapshot.size} teacher(s) not assigned to any department`,
                count: unassignedSnapshot.size
            });
        }

        return alerts;
    } catch (error) {
        console.error('Error fetching college alerts:', error);
        return alerts;
    }
}

/**
 * Assign HOD to a department
 */
export async function assignHOD(departmentId, userId, effectiveDate, currentPrincipal) {
    try {
        const departmentRef = doc(db, 'departments', departmentId);
        const userRef = doc(db, 'users', userId);

        // Get department and user data
        const [deptDoc, userDoc] = await Promise.all([
            getDoc(departmentRef),
            getDoc(userRef)
        ]);

        if (!deptDoc.exists() || !userDoc.exists()) {
            throw new Error('Department or user not found');
        }

        const department = { id: deptDoc.id, ...deptDoc.data() };
        const user = { id: userDoc.id, ...userDoc.data() };

        // Update user roles
        const currentRoles = user.roles || [user.role];
        const updatedRoles = currentRoles.includes('hod')
            ? currentRoles
            : [...currentRoles, 'hod'];

        // Update user document
        await updateDoc(userRef, {
            roles: updatedRoles,
            departmentId: departmentId,
            departmentName: department.name,
            isHOD: true,
            hodSince: effectiveDate
        });

        // Update department document with current HOD info
        await updateDoc(departmentRef, {
            currentHOD: userId,
            currentHODName: user.name,
            hodAssignedDate: effectiveDate
        });

        // Log the action
        await logAudit({
            action: 'assign_hod',
            performedBy: currentPrincipal.uid,
            performedByName: currentPrincipal.displayName || currentPrincipal.email,
            targetUser: userId,
            targetUserName: user.name,
            departmentId: departmentId,
            departmentName: department.name,
            details: `Assigned ${user.name} as HOD of ${department.name}`,
            timestamp: new Date()
        });

        // Log role change for audit trail
        await logRoleAssignment(user, 'hod', {
            departmentId: departmentId,
            departmentName: department.name,
            details: `Assigned as HOD of ${department.name} by ${currentPrincipal.displayName || currentPrincipal.email}`
        });

        return { success: true };
    } catch (error) {
        console.error('Error assigning HOD:', error);
        throw error;
    }
}

/**
 * Change HOD (succession flow)
 */
export async function changeHOD(departmentId, newUserId, oldUserId, effectiveDate, currentPrincipal) {
    try {
        // Get department and user data
        const deptDoc = await getDoc(doc(db, 'departments', departmentId));
        const newUserDoc = await getDoc(doc(db, 'users', newUserId));

        // Try to get old user, but don't fail if missing
        let oldUserDoc = null;
        let oldUserData = { name: 'Unknown User' };

        if (oldUserId) {
            oldUserDoc = await getDoc(doc(db, 'users', oldUserId));
            if (oldUserDoc.exists()) {
                oldUserData = oldUserDoc.data();
            } else {
                console.warn(`Old HOD user ${oldUserId} not found, skipping role revocation.`);
            }
        }

        if (!deptDoc.exists() || !newUserDoc.exists()) {
            throw new Error('Department or new user not found');
        }

        const deptData = deptDoc.data();
        const newUserData = newUserDoc.data();

        // Revoke HOD role from old user if they exist
        if (oldUserDoc && oldUserDoc.exists()) {
            const oldAssignmentQuery = query(
                collection(db, 'roleAssignments'),
                where('userId', '==', oldUserId),
                where('role', '==', 'hod'),
                where('scope.departmentId', '==', departmentId),
                where('status', '==', 'active')
            );
            const oldAssignmentSnapshot = await getDocs(oldAssignmentQuery);

            for (const assignmentDoc of oldAssignmentSnapshot.docs) {
                await revokeRole(
                    assignmentDoc.id,
                    currentPrincipal,
                    `HOD succession - replaced by ${newUserData.name}`
                );
            }
        }

        // Assign HOD role to new user
        // Use assignHOD logic or assignRole directly
        await assignRole(
            newUserId,
            'hod',
            {
                collegeId: deptData.collegeId,
                departmentId: departmentId
            },
            currentPrincipal
        );

        // Explicitly update user document with department details for UI display
        await updateDoc(doc(db, 'users', newUserId), {
            departmentId: departmentId,
            departmentName: deptData.name,
            isHOD: true
        });

        // Update department
        await updateDoc(doc(db, 'departments', departmentId), {
            currentHOD: newUserId,
            currentHODName: newUserData.name,
            previousHOD: oldUserId,
            previousHODName: oldUserData.name,
            hodAssignedAt: effectiveDate || serverTimestamp(),
            hodChangedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: currentPrincipal.uid
        });

        // Log the succession
        await logUpdate(
            'departments',
            departmentId,
            deptData,
            {
                ...deptData,
                currentHOD: newUserId,
                currentHODName: newUserData.name
            },
            currentPrincipal,
            {
                label: deptData.name,
                path: `${deptData.campusName} > ${deptData.collegeName} > ${deptData.name}`,
                action: 'change_hod',
                oldHOD: oldUserData.name,
                newHOD: newUserData.name
            }
        );

        return { success: true };
    } catch (error) {
        console.error('Error changing HOD:', error);
        throw error;
    }
}

/**
 * Create new HOD user
 */
export async function createHODUser(userData, departmentId, currentPrincipal) {
    try {
        const { initializeApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
        const { firebaseConfig } = await import('../config/firebase');

        // Generate password: firstname + last 4 digits of phone
        const firstName = userData.firstName.trim().toLowerCase();
        const last4Digits = userData.phone.slice(-4);
        const password = firstName + last4Digits;

        // Create Firebase Auth account
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp-HOD");
        const secondaryAuth = getAuth(secondaryApp);

        const authResult = await createUserWithEmailAndPassword(
            secondaryAuth,
            userData.email,
            password
        );

        // Get department data
        const deptDoc = await getDoc(doc(db, 'departments', departmentId));
        const deptData = deptDoc.data();

        // Create user document
        const fullName = `${userData.firstName.trim()} ${userData.lastName.trim()}`;
        const newUser = {
            uid: authResult.user.uid,
            name: fullName,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            employeeId: userData.employeeId || '',
            role: 'hod',
            primaryRole: 'hod',
            roles: ['hod'],
            currentActiveRole: 'hod',
            collegeId: deptData.collegeId || currentPrincipal.collegeId || null,
            collegeName: deptData.collegeName || currentPrincipal.collegeName || null,
            campusId: deptData.campusId || currentPrincipal.campusId || null,
            campusName: deptData.campusName || currentPrincipal.campusName || null,
            departmentId: departmentId,
            departmentName: deptData.name || null,
            status: 'active',
            mustResetPassword: true,
            createdAt: serverTimestamp(),
            createdBy: currentPrincipal.uid,
            updatedAt: serverTimestamp(),
            updatedBy: currentPrincipal.uid,
            // Add explicit HOD flags
            isHOD: true,
            hodSince: userData.joiningDate || new Date().toISOString().split('T')[0]
        };

        await setDoc(doc(db, 'users', authResult.user.uid), newUser);

        // Update department document with current HOD info
        // This was missing previously, causing the sync issue
        await updateDoc(doc(db, 'departments', departmentId), {
            currentHOD: authResult.user.uid,
            currentHODName: fullName,
            currentHODEmail: userData.email,
            hodAssignedAt: userData.joiningDate ? new Date(userData.joiningDate) : serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Log creation
        await logCreate('users', authResult.user.uid, newUser, currentPrincipal, {
            label: fullName,
            path: `${deptData.campusName} > ${deptData.collegeName} > ${deptData.name}`,
            action: 'create_hod'
        });

        // Cleanup secondary auth
        await signOut(secondaryAuth);

        return {
            success: true,
            userId: authResult.user.uid,
            password: password
        };
    } catch (error) {
        console.error('Error creating HOD user:', error);
        throw error;
    }
}

/**
 * Create new Teacher user (by Principal)
 */
export async function createTeacherUser(userData, departmentId, currentPrincipal) {
    try {
        const { initializeApp, deleteApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
        const { firebaseConfig } = await import('../config/firebase');

        // Generate password: firstname + last 4 digits of phone
        const firstName = userData.firstName.trim().toLowerCase();
        const last4Digits = userData.phone.slice(-4);
        const password = firstName + last4Digits;

        // Create Firebase Auth account
        const secondaryAppName = `TeacherApp-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);

        try {
            const authResult = await createUserWithEmailAndPassword(
                secondaryAuth,
                userData.email,
                password
            );

            // Get department data
            const deptDoc = await getDoc(doc(db, 'departments', departmentId));
            const deptData = deptDoc ? deptDoc.data() : { name: 'Unknown' };

            // Create user document
            const fullName = `${userData.firstName.trim()} ${userData.lastName.trim()}`;
            const newUser = {
                uid: authResult.user.uid,
                name: fullName,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                phone: userData.phone,
                employeeId: userData.employeeId || '',
                role: 'teacher',
                roles: ['teacher'],
                collegeId: currentPrincipal.collegeId || null,
                collegeName: currentPrincipal.collegeName || null,
                campusId: currentPrincipal.campusId || null,
                campusName: currentPrincipal.campusName || null,
                departmentId: departmentId,
                departmentName: deptData.name || null,
                status: 'active',
                mustResetPassword: true,
                createdAt: serverTimestamp(),
                createdBy: currentPrincipal.uid,
                updatedAt: serverTimestamp(),
                updatedBy: currentPrincipal.uid,
                designation: userData.designation || 'Teacher'
            };

            await setDoc(doc(db, 'users', authResult.user.uid), newUser);
            await logCreate('users', authResult.user.uid, newUser, currentPrincipal);
            await signOut(secondaryAuth);

            return {
                success: true,
                userId: authResult.user.uid,
                password: password
            };
        } finally {
            await deleteApp(secondaryApp);
        }
    } catch (error) {
        console.error('Error creating Teacher user:', error);
        throw error;
    }
}
