// ============================================
// studentService.js - Domain service for Student CRUD
// Centralizes Firebase operations for student management
// ============================================

import {
    collection, doc, getDocs, updateDoc, deleteDoc,
    setDoc, query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Generates the next roll number for a batch based on its name and existing students.
 * Pattern: COURSE + YEAR + 3-digit sequence (e.g., BCA23001)
 */
export const generateNextRollNumber = (batchName, existingStudents) => {
    let yearPart = new Date().getFullYear().toString().slice(-2);
    const yearMatch = batchName?.match(/20(\d{2})/) || batchName?.match(/-(\d{2})/);
    if (yearMatch) yearPart = yearMatch[1];

    const coursePart = batchName
        ? batchName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')
        : 'STD';

    const prefix = `${coursePart}${yearPart}`;
    const existing = existingStudents.filter(s => s.rollNumber?.startsWith(prefix));

    if (existing.length === 0) return `${prefix}001`;

    const maxSeq = existing.reduce((max, s) => {
        const num = parseInt(s.rollNumber.replace(prefix, ''));
        return !isNaN(num) && num > max ? num : max;
    }, 0);

    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
};

/**
 * Update a student's council role. Prevents duplicate President assignment.
 */
export const updateStudentRole = async (studentId, newRole, departmentId) => {
    if (newRole === 'president') {
        const q = query(
            collection(db, 'users'),
            where('departmentId', '==', departmentId),
            where('councilRole', '==', 'president')
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const existing = snapshot.docs[0].data();
            if (existing.uid !== studentId && snapshot.docs[0].id !== studentId) {
                throw new Error(`${existing.name} is already Department President. Remove them first.`);
            }
        }
    }

    const councilRoleValue = newRole === 'student' ? null : newRole;
    await updateDoc(doc(db, 'users', studentId), { councilRole: councilRoleValue });
};

/**
 * Toggle a student's NOC status.
 */
export const toggleStudentNOC = async (studentId, currentNocStatus, updatedBy) => {
    const newStatus = currentNocStatus === 'cleared' ? 'pending' : 'cleared';
    await updateDoc(doc(db, 'users', studentId), {
        nocStatus: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy
    });
    return newStatus;
};

/**
 * Delete a student record from Firestore.
 */
export const deleteStudent = async (studentId) => {
    await deleteDoc(doc(db, 'users', studentId));
};

/**
 * Update an existing student's profile fields.
 */
export const updateStudent = async (studentId, payload, updatedBy) => {
    await updateDoc(doc(db, 'users', studentId), {
        ...payload,
        updatedAt: serverTimestamp(),
        updatedBy
    });
};

/**
 * Register a new student auth account + Firestore document.
 * Uses a secondary Firebase app to avoid logging out the current teacher.
 *
 * Pre-checks for duplicate email to handle Firebase Email Enumeration Protection
 * (which converts auth/email-already-in-use into a generic 400 response).
 */
export const createStudentAccount = async (email, password, firestorePayload, createdBy) => {
    // 1. Pre-check: does a user with this email already exist in Firestore?
    const existing = await getDocs(
        query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()))
    );
    if (!existing.empty) {
        throw new Error(`A student account with email "${email}" already exists. Use a different email.`);
    }

    // 2. Validate password length (Firebase requires minimum 6 chars)
    if (!password || password.length < 6) {
        throw new Error('Password (Last Exam Roll No) must be at least 6 characters.');
    }

    const { initializeApp, deleteApp } = await import('firebase/app');
    const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
    const { firebaseConfig } = await import('../config/firebase');

    const secondaryApp = initializeApp(firebaseConfig, `secondary-student-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            email.toLowerCase().trim(),
            password
        );
        const uid = userCredential.user.uid;

        await setDoc(doc(db, 'users', uid), {
            ...firestorePayload,
            email: email.toLowerCase().trim(),
            uid,
            createdAt: serverTimestamp(),
            createdBy,
            mustResetPassword: true,
        });

        return uid;

    } catch (err) {
        // Map Firebase Auth error codes to clear messages
        const code = err.code || '';
        if (code === 'auth/email-already-in-use') {
            throw new Error(`Email "${email}" is already registered. Check existing accounts.`);
        }
        if (code === 'auth/invalid-email') {
            throw new Error(`"${email}" is not a valid email address.`);
        }
        if (code === 'auth/weak-password') {
            throw new Error('Last Exam Roll No must be at least 6 characters to use as password.');
        }
        if (code === 'auth/operation-not-allowed') {
            throw new Error('Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication.');
        }
        // Generic 400 from Firebase (Email Enumeration Protection or network)
        if (err.message?.includes('400') || err.status === 400) {
            throw new Error(`Account creation blocked (400). Likely cause: email "${email}" already exists in Firebase Auth. Try a different email.`);
        }
        throw err; // re-throw unknown errors as-is
    } finally {
        try {
            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);
        } catch (_) { /* cleanup errors are non-fatal */ }
    }
};
