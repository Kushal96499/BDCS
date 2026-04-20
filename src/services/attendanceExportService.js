import * as XLSX from 'xlsx';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSunday } from 'date-fns';

/**
 * Export monthly attendance matrix to Excel
 * @param {Object} batch - Batch details
 * @param {Date} monthDate - The month to export
 * @param {Array} students - List of students
 * @param {Array} records - Attendance records for the month
 * @returns {string} Filename
 */
export async function exportMonthlyAttendanceToExcel(batch, monthDate, students, records) {
    try {
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const days = eachDayOfInterval({ start, end });

        // Prepare Header: S.No, Roll No, Name, [Days 1-31], Present, Absent, %
        const header = [
            'S.No', 
            'Roll No', 
            'Student Name', 
            ...days.map(d => format(d, 'dd')), 
            'Present', 
            'Absent', 
            'Percentage'
        ];

        // Prepare Data Rows
        const rows = students.map((student, idx) => {
            let presentCount = 0;
            let totalSessions = 0;

            const dayStatuses = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const record = records.find(r => r.studentId === student.id && r.date === dateStr);
                
                if (isSunday(day)) return 'SUN';
                
                if (!record) return '-';

                const status = (record.status || '').toUpperCase();
                if (status === 'PRESENT' || status === 'P' || status === 'NOC') {
                    presentCount++;
                    totalSessions++;
                    return status === 'NOC' ? 'NOC' : 'P';
                } else if (status === 'HOLIDAY') {
                    return 'H';
                } else {
                    totalSessions++;
                    return 'A';
                }
            });

            const percentage = totalSessions > 0 ? ((presentCount / totalSessions) * 100).toFixed(1) : '0.0';

            return [
                idx + 1,
                student.rollNumber || 'N/A',
                student.name,
                ...dayStatuses,
                presentCount,
                totalSessions - presentCount,
                `${percentage}%`
            ];
        });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

        // Auto-size columns
        const colWidths = [
            { wch: 5 },  // S.No
            { wch: 15 }, // Roll No
            { wch: 25 }, // Name
            ...days.map(() => ({ wch: 4 })), // Day columns
            { wch: 8 },  // Present
            { wch: 8 },  // Absent
            { wch: 10 }  // Percentage
        ];
        worksheet['!cols'] = colWidths;

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

        // Filename
        const filename = `Attendance_${batch.courseName}_${format(monthDate, 'MMM_yyyy')}.xlsx`
            .replace(/\s+/g, '_');

        // Download
        XLSX.writeFile(workbook, filename);

        return filename;
    } catch (error) {
        console.error('Excel Export Error:', error);
        throw error;
    }
}
