// ============================================
// BDCS - Test Result Service
// Manages test results, marks entry, and student performance
// ============================================

import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logSystemAction } from '../utils/auditLogger';

/**
 * Upload marks for multiple students (bulk)
 * @param {string} testId - Test ID
 * @param {Array} marksArray - Array of {studentId, marksObtained, remarks}
 * @param {Object} teacherUser - Teacher entering marks
 * @returns {Promise<number>} - Number of results uploaded
 */
export async function uploadMarks(testId, marksArray, teacherUser) {
    try {
        // Get test details
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) {
            throw new Error('Test not found');
        }

        const testData = testDoc.data();
        const { maxMarks, batch, subject, semester, academicYear } = testData;

        const batch_write = writeBatch(db);
        let successCount = 0;

        for (const markEntry of marksArray) {
            const { studentId, marksObtained, remarks = '' } = markEntry;

            // Validation
            if (marksObtained < 0 || marksObtained > maxMarks) {
                console.warn(`Invalid marks for student ${studentId}: ${marksObtained}`);
                continue;
            }

            // Get student details
            const studentDoc = await getDoc(doc(db, 'users', studentId));
            if (!studentDoc.exists()) {
                console.warn(`Student not found: ${studentId}`);
                continue;
            }

            const studentData = studentDoc.data();
            const percentage = ((marksObtained / maxMarks) * 100).toFixed(2);

            // Determine pass/fail (assuming 40% is passing)
            const passingPercentage = 40;
            const passFailStatus = percentage >= passingPercentage ? 'PASS' : 'FAIL';

            // Create or update result document
            const resultId = `${testId}_${studentId}`;
            const resultRef = doc(db, 'test_results', resultId);

            const resultData = {
                // References
                test: testId,
                student: studentId,
                studentName: studentData.name,
                rollNumber: studentData.rollNumber || null,
                enrollmentNumber: studentData.enrollmentNumber || studentData.rollNumber || 'N/A',

                // Academic Context (denormalized for queries)
                batch,
                subject,
                semester: parseInt(semester),
                academicYear,

                // Results
                marksObtained: parseFloat(marksObtained),
                maxMarks: parseInt(maxMarks),
                percentage: parseFloat(percentage),
                passFailStatus,

                // Additional Data
                remarks,
                enteredBy: teacherUser.uid,
                enteredAt: serverTimestamp(),

                // Publication
                isPublished: false,
                publishedAt: null
            };

            batch_write.set(resultRef, resultData, { merge: true });
            successCount++;
        }

        await batch_write.commit();

        // Update test stats
        await updateTestStats(testId);

        // Audit log
        await logSystemAction(
            'test_results',
            testId,
            'UPLOAD_MARKS',
            {
                testName: `${testData.subjectName} - ${testData.topic}`,
                studentsCount: successCount
            },
            teacherUser
        );

        return successCount;
    } catch (error) {
        console.error('Error uploading marks:', error);
        throw error;
    }
}

/**
 * Update individual student mark
 * @param {string} testId - Test ID
 * @param {string} studentId - Student ID
 * @param {number} marksObtained - Marks obtained
 * @param {string} remarks - Optional remarks
 * @param {Object} teacherUser - Teacher updating
 * @returns {Promise<void>}
 */
export async function updateStudentMark(testId, studentId, marksObtained, remarks, teacherUser) {
    try {
        // Get test details
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) {
            throw new Error('Test not found');
        }

        const testData = testDoc.data();
        const { maxMarks } = testData;

        // Validation
        if (marksObtained < 0 || marksObtained > maxMarks) {
            throw new Error(`Marks must be between 0 and ${maxMarks}`);
        }

        const percentage = ((marksObtained / maxMarks) * 100).toFixed(2);
        const passingPercentage = 40;
        const passFailStatus = percentage >= passingPercentage ? 'PASS' : 'FAIL';

        const resultId = `${testId}_${studentId}`;
        const resultRef = doc(db, 'test_results', resultId);

        await setDoc(resultRef, {
            test: testId,
            student: studentId,
            marksObtained: parseFloat(marksObtained),
            percentage: parseFloat(percentage),
            passFailStatus,
            remarks: remarks || '',
            enteredBy: teacherUser.uid,
            enteredAt: serverTimestamp()
        }, { merge: true });

        // Update test stats
        await updateTestStats(testId);

        // Audit log
        await logSystemAction(
            'test_results',
            resultId,
            'UPDATE_MARK',
            {
                student: studentId,
                marks: marksObtained,
                maxMarks
            },
            teacherUser
        );
    } catch (error) {
        console.error('Error updating student mark:', error);
        throw error;
    }
}

