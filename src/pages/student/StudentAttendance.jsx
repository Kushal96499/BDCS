import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export default function StudentAttendance() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({ total: 0, present: 0, percentage: 100 });
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const events = []; // placeholder — holiday/exam events can be wired from Firestore later


    useEffect(() => {
        if (!user) return;

        setLoading(true);
        // Real-time listener
        const q = query(collection(db, 'attendance_records'), where('studentId', '==', user.uid));



        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data(), dateStr: d.data().date }));
            const currentSemData = data.filter(r => !user.currentSemester || r.semester == user.currentSemester);

            // Deduplication Logic: Group by Date, kept LATEST updated record
            // This handles the "1 Present, 1 Absent" bug by collapsing multiples into one authoritative state
            const uniqueRecordsMap = {};

            currentSemData.forEach(record => {
                const existing = uniqueRecordsMap[record.dateStr];
                // If no record for this date, or if this record is newer (by timestamp), overwrite
                // Note: Firestore timestamp might be missing on immediate local write, so handle carefully
                if (!existing) {
                    uniqueRecordsMap[record.dateStr] = record;
                } else {
                    const existingTime = existing.timestamp?.toMillis ? existing.timestamp.toMillis() : 0;
                    const newTime = record.timestamp?.toMillis ? record.timestamp.toMillis() : 0;
                    if (newTime > existingTime) {
                        uniqueRecordsMap[record.dateStr] = record;
                    }
                }
            });

            const uniqueRecords = Object.values(uniqueRecordsMap);

            const total = uniqueRecords.length;
            const present = uniqueRecords.filter(r => r.status === 'PRESENT').length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            setSummary({ total, present, percentage });
            setRecords(uniqueRecords.sort((a, b) => b.date.localeCompare(a.date)));
            setLoading(false);
        }, (error) => {
            console.error('Attendance subscription error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Calendar Data
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    if (loading) return (
        <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-biyani-red"></div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto space-y-8 pb-32 font-sans"
        >
            {/* 1. ACADEMIC HEADER (Gradient Ring) */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>

                {/* Gradient Ring Component */}
                <div className="relative w-48 h-48 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Track */}
                        <circle cx="96" cy="96" r="80" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                        {/* Progress */}
                        <defs>
                            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#C62828" />
                                <stop offset="100%" stopColor="#FF9800" />
                            </linearGradient>
                        </defs>
                        <motion.circle
                            cx="96" cy="96" r="80"
                            stroke="url(#ringGradient)"
                            strokeWidth="12" fill="none"
                            strokeDasharray="502"
                            initial={{ strokeDashoffset: 502 }}
                            animate={{ strokeDashoffset: 502 - (502 * summary.percentage) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-heading font-black text-gray-900 tracking-tight">{summary.percentage}%</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest mt-1 ${summary.percentage >= 75 ? 'text-success-green' : 'text-red-500'}`}>
                            {summary.percentage >= 75 ? 'Safe Zone' : 'Warning'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left z-10">
                    <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">My Attendance</h1>
                    <p className="text-gray-500 font-medium mb-6 max-w-md">
                        {summary.percentage >= 75
                            ? "Excellent consistency! You're eligible for all upcoming exams."
                            : "Your attendance is critically low. Please attend regular classes to avoid debarment."}
                    </p>

                    <div className="flex gap-4 justify-center md:justify-start">
                        <div className="bg-green-50 px-6 py-3 rounded-2xl border border-green-100">
                            <div className="text-2xl font-black text-green-600 mb-1">{summary.present}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Present</div>
                        </div>
                        <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-100">
                            <div className="text-2xl font-black text-red-600 mb-1">{summary.total - summary.present}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Absent</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. CALENDAR (Rounded Tiles) */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-heading font-bold text-xl text-gray-900">History Log</h3>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                        <button onClick={() => setSelectedMonth(p => new Date(p.getFullYear(), p.getMonth() - 1))} className="w-10 h-10 hover:bg-white hover:shadow rounded-lg text-gray-500 transition-all">←</button>
                        <div className="px-4 flex items-center font-bold text-sm uppercase tracking-wide">{format(selectedMonth, 'MMMM yyyy')}</div>
                        <button onClick={() => setSelectedMonth(p => new Date(p.getFullYear(), p.getMonth() + 1))} className="w-10 h-10 hover:bg-white hover:shadow rounded-lg text-gray-500 transition-all">→</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-3 md:gap-4">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-gray-300 uppercase py-2">{d}</div>
                    ))}

                    {[...Array(monthStart.getDay())].map((_, i) => <div key={`p${i}`}></div>)}

                    {daysInMonth.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const record = records.find(r => r.date === dateStr);
                        const event = events.find(e => e.date === dateStr);
                        const isToday = isSameDay(day, new Date());

                        let baseClass = "aspect-square rounded-2xl flex items-center justify-center font-bold text-sm transition-all relative";
                        // Default
                        let stateClass = "bg-gray-50 text-gray-400 hover:bg-gray-100";

                        // Priority 1: Events (Holiday/Exam)
                        if (event) {
                            if (event.type === 'HOLIDAY') stateClass = "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";
                            if (event.type === 'EXAM') stateClass = "bg-purple-100 text-purple-800 ring-1 ring-purple-200";
                        }
                        // Priority 2: Attendance Record (only if no event, or if we want to show P/A status underneath? No, User said Exam days "naa present naa absent")
                        else if (record) {
                            if (record.status === 'PRESENT') stateClass = "bg-green-100 text-green-700 shadow-sm";
                            if (record.status === 'ABSENT') stateClass = "bg-red-50 text-red-600 shadow-sm";
                        }
                        // Priority 3: Today generic highlight
                        else if (isToday) {
                            stateClass = "bg-white text-info-blue ring-2 ring-info-blue/20 ring-inset";
                        }

                        return (
                            <motion.div whileHover={{ scale: 1.05 }} key={dateStr} className={`${baseClass} ${stateClass}`} title={event?.description || record?.status || ''}>
                                {day.getDate()}
                                {!record && !event && isToday && <div className="absolute w-1.5 h-1.5 bg-info-blue rounded-full bottom-2"></div>}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
