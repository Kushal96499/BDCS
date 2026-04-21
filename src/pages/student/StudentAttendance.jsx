import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSunday, startOfWeek, endOfWeek } from 'date-fns';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function StudentAttendance() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allRecords, setAllRecords] = useState([]);
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({ total: 0, present: 0, percentage: 0 });
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [availableSemesters, setAvailableSemesters] = useState([]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = onSnapshot(query(collection(db, 'attendance_records'), where('studentId', '==', user.uid)), (snap) => {
            const data = snap.docs.map(d => ({ 
                id: d.id, 
                ...d.data(), 
                dateStr: d.data().date,
                semester: d.data().semester || '1'
            }));
            
            const uniqueRecordsMap = {};
            data.forEach(record => {
                const dateKey = record.date || record.dateStr;
                if (!dateKey) return;
                if (!uniqueRecordsMap[dateKey] || (record.timestamp?.toMillis?.() > uniqueRecordsMap[dateKey].timestamp?.toMillis?.())) {
                    uniqueRecordsMap[dateKey] = record;
                }
            });

            const processedRecords = Object.values(uniqueRecordsMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setAllRecords(processedRecords);

            const currentSem = parseInt(user?.currentSemester || 1);
            const sems = Array.from({ length: currentSem }, (_, i) => String(i + 1));
            setAvailableSemesters(sems);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        let filtered = allRecords;
        if (selectedSemester !== 'all') {
            filtered = allRecords.filter(r => String(r.semester) === String(selectedSemester));
        }

        const relevantRecords = filtered.filter(r => (r.status || r.attendanceStatus || '').toUpperCase() !== 'HOLIDAY');
        const total = relevantRecords.length;
        const present = relevantRecords.filter(r => {
            const status = (r.status || r.attendanceStatus || '').toUpperCase();
            return ['PRESENT', 'NOC', 'P'].includes(status);
        }).length;

        setSummary({
            total,
            present,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0
        });
        setRecords(filtered);
    }, [selectedSemester, allRecords]);

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    if (loading) return (
        <div className="animate-pulse space-y-8">
            <div className="h-48 bg-white rounded-3xl border border-slate-100" />
            <div className="h-96 bg-white rounded-3xl border border-slate-100" />
        </div>
    );

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-32">
            
            {/* ── CLEAN PREMIUM HEADER ──────────────────────────── */}
            <motion.header variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <div className="px-3 py-1 bg-red-50 rounded-full border border-red-100 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 bg-[#E31E24] rounded-full animate-pulse" />
                             <p className="text-[9px] font-black text-[#E31E24] uppercase tracking-widest">Attendance Tracker</p>
                         </div>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">
                        Activity Log<span className="text-[#E31E24]">.</span>
                    </h1>
                </div>

                <div className="flex bg-white p-1.5 rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setSelectedSemester('all')}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${selectedSemester === 'all' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        Combined
                    </button>
                    {availableSemesters.map(sem => (
                        <button
                            key={sem}
                            onClick={() => setSelectedSemester(sem)}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${selectedSemester === sem ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            Sem {sem}
                        </button>
                    ))}
                </div>
            </motion.header>

            {/* ── STATS ROW ───────────────────────── */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="aether-card p-8 group overflow-visible">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100 group-hover:bg-vibrant-red group-hover:text-white transition-all duration-500">
                        <span className="text-2xl group-hover:scale-125 transition-transform">📈</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-[#E31E24] transition-colors">Current Attendance</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter group-hover:scale-110 transition-transform origin-left duration-500">{summary.percentage}%</h3>
                </div>
                <div className="aether-card p-8 group overflow-visible">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 group-hover:bg-vibrant-emerald group-hover:text-white transition-all duration-500">
                        <span className="text-2xl group-hover:scale-125 transition-transform">✅</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-600 transition-colors">Total Present</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter group-hover:scale-110 transition-transform origin-left duration-500">{summary.present} Days</h3>
                </div>
                <div className="aether-card p-8 group overflow-visible">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500">
                        <span className="text-2xl group-hover:scale-125 transition-transform">❌</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-rose-600 transition-colors">Total Absent</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter group-hover:scale-110 transition-transform origin-left duration-500">{summary.total - summary.present} Days</h3>
                </div>
                <div className="aether-card p-8 group overflow-visible">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                        <span className="text-2xl group-hover:scale-125 transition-transform">📂</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Working</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter group-hover:scale-110 transition-transform origin-left duration-500">{summary.total} Days</h3>
                </div>
            </motion.div>

            {/* ── COMPACT CALENDAR ─────────────────────────────────── */}
            <motion.div variants={item} className="aether-card max-w-5xl shadow-2xl shadow-slate-200/40">
                <div className="flex flex-col sm:flex-row justify-between items-center p-10 border-b border-slate-50 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-50 rounded-[1.25rem] border border-red-100 flex items-center justify-center text-3xl">
                            🗓️
                        </div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Calendar Feed</h3>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button onClick={() => setSelectedMonth(p => new Date(p.getFullYear(), p.getMonth() - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm hover:bg-[#E31E24] hover:text-white transition-all">←</button>
                        <span className="font-black text-[10px] text-slate-900 min-w-[120px] text-center uppercase tracking-[0.2em]">
                            {format(selectedMonth, 'MMMM yyyy')}
                        </span>
                        <button onClick={() => setSelectedMonth(p => new Date(p.getFullYear(), p.getMonth() + 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm hover:bg-[#E31E24] hover:text-white transition-all">→</button>
                    </div>
                </div>

                <div className="p-10">
                    <div className="grid grid-cols-7 mb-6">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className={`text-center text-[10px] font-black uppercase tracking-[0.2em] py-2 ${d === 'Sun' ? 'text-[#E31E24]' : 'text-slate-400'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                        {days.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const record = records.find(r => (r.date || r.dateStr) === dateStr);
                            const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
                            const isToday = isSameDay(day, new Date());
                            const isSun = isSunday(day);

                            let cellStyle = '';
                            let statusIcon = null;

                            if (record) {
                                const st = (record.status || record.attendanceStatus || '').toUpperCase();
                                if (st === 'PRESENT' || st === 'P' || st === 'NOC') {
                                    cellStyle = 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-100/50';
                                    statusIcon = 'P';
                                } else if (st === 'ABSENT' || st === 'A') {
                                    cellStyle = 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-100/50';
                                    statusIcon = 'A';
                                } else if (st === 'HOLIDAY') {
                                    cellStyle = 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-100/30';
                                    statusIcon = 'H';
                                }
                            }

                            return (
                                <div
                                    key={dateStr}
                                    className={`calendar-cell ${isSun ? 'sunday' : ''} ${cellStyle} ${!isCurrentMonth ? 'opacity-20 pointer-events-none' : ''} ${isToday ? 'ring-4 ring-indigo-500/10 border-2 border-indigo-600 shadow-xl shadow-indigo-100/50' : ''}`}
                                >
                                    <span className={`text-[15px] font-black ${isToday ? 'text-indigo-600' : ''}`}>{day.getDate()}</span>
                                    {statusIcon && <span className="text-[8px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-md bg-white/50">{statusIcon}</span>}
                                    {isSun && !statusIcon && isCurrentMonth && (
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isToday ? 'bg-indigo-400' : 'bg-[#E31E24]/20'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 pt-10 border-t border-slate-50 flex flex-wrap gap-8 items-center justify-center">
                        <Legend label="Attendance" color="bg-emerald-500" />
                        <Legend label="Absence" color="bg-rose-500" />
                        <Legend label="Holiday" color="bg-amber-400 border border-amber-500/20" />
                        <Legend label="Sunday" color="bg-[#E31E24]/10 border border-[#E31E24]/20" />
                        <Legend label="Today" color="bg-white border-2 border-indigo-600" />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function Legend({ label, color }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${color} shadow-sm`} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
    );
}
