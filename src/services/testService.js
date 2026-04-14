// ============================================
// BDCS - Test Service
// Manages Continuous Tests (Class Tests, Unit Tests, Practicals)
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
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logSystemAction } from '../utils/auditLogger';

/**
 * Create a new test
 * @param {Object} testData - Test details
 * @param {Object} teacherUser - Creating teacher
 * @returns {Promise<string>} - Created test ID
 */
export async function createTest(testData, teacherUser) {
    try {
        const {
            subjectId,
            subjectName,
            topic,
            batchId,
            batchName,
            semester,
            academicYear,
            courseId,
            courseName,
            testDate,
            maxMarks,
            testType = 'class_test',
            description = ''
        } = testData;

        // Validation
        if (!subjectId || !batchId || !testDate || !maxMarks) {
            throw new Error('Missing required fields');
        }

        if (maxMarks <= 0) {
            throw new Error('Max marks must be greater than 0');
        }

        const testDateObj = new Date(testDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        if (testDateObj < today) {
            throw new Error('Test date cannot be in the past');
        }

        // Count students in batch
        const studentsQuery = query(
            collection(db, 'users'),
            where('batchId', '==', batchId),
            where('role', '==', 'student'),
            where('status', '==', 'active')
        );
        const studentsSnap = await getDocs(studentsQuery);
        const totalStudents = studentsSnap.size;

        const testDoc = {
            // Test Identity
            subject: subjectId,
            subjectName,
            topic,

            // Batch & Academic Context
            batch: batchId,
            batchName,
            semester: parseInt(semester),
            academicYear,
            course: courseId,
            courseName,

            // Test Details
            testDate: Timestamp.fromDate(new Date(testDate)),
            maxMarks: parseInt(maxMarks),
            testType,
            description,

            // Ownership
            createdBy: teacherUser.uid,
            createdByName: teacherUser.name,
            createdAt: serverTimestamp(),

            // Status
            status: 'draft', // draft, scheduled, completed, published
            publishedAt: null,
            publishedBy: null,

            // Stats
            totalStudents,
            resultsEntered: 0,
            resultsMissing: totalStudents
        };

        const docRef = await addDoc(collection(db, 'tests'), testDoc);

        // Audit log
        await logSystemAction(
            'tests',
            docRef.id,
            'CREATE_TEST',
            {
                testType,
                subject: subjectName,
                batch: batchName,
                maxMarks,
                totalStudents
            },
            teacherUser
        );

        return docRef.id;
    } catch (error) {
        console.error('Error creating test:', error);
        throw error;
    }
}

/**
 * Get tests by batch with filters
 * @param {string} batchId - Batch ID
 * @param {Object} filters - Optional filters (status, subject, semester)
 * @returns {Promise<Array>} - List of tests
 */
export async function getTestsByBatch(batchId, filters = {}) {
    try {
        let q = query(
            collection(db, 'tests'),
            where('batch', '==', batchId),
            orderBy('testDate', 'desc')
        );

        // Apply filters
        if (filters.status) {
            q = query(q, where('status', '==', filters.status));
        }
        if (filters.subject) {
            q = query(q, where('subject', '==', filters.subject));
        }
        if (filters.semester) {
            q = query(q, where('semester', '==', parseInt(filters.semester)));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            testDate: doc.data().testDate?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            publishedAt: doc.data().publishedAt?.toDate()
        }));
    } catch (error) {
        console.error('Error fetching tests by batch:', error);
        throw error;
    }
}

/**
 * Get tests created by a teacher
 * @param {string} teacherId - Teacher user ID
 * @param {string} academicYear - Optional academic year filter
 * @returns {Promise<Array>} - List of tests
 */
export async function getTestsByTeacher(teacherId, academicYear = null) {
    try {
        let q = query(
            collection(db, 'tests'),
            where('createdBy', '==', teacherId)
            // Removed orderBy to avoid composite index requirement
            // Client-side sorting will be done in the component
        );

        if (academicYear) {
            q = query(q, where('academicYear', '==', academicYear));
        }

        const snapshot = await getDocs(q);
        const tests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            testDate: doc.data().testDate?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
            publishedAt: doc.data().publishedAt?.toDate()
        }));

        // Sort by testDate descending on client-side
        return tests.sort((a, b) => {
            const dateA = a.testDate || new Date(0);
            const dateB = b.testDate || new Date(0);
            return dateB - dateA;
        });
    } catch (error) {
        console.error('Error fetching tests by teacher:', error);
        throw error;
    }
}

/**
 * Get single test by ID
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} - Test data
 */
export async function getTestById(testId) {
    try {
        const docRef = doc(db, 'tests', testId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Test not found');
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            testDate: data.testDate?.toDate(),
            createdAt: data.createdAt?.toDate(),
            publishedAt: data.publishedAt?.toDate()
        };
    } catch (error) {
        console.error('Error fetching test:', error);
        throw error;
    }
}

/**
 * Update test details (only before completion)
 * @param {string} testId - Test ID
 * @param {Object} updates - Fields to update
 * @param {Object} teacherUser - Updating teacher
 * @returns {Promise<void>}
 */
