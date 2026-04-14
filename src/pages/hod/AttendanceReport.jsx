// ============================================
// BDCS - HOD Attendance Report
// Teacher-wise attendance marking compliance
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/admin/DataTable';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDaysInMonth } from 'date-fns';

export default function AttendanceReport() {
    const { user } = useAuth();


    const [batches, setBatches] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        // Placeholder for future implementation
    };
    const [selectedBatch, setSelectedBatch] = useState('');
    const [targetSemester, setTargetSemester] = useState('');
    const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (user) {
            fetchReport();
            fetchBatches();
        }
    }, [user]);

    const fetchBatches = async () => {
        try {
            if (user.role === 'hod' || user.roles?.includes('hod')) {
                // HOD: Fetch All Batches in Department
                const q = query(
                    collection(db, 'batches'),
                    where('departmentId', '==', user.departmentId),
                    where('status', '==', 'active')
                );
                const snap = await getDocs(q);
                setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                // Teacher: Fetch Assigned Classes
                const q = query(collection(db, 'class_assignments'), where('teacherId', '==', user.uid));
                const snap = await getDocs(q);
                const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Deduplicate by Batch ID
                const uniqueBatches = [];
                const seen = new Set();

                assignments.forEach(a => {
                    // Use batchId as key. If missing, fallback to id but batchId preferred from assignment
                    const batchId = a.batchId;
                    if (batchId && !seen.has(batchId)) {
                        seen.add(batchId);
                        uniqueBatches.push({
                            id: batchId,
                            courseId: a.courseId,
                            courseName: a.courseName || a.batchName || 'Batch',
                            semester: a.semester,
                            section: a.section || '',
                            departmentId: a.departmentId
                        });
                    }
                });
                setBatches(uniqueBatches);
            }
        } catch (e) {
            console.error('Error fetching batches:', e);
        }
    };

    const handleExport = async () => {
        if (!selectedBatch || !exportDate) {
            alert('Please select a batch and month');
            return;
        }

        setExporting(true);
        try {
            const [year, month] = exportDate.split('-');
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of month

            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            // 1. Fetch Batch Details
            const batchDoc = batches.find(b => b.id === selectedBatch);
            const activeSemester = batchDoc.semester.toString();
            const exportSemester = targetSemester || activeSemester;

            // 2. Fetch Students of this batch
            // Improved Logic: Fetch via batchId if possible, else Course/Section match
            // We want the students who are CURRENTLY in this batch (even if we are looking at past sem records for them)
            // 2. Fetch Students of this batch
            // Improved Logic: Fetch via batchId if possible, else Course/Section match
            let studentsQ;
            if (batchDoc.id) {
                // If batchId exists, use it - it's usually indexed or simple enough
                studentsQ = query(
                    collection(db, 'users'),
                    where('batchId', '==', batchDoc.id)
                );
            } else {
                // Fallback: Query by courseId only to avoid complex composite index requirement
                // Then filter by section/role in memory
                studentsQ = query(
                    collection(db, 'users'),
                    where('courseId', '==', batchDoc.courseId)
                );
            }

            const studentsSnap = await getDocs(studentsQ);
            const students = studentsSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(s => {
                    // Manual filter to avoid index issues
                    const roleMatch = s.role === 'student';
                    const sectionMatch = batchDoc.id ? true : (s.section === batchDoc.section);
                    // Note: Section match moved here if query was only courseId
                    return roleMatch && sectionMatch;
                });

            if (students.length === 0) {
                alert('No students found in this batch');
                setExporting(false);
                return;
            }

            // 3. Fetch Attendance Records for this range AND Semester
            // Filter by courseId only to avoid index errors, filter others in memory
            const recordsQ = query(
                collection(db, 'attendance_records'),
                where('courseId', '==', batchDoc.courseId)
            );
            const recordsSnap = await getDocs(recordsQ);
            const records = recordsSnap.docs
                .map(d => d.data())
                .filter(r => {
                    const dateMatch = r.date >= startStr && r.date <= endStr;
                    const semMatch = r.semester == exportSemester || r.semester == exportSemester.toString();
                    return dateMatch && semMatch;
                });

            // 4. Pivot Data
            // Rows: Students
            // Cols: Dates (All days of month)
            const daysInMonth = endDate.getDate();
            const dates = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, month - 1, d);
                dates.push(format(dateObj, 'yyyy-MM-dd'));
            }

            // Fetch Holidays for correct export status
            const eventsQ = query(collection(db, 'calendar_events'), where('departmentId', '==', user.departmentId));
            const eventsSnap = await getDocs(eventsQ);
            const events = eventsSnap.docs.map(d => d.data());

            const getEventStatus = (dateStr) => {
                const event = events.find(e => e.date === dateStr && (e.targetBatchId === 'ALL' || e.targetBatchId === batchDoc.id));
                const dateObj = new Date(dateStr);
                const isSunday = dateObj.getDay() === 0;
                if (event && (event.type === 'HOLIDAY' || event.type === 'EXAM')) return 'H';
                if (isSunday) return 'S';
                return null;
            };

            const exportData = students.map(student => {
                const row = {
                    'Student Name': student.name,
                    'Roll No': student.enrollmentNumber || 'N/A',
                    'Semester': exportSemester
                };

                let presentCount = 0;
                let holidayCount = 0;

                dates.forEach(date => {
                    const specialStatus = getEventStatus(date);

                    if (specialStatus) {
                        row[date] = specialStatus; // H or S
                        holidayCount++;
                    } else {
                        const record = records.find(r => r.studentId === student.id && r.date === date);
                        if (record) {
                            const status = record.status === 'PRESENT' ? 'P' : 'A';
                            row[date] = status;
                            if (status === 'P') presentCount++;
                        } else {
                            row[date] = '-';
                        }
                    }
                });

                const validTotal = daysInMonth; // Matching UI logic
                const effectiveTotal = validTotal - holidayCount;
                const percentage = effectiveTotal > 0 ? ((presentCount / effectiveTotal) * 100).toFixed(0) + '%' : '0%';

                row['Total Present'] = presentCount;
                row['Total Days'] = validTotal;
                row['Percentage'] = percentage;

                return row;
            });

            // 5. Generate Excel
            const { utils, writeFile } = await import('xlsx');
            const ws = utils.json_to_sheet(exportData);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Attendance");
            writeFile(wb, `${batchDoc.courseName}_${batchDoc.semester}_Attendance_${exportDate}.xlsx`);

        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed');
        } finally {
            setExporting(false);
        }
    };

    // State for Matrix View
    const [matrixData, setMatrixData] = useState({ days: [], students: [] });

    // Fetch Student Stats when filters change
    useEffect(() => {
        if (selectedBatch) fetchStudentStats();
        else setMatrixData({ days: [], students: [] });
    }, [selectedBatch, targetSemester, exportDate]);

    const fetchStudentStats = async () => {
        setLoading(true);
        try {
            const [year, month] = exportDate.split('-');
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const daysInMonth = endDate.getDate();
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            // Generate array of days [1, 2, ..., 30/31]
            const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            const batchDoc = batches.find(b => b.id === selectedBatch);
            if (!batchDoc) return;

            const activeSemester = batchDoc.semester.toString();
            const exportSemester = targetSemester || activeSemester;

            // Fetch Students (Active Only)
            let studentsQ;
            if (batchDoc.id) {
                studentsQ = query(collection(db, 'users'), where('batchId', '==', batchDoc.id));
            } else {
                studentsQ = query(collection(db, 'users'), where('courseId', '==', batchDoc.courseId));
            }
            const studentsSnap = await getDocs(studentsQ);
            const students = studentsSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(s => s.role === 'student' && s.status === 'active' && (batchDoc.id ? true : s.section === batchDoc.section))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Fetch Records
            const recordsQ = query(collection(db, 'attendance_records'), where('courseId', '==', batchDoc.courseId));
            const recordsSnap = await getDocs(recordsQ);
            const records = recordsSnap.docs.map(d => d.data()).filter(r => {
                const dateMatch = r.date >= startStr && r.date <= endStr;
                const semMatch = r.semester == exportSemester || r.semester == exportSemester.toString();
                return dateMatch && semMatch;
            });

            // Fetch Holidays
            const eventsQ = query(collection(db, 'calendar_events'), where('departmentId', '==', user.departmentId));
            const eventsSnap = await getDocs(eventsQ);
            const events = eventsSnap.docs.map(d => d.data());

            // Helper
            const getEventStatus = (day) => {
                const dateObj = new Date(year, month - 1, day);
                const dateStr = format(dateObj, 'yyyy-MM-dd');
                const event = events.find(e => e.date === dateStr && (e.targetBatchId === 'ALL' || e.targetBatchId === batchDoc.id));
                const isSunday = dateObj.getDay() === 0;

                if (event && (event.type === 'HOLIDAY' || event.type === 'EXAM')) return 'H';
                if (isSunday) return 'S'; // Sunday
                return null;
            };

            // Process Data
            const processedStudents = students.map(student => {
                let presentCount = 0;
                let absentCount = 0;
                let holidayCount = 0;
                let attendanceMap = {};

                daysArray.forEach(day => {
                    const dateObj = new Date(year, month - 1, day);
                    const dateStr = format(dateObj, 'yyyy-MM-dd');
                    const specialStatus = getEventStatus(day); // 'H' or 'S'

                    if (specialStatus) {
                        attendanceMap[day] = specialStatus;
                        holidayCount++;
                    } else {
                        const record = records.find(r => r.studentId === student.id && r.date === dateStr);
                        if (record) {
                            if (record.status === 'PRESENT') {
                                attendanceMap[day] = 'P';
                                presentCount++;
                            } else {
                                attendanceMap[day] = 'A';
                                absentCount++;
                            }
                        } else {
                            attendanceMap[day] = '-'; // NA
                        }
                    }
                });

                const validTotal = daysInMonth; // Or working days? Usually percentage is on Total Days - Holidays? 
                // Let's stick to standard: (Present / (Total - Holidays)) * 100
                const effectiveTotal = validTotal - holidayCount;
                const percentage = effectiveTotal > 0 ? ((presentCount / effectiveTotal) * 100).toFixed(0) : '0';

                return {
                    ...student,
                    attendance: attendanceMap,
                    stats: {
                        present: presentCount,
                        absent: absentCount,
                        holiday: holidayCount,
                        total: validTotal,
                        percentage: percentage
                    }
                };
            });

            setMatrixData({ days: daysArray, students: processedStudents });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="p-8 text-center">Loading User Profile...</div>;

    return (
        <div className="p-6 space-y-8">
            {/* Header with Export */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Attendance Reports</h2>
                    <p className="text-sm text-gray-600">Monthly Matrix View</p>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Select Batch</label>
                        <select
                            className="border rounded-lg px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-biyani-red"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                        >
                            <option value="">-- Choose Batch --</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.courseName} Sem {b.semester} ({b.section})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Target Semester</label>
                        <select
                            className="border rounded-lg px-3 py-2 text-sm w-32 focus:ring-2 focus:ring-biyani-red"
                            value={targetSemester}
                            onChange={(e) => setTargetSemester(e.target.value)}
                            disabled={!selectedBatch}
                        >
                            <option value="">-- Current --</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                <option key={sem} value={sem}>Sem {sem}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Month</label>
                        <input
                            type="month"
                            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red"
                            value={exportDate}
                            onChange={(e) => setExportDate(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting || !selectedBatch}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {exporting ? 'Generating...' : 'Export Excel'}
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
            {selectedBatch && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="min-w-max w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase border-r border-gray-200">S.No</th>
                                    <th className="sticky left-[3.5rem] z-10 bg-gray-50 px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase border-r border-gray-200 w-48">Student Name</th>

                                    {/* Create headers for 1...31 */}
                                    {matrixData.days.map(day => (
                                        <th key={day} className="px-1 py-3 text-center text-xs font-semibold text-gray-500 w-8 border-r border-gray-100">
                                            {day}
                                        </th>
                                    ))}

                                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase border-l border-gray-200 bg-gray-50">Present</th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase border-l border-gray-200 bg-gray-50">Absent</th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase border-l border-gray-200 bg-gray-50">Holiday</th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase border-l border-gray-200 bg-gray-50">Total</th>
                                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase border-l border-gray-200 bg-gray-50">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={40} className="p-8 text-center text-gray-500">Loading attendance data...</td></tr>
                                ) : matrixData.students.length === 0 ? (
                                    <tr><td colSpan={40} className="p-8 text-center text-gray-500">No students found.</td></tr>
                                ) : (
                                    matrixData.students.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="sticky left-0 bg-white px-4 py-2 text-xs font-medium text-gray-500 border-r border-gray-100 group-hover:bg-gray-50">
                                                {idx + 1}
                                            </td>
                                            <td className="sticky left-[3.5rem] bg-white px-4 py-2 text-sm font-semibold text-gray-900 border-r border-gray-100 group-hover:bg-gray-50 w-48 truncate" title={student.name}>
                                                {student.name}
                                            </td>

                                            {matrixData.days.map(day => {
                                                const status = student.attendance[day];
                                                // Colors matching screenshot roughly
                                                let bgColor = 'bg-white';
                                                let textColor = 'text-gray-300';

                                                if (status === 'P') { bgColor = 'bg-transparent'; textColor = 'text-green-600 font-bold'; }
                                                else if (status === 'A') { bgColor = 'bg-red-50'; textColor = 'text-red-500 font-bold'; }
                                                else if (status === 'H' || status === 'S') { bgColor = 'bg-pink-50'; textColor = 'text-pink-600 font-bold'; }

                                                return (
                                                    <td key={day} className={`px-1 py-1 text-center text-xs border-r border-gray-100 ${bgColor}`}>
                                                        <span className={textColor}>{status === '-' ? '' : status}</span>
                                                    </td>
                                                );
                                            })}

                                            <td className="px-3 py-2 text-center text-sm font-medium text-green-600 border-l border-gray-100">{student.stats.present}</td>
                                            <td className="px-3 py-2 text-center text-sm font-medium text-red-500 border-l border-gray-100">{student.stats.absent}</td>
                                            <td className="px-3 py-2 text-center text-sm font-medium text-pink-500 border-l border-gray-100">{student.stats.holiday}</td>
                                            <td className="px-3 py-2 text-center text-sm font-medium text-gray-600 border-l border-gray-100">{student.stats.total}</td>
                                            <td className={`px-3 py-2 text-center text-sm font-bold border-l border-gray-100 ${parseInt(student.stats.percentage) < 75 ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {student.stats.percentage}%
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Keeping Teacher View for HOD if needed, but hiding for now to focus on requests */}
            {!selectedBatch && (user.role === 'hod' || user.roles?.includes('hod')) && (
                <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-dashed border-gray-300">
                    Select a batch to view the attendance matrix.
                </div>
            )}
        </div>
    );
}