/**
 * Initialize test results for all students in batch (if not already created)
 * @param {string} testId - Test ID
 * @returns {Promise<number>} - Number of result entries created
 */
export async function initializeTestResults(testId) {
    try {
        // Get test details
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) {
            throw new Error('Test not found');
        }

        const testData = testDoc.data();
        const { batch, batchId, batchName, subject, subjectName, semester, academicYear, maxMarks, topic, testDate } = testData;

        // SANITIZATION: Ensure no undefined values hit Firestore queries
        const resolvedBatchId = batchId || (typeof batch === 'string' ? batch : batch?.id) || '';
        
        if (!resolvedBatchId) {
            console.warn('Initialization aborted: No valid Batch reference found for test:', testId);
            return 0;
        }

        // Check if results already exist - improved to check per student
        const existingResults = await getDocs(query(
            collection(db, 'test_results'),
            where('test', '==', testId)
        ));

        const existingStudentIds = new Set();

        // Check for duplicates within existing results
        const studentResultMap = new Map(); // studentId -> [docIds]

        existingResults.docs.forEach(doc => {
            const data = doc.data();
            const studentId = data.student;

            if (!studentResultMap.has(studentId)) {
                studentResultMap.set(studentId, []);
            }
            studentResultMap.get(studentId).push({ id: doc.id, data });
            existingStudentIds.add(studentId);
        });

        // Cleanup Duplicates if any
        let duplicatesRemoved = 0;
        const cleanupBatch = writeBatch(db);

        studentResultMap.forEach((docs, studentId) => {
            if (docs.length > 1) {
                console.log(`Found duplicate results for student ${studentId}: ${docs.length} entries`);

                // Sort to find the best one to keep
                // Priority: 1. Has marks, 2. Created recently
                docs.sort((a, b) => {
                    const hasMarksA = a.data.marksObtained !== null && a.data.marksObtained !== undefined && a.data.marksObtained !== '';
                    const hasMarksB = b.data.marksObtained !== null && b.data.marksObtained !== undefined && b.data.marksObtained !== '';

                    if (hasMarksA && !hasMarksB) return -1; // Keep A
                    if (!hasMarksA && hasMarksB) return 1;  // Keep B
                    return 0;
                });

                // Keep the first one (docs[0]), delete the rest
                const docsToDelete = docs.slice(1);
                docsToDelete.forEach(docItem => {
                    cleanupBatch.delete(doc(db, 'test_results', docItem.id));
                    duplicatesRemoved++;
                });
            }
        });

        if (duplicatesRemoved > 0) {
            await cleanupBatch.commit();
            console.log(`Cleaned up ${duplicatesRemoved} duplicate entries`);
        }

        // --- NEW: Fix Random-ID Documents ---
        // If we find docs where doc.id !== `${testId}_${studentId}`, migrate them.
        const migrationBatch = writeBatch(db);
        let migratedCount = 0;

        studentResultMap.forEach((docs, studentId) => {
            const deterministicId = `${testId}_${studentId}`;
            const legacyDocs = docs.filter(docItem => docItem.id !== deterministicId);
            const deterministicDoc = docs.find(docItem => docItem.id === deterministicId);

            if (legacyDocs.length > 0) {
                // We have legacy docs. 
                // If we DON'T have a deterministic doc yet, migrate the "best" legacy doc.
                // If we DO have a deterministic doc, merge legacy into it and delete legacy.
                
                const bestLegacy = legacyDocs[0]; // Already sorted by priority in previous step
                
                if (!deterministicDoc) {
                    // Create deterministic doc with legacy data
                    migrationBatch.set(doc(db, 'test_results', deterministicId), bestLegacy.data);
                    migratedCount++;
                }

                // Delete ALL legacy docs
                legacyDocs.forEach(ld => {
                    migrationBatch.delete(doc(db, 'test_results', ld.id));
                });
            }
        });

        if (migratedCount > 0) {
            await migrationBatch.commit();
            console.log(`Migrated ${migratedCount} results to deterministic ID format`);
            
            // Re-fetch or adjust map if necessary? 
            // For now, next time initialize runs or snapshots fix it.
        }

        console.log(`Found ${existingResults.size - duplicatesRemoved} unique existing results`);

        // Get all students in this batch
        const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            where('batchId', '==', resolvedBatchId)
            // Removed strict status filtering to ensure all batch students are markable
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        const eligibleStudents = studentsSnapshot.docs;

        // Cleanup Orphans (Students removed from batch or marked as BACKLOG later)
        const currentStudentIds = new Set(eligibleStudents.map(d => d.id));
        const orphanBatch = writeBatch(db);
        let orphansRemoved = 0;

        studentResultMap.forEach((docs, studentId) => {
            if (!currentStudentIds.has(studentId)) {
                console.log(`Removing orphan results for student ${studentId}`);
                docs.forEach(docItem => {
                    orphanBatch.delete(doc(db, 'test_results', docItem.id));
                    orphansRemoved++;
                });
            }
        });

        if (orphansRemoved > 0) {
            await orphanBatch.commit();
            console.log(`Removed ${orphansRemoved} orphaned entries`);
        }

        if (eligibleStudents.length === 0) {
            console.log('No eligible students found in batch');
            // Fix stale stats: if we found 0 students but db says > 0, update it.
            if (testData.totalStudents && testData.totalStudents > 0) {
                console.log('Detected stale stats (Students: 0 vs DB: ' + testData.totalStudents + '), fixing...');
                await updateTestStats(testId, 0);
            }
            return 0;
        }

        // Create or Update result placeholders
        const batch_write = writeBatch(db);
        let newCount = 0;
        let syncCount = 0;

        eligibleStudents.forEach(studentDoc => {
            const student = studentDoc.data();
            const studentId = studentDoc.id;

            // CHECK: Does this student already have a result entry?
            if (existingStudentIds.has(studentId)) {
                // IDENTITY SYNC: Update existing entry with latest metadata (Name, Roll No)
                const existingEntries = studentResultMap.get(studentId);
                if (existingEntries && existingEntries.length > 0) {
                    const existingDoc = existingEntries[0]; // After cleanup, only one remains
                    const currentData = existingDoc.data;

                    // Only update if something has changed to save writes
                    const needsSync = 
                        currentData.studentName !== student.name ||
                        currentData.rollNumber !== (student.rollNumber || null) ||
                        currentData.enrollmentNumber !== (student.enrollmentNumber || null);

                    if (needsSync) {
                        batch_write.update(doc(db, 'test_results', existingDoc.id), {
                            studentName: student.name || 'Unknown',
                            rollNumber: student.rollNumber || null,
                            enrollmentNumber: student.enrollmentNumber || null,
                            email: student.email || null,
                            updatedAt: serverTimestamp()
                        });
                        syncCount++;
                    }
                }
                return;
            }

            // CREATE NEW: Placeholder with deterministic ID
            const resId = `${testId}_${studentId}`;
            const resultRef = doc(db, 'test_results', resId);

            const resultData = {
                // Test Info
                test: testId,
                testTopic: topic,
                testDate,
                maxMarks,

                // Student Info
                student: studentId,
                studentName: student.name || 'Unknown',
                rollNumber: student.rollNumber || null,
                enrollmentNumber: student.enrollmentNumber || null,
                email: student.email || null,

                // Batch/Course Info
                batch: resolvedBatchId,
                batchName: batchName || 'Batch',
                subject: subject || '',
                subjectName: subjectName || 'Subject',
                semester: parseInt(semester) || 1,
                academicYear: academicYear || '',

                // Results (empty initially)
                marksObtained: null,
                percentage: 0,
                passFailStatus: 'PENDING',

                // Additional Data
                remarks: '',
                enteredBy: null,
                enteredAt: null,

                // Publication
                isPublished: false,
                publishedAt: null,

                // Metadata
                createdAt: serverTimestamp()
            };

            batch_write.set(resultRef, resultData);
            newCount++;
        });

        if (newCount > 0 || syncCount > 0) {
            await batch_write.commit();
            console.log(`Test Init: Created ${newCount} new, Synced ${syncCount} existing identity profiles`);
        } else {
            console.log('Test logic: All student identities are up-to-date');
        }

        // Update test stats with authoritative count
        await updateTestStats(testId, eligibleStudents.length);

        return newCount;
    } catch (error) {
        console.error('Error initializing test results:', error);
        throw error;
    }
}

