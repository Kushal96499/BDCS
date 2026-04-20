import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

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
    const [allRecords, setAllRecords] = useState([]); // Master set
    const [records, setRecords] = useState([]); // Filtered set
    const [summary, setSummary] = useState({ total: 0, present: 0, percentage: 0 });
    const [overallSummary, setOverallSummary] = useState({ total: 0, present: 0, percentage: 0 });
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
                semester: d.data().semester || '1' // Fallback for old records
            }));
            
            // 1. DEDUPLICATION & MASTER SET
            const uniqueRecordsMap = {};
            data.forEach(record => {
                const dateKey = record.date || record.dateStr;
                if (!dateKey) return;
                // Keep the latest record for a date if duplicates exist
                if (!uniqueRecordsMap[dateKey] || (record.timestamp?.toMillis?.() > uniqueRecordsMap[dateKey].timestamp?.toMillis?.())) {
                    uniqueRecordsMap[dateKey] = record;
                }
            });

            const processedRecords = Object.values(uniqueRecordsMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            setAllRecords(processedRecords);

            // 2. DETECT SEMESTERS (Automatic based on Student Profile)
            const currentSem = parseInt(user?.currentSemester || 1);
            const sems = Array.from({ length: currentSem }, (_, i) => String(i + 1));
            setAvailableSemesters(sems);

            // 3. CALCULATE OVERALL SUMMARY
            const totalOverall = processedRecords.length;
            const presentOverall = processedRecords.filter(r => {
                const status = (r.status || r.attendanceStatus || '').toUpperCase();
                return ['PRESENT', 'NOC', 'P'].includes(status);
            }).length;
            setOverallSummary({
                total: totalOverall,
                present: presentOverall,
                percentage: totalOverall > 0 ? Math.round((presentOverall / totalOverall) * 100) : 0
            });

            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Update filtered records and situational summary whenever selection changes
    useEffect(() => {
        let filtered = allRecords;
        if (selectedSemester !== 'all') {
            filtered = allRecords.filter(r => String(r.semester) === String(selectedSemester));
        }

        const total = filtered.length;
        const present = filtered.filter(r => {
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
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    if (loading) return <div className="p-12 animate-pulse space-y-8"><div className="h-64 bg-white rounded-[3rem] border border-slate-100" /></div>;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-32">
            
            {/* ── NOC SYSTEM ALERT ─────────────────────────────────── */}
            {(user?.nocStatus === 'cleared' || user?.nocStatus === 'approved') && (
                <motion.div variants={item} className="aether-card p-6 bg-slate-900 border-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl">🛡️</div>
                        <div>
                            <p className="text-white font-bold tracking-tight">Official Duty Certification Active</p>
                            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Verified Academic Clearance Logged</p>
                        </div>
                    </div>
                    <span className="px-4 py-1.5 border border-white/10 rounded-full text-white/60 text-[9px] font-bold uppercase tracking-widest hidden sm:block">Operational Status</span>
                </motion.div>
            )}

            {/* ── SEMESTER CYCLE SELECTOR ──────────────────────────── */}
            <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#E31E24] rounded-full" />
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Segment Analytics</h2>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner max-w-full overflow-x-auto scrollbar-hide no-scrollbar">
                    <div className="flex gap-1 min-w-max">
                        <button
                            onClick={() => setSelectedSemester('all')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedSemester === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            All Time
                        </button>
                        {availableSemesters.map(sem => (
                            <button
                                key={sem}
                                onClick={() => setSelectedSemester(sem)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedSemester === sem ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Sem {sem}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* ── ATTENDANCE ANALYTICS HEADER ───────────────────────── */}
            <motion.div variants={item} className="aether-card p-6 md:p-14 flex flex-col md:flex-row items-center gap-10 md:gap-12 lg:gap-20 relative overflow-hidden">
                {/* Visual Ring */}
                <div className="relative w-40 h-40 md:w-48 md:h-48 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="42%" stroke="rgba(15,23,42,0.03)" strokeWidth="10" fill="none" />
                        <motion.circle
                            cx="50%" cy="50%" r="42%"
                            stroke={summary.percentage >= 75 ? "#10b981" : "#E31E24"}
                            strokeWidth="10" fill="none"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "515 515", strokeDashoffset: 515 }}
                            animate={{ strokeDashoffset: 515 - (515 * summary.percentage) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-4xl md:text-5xl font-heading text-slate-900 tracking-tighter tabular-nums">{summary.percentage}%</span>
                        <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] mt-1 ${summary.percentage >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {selectedSemester === 'all' ? 'Lifecycle' : `Sem ${selectedSemester}`}
                        </span>
                    </div>
                </div>

                <div className="flex-1 space-y-8 text-center md:text-left">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                             <h1 className="text-4xl font-heading text-slate-900 tracking-tight leading-none">Attendance Analytics</h1>
                             <span className="hidden md:block px-3 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                                {selectedSemester === 'all' ? 'Institutional Sync' : `Phase ${selectedSemester}`}
                             </span>
                        </div>
                        <p className="text-slate-500 text-lg leading-relaxed max-w-lg">
                            {summary.percentage >= 75 
                                ? `Your consistency in ${selectedSemester === 'all' ? 'all academic sectors' : `Semester ${selectedSemester}`} is exemplary.`
                                : `Your current trajectory in ${selectedSemester === 'all' ? 'this lifecycle' : `Semester ${selectedSemester}`} falls below threshold.`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <MetricBadge label="Present" value={summary.present} color="emerald" />
                        <MetricBadge label="Absent" value={summary.total - summary.present} color="red" />
                        <MetricBadge label="Total Sessions" value={summary.total} color="slate" />
                        
                        {selectedSemester !== 'all' && (
                            <div className="ml-auto flex items-center gap-3 pl-6 border-l border-slate-100 hidden lg:flex">
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Lifecycle Score</p>
                                    <p className="text-sm font-black text-slate-900">{overallSummary.percentage}% Overall</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── ACTIVITY CALENDAR ─────────────────────────────────── */}
            <motion.div variants={item} className="aether-card p-10 md:p-14">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-8">
                    <div>
                        <h3 className="text-2xl font-heading text-slate-900">Academic Sync Log</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Real-time Verified Entries</p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button 
                            onClick={() => setSelectedMonth(p => new Date(p.getFullYear(), p.getMonth() - 1))} 
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-slate-900 hover:shadow-sm transition-all"
                        >←</button>
                        <span className="px-4 font-bold text-[11px] uppercase tracking-widest text-slate-900 min-w-[120px] text-center">
                            {format(selectedMonth, 'MMM yyyy')}
                        </span>
                        <button 
                            onClick={() => setSelectedMonth(p => new Date(p.getFullYear(), p.getMonth() + 1))} 
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-slate-900 hover:shadow-sm transition-all"
                        >→</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2 md:gap-6">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                        <div key={d} className="text-center text-[8px] font-bold text-slate-300 uppercase tracking-widest pb-4">{d}</div>
                    ))}

                    {[...Array(monthStart.getDay())].map((_, i) => <div key={`p${i}`} />)}

                    {daysInMonth.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const record = records.find(r => (r.date || r.dateStr) === dateStr);
                        const isToday = isSameDay(day, new Date());
                        
                        let uiState = "bg-slate-50 border-slate-100 text-slate-300";
                        if (record) {
                            const st = (record.status || record.attendanceStatus);
                            if (st === 'PRESENT') uiState = "bg-emerald-50 border-emerald-100 text-emerald-600 font-bold";
                            else if (st === 'ABSENT') uiState = "bg-red-50 border-red-100 text-red-600 font-bold";
                            else if (st === 'NOC') uiState = "bg-slate-900 border-slate-900 text-white font-bold";
                        } else if (isToday) {
                            uiState = "bg-white border-[#E31E24] text-[#E31E24] font-bold shadow-md shadow-red-50";
                        }

                        return (
                            <div 
                                key={dateStr}
                                className={`aspect-square rounded-xl md:rounded-2xl border flex items-center justify-center relative cursor-default transition-all duration-300 ${uiState}`}
                            >
                                <span className="text-xs md:text-lg">{day.getDate()}</span>
                                {isToday && <div className="absolute top-1 right-1 w-1 h-1 bg-[#E31E24] rounded-full animate-pulse md:w-1.5 md:h-1.5" />}
                            </div>
                        );
                    })}
                </div>

                {/* Legend Overlay */}
                <div className="mt-16 pt-10 border-t border-slate-50 flex flex-wrap justify-center gap-10">
                    <LegendItem label="Present" color="bg-emerald-500" />
                    <LegendItem label="Absent" color="bg-red-500" />
                    <LegendItem label="Duty / NOC" color="bg-slate-900" />
                    <LegendItem label="No Activity" color="bg-slate-100" />
                </div>
            </motion.div>
        </motion.div>
    );
}

function MetricBadge({ label, value, color }) {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        red: 'bg-red-50 text-red-600 border-red-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-100'
    };
    return (
        <div className={`px-5 py-3 rounded-2xl border flex items-center gap-4 ${colors[color]}`}>
            <span className="text-xl font-heading">{value}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{label}</span>
        </div>
    );
}

function LegendItem({ label, color }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
    );
}
