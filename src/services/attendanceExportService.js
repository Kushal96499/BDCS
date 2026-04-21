import ExcelJS from 'exceljs';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSunday, getDate } from 'date-fns';

/**
 * Export monthly attendance matrix to Excel
 * Matches the requested institutional format:
 * - Color-coded Sundays/Holidays (Pink)
 * - Full matrix of days existing in the month
 * - Summary columns: Present, Absent, NOC, Holiday, Total, Percentage
 * 
 * @param {Object} batch - Batch details
 * @param {Date} monthDate - The month to export (Date object)
 * @param {Array} students - List of students
 * @param {Array} records - Attendance records for the month
 * @returns {string} Filename
 */
export async function exportMonthlyAttendanceToExcel(batch, monthDate, students, records) {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`${format(monthDate, 'MMMM')} Attendance`);

        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const lastDay = daysInMonth.length;

        // 1. Setup Columns
        const columns = [
            { header: 'S.No', key: 'sno', width: 5 },
            { header: 'Student Name', key: 'name', width: 25 },
        ];
        
        // Add Days Columns (1 to lastDay)
        daysInMonth.forEach(day => {
            columns.push({ header: format(day, 'd'), key: `day_${format(day, 'd')}`, width: 4 });
        });

        // Add Summary Columns
        columns.push(
            { header: 'Present', key: 'present', width: 8 },
            { header: 'Absent', key: 'absent', width: 8 },
            { header: 'NOC', key: 'noc', width: 8 },
            { header: 'NA', key: 'na', width: 8 },
            { header: 'Holiday', key: 'holiday', width: 8 },
            { header: 'Total', key: 'total', width: 8 },
            { header: '%', key: 'percentage', width: 8 }
        );

        worksheet.columns = columns;

        // 2. Styling: Header Row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 10, name: 'Arial' };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
        };

        // 3. Add Data Rows
        students.forEach((student, idx) => {
            const rowData = {
                sno: idx + 1,
                name: student.name.toUpperCase()
            };

            let presentCount = 0;
            let absentCount = 0;
            let nocCount = 0;
            let holidayCount = 0;
            let naCount = 0;

            daysInMonth.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayNum = format(day, 'd');
                const record = records.find(r => r.studentId === student.id && r.date === dateStr);
                const dayCellKey = `day_${dayNum}`;

                if (isSunday(day)) {
                    rowData[dayCellKey] = 'SUN';
                    holidayCount++;
                } else if (record) {
                    const status = record.status?.toUpperCase() || '';
                    if (status === 'PRESENT' || status === 'P') {
                        rowData[dayCellKey] = 'P';
                        presentCount++;
                    } else if (status === 'ABSENT' || status === 'A') {
                        rowData[dayCellKey] = 'A';
                        absentCount++;
                    } else if (status === 'NOC') {
                        rowData[dayCellKey] = 'N';
                        nocCount++;
                    } else if (status === 'HOLIDAY' || status === 'H') {
                        rowData[dayCellKey] = 'H';
                        holidayCount++;
                    } else {
                        rowData[dayCellKey] = '-';
                        naCount++;
                    }
                } else {
                    rowData[dayCellKey] = '';
                    naCount++;
                }
            });

            // Summary Totals
            rowData.present = presentCount;
            rowData.absent = absentCount;
            rowData.noc = nocCount;
            rowData.na = naCount;
            rowData.holiday = holidayCount;
            rowData.total = lastDay;
            
            // Conducted Classes only include P, A, and N (Excludes NA and Holidays)
            const conductedDays = presentCount + absentCount + nocCount;
            const percentage = conductedDays > 0 
                ? (((presentCount + nocCount) / conductedDays) * 100).toFixed(0) 
                : '0';
            rowData.percentage = `${percentage}%`;

            const row = worksheet.addRow(rowData);
            
            // 4. Row Styling & Conditional Formatting
            row.font = { size: 9, name: 'Arial' };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell('name').alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            row.getCell('name').font = { bold: true, size: 9 };

            // Color Sundays and Holidays
            daysInMonth.forEach((day, dIdx) => {
                const cell = row.getCell(3 + dIdx); // 1-based index (S.No=1, Name=2, Day1=3)
                const isH = cell.value === 'SUN' || cell.value === 'H' || cell.value === 'HOL';
                
                if (isSunday(day) || isH) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFEBEE' } // Light Pink
                    };
                }
            });

            // Borders for every cell in row
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFEDEDED' } },
                    left: { style: 'thin', color: { argb: 'FFEDEDED' } },
                    bottom: { style: 'thin', color: { argb: 'FFEDEDED' } },
                    right: { style: 'thin', color: { argb: 'FFEDEDED' } }
                };
            });
        });

        // 5. Freeze Panes (Freeze S.No and Name)
        worksheet.views = [
            { state: 'frozen', xSplit: 2, ySplit: 1 }
        ];

        // 6. Generate Buffer
        const buffer = await workbook.xlsx.writeBuffer();
        
        // 7. Download
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const filename = `Report_${batch.courseName}_${format(monthDate, 'MMM_yyyy')}.xlsx`.replace(/\s+/g, '_');
        anchor.download = filename;
        anchor.click();
        window.URL.revokeObjectURL(url);

        return filename;
    } catch (error) {
        console.error('Excel Export Error:', error);
        throw error;
    }
}