/**
 * Get all results for a test
 * @param {string} testId - Test ID
 * @returns {Promise<Array>} - List of results
 */
export async function getTestResults(testId) {
    try {
        const resultsQuery = query(
            collection(db, 'test_results'),
            where('test', '==', testId)
            // Removed orderBy to avoid composite index requirement
        );

        const snapshot = await getDocs(resultsQuery);
        const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            enteredAt: doc.data().enteredAt?.toDate(),
            publishedAt: doc.data().publishedAt?.toDate()
        }));

        // Sort by studentName on client-side
        return results.sort((a, b) => {
            const nameA = (a.studentName || '').toLowerCase();
            const nameB = (b.studentName || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    } catch (error) {
        console.error('Error fetching test results:', error);
        throw error;
    }
}

/**
 * Get student's test results with filters
 * @param {string} studentId - Student ID
 * @param {Object} filters - Optional filters {semester, subject, academicYear, isPublished}
 * @returns {Promise<Array>} - List of results
 */
export async function getStudentResults(studentId, filters = {}) {
    try {
        let q = query(
            collection(db, 'test_results'),
            where('student', '==', studentId)
        );

        // Apply filters
        if (filters.semester) {
            q = query(q, where('semester', '==', parseInt(filters.semester)));
        }
        if (filters.subject) {
            q = query(q, where('subject', '==', filters.subject));
        }
        if (filters.academicYear) {
            q = query(q, where('academicYear', '==', filters.academicYear));
        }
        if (filters.isPublished !== undefined) {
            q = query(q, where('isPublished', '==', filters.isPublished));
        }

        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            enteredAt: doc.data().enteredAt?.toDate(),
            publishedAt: doc.data().publishedAt?.toDate()
        }));

        // Get test details for each result
        const resultsWithTests = await Promise.all(
            results.map(async (result) => {
                const testDoc = await getDoc(doc(db, 'tests', result.test));
                const testData = testDoc.exists() ? testDoc.data() : null;

                return {
                    ...result,
                    testDetails: testData ? {
                        id: testDoc.id,
                        topic: testData.topic,
                        testDate: testData.testDate?.toDate(),
                        subjectName: testData.subjectName,
                        testType: testData.testType,
                        semester: testData.semester
                    } : null
                };
            })
        );

        // Sort by most recent first
        resultsWithTests.sort((a, b) => {
            const dateA = a.testDetails?.testDate || new Date(0);
            const dateB = b.testDetails?.testDate || new Date(0);
            return dateB - dateA;
        });

        return resultsWithTests;
    } catch (error) {
        console.error('Error fetching student results:', error);
        throw error;
    }
}

