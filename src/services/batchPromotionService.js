// ============================================
// BDCS - Batch Promotion Service
// Academic Progression with Rollback & Restriction Model
// ============================================

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    writeBatch,
    serverTimestamp,
    arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logSystemAction } from '../utils/auditLogger';

// ============================================
// HELPERS
// ============================================

/**
 * Get academic year from semester number
 * Sem 1,2 → Year 1 | Sem 3,4 → Year 2 | Sem 5,6 → Year 3
 */
export function getSemesterYear(semester) {
    return Math.ceil(parseInt(semester) / 2);
}

/**
 * Get rollback semester when a student fails
 * Year 3 fails → rolls back to Year 2 (Sem 3)
 * Year 2 fails → rolls back to Year 1 (Sem 1)
 * Year 1 fails → stays at Year 1 (Sem 1) as REPEAT_YEAR
 */
export function getRollbackSemester(currentSemester) {
    const year = getSemesterYear(currentSemester);
    if (year >= 3) return (year - 2) * 2 + 1; // Year 3→Sem 3, Year 4→Sem 5
    if (year === 2) return 1; // Year 2→Sem 1
    return 1; // Year 1→stays Sem 1
}

/**
 * Get rollback year
 */
export function getRollbackYear(currentSemester) {
    const year = getSemesterYear(currentSemester);
    if (year >= 3) return year - 1;
    if (year === 2) return 1;
    return 1;
}

/**
 * Determine academic status on failure
 */
export function getFailureStatus(currentSemester) {
    const year = getSemesterYear(currentSemester);
    if (year === 1) return 'REPEAT_YEAR';
    return 'BACKLOG';
}

/** Default restriction flags for backlog/repeat students */
export const BACKLOG_RESTRICTIONS = {
    attendance: false,
    tests: false,
    assignments: false,
    projects: false
};

/** Active restrictions (no restrictions) */
export const ACTIVE_RESTRICTIONS = {
    attendance: true,
    tests: true,
    assignments: true,
    projects: true
};

/**
 * Get subjects for a batch's current semester
 */
