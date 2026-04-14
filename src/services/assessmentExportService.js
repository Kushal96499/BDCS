// ============================================
// BDCS - Assessment Export Service
// Excel export for test results and student history
// ============================================

import * as XLSX from 'xlsx';
import { getTestById } from './testService';
import { getTestResults } from './testResultService';
import { getStudentAcademicHistory } from './batchPromotionService';
import { format } from 'date-fns';

/**
 * Export test results to Excel file
 * @param {string} testId - Test ID
 * @returns {Promise<void>}
 */
export async function exportTestResultsToExcel(testId) {
    try {
        // Get test details
        const test = await getTestById(testId);
        const results = await getTestResults(testId);

        // Prepare data for Excel
        const excelData = results.map((result, index) => ({
            'S.No': index + 1,
            'Enrollment No': result.enrollmentNumber || 'N/A',
            'Student Name': result.studentName,
            'Marks Obtained': result.marksObtained,
            'Max Marks': result.maxMarks,
            'Percentage': `${result.percentage}%`,
            'Result': result.passFailStatus,
            'Remarks': result.remarks || '-'
        }));

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 6 },  // S.No
            { wch: 15 }, // Enrollment No
            { wch: 25 }, // Student Name
            { wch: 12 }, // Marks Obtained
            { wch: 10 }, // Max Marks
            { wch: 12 }, // Percentage
            { wch: 8 },  // Result
            { wch: 30 }  // Remarks
        ];

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

        // Add summary sheet
        const summary = [
            ['Test Details', ''],
            ['Subject', test.subjectName],
            ['Topic', test.topic],
            ['Batch', test.batchName],
            ['Semester', test.semester],
            ['Test Date', format(test.testDate, 'dd MMM yyyy')],
            ['Max Marks', test.maxMarks],
            [''],
            ['Statistics', ''],
            ['Total Students', test.totalStudents],
            ['Results Entered', test.resultsEntered],
            ['Pass Count', results.filter(r => r.passFailStatus === 'PASS').length],
            ['Fail Count', results.filter(r => r.passFailStatus === 'FAIL').length]
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summary);
        summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Generate filename
        const filename = `${test.subjectName}_${test.topic}_Results_${format(new Date(), 'ddMMMyyy')}.xlsx`
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\.]/g, '');

        // Download file
        XLSX.writeFile(workbook, filename);

        return filename;
    } catch (error) {
        console.error('Error exporting test results:', error);
        throw error;
    }
}

/**
 * Export batch results to Excel (all tests for a semester)
 * @param {string} batchId - Batch ID
 * @param {number} semester - Semester number
 * @param {Array} tests - Array of test objects
 * @returns {Promise<void>}
 */
export async function exportBatchResultsToExcel(batchId, semester, tests) {
    try {
        const workbook = XLSX.utils.book_new();

        // For each test, create a sheet
        for (const test of tests) {
            const results = await getTestResults(test.id);

            const excelData = results.map((result, index) => ({
                'S.No': index + 1,
                'Enrollment No': result.enrollmentNumber || 'N/A',
                'Student Name': result.studentName,
                'Marks': result.marksObtained,
                'Max Marks': result.maxMarks,
                'Percentage': `${result.percentage}%`,
                'Result': result.passFailStatus
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet['!cols'] = [
                { wch: 6 }, { wch: 15 }, { wch: 25 },
                { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 8 }
            ];

            // Sheet name (max 31 chars for Excel)
            const sheetName = `${test.subjectName.substring(0, 20)}_${test.topic.substring(0, 8)}`
                .replace(/[^a-zA-Z0-9_]/g, '_');

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }

        // Generate filename
        const filename = `Batch_Results_Sem${semester}_${format(new Date(), 'ddMMMyyy')}.xlsx`;

        // Download file
        XLSX.writeFile(workbook, filename);

        return filename;
    } catch (error) {
        console.error('Error exporting batch results:', error);
        throw error;
    }
}

/**
 * Export student's complete academic history to Excel
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student name
 * @returns {Promise<void>}
 */
export async function exportStudentHistoryToExcel(studentId, studentName) {
    try {
        const history = await getStudentAcademicHistory(studentId);

        const excelData = history.map((record, index) => ({
            'S.No': index + 1,
            'Semester': record.semester,
            'Batch': record.batchName,
            'Academic Year': record.academicYear,
            'Joined': format(record.joinedAt, 'dd MMM yyyy'),
            'Left': record.leftAt ? format(record.leftAt, 'dd MMM yyyy') : 'Active',
            'Status': record.status,
            'Tests Completed': record.testsCompleted || 0,
            'Average %': record.averagePercentage ? `${record.averagePercentage}%` : 'N/A',
            'Pass Count': record.passCount || 0,
            'Fail Count': record.failCount || 0,
            'Remarks': record.remarks || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        worksheet['!cols'] = [
            { wch: 6 }, { wch: 8 }, { wch: 25 }, { wch: 12 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 30 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Academic History');

        const filename = `${studentName.replace(/\s+/g, '_')}_Academic_History_${format(new Date(), 'ddMMMyyy')}.xlsx`;

        XLSX.writeFile(workbook, filename);

        return filename;
    } catch (error) {
        console.error('Error exporting student history:', error);
        throw error;
    }
}