/**
 * Check if all marks are entered for a test
 * @param {string} testId - Test ID
 * @returns {Promise<boolean>}
 */
export async function canPublishResults(testId) {
    try {
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) {
            return false;
        }

        const testData = testDoc.data();
        return testData.resultsMissing === 0;
    } catch (error) {
        console.error('Error checking publish readiness:', error);
        return false;
    }
}

/**
 * Calculate statistics for a test
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} - Statistics object
 */
export async function calculateTestStatistics(testId) {
    try {
        const resultsQuery = query(
            collection(db, 'test_results'),
            where('test', '==', testId)
        );
        const resultsSnap = await getDocs(resultsQuery);

        const results = resultsSnap.docs.map(doc => doc.data());

        if (results.length === 0) {
            return {
                totalStudents: 0,
                resultsEntered: 0,
                passCount: 0,
                failCount: 0,
                averageMarks: 0,
                averagePercentage: 0,
                highest: 0,
                lowest: 0
            };
        }

        const totalStudents = results.length;
        // Only count valid marks
        const validResults = results.filter(r => r.marksObtained !== null && r.marksObtained !== undefined && r.marksObtained !== '');
        const resultsEntered = validResults.length;

        const passCount = validResults.filter(r => r.passFailStatus === 'PASS').length;
        const failCount = validResults.filter(r => r.passFailStatus === 'FAIL').length;

        const totalMarks = validResults.reduce((sum, r) => sum + (parseFloat(r.marksObtained) || 0), 0);
        const averageMarks = resultsEntered > 0 ? (totalMarks / resultsEntered).toFixed(2) : 0;

        const totalPercentage = validResults.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);
        const averagePercentage = resultsEntered > 0 ? (totalPercentage / resultsEntered).toFixed(2) : 0;

        const marksArray = validResults.map(r => parseFloat(r.marksObtained) || 0);
        const highest = marksArray.length > 0 ? Math.max(...marksArray) : 0;
        const lowest = marksArray.length > 0 ? Math.min(...marksArray) : 0;

        return {
            totalStudents,
            resultsEntered,
            passCount,
            failCount,
            passPercentage: ((passCount / totalStudents) * 100).toFixed(2),
            averageMarks: parseFloat(averageMarks),
            averagePercentage: parseFloat(averagePercentage),
            highest,
            lowest
        };
    } catch (error) {
        console.error('Error calculating test statistics:', error);
        throw error;
    }
}