export async function updateTestDetails(testId, updates, teacherUser) {
    try {
        const testRef = doc(db, 'tests', testId);
        const testSnap = await getDoc(testRef);

        if (!testSnap.exists()) {
            throw new Error('Test not found');
        }

        const currentData = testSnap.data();

        // Validation: Can only update if not published
        if (currentData.status === 'published') {
            throw new Error('Cannot update published test');
        }

        // Allowed updates
        const allowedFields = ['topic', 'description', 'testDate', 'maxMarks'];
        const filteredUpdates = {};

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];

                // Convert date if needed
                if (field === 'testDate' && typeof updates[field] === 'string') {
                    filteredUpdates[field] = Timestamp.fromDate(new Date(updates[field]));
                }

                // Parse numbers
                if (field === 'maxMarks') {
                    filteredUpdates[field] = parseInt(updates[field]);
                }
            }
        });

        await updateDoc(testRef, filteredUpdates);

        // Audit log
        await logSystemAction(
            'tests',
            testId,
            'UPDATE_TEST',
            { updates: filteredUpdates },
            teacherUser
        );
    } catch (error) {
        console.error('Error updating test:', error);
        throw error;
    }
}

/**
 * Publish test results (make visible to students)
 * @param {string} testId - Test ID
 * @param {Object} teacherUser - Publishing teacher
 * @returns {Promise<void>}
 */
export async function publishTest(testId, teacherUser) {
    try {
        const testRef = doc(db, 'tests', testId);
        const testSnap = await getDoc(testRef);

        if (!testSnap.exists()) {
            throw new Error('Test not found');
        }

        const testData = testSnap.data();

        // Validation: Check if all results are entered
        if (testData.resultsMissing > 0) {
            throw new Error(`Cannot publish: ${testData.resultsMissing} results still missing`);
        }

        // Update test status
        await updateDoc(testRef, {
            status: 'published',
            publishedAt: serverTimestamp(),
            publishedBy: teacherUser.uid
        });

        // Update all test_results to published
        const resultsQuery = query(
            collection(db, 'test_results'),
            where('test', '==', testId)
        );
        const resultsSnap = await getDocs(resultsQuery);

        const updatePromises = resultsSnap.docs.map(resultDoc =>
            updateDoc(doc(db, 'test_results', resultDoc.id), {
                isPublished: true,
                publishedAt: serverTimestamp()
            })
        );

        await Promise.all(updatePromises);

        // Audit log
        await logSystemAction(
            'tests',
            testId,
            'PUBLISH_TEST',
            {
                testName: `${testData.subjectName} - ${testData.topic}`,
                batch: testData.batchName,
                studentsCount: testData.totalStudents
            },
            teacherUser
        );

        // TODO: Send notifications to students
    } catch (error) {
        console.error('Error publishing test:', error);
        throw error;
    }
}

/**
 * Mark test as completed (after test date)
 * @param {string} testId - Test ID
 * @returns {Promise<void>}
 */
export async function markTestCompleted(testId) {
    try {
        const testRef = doc(db, 'tests', testId);
        await updateDoc(testRef, {
            status: 'completed'
        });
    } catch (error) {
        console.error('Error marking test completed:', error);
        throw error;
    }
}

/**
 * Get test statistics
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} - Stats object
 */
export async function getTestStats(testId) {
    try {
        const resultsQuery = query(
            collection(db, 'test_results'),
            where('test', '==', testId)
        );
        const resultsSnap = await getDocs(resultsQuery);

        const results = resultsSnap.docs.map(doc => doc.data());

        const totalStudents = results.length;
        const passCount = results.filter(r => r.passFailStatus === 'PASS').length;
        const failCount = results.filter(r => r.passFailStatus === 'FAIL').length;

        const totalMarks = results.reduce((sum, r) => sum + (r.marksObtained || 0), 0);
        const averageMarks = totalStudents > 0 ? (totalMarks / totalStudents).toFixed(2) : 0;
        const averagePercentage = results.length > 0
            ? (results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length).toFixed(2)
            : 0;

        const highest = Math.max(...results.map(r => r.marksObtained || 0));
        const lowest = Math.min(...results.map(r => r.marksObtained || 0));

        return {
            totalStudents,
            passCount,
            failCount,
            passPercentage: totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(2) : 0,
            averageMarks,
            averagePercentage,
            highest,
            lowest
        };
    } catch (error) {
        console.error('Error calculating test stats:', error);
        throw error;
    }
}

/**
 * Get batch test summary for a semester
 * @param {string} batchId - Batch ID
 * @param {number} semester - Semester number
 * @returns {Promise<Object>} - Summary stats
 */
export async function getBatchTestSummary(batchId, semester) {
    try {
        const testsQuery = query(
            collection(db, 'tests'),
            where('batch', '==', batchId),
            where('semester', '==', parseInt(semester)),
            where('status', '==', 'published')
        );
        const testsSnap = await getDocs(testsQuery);

        const totalTests = testsSnap.size;
        const subjects = new Set();

        testsSnap.docs.forEach(doc => {
            subjects.add(doc.data().subjectName);
        });

        return {
            totalTests,
            totalSubjects: subjects.size,
            subjectNames: Array.from(subjects)
        };
    } catch (error) {
        console.error('Error fetching batch test summary:', error);
        throw error;
    }
}
