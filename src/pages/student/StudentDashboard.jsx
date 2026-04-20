import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, onSnapshot, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { isBacklogStudent, hasAnyBacklogs } from '../../services/batchPromotionService';
import AcademicTimeline from '../../components/student/AcademicTimeline';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', sub: 'Session: Morning' };
    if (h < 17) return { text: 'Good Afternoon', sub: 'Session: Afternoon' };
    return { text: 'Good Evening', sub: 'Session: Evening' };
}

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ 
        attendance: 0, 
        testsCount: 0, 
        upcomingTests: [], // Array of upcoming test objects
        projectsCount: 0, 
        upcomingEvent: null 
    });
    const [loading, setLoading] = useState(true);
    const [displayCourseName, setDisplayCourseName] = useState(user?.courseName || '');
    const greeting = useMemo(() => getGreeting(), []);

    useEffect(() => {
        if (!user?.uid) return;

        // ── PERSISTENT FIRESTORE LISTENERS ──────────────────────────
        const unsubAtt = onSnapshot(query(collection(db, 'attendance_records'), where('studentId', '==', user.uid)), (snap) => {
            const data = snap.docs.map(d => d.data());
            
            // CUMULATIVE ATTENDANCE LOGIC (System Wide)
            // We calculate overall attendance across all semesters for the dashboard metric
            const uniqueRecordsMap = {};
            data.forEach(record => {
                const dateKey = record.date || record.dateStr;
                if (!dateKey) return;
                // De-duplicate multiple records on the same day
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

        // ── UPCOMING TESTS LISTENER ──────────────────────────────
        let unsubUpcoming = () => {};
        if (user?.batchId) {
            unsubUpcoming = onSnapshot(
                query(
                    collection(db, 'tests'), 
                    where('batch', '==', user.batchId),
                    where('status', 'in', ['scheduled', 'draft', 'postponed'])
                ),
                (snap) => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    
                    const upcoming = snap.docs
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
                    
                    setStats(prev => ({ ...prev, upcomingTests: upcoming }));
                }
            );
        }

        return () => { unsubAtt(); unsubTests(); unsubProj(); unsubEvents(); unsubUpcoming(); };
    }, [user?.uid, user?.currentSemester]);

    useEffect(() => {
        if (!user?.courseName && user?.courseId) {
            getDoc(doc(db, 'courses', user.courseId)).then(snap => {
                if (snap.exists()) setDisplayCourseName(snap.data().name);
            });
        }
    }, [user?.courseName, user?.courseId]);

    if (loading) return <div className="p-12 animate-pulse space-y-8"><div className="h-64 bg-white rounded-[3rem] border border-slate-100" /></div>;

    const firstName = user?.name?.split(' ')[0] || 'Student';

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12 pb-20">
            
            {/* ── STUDENT PORTAL OVERVIEW ───────────────────────────── */}
            <motion.div variants={item} className="aether-card p-10 md:p-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">Spotlight</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{greeting.sub}</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-heading text-slate-900 leading-none">
                                {greeting.text}, <span className="text-[#E31E24]">{firstName}</span>.
                            </h1>
                            <p className="mt-6 text-slate-500 text-lg max-w-xl leading-relaxed">
                                See your attendance and test results here. All your academic records are safe.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <StatPill label="Course" value={displayCourseName || user?.courseName || 'Syncing...'} />
                            <StatPill label="Semester" value={user?.currentSemester || 'Regular'} />
                            <StatPill label="Status" value="Verified" color="emerald" />
                        </div>
                    </div>

                    <div className="hidden lg:block w-px h-32 bg-slate-100" />

                        <div className="flex items-center gap-8 px-8">
                        <div className="text-center group cursor-default">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Attendance</p>
                            <h3 className="text-5xl font-heading text-slate-900 group-hover:text-[#E31E24] transition-colors">{stats.attendance}%</h3>
                        </div>
                        <div className="text-center group cursor-default">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Upcoming Tests</p>
                            <h3 className="text-5xl font-heading text-slate-900 group-hover:text-[#E31E24] transition-colors">{stats.upcomingTests.length}</h3>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── DASHBOARD SHORTCUTS ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <BentoCard 
                    title="My Attendance" 
                    desc="Check your attendance status for all subjects."
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>}
                    onClick={() => navigate('/student/attendance')}
                    stats={`${stats.attendance}% Present`}
                />
                <BentoCard 
                    title="Test Results" 
                    desc="View your marks for unit tests and assignments."
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h2M8 17h2M14 13h2M14 17h2" /></svg>}
                    onClick={() => navigate('/student/test-history')}
                    stats={`${stats.testsCount} Tests`}
                />
                <BentoCard 
                    title="My Projects" 
                    desc="Manage your college projects and reports."
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>}
                    onClick={() => navigate('/student/projects')}
                    stats={`${stats.projectsCount} Active`}
                />
            </div>

            {/* ── COLLEGE ANNOUNCEMENTS ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <motion.div variants={item} className="lg:col-span-3 aether-card p-10 flex flex-col justify-between hover:bg-slate-50/50">
                    <div>
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Immediate Schedule</h3>
                        {stats.upcomingEvent || stats.upcomingTests.length > 0 ? (
                            <div className="space-y-4">
                                {stats.upcomingEvent ? (
                                    <>
                                        <h4 className="text-3xl font-heading text-slate-900">{stats.upcomingEvent.title}</h4>
                                        <p className="text-slate-500 max-w-md">Upcoming institutional event. Check calendar for details.</p>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-3xl font-heading text-slate-900">{stats.upcomingTests[0].subjectName}</h4>
                                        <p className="text-slate-500 max-w-md">Upcoming Test: {stats.upcomingTests[0].topic} on {format(stats.upcomingTests[0].testDate?.toDate ? stats.upcomingTests[0].testDate.toDate() : new Date(stats.upcomingTests[0].testDate), 'MMM dd')}</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-400 font-medium">No immediate tests or events scheduled.</p>
                        )}
                    </div>
                    <button 
                        onClick={() => navigate(stats.upcomingEvent ? '/student/events' : '/student/test-history')}
                        className="mt-12 action-button w-fit px-8"
                    >
                        {stats.upcomingEvent ? 'View Events' : 'View Test Schedule'}
                    </button>
                </motion.div>

                <motion.div variants={item} className="lg:col-span-2 space-y-4">
                    <QuickUplink icon="🏛️" label="Campus Council" to="/student/council" />
                    <QuickUplink icon="🔍" label="Student Search" to="/student/directory" />
                    <QuickUplink icon="🎒" label="Materials" to="/student/projects" />
                </motion.div>
            </div>

            <div className="pt-20 text-center opacity-30">
                <span className="text-[10px] font-bold uppercase tracking-[0.6em] text-slate-900">Biyani Digital Campus System | Student Dashboard</span>
            </div>
        </motion.div>
    );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────

function StatPill({ label, value, color = 'slate' }) {
    const colors = {
        slate: 'bg-slate-50 text-slate-600 border-slate-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    };
    return (
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${colors[color]}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{label}:</span>
            <span className="text-[11px] font-bold uppercase">{value}</span>
        </div>
    );
}

function BentoCard({ title, desc, icon, onClick, stats }) {
    return (
        <motion.div 
            variants={item}
            onClick={onClick}
            className="aether-card p-10 cursor-pointer group flex flex-col justify-between min-h-[300px]"
        >
            <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#E31E24] group-hover:text-white transition-all duration-500">
                    <div className="w-6 h-6">{icon}</div>
                </div>
                <div>
                    <h3 className="text-2xl font-heading text-slate-900 mb-3">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
            </div>
            <div className="pt-8 flex items-center justify-between border-t border-slate-50 mt-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats}</span>
                <span className="text-slate-200 group-hover:text-[#E31E24] transition-colors">→</span>
            </div>
        </motion.div>
    );
}

function QuickUplink({ icon, label, to }) {
    const navigate = useNavigate();
    return (
        <button 
            onClick={() => navigate(to)}
            className="w-full aether-card p-6 flex items-center justify-between hover:scale-[1.02] active:scale-[0.98]"
        >
            <div className="flex items-center gap-4">
                <span className="text-xl">{icon}</span>
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-slate-300">→</span>
        </button>
    );
}