/**
 * Get student performance summary for a semester
 * @param {string} studentId - Student ID
 * @param {number} semester - Semester number
 * @returns {Promise<Object>} - Performance summary
 */
export async function getStudentPerformanceSummary(studentId, semester) {
    try {
        const resultsQuery = query(
            collection(db, 'test_results'),
            where('student', '==', studentId),
            where('semester', '==', parseInt(semester)),
            where('isPublished', '==', true)
        );
        const resultsSnap = await getDocs(resultsQuery);

        const results = resultsSnap.docs.map(doc => doc.data());

        if (results.length === 0) {
            return {
                totalTests: 0,
                passCount: 0,
                failCount: 0,
                averagePercentage: 0
            };
        }

        const totalTests = results.length;
        const passCount = results.filter(r => r.passFailStatus === 'PASS').length;
        const failCount = results.filter(r => r.passFailStatus === 'FAIL').length;

        const totalPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0);
        const averagePercentage = (totalPercentage / totalTests).toFixed(2);

        return {
            totalTests,
            passCount,
            failCount,
            averagePercentage: parseFloat(averagePercentage),
            passPercentage: ((passCount / totalTests) * 100).toFixed(2)
        };
    } catch (error) {
        console.error('Error fetching student performance summary:', error);
        throw error;
    }
}

/**
 * Update test statistics (internal helper)
 * @param {string} testId - Test ID
 * @returns {Promise<void>}
 */
async function updateTestStats(testId, forcedTotalStudents = null) {
    try {
        const testDoc = await getDoc(doc(db, 'tests', testId));
        if (!testDoc.exists()) {
            return;
        }

        const testData = testDoc.data();
        let { totalStudents } = testData;

        // If a forced count is provided (e.g., from initialization), use it
        if (forcedTotalStudents !== null) {
            totalStudents = forcedTotalStudents;
        }

        // Count results entered
        const resultsQuery = query(
            collection(db, 'test_results'),
            where('test', '==', testId)
        );
        const resultsSnap = await getDocs(resultsQuery);
        const resultsEntered = resultsSnap.size;
        const resultsMissing = Math.max(0, totalStudents - resultsEntered);

        await updateDoc(doc(db, 'tests', testId), {
            totalStudents,
            resultsEntered,
            resultsMissing
        });

        // Transition logic: If scheduled AND conducting date has passed, move to completed
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const testDate = testData.testDate?.toDate ? testData.testDate.toDate() : new Date(testData.testDate);
        testDate.setHours(0, 0, 0, 0);

        if (testData.status === 'scheduled' && today >= testDate) {
            await updateDoc(doc(db, 'tests', testId), {
                status: 'completed'
            });
            console.log(`Test ${testId} transitioned to COMPLETED (Date Passed)`);
        }

        console.log(`Updated stats: Total=${totalStudents}, Entered=${resultsEntered}, Missing=${resultsMissing}`);
    } catch (error) {
        console.error('Error updating test stats:', error);
    }
}
