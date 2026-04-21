import React, { useState, useEffect, useMemo, memo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, onSnapshot, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getDoc as getFirestoreDoc } from 'firebase/firestore';
import Skeleton, { CardSkeleton } from '../../components/common/Skeleton';
import { 
    LayoutDashboard, 
    ClipboardList, 
    Rocket, 
    Users, 
    Search,
    GraduationCap,
    IdCard,
    ArrowRight
} from 'lucide-react';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

// Memoized Sub-components for better performance
const IdentityToken = memo(({ label, value, icon, variant = 'slate' }) => {
    const variants = {
        slate: 'bg-slate-50 border-slate-200/60 text-slate-900',
        red: 'bg-red-50/80 border-red-100 text-[#E31E24]',
        indigo: 'bg-indigo-50/80 border-indigo-100 text-indigo-700'
    };

    return (
        <motion.div 
            whileHover={{ y: -1 }}
            className={`px-4 py-2 rounded-2xl border flex items-center gap-3 transition-all duration-300 ${variants[variant]}`}
        >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                variant === 'red' ? 'bg-[#E31E24] text-white' : 
                variant === 'indigo' ? 'bg-indigo-600 text-white' : 
                'bg-slate-900 text-white'
            }`}>
                {React.cloneElement(icon, { className: "w-3.5 h-3.5" })}
            </div>
            <div className="flex flex-col items-start text-left min-w-0 leading-none">
                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{label}</span>
                <span className="text-[11px] md:text-[13px] font-black uppercase tracking-tight truncate w-full">{value}</span>
            </div>
        </motion.div>
    );
});

const BentoCard = memo(({ title, desc, icon, onClick, stats, label, color }) => {
    const overlays = {
        slate: 'hover:border-slate-900 hover:bg-slate-50',
        red: 'hover:border-[#E31E24] hover:bg-red-50',
        indigo: 'hover:border-indigo-600 hover:bg-indigo-50'
    };
    return (
        <motion.div
            variants={item}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`aether-card p-8 cursor-pointer group flex flex-col justify-between min-h-[220px] transition-all duration-500 border border-slate-100 ${overlays[color]}`}
        >
            <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 group-hover:bg-white shadow-sm">
                    {icon}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                    <h4 className="text-2xl font-black text-slate-900 group-hover:text-[#E31E24] transition-colors tabular-nums">{stats}</h4>
                </div>
            </div>

            <div className="space-y-1 mt-8">
                <h3 className="text-xl font-black uppercase tracking-tight leading-none group-hover:translate-x-1 transition-transform duration-500">{title}</h3>
                <p className="text-slate-400 font-semibold text-[11px] leading-snug">{desc}</p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-50 opacity-40 group-hover:opacity-100 transition-all">
                <span className="text-[9px] font-black uppercase tracking-widest">Open Analytics</span>
                <span className="text-lg group-hover:translate-x-2 transition-transform">→</span>
            </div>
        </motion.div>
    );
});

const QuickAction = memo(({ icon, label, to }) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            className="w-full bg-white border border-slate-100 rounded-[2.2rem] p-8 flex items-center justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group shadow-lg shadow-slate-100/30"
        >
            <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 group-hover:bg-red-50">
                    {icon}
                </div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] group-hover:text-[#E31E24] transition-colors">{label}</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-slate-50 flex items-center justify-center group-hover:rotate-45 transition-all text-slate-200 group-hover:text-slate-900">
                <span className="text-xl">→</span>
            </div>
        </button>
    );
});

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        attendance: 0,
        testsCount: 0,
        upcomingTests: [],
        projectsCount: 0,
        upcomingEvent: null
    });
    const [loading, setLoading] = useState(true);
    const [displayCourseName, setDisplayCourseName] = useState(user?.courseName || '');

    useEffect(() => {
        if (!user?.uid) return;

        const unsubAtt = onSnapshot(query(collection(db, 'attendance_records'), where('studentId', '==', user.uid)), (snap) => {
            const data = snap.docs.map(d => d.data());
            const uniqueRecordsMap = {};
            data.forEach(record => {
                const dateKey = record.date || record.dateStr;
                if (!dateKey) return;
                if (!uniqueRecordsMap[dateKey] || (record.timestamp?.toMillis?.() > uniqueRecordsMap[dateKey].timestamp?.toMillis?.())) {
                    uniqueRecordsMap[dateKey] = record;
                }
            });
            const uniqueRecords = Object.values(uniqueRecordsMap);
            const total = uniqueRecords.length;
            const present = uniqueRecords.filter(r => {
                const status = (r.status || r.attendanceStatus || '').toUpperCase();
                return ['PRESENT', 'NOC', 'P'].includes(status);
            }).length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            setStats(prev => ({ ...prev, attendance: percentage }));
            setLoading(false);
        });

        const unsubTests = onSnapshot(query(collection(db, 'test_results'), where('student', '==', user.uid), where('isPublished', '==', true)), (snap) => {
            setStats(prev => ({ ...prev, testsCount: snap.size }));
        });

        const unsubProj = onSnapshot(query(collection(db, 'projects'), where('studentId', '==', user.uid)), (snap) => {
            setStats(prev => ({ ...prev, projectsCount: snap.size }));
        });

        const unsubEvents = onSnapshot(query(collection(db, 'events'), where('status', '==', 'approved'), limit(5)), (snap) => {
            const now = new Date();
            const upcoming = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(e => new Date(e.startDate) >= now)
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] || null;
            setStats(prev => ({ ...prev, upcomingEvent: upcoming }));
        });

        let unsubUpcoming = () => { };
        if (user?.batchId) {
            unsubUpcoming = onSnapshot(
                query(collection(db, 'tests'), where('batch', '==', user.batchId), where('status', 'in', ['scheduled', 'draft', 'postponed'])),
                (snap) => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const upcomingDocs = snap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter(t => {
                            const tDate = t.testDate?.toDate ? t.testDate.toDate() : new Date(t.testDate);
                            return tDate >= now && t.status !== 'published';
                        })
                        .sort((a, b) => {
                            const dateA = a.testDate?.toDate ? a.testDate.toDate() : new Date(a.testDate);
                            const dateB = b.testDate?.toDate ? b.testDate.toDate() : new Date(b.testDate);
                            return dateA - dateB;
                        });
                    setStats(prev => ({ ...prev, upcomingTests: upcomingDocs }));
                }
            );
        }

        return () => { unsubAtt(); unsubTests(); unsubProj(); unsubEvents(); unsubUpcoming(); };
    }, [user?.uid, user?.batchId]);

    useEffect(() => {
        if (!user?.courseName && user?.courseId) {
            getFirestoreDoc(doc(db, 'courses', user.courseId)).then(snap => {
                if (snap.exists()) setDisplayCourseName(snap.data().name);
            });
        }
    }, [user?.courseName, user?.courseId]);

    if (loading) return (
        <div className="space-y-10 w-full">
            {/* Hero Skeleton */}
            <div className="relative bg-white rounded-[3rem] p-10 border border-slate-100 overflow-hidden">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-8 w-full">
                        <div className="space-y-4">
                            <Skeleton className="w-32 h-6" />
                            <Skeleton className="w-2/3 h-16 md:h-24" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="w-32 h-12 rounded-2xl" />
                            <Skeleton className="w-32 h-12 rounded-2xl" />
                            <Skeleton className="w-32 h-12 rounded-2xl" />
                        </div>
                    </div>
                    <div className="w-full lg:w-96 flex gap-6 p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100">
                        <div className="flex-1 space-y-4">
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-full h-12" />
                            <Skeleton className="w-full h-2" />
                        </div>
                        <div className="flex-1 space-y-4 text-center">
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-full h-12" />
                            <Skeleton className="w-full h-6 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Bento Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
        </div>
    );

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-32 w-full">

            {/* ── UNIFIED DASHBOARD HERO: PREMIUM GLASS EDITION ────── */}
            <motion.div variants={item} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-white to-red-100 rounded-[3.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />
                <div className="relative bg-white/60 rounded-[3rem] p-6 sm:p-10 md:p-14 overflow-hidden border border-white/80 shadow-2xl shadow-indigo-100/50 backdrop-blur-3xl">
                    {/* Soft Glow Orbs */}
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.4, 0.6, 0.4]
                        }}
                        transition={{ duration: 10, repeat: Infinity }}
                        className="absolute -top-32 -right-32 w-96 h-96 bg-red-100/60 rounded-full blur-[100px]"
                    />
                    <motion.div
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.5, 0.3]
                        }}
                        transition={{ duration: 8, repeat: Infinity }}
                        className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-100/40 rounded-full blur-[100px]"
                    />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
                        {/* LEFT: Identity & Welcome */}
                        <div className="flex-1 space-y-8 w-full">
                            <div className="space-y-4">
                                <div className="flex items-center justify-center lg:justify-start gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-[#E31E24]/5 rounded-full border border-[#E31E24]/10">
                                        <span className="w-1 h-1 bg-[#E31E24] rounded-full animate-pulse" />
                                        <p className="text-[9px] font-black text-[#E31E24] uppercase tracking-[0.2em]">Student Identity Card</p>
                                    </div>
                                </div>
                                <h1 className="text-4xl md:text-7xl font-black text-slate-950 tracking-tighter uppercase leading-[0.9]">
                                    Welcome,<br />
                                    <span className="text-[#E31E24] inline-block mt-1">
                                        {user?.name?.split(' ')[0] || 'Scholar'}
                                    </span>
                                </h1>
                            </div>

                            <div className="space-y-3 max-w-2xl mx-auto lg:mx-0 w-full">
                                {/* Row 1: Course (Compact width) */}
                                <div className="w-fit max-w-full">
                                    <IdentityToken 
                                        label="Course" 
                                        value={displayCourseName || user?.courseName || 'Student'} 
                                        icon={<GraduationCap />} 
                                        variant="slate" 
                                    />
                                </div>
                                
                                {/* Row 2: Sem & Roll No (Side-by-side on mobile) */}
                                <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3 w-full">
                                    <IdentityToken 
                                        label="Sem" 
                                        value={user?.currentSemester || 'Auto'} 
                                        icon={<Users />} 
                                        variant="red" 
                                    />
                                    <IdentityToken 
                                        label="Roll No" 
                                        value={user?.rollNumber || user?.uid?.slice(-6).toUpperCase()} 
                                        icon={<IdCard />} 
                                        variant="indigo" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Combined Analytics Strip (Always row on mobile) */}
                        <div className="w-full lg:w-auto shrink-0 flex items-center justify-center">
                            <div className="flex flex-row items-center justify-around w-full lg:w-auto gap-6 md:gap-16 bg-slate-50/50 p-6 md:p-14 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 backdrop-blur-2xl shadow-sm">
                                <div className="text-center flex-1 lg:flex-none">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Attendance</p>
                                    <h3 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter tabular-nums">
                                        {stats.attendance}<span className="text-xl md:text-2xl text-[#E31E24]">%</span>
                                    </h3>
                                    <div className="mt-3 md:mt-4 h-1 md:h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats.attendance}%` }}
                                            className="h-full bg-[#E31E24]"
                                        />
                                    </div>
                                </div>
                                
                                <div className="w-px h-12 md:h-20 bg-slate-200/60" />

                                <div className="text-center flex-1 lg:flex-none">
                                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Upcoming</p>
                                    <h3 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter tabular-nums">
                                        {stats.upcomingTests.length}
                                    </h3>
                                    <div className="mt-3 md:mt-4 text-[8px] md:text-[9px] font-black text-[#E31E24] uppercase tracking-widest bg-red-50 px-2 md:px-3 py-1 rounded-full border border-red-100">
                                        Tests Pending
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── BENTO NAVIGATION ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <BentoCard
                    title="Attendance"
                    desc="Track your daily presence."
                    icon={<LayoutDashboard className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    onClick={() => navigate('/student/attendance')}
                    stats={`${stats.attendance}%`}
                    label="Current"
                    color="slate"
                />
                <BentoCard
                    title="Results"
                    desc="View class test records."
                    icon={<ClipboardList className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    onClick={() => navigate('/student/test-history')}
                    stats={stats.testsCount}
                    label="Tests"
                    color="red"
                />
                <BentoCard
                    title="Projects"
                    desc="Showcase your work."
                    icon={<Rocket className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    onClick={() => navigate('/student/projects')}
                    stats={stats.projectsCount}
                    label="Active"
                    color="indigo"
                />
            </div>

            {/* ── UPDATES FEED ──────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <motion.div variants={item} className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-100 p-12 flex flex-col justify-between hover:shadow-2xl transition-all duration-700 h-[380px] relative overflow-hidden group shadow-xl shadow-slate-100/50">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-50/50 rounded-full blur-3xl group-hover:bg-red-100 transition-colors duration-700" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors duration-700" />

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1.5 bg-red-50 text-[#E31E24] text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-red-100">Latest Update</span>
                        </div>
                        {stats.upcomingEvent || stats.upcomingTests.length > 0 ? (
                            <div className="space-y-6">
                                {stats.upcomingEvent ? (
                                    <>
                                        <h4 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight leading-[0.95] line-clamp-2">{stats.upcomingEvent.title}</h4>
                                        <p className="text-slate-500 font-semibold text-lg max-w-md leading-relaxed">New campus event scheduled. Visit the explorer to register.</p>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight leading-[0.95] line-clamp-2">{stats.upcomingTests[0].subjectName}</h4>
                                        <p className="text-slate-500 font-semibold text-lg max-w-md leading-relaxed">Upcoming Test on {format(stats.upcomingTests[0].testDate?.toDate ? stats.upcomingTests[0].testDate.toDate() : new Date(stats.upcomingTests[0].testDate), 'MMMM dd, yyyy')}</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="py-10">
                                <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-3xl opacity-20">No New Activity</p>
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 pt-10">
                        <button
                            onClick={() => navigate(stats.upcomingEvent ? '/student/events' : '/student/test-history')}
                            className="bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-[#E31E24] hover:-translate-y-1 active:translate-y-0 transition-all duration-500 flex items-center gap-3"
                        >
                            Explore Now
                            <span className="text-xl">→</span>
                        </button>
                    </div>
                </motion.div>

                <motion.div variants={item} className="lg:col-span-2 space-y-6">
                    <QuickAction icon={<Users className="w-3 h-3 md:w-3.5 md:h-3.5" />} label="Campus Council" to="/student/council" />
                    <QuickAction icon={<Search className="w-3 h-3 md:w-3.5 md:h-3.5" />} label="Student Directory" to="/student/directory" />
                </motion.div>
            </div>
        </motion.div>
    );
}
