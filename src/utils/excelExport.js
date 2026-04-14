// ============================================
// BDCS - Excel Export Utility
// Generates Excel reports for tests, batches, and student transcripts
// ============================================

import { logSystemAction } from './auditLogger';

/**
 * Export batch test results to Excel
 * @param {Array} results - Test results array
 * @param {Object} testInfo - Test information
 * @param {string} filename - Output filename
 * @param {Object} user - User performing export (for audit)
 */
export async function exportBatchResults(results, testInfo, filename = 'batch_results.xlsx', user = null) {
    try {
        // Create table data
        const headers = [
            'Roll No',
            'Student Name',
            'Marks Obtained',
            'Max Marks',
            'Percentage',
            'Status',
            'Remarks'
        ];

        const rows = results.map(result => [
            result.enrollmentNumber,
            result.studentName,
            result.marksObtained,
            result.maxMarks,
            `${result.percentage}%`,
            result.passFailStatus,
            result.remarks || '-'
        ]);

        // Generate worksheet
        const wsData = [
            // Title rows
            [`${testInfo.subjectName} - ${testInfo.topic}`],
            [`Batch: ${testInfo.batchName}`],
            [`Date: ${new Date(testInfo.testDate).toLocaleDateString()}`],
            [`Max Marks: ${testInfo.maxMarks}`],
            [], // Empty row
            headers,
            ...rows
        ];

        downloadAsExcel(wsData, filename);

        // Audit Log
        if (user) {
            await logSystemAction(
                'exports',
                `export_${Date.now()}`,
                'EXPORT_BATCH_RESULTS',
                {
                    testId: testInfo.id,
                    subject: testInfo.subjectName,
                    batch: testInfo.batchName,
                    recordCount: results.length
                },
                user
            );
        }
    } catch (error) {
        console.error('Error exporting batch results:', error);
        throw error;
    }
}

/**
 * Export semester-wise report
 * @param {Array} tests - Array of tests with results
 * @param {Object} batchInfo - Batch information
 * @param {string} filename - Output filename
 * @param {Object} user - User performing export
 */
export async function exportSemesterReport(tests, batchInfo, filename = 'semester_report.xlsx', user = null) {
    try {
        const headers = [
            'Subject',
            'Topic',
            'Date',
            'Type',
            'Max Marks',
            'Average',
            'Highest',
            'Lowest',
            'Pass %'
        ];

        const rows = tests.map(test => [
            test.subjectName,
            test.topic,
            new Date(test.testDate).toLocaleDateString(),
            test.testType,
            test.maxMarks,
            test.stats?.averageMarks || '-',
            test.stats?.highest || '-',
            test.stats?.lowest || '-',
            test.stats?.passPercentage ? `${test.stats.passPercentage}%` : '-'
        ]);

        const wsData = [
            [`Semester Report - ${batchInfo.name}`],
            [`Academic Year: ${batchInfo.academicYear}`],
            [`Semester: ${batchInfo.semester}`],
            [],
            headers,
            ...rows
        ];

        downloadAsExcel(wsData, filename);

        // Audit Log
        if (user) {
            await logSystemAction(
                'exports',
                `export_${Date.now()}`,
                'EXPORT_SEMESTER_REPORT',
                {
                    batchName: batchInfo.name,
                    semester: batchInfo.semester,
                    academicYear: batchInfo.academicYear,
                    recordCount: tests.length
                },
                user
            );
        }
    } catch (error) {
        console.error('Error exporting semester report:', error);
        throw error;
    }
}

/**
 * Export student transcript
 * @param {Object} studentData - Student information
 * @param {Array} semesterResults - Semester-wise results
 * @param {string} filename - Output filename
 * @param {Object} user - User performing export
 */
export async function exportStudentTranscript(studentData, semesterResults, filename = 'student_transcript.xlsx', user = null) {
    try {
        const wsData = [
            ['ACADEMIC TRANSCRIPT'],
            [],
            ['Student Name:', studentData.name],
            ['Enrollment Number:', studentData.enrollmentNumber],
            ['Course:', studentData.courseName],
            [],
        ];

        // Add semester-wise data
        semesterResults.forEach(semester => {
            wsData.push([`SEMESTER ${semester.semester} (${semester.academicYear})`]);
            wsData.push(['Subject', 'Test', 'Date', 'Marks', 'Max', '%', 'Status']);

            semester.tests.forEach(test => {
                wsData.push([
                    test.subjectName,
                    test.topic,
                    new Date(test.testDate).toLocaleDateString(),
                    test.marksObtained,
                    test.maxMarks,
                    `${test.percentage}%`,
                    test.passFailStatus
                ]);
            });

            wsData.push(['', '', '', '', 'Average:', `${semester.averagePercentage}%`, '']);
            wsData.push([]);
        });

        downloadAsExcel(wsData, filename);

        // Audit Log
        if (user) {
            await logSystemAction(
                'exports',
                `export_${Date.now()}`,
                'EXPORT_STUDENT_TRANSCRIPT',
                {
                    studentName: studentData.name,
                    enrollmentNumber: studentData.enrollmentNumber,
                    semestersCount: semesterResults.length
                },
                user
            );
        }
    } catch (error) {
        console.error('Error exporting student transcript:', error);
        throw error;
    }
}

/**
 * Helper: Download data as Excel file (CSV format for simplicity)
 * @param {Array} data - 2D array of data
 * @param {string} filename - Output filename
 */
function downloadAsExcel(data, filename) {
    // Convert to CSV
    const csvContent = data
        .map(row =>
            row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        )
        .join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename.replace('.xlsx', '.csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate Excel template for bulk marks upload
 * @param {Array} students - List of students
 * @param {Object} testInfo - Test information
 * @returns {void}
 */
export function downloadMarksTemplate(students, testInfo) {
    const wsData = [
        ['Bulk Marks Upload Template'],
        [`Subject: ${testInfo.subjectName} - ${testInfo.topic}`],
        [`Max Marks: ${testInfo.maxMarks}`],
        [],
        ['Roll No', 'Student Name', 'Marks Obtained', 'Remarks'],
        ...students.map(student => [
            student.enrollmentNumber || student.rollNumber,
            student.name,
            '', // Empty marks field
            '' // Empty remarks field
        ])
    ];

    downloadAsExcel(wsData, `marks_template_${testInfo.topic}.csv`);
}
