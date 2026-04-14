// ============================================
// BDCS - HOD Service
// Department-level operations and statistics
// ============================================

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    addDoc,
    serverTimestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logCreate, logUpdate } from '../utils/auditLogger';

/**
 * Get department statistics for HOD dashboard
 */
export const getDepartmentStats = async (departmentId) => {
    try {
        // Get teachers count
        const teachersQuery = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('roles', 'array-contains', 'teacher'),
            where('status', '==', 'active')
        );
        const teachersSnapshot = await getDocs(teachersQuery);
        const teachersCount = teachersSnapshot.size;

        // Get students count  
        const studentsQuery = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('role', '==', 'student'),
            where('status', '==', 'active')
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsCount = studentsSnapshot.size;

        // Get subjects count
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('departmentId', '==', departmentId)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjectsCount = subjectsSnapshot.size;

        return {
            teachers: teachersCount,
            students: studentsCount,
            subjects: subjectsCount
        };
    } catch (error) {
        console.error('Error getting department stats:', error);
        throw error;
    }
};

/**
 * Get department alerts
 */
export const getDepartmentAlerts = async (departmentId) => {
    try {
        const alerts = [];

        // Check for subjects without teachers
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('departmentId', '==', departmentId)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);

        let unassignedSubjects = 0;
        subjectsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (!data.assignedTeachers || data.assignedTeachers.length === 0) {
                unassignedSubjects++;
            }
        });

        if (unassignedSubjects > 0) {
            alerts.push({
                type: 'warning',
                message: `${unassignedSubjects} subject(s) without assigned teachers`,
                action: 'assign_teachers'
            });
        }

        // Check for teachers without subjects
        const teachersQuery = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('roles', 'array-contains', 'teacher'),
            where('status', '==', 'active')
        );
        const teachersSnapshot = await getDocs(teachersQuery);

        let unassignedTeachers = 0;
        for (const teacherDoc of teachersSnapshot.docs) {
            const subjectsForTeacher = query(
                collection(db, 'subjects'),
                where('assignedTeachers', 'array-contains', teacherDoc.id)
            );
            const subSnap = await getDocs(subjectsForTeacher);
            if (subSnap.empty) {
                unassignedTeachers++;
            }
        }

        if (unassignedTeachers > 0) {
            alerts.push({
                type: 'info',
                message: `${unassignedTeachers} teacher(s) without assigned subjects`,
                action: 'assign_subjects'
            });
        }

        return alerts;
    } catch (error) {
        console.error('Error getting department alerts:', error);
        return [];
    }
};

/**
 * Get teachers in department (including HOD)
 */
export const getDepartmentTeachers = async (departmentId) => {
    try {
        const teachersQuery = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('roles', 'array-contains', 'teacher'),
            where('status', '==', 'active')
        );

        const snapshot = await getDocs(teachersQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting department teachers:', error);
        throw error;
    }
};

/**
 * Get students in department
 */
export const getDepartmentStudents = async (departmentId) => {
    try {
        const studentsQuery = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('role', '==', 'student'),
            where('status', '==', 'active')
        );

        const snapshot = await getDocs(studentsQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting department students:', error);
        throw error;
    }
};

/**
 * Get department subjects
 */
export const getDepartmentSubjects = async (departmentId) => {
    try {
        const subjectsQuery = query(
            collection(db, 'subjects'),
            where('departmentId', '==', departmentId)
        );

        const snapshot = await getDocs(subjectsQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting department subjects:', error);
        throw error;
    }
};

/**
 * Assign teacher to subject
 */
export const assignTeacherToSubject = async (subjectId, teacherId, performedBy) => {
    try {
        const subjectRef = doc(db, 'subjects', subjectId);
        const subjectDoc = await getDoc(subjectRef);

        if (!subjectDoc.exists()) {
            throw new Error('Subject not found');
        }

        const currentTeachers = subjectDoc.data().assignedTeachers || [];

        if (currentTeachers.includes(teacherId)) {
            throw new Error('Teacher already assigned to this subject');
        }

        await updateDoc(subjectRef, {
            assignedTeachers: [...currentTeachers, teacherId],
            updatedAt: serverTimestamp()
        });

        // Audit log
        await logUpdate(
            performedBy.uid,
            performedBy.name,
            'subjects',
            subjectId,
            { assignedTeachers: [...currentTeachers, teacherId] },
            'assign_teacher_to_subject'
        );

        return true;
    } catch (error) {
        console.error('Error assigning teacher to subject:', error);
        throw error;
    }
};

/**
 * Remove teacher from subject
 */
export const removeTeacherFromSubject = async (subjectId, teacherId, performedBy) => {
    try {
        const subjectRef = doc(db, 'subjects', subjectId);
        const subjectDoc = await getDoc(subjectRef);

        if (!subjectDoc.exists()) {
            throw new Error('Subject not found');
        }

        const currentTeachers = subjectDoc.data().assignedTeachers || [];
        const updatedTeachers = currentTeachers.filter(id => id !== teacherId);

        await updateDoc(subjectRef, {
            assignedTeachers: updatedTeachers,
            updatedAt: serverTimestamp()
        });

        // Audit log
        await logUpdate(
            performedBy.uid,
            performedBy.name,
            'subjects',
            subjectId,
            { assignedTeachers: updatedTeachers },
            'remove_teacher_from_subject'
        );

        return true;
    } catch (error) {
        console.error('Error removing teacher from subject:', error);
        throw error;
    }
};
