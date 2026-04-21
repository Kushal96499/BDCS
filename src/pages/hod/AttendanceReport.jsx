// ============================================
// BDCS - HOD Attendance Report
// Teacher-wise attendance marking compliance
// Modernized "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function AttendanceReport() {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [targetSemester, setTargetSemester] = useState('');
    const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [exporting, setExporting] = useState(false);
    const [matrixData, setMatrixData] = useState({ days: [], students: [] });

    useEffect(() => {
        if (user) fetchBatches();
    }, [user]);

    const fetchBatches = async () => {
        try {
            const q = query(
                collection(db, 'batches'),
                where('departmentId', '==', user.departmentId),
                where('status', '==', 'active')
            );
            const snap = await getDocs(q);
            setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error('Sync failed:', e);
        }
    };

    const fetchStudentStats = async () => {
        if (!selectedBatch) return;
        setLoading(true);
        try {
            const [year, month] = exportDate.split('-');
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const daysInMonth = endDate.getDate();
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];
            const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            const batchDoc = batches.find(b => b.id === selectedBatch);
            if (!batchDoc) return;

            const activeSemester = batchDoc.semester.toString();
            const exportSemester = targetSemester || activeSemester;

            // Fetch Students
            const studentsQ = query(collection(db, 'users'), where('batchId', '==', batchDoc.id));
            const studentsSnap = await getDocs(studentsQ);
            const students = studentsSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(s => s.role === 'student' && s.status === 'active')
                .sort((a, b) => a.name.localeCompare(b.name));

            // Fetch Records
            const recordsQ = query(collection(db, 'attendance_records'), where('courseId', '==', batchDoc.courseId));
            const recordsSnap = await getDocs(recordsQ);
            const records = recordsSnap.docs.map(d => d.data()).filter(r => {
                return r.date >= startStr && r.date <= endStr && (r.semester == exportSemester);
            });

            // Fetch Holidays
            const eventsQ = query(collection(db, 'calendar_events'), where('departmentId', '==', user.departmentId));
            const eventsSnap = await getDocs(eventsQ);
            const events = eventsSnap.docs.map(d => d.data());

            const processedStudents = students.map(student => {
                let presentCount = 0, absentCount = 0, holidayCount = 0;
                let attendanceMap = {};

                daysArray.forEach(day => {
                    const dateObj = new Date(year, month - 1, day);
                    const dateStr = format(dateObj, 'yyyy-MM-dd');
                    const event = events.find(e => e.date === dateStr && (e.targetBatchId === 'ALL' || e.targetBatchId === batchDoc.id));
                    const isSunday = dateObj.getDay() === 0;
                    
                    if (event && (event.type === 'HOLIDAY' || event.type === 'EXAM')) {
                        attendanceMap[day] = 'H'; holidayCount++;
                    } else if (isSunday) {
                        attendanceMap[day] = 'S'; holidayCount++;
                    } else {
                        const record = records.find(r => r.studentId === student.id && r.date === dateStr);
                        if (record) {
                            attendanceMap[day] = record.status === 'PRESENT' ? 'P' : 'A';
                            if (record.status === 'PRESENT') presentCount++; else absentCount++;
                        } else attendanceMap[day] = '-';
                    }
                });

                const effectiveTotal = daysInMonth - holidayCount;
                const percentage = effectiveTotal > 0 ? ((presentCount / effectiveTotal) * 100).toFixed(0) : '0';

                return { ...student, attendance: attendanceMap, stats: { present: presentCount, absent: absentCount, holiday: holidayCount, total: daysInMonth, percentage } };
            });

            setMatrixData({ days: daysArray, students: processedStudents });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudentStats();
    }, [selectedBatch, targetSemester, exportDate]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const { utils, writeFile } = await import('xlsx');
            const batchDoc = batches.find(b => b.id === selectedBatch);
            const exportRows = matrixData.students.map(s => ({
                'Name': s.name, 'Roll No': s.rollNumber || 'N/A', 'Sem': s.stats.percentage + '%',
                ...matrixData.days.reduce((acc, d) => ({ ...acc, [d]: s.attendance[d] }), {}),
                'P': s.stats.present, 'A': s.stats.absent, 'H': s.stats.holiday, '%': s.stats.percentage
            }));
            const ws = utils.json_to_sheet(exportRows);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Attendance");
            writeFile(wb, `${batchDoc.name}_Attendance_${exportDate}.xlsx`);
        } catch (e) { console.error(e); } finally { setExporting(false); }
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Header / Hero */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gray-900 p-12 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#E31E24] opacity-5 blur-[100px] rounded-full -mr-32 -mt-32" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Attendance Report</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                            Attendance <span className="text-[#E31E24]">Summary</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Departmental Report • {user?.departmentName}</p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleExport}
                            disabled={exporting || !selectedBatch}
                            className="bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-[#E31E24] hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                            {exporting ? 'SYNCING...' : 'Download Report'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Glassmorphic Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white/50 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white shadow-xl shadow-gray-200/50 relative z-20">                <div className="relative group">
                    <select
                        className="w-full pl-6 pr-12 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-600 uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-red-50 focus:border-[#E31E24] hover:bg-gray-50/50 cursor-pointer appearance-none"
                        value={selectedBatch}
                        onChange={e => setSelectedBatch(e.target.value)}
                    >
                        <option value="">SELECT CLASS</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()} (SEM {b.currentSemester})</option>)}
                    </select>
                </div>

                <select
                    className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-600 uppercase tracking-widest outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors focus:ring-4 focus:ring-red-50"
                    value={targetSemester}
                    onChange={e => setTargetSemester(e.target.value)}
                >
                    <option value="">CURRENT SEMESTER</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>SEMESTER 0{s}</option>)}
                </select>


                <input
                    type="month"
                    className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-600 uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-red-50 focus:border-[#E31E24] hover:bg-gray-50/50"
                    value={exportDate}
                    onChange={e => setExportDate(e.target.value)}
                />
            </div>

            {/* Matrix View */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[3rem] p-1 border border-white shadow-2xl relative z-10 overflow-hidden">
                <div className="bg-white rounded-[2.8rem] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-max w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-900 border-b border-gray-800">
                                    <th className="sticky left-0 z-20 bg-gray-900 px-6 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-800">ID</th>
                                    <th className="sticky left-[4.5rem] z-20 bg-gray-900 px-6 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-800 w-56">Student Name</th>
                                    {matrixData.days.map(day => (
                                        <th key={day} className="px-1 py-5 text-center text-[9px] font-black text-gray-500 w-10 border-r border-gray-800">
                                            {day.toString().padStart(2, '0')}
                                        </th>
                                    ))}
                                    <th className="px-4 py-5 text-center text-[9px] font-black text-emerald-400 uppercase border-l border-gray-800 bg-gray-900">P</th>
                                    <th className="px-4 py-5 text-center text-[9px] font-black text-red-400 uppercase border-l border-gray-800 bg-gray-900">A</th>
                                    <th className="px-4 py-5 text-center text-[9px] font-black text-gray-400 uppercase border-l border-gray-800 bg-gray-900 tracking-tighter">% AGE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={100} className="p-24 text-center"><div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto mb-4" /><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Loading data...</p></td></tr>
                                ) : !selectedBatch ? (
                                    <tr><td colSpan={100} className="p-32 text-center text-gray-400"><div className="w-20 h-20 bg-gray-50 rounded-3xl mx-auto flex items-center justify-center mb-6 text-gray-300 font-black text-[10px] uppercase">Select Class</div><h4 className="text-xl font-black text-gray-900 mb-2 tracking-tight">System Idle</h4><p className="text-xs font-bold uppercase tracking-widest">Select an class to view the attendance table.</p></td></tr>
                                ) : matrixData.students.map((student, idx) => (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="sticky left-0 bg-white group-hover:bg-gray-50 px-6 py-4 text-[10px] font-black text-gray-400 border-r border-gray-50 transition-colors">
                                            {(idx + 1).toString().padStart(2, '0')}
                                        </td>
                                        <td className="sticky left-[4.5rem] bg-white group-hover:bg-gray-50 px-6 py-4 text-sm font-black text-gray-900 border-r border-gray-50 truncate transition-colors w-56">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center text-[10px] font-black group-hover:bg-[#E31E24] transition-colors">{student.name?.[0]}</div>
                                                <span className="uppercase tracking-tighter">{student.name}</span>
                                            </div>
                                        </td>
                                        {matrixData.days.map(day => {
                                            const s = student.attendance[day];
                                            let color = 'text-gray-200';
                                            if (s === 'P') color = 'text-emerald-500 font-black';
                                            else if (s === 'A') color = 'text-red-500 font-black';
                                            else if (s === 'H' || s === 'S') color = 'text-amber-500 font-black opacity-50';
                                            return (
                                                <td key={day} className="px-1 py-4 text-center text-[10px] border-r border-gray-50">
                                                    <span className={color}>{s === '-' ? '•' : s}</span>
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-4 text-center text-[10px] font-black text-emerald-600 border-l border-gray-50 bg-emerald-50/10">{student.stats.present}</td>
                                        <td className="px-4 py-4 text-center text-[10px] font-black text-red-600 border-l border-gray-50 bg-red-50/10">{student.stats.absent}</td>
                                        <td className={`px-4 py-4 text-center text-xs font-black border-l border-gray-50 ${parseInt(student.stats.percentage) < 75 ? 'text-red-500' : 'text-gray-900'}`}>{student.stats.percentage}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