export async function getSubjectsForSemester(courseId, semester) {
    try {
        const q = query(
            collection(db, 'subjects'),
            where('courseId', '==', courseId),
            where('semester', '==', parseInt(semester)),
            where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
    }
}

// ============================================
// CORE PROMOTION WITH ROLLBACK
// ============================================

/**
 * Promote batch with rollback tracking
 * @param {string} batchId - Current batch ID
 * @param {Object} backlogMap - { studentId: [{ name, code }], ... } — only failed students
 * @param {Object} hodUser - HOD performing the promotion
 * @returns {Promise<Object>} - Summary of promotion
 */
export async function promoteBatchWithBacklogs(batchId, backlogMap, hodUser) {
    try {
        const batchDoc = await getDoc(doc(db, 'batches', batchId));
        if (!batchDoc.exists()) throw new Error('Batch not found');
        const batchData = batchDoc.data();

        const currentSem = parseInt(batchData.currentSemester);
        const nextSem = currentSem + 1;
        const currentYear = getSemesterYear(currentSem);
        const nextYear = getSemesterYear(nextSem);

        // Fetch active students in this batch
        const studentsQuery = query(
            collection(db, 'users'),
            where('batchId', '==', batchId),
            where('role', '==', 'student')
        );
        const studentsSnap = await getDocs(studentsQuery);
        const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (students.length === 0) throw new Error('No students found in batch');

        const firebaseBatch = writeBatch(db);
        let promotedCount = 0;
        let backlogCount = 0;
        const now = new Date().toISOString();

        for (const student of students) {
            // Skip already backlog/repeat students if they are not in the current batch promotion cycle
            if (student.academicStatus === 'REPEAT_YEAR') continue;

            const studentRef = doc(db, 'users', student.id);
            const selection = backlogMap[student.id]; // { mode: 'BACK_PROMOTED' | 'NOT_PROMOTED', subjects: [...] }

            if (selection) {
                // ── [NEW] ADVANCED PROMOTION LOGIC (ATKT / DETAIN) ──
                const mode = selection.mode || 'BACK_PROMOTED';
                const selectionSubjects = selection.subjects || [];
                const subjectNames = selectionSubjects.map(s => s.name || s);

                if (mode === 'NOT_PROMOTED') {
                    // 🚫 STAY IN CURRENT YEAR / MOVE TO JUNIOR BATCH
                    const rollbackSem = getRollbackSemester(currentSem);
                    const rollbackYear = getRollbackYear(currentSem);

                    // Find junior batch
                    const targetBatchQuery = query(
                        collection(db, 'batches'),
                        where('courseId', '==', batchData.courseId),
                        where('currentSemester', '==', rollbackSem)
                    );
                    const targetBatchSnap = await getDocs(targetBatchQuery);
                    let targetBatchId = batchId;
                    let targetBatchName = batchData.name;

                    if (!targetBatchSnap.empty) {
                        const tBatch = targetBatchSnap.docs[0];
                        targetBatchId = tBatch.id;
                        targetBatchName = tBatch.data().name;
                    }

                    const updateData = {
                        academicStatus: 'NOT_PROMOTED',
                        currentYear: rollbackYear,
                        currentSemester: rollbackSem,
                        batchId: targetBatchId,
                        batchName: targetBatchName,
                        rollbackReason: `Detained/Failed ${subjectNames.length} subject(s) in Sem ${currentSem}`,
                        restrictions: BACKLOG_RESTRICTIONS,
                        updatedAt: serverTimestamp(),
                        [`backlogLedger.sem_${currentSem}`]: subjectNames
                    };

                    firebaseBatch.update(studentRef, updateData);
                    firebaseBatch.update(studentRef, {
                        progressionHistory: arrayUnion({
                            action: 'NOT_PROMOTED',
                            fromSemester: currentSem,
                            toSemester: rollbackSem,
                            subjects: subjectNames,
                            date: now,
                            promotedBy: hodUser.uid,
                            batchName: batchData.name
                        })
                    });
                    backlogCount++;

                } else if (mode === 'BACK_PROMOTED') {
                    // ⚠️ ATKT: MOVE TO NEXT SEM + CARRY BACKLOG
                    const updateData = {
                        academicStatus: 'BACK_PROMOTED',
                        currentSemester: nextSem,
                        currentYear: nextYear,
                        backlogSubjects: arrayUnion(...subjectNames), // Legacy support
                        [`backlogLedger.sem_${currentSem}`]: subjectNames,
                        restrictions: ACTIVE_RESTRICTIONS,
                        updatedAt: serverTimestamp()
                    };

                    firebaseBatch.update(studentRef, updateData);
                    firebaseBatch.update(studentRef, {
                        progressionHistory: arrayUnion({
                            action: 'BACK_PROMOTED',
                            fromSemester: currentSem,
                            toSemester: nextSem,
                            subjects: subjectNames,
                            date: now,
                            promotedBy: hodUser.uid,
                            batchName: batchData.name
                        })
                    });
                    promotedCount++;
                }
            } else {
                // ✅ FULLY PROMOTED (NO BACKS)
                const updateData = {
                    academicStatus: 'ACTIVE',
                    currentSemester: nextSem,
                    currentYear: nextYear,
                    rollbackReason: null,
                    restrictions: ACTIVE_RESTRICTIONS,
                    [`backlogLedger.sem_${currentSem}`]: [],
                    updatedAt: serverTimestamp()
                };

                if (!student.originalBatchId) {
                    updateData.originalBatchId = batchId;
                    updateData.originalBatchName = batchData.name;
                }

                firebaseBatch.update(studentRef, updateData);

                firebaseBatch.update(studentRef, {
                    progressionHistory: arrayUnion({
                        action: 'PROMOTED',
                        fromSemester: currentSem,
                        toSemester: nextSem,
                        fromYear: currentYear,
                        toYear: nextYear,
                        subjects: [],
                        date: now,
                        promotedBy: hodUser.uid,
                        batchName: batchData.name
                    })
                });

                promotedCount++;
            }
        }

        // Update batch semester
        const batchRef = doc(db, 'batches', batchId);
        firebaseBatch.update(batchRef, {
            currentSemester: nextSem,
            lastPromotionDate: serverTimestamp(),
            promotedBy: hodUser.uid,
            updatedAt: serverTimestamp()
        });

        await firebaseBatch.commit();

        // Audit log
        await logSystemAction(
            'batches',
            batchId,
            'PROMOTE_BATCH',
            {
                batchName: batchData.name,
                fromSemester: currentSem,
                toSemester: nextSem,
                totalStudents: students.length,
                promoted: promotedCount,
                backlog: backlogCount
            },
            hodUser
        );

        return {
            totalStudents: students.length,
            promoted: promotedCount,
            backlog: backlogCount,
            fromSemester: currentSem,
            toSemester: nextSem
        };

    } catch (error) {
        console.error('Error in promoteBatchWithBacklogs:', error);
        throw error;
    }
}

// ============================================
// BACKLOG REJOIN
// ============================================

/**
 * Clear backlog and rejoin a running batch
 */
export async function clearBacklogAndRejoin(studentId, newBatchId, hodUser) {
    try {
        const [studentDoc, newBatchDoc] = await Promise.all([
            getDoc(doc(db, 'users', studentId)),
            getDoc(doc(db, 'batches', newBatchId))
        ]);

        if (!studentDoc.exists()) throw new Error('Student not found');
        if (!newBatchDoc.exists()) throw new Error('Target batch not found');

        const studentData = studentDoc.data();
        const newBatch = newBatchDoc.data();

        if (studentData.academicStatus !== 'BACKLOG' && studentData.academicStatus !== 'REPEAT_YEAR') {
            throw new Error('Student is not in BACKLOG or REPEAT_YEAR status');
        }

        const oldBatchName = studentData.batchName || 'Unknown';
        const now = new Date().toISOString();

        await updateDoc(doc(db, 'users', studentId), {
            batchId: newBatchId,
            batchName: newBatch.name,
            academicStatus: 'ACTIVE',
            currentSemester: parseInt(newBatch.currentSemester),
            currentYear: getSemesterYear(newBatch.currentSemester),
            backlogSubjects: [],
            rollbackReason: null,
            restrictions: ACTIVE_RESTRICTIONS,
            updatedAt: serverTimestamp(),
            progressionHistory: arrayUnion({
                action: 'REJOIN',
                fromBatch: oldBatchName,
                toBatch: newBatch.name,
                fromSemester: studentData.currentSemester,
                toSemester: parseInt(newBatch.currentSemester),
                subjects: [],
                date: now,
                promotedBy: hodUser.uid,
                batchName: newBatch.name
            })
        });

        await logSystemAction(
            'users',
            studentId,
            'BACKLOG_REJOIN',
            {
                studentName: studentData.name,
                fromBatch: oldBatchName,
                toBatch: newBatch.name,
                clearedSubjects: studentData.backlogSubjects || []
            },
            hodUser
        );

        return { success: true };
    } catch (error) {
        console.error('Error in clearBacklogAndRejoin:', error);
        throw error;
    }
}

// ============================================
// PASSOUT
// ============================================

export async function markBatchPassout(batchId, teacherUser) {
    try {
        const batchDoc = await getDoc(doc(db, 'batches', batchId));
        if (!batchDoc.exists()) throw new Error('Batch not found');
        const batchData = batchDoc.data();

        const studentsQuery = query(
            collection(db, 'users'),
            where('batchId', '==', batchId),
            where('role', '==', 'student')
        );
        const studentsSnap = await getDocs(studentsQuery);
        const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const firebaseBatch = writeBatch(db);
        const now = new Date().toISOString();

        for (const student of students) {
            if (student.academicStatus === 'BACKLOG' || student.academicStatus === 'REPEAT_YEAR') continue;

            const studentRef = doc(db, 'users', student.id);
            firebaseBatch.update(studentRef, {
                academicStatus: 'PASSOUT',
                passoutDate: serverTimestamp(),
                restrictions: BACKLOG_RESTRICTIONS,
                updatedAt: serverTimestamp()
            });

            firebaseBatch.update(studentRef, {
                progressionHistory: arrayUnion({
                    action: 'PASSOUT',
                    fromSemester: parseInt(batchData.currentSemester),
                    toSemester: null,
                    subjects: [],
                    date: now,
                    promotedBy: teacherUser.uid,
                    batchName: batchData.name
                })
            });
        }

        const batchRef = doc(db, 'batches', batchId);
        firebaseBatch.update(batchRef, {
            status: 'passout',
            promotedAt: serverTimestamp(),
            promotedBy: teacherUser.uid,
            passoutStudents: students.filter(s => s.academicStatus !== 'BACKLOG' && s.academicStatus !== 'REPEAT_YEAR').length
        });

        await firebaseBatch.commit();

        await logSystemAction(
            'batches',
            batchId,
            'MARK_BATCH_PASSOUT',
            { batchName: batchData.name, studentsCount: students.length },
            teacherUser
        );
    } catch (error) {
        console.error('Error marking batch as passout:', error);
        throw error;
    }
}

// ============================================
// HELPERS: Check if student is restricted
// ============================================

/**
 * Check if a student can access a feature
 * @param {object} user - Student user object
 * @param {string} feature - 'attendance' | 'tests' | 'assignments' | 'projects'
 * @returns {boolean}
 */
export function canAccess(user, feature) {
    if (!user) return false;
    const status = user.academicStatus;
    if (status === 'BACKLOG' || status === 'REPEAT_YEAR' || status === 'NOT_PROMOTED') {
        return user.restrictions?.[feature] ?? false;
    }
    return true;
}

/**
 * Check if a student is in backlog/repeat/not-promoted mode
 */
export function isBacklogStudent(user) {
    return user?.academicStatus === 'BACKLOG' 
        || user?.academicStatus === 'REPEAT_YEAR'
        || user?.academicStatus === 'NOT_PROMOTED';
}

/**
 * Check if a student has any pending backlogs (even if BACK_PROMOTED)
 */
export function hasAnyBacklogs(user) {
    if (!user?.backlogLedger) return false;
    return Object.values(user.backlogLedger).some(subjects => 
        Array.isArray(subjects) && subjects.length > 0
    );
}

/**
 * Get all pending backlogs grouped by semester
 */
export function getPendingBacklogs(user) {
    if (!user?.backlogLedger) return {};
    const pending = {};
    for (const [sem, subjects] of Object.entries(user.backlogLedger)) {
        if (Array.isArray(subjects) && subjects.length > 0) {
            pending[sem] = subjects;
        }
    }
    return pending;
}

/**
 * Count total pending backlog subjects
 */
export function getTotalBacklogCount(user) {
    if (!user?.backlogLedger) return 0;
    return Object.values(user.backlogLedger).reduce((total, subjects) => {
        return total + (Array.isArray(subjects) ? subjects.length : 0);
    }, 0);
}

// ============================================
// HOD: CLEAR STUDENT BACKLOGS
// ============================================

/**
 * Clear specific backlog subjects for a student (HOD action)
 * When all backlogs are cleared, student status changes to ACTIVE
 * @param {string} studentId
 * @param {string} semesterKey - e.g. 'sem_1', 'sem_3'
 * @param {string[]} clearedSubjects - subject names to clear from that semester
 * @param {Object} hodUser
 */
export async function clearStudentBacklogs(studentId, semesterKey, clearedSubjects, hodUser) {
    try {
        const studentDoc = await getDoc(doc(db, 'users', studentId));
        if (!studentDoc.exists()) throw new Error('Student not found');

        const studentData = studentDoc.data();
        const ledger = studentData.backlogLedger || {};
        const currentSubjects = ledger[semesterKey] || [];

        // Remove cleared subjects
        const remaining = currentSubjects.filter(s => !clearedSubjects.includes(s));
        const updatedLedger = { ...ledger, [semesterKey]: remaining };

        // Check if ALL backlogs are now clear
        const totalRemaining = Object.values(updatedLedger).reduce((t, s) => 
            t + (Array.isArray(s) ? s.length : 0), 0
        );

        const now = new Date().toISOString();
        const updateData = {
            backlogLedger: updatedLedger,
            backlogSubjects: Object.values(updatedLedger).flat().filter(s => s), // Legacy sync
            updatedAt: serverTimestamp()
        };

        // If all backlogs cleared, restore to ACTIVE
        if (totalRemaining === 0) {
            updateData.academicStatus = 'ACTIVE';
            updateData.rollbackReason = null;
            updateData.restrictions = ACTIVE_RESTRICTIONS;
        }

        await updateDoc(doc(db, 'users', studentId), updateData);

        // Add to progression history
        await updateDoc(doc(db, 'users', studentId), {
            progressionHistory: arrayUnion({
                action: 'BACKLOG_CLEARED',
                semester: semesterKey,
                clearedSubjects: clearedSubjects,
                remainingTotal: totalRemaining,
                date: now,
                promotedBy: hodUser.uid
            })
        });

        await logSystemAction(
            'users',
            studentId,
            'BACKLOG_CLEARED',
            {
                studentName: studentData.name,
                semester: semesterKey,
                cleared: clearedSubjects,
                remainingBacklogs: totalRemaining,
                newStatus: totalRemaining === 0 ? 'ACTIVE' : studentData.academicStatus
            },
            hodUser
        );

        return { 
            success: true, 
            remainingTotal: totalRemaining,
            newStatus: totalRemaining === 0 ? 'ACTIVE' : studentData.academicStatus
        };
    } catch (error) {
        console.error('Error clearing backlogs:', error);
        throw error;
    }
}

/**
 * HOD: Change NOT_PROMOTED student's status — rejoin to a batch
 * Used when a detained student clears backlogs and needs to rejoin
 */
export async function rejoinNotPromotedStudent(studentId, targetBatchId, hodUser) {
    try {
        const [studentDoc, batchDoc] = await Promise.all([
            getDoc(doc(db, 'users', studentId)),
            getDoc(doc(db, 'batches', targetBatchId))
        ]);

        if (!studentDoc.exists()) throw new Error('Student not found');
        if (!batchDoc.exists()) throw new Error('Target batch not found');

        const studentData = studentDoc.data();
        const batchData = batchDoc.data();

        if (studentData.academicStatus !== 'NOT_PROMOTED' && studentData.academicStatus !== 'BACKLOG') {
            throw new Error('Student is not in NOT_PROMOTED or BACKLOG status');
        }

        const now = new Date().toISOString();

        await updateDoc(doc(db, 'users', studentId), {
            batchId: targetBatchId,
            batchName: batchData.name,
            academicStatus: 'ACTIVE',
            currentSemester: parseInt(batchData.currentSemester),
            currentYear: getSemesterYear(batchData.currentSemester),
            backlogSubjects: [],
            backlogLedger: {},
            rollbackReason: null,
            restrictions: ACTIVE_RESTRICTIONS,
            updatedAt: serverTimestamp(),
            progressionHistory: arrayUnion({
                action: 'REJOIN',
                fromBatch: studentData.batchName,
                toBatch: batchData.name,
                fromSemester: studentData.currentSemester,
                toSemester: parseInt(batchData.currentSemester),
                subjects: [],
                date: now,
                promotedBy: hodUser.uid,
                batchName: batchData.name
            })
        });

        await logSystemAction(
            'users',
            studentId,
            'STUDENT_REJOIN',
            {
                studentName: studentData.name,
                fromBatch: studentData.batchName,
                toBatch: batchData.name,
                previousStatus: studentData.academicStatus
            },
            hodUser
        );

        return { success: true };
    } catch (error) {
        console.error('Error in rejoinNotPromotedStudent:', error);
        throw error;
    }
}

// ============================================
// ACADEMIC HISTORY
// ============================================

export async function getStudentAcademicHistory(studentId) {
    try {
        const historyQuery = query(
            collection(db, 'batch_history'),
            where('student', '==', studentId),
            orderBy('semester', 'asc')
        );

        const snapshot = await getDocs(historyQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            joinedAt: doc.data().joinedAt?.toDate(),
            leftAt: doc.data().leftAt?.toDate(),
            promotedAt: doc.data().promotedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching student academic history:', error);
        throw error;
    }
}
