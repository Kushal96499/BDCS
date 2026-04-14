// ============================================
// BDCS Student Dashboard — "Neo-Campus Playful"
// Gen-Z aesthetic with Biyani brand DNA
// Aesthetic: Playful + Maximalist
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { isBacklogStudent, hasAnyBacklogs, getTotalBacklogCount } from '../../services/batchPromotionService';
import AcademicTimeline, { StatusBadge } from '../../components/student/AcademicTimeline';

// ── ANIMATIONS ──
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const popUp = { hidden: { opacity: 0, y: 24, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } } };
const slideRight = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } } };
const fadeScale = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', emoji: '☀️', vibe: 'Rise & grind 💪' };
    if (h < 17) return { text: 'Good Afternoon', emoji: '🌤️', vibe: 'Keep pushing 🔥' };
    if (h < 21) return { text: 'Good Evening', emoji: '🌅', vibe: 'Almost there ✨' };
    return { text: 'Night Mode', emoji: '🌙', vibe: 'Burning midnight oil 🦉' };
}

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ attendance: 0, testsCount: 0, projectsCount: 0, upcomingEvent: null });
    const [loading, setLoading] = useState(true);
    const greeting = useMemo(() => getGreeting(), []);

    useEffect(() => {
        if (user) fetchStats();
    }, [user]);

    const fetchStats = async () => {
        try {
            const attSnap = await getDocs(query(collection(db, 'attendance_records'), where('studentId', '==', user.uid)));
            const semRecs = attSnap.docs.filter(d => !user.currentSemester || d.data().semester == user.currentSemester);
            const attendance = semRecs.length > 0 ? Math.round((semRecs.filter(d => d.data().status === 'PRESENT').length / semRecs.length) * 100) : 0;
            const testsSnap = await getDocs(query(collection(db, 'test_results'), where('student', '==', user.uid), where('isPublished', '==', true)));
            const projSnap = await getDocs(query(collection(db, 'projects'), where('studentId', '==', user.uid)));
            const eventsSnap = await getDocs(query(collection(db, 'events'), where('status', '==', 'approved'), limit(5)));
            const now = new Date();
            const upcomingEvent = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => new Date(e.startDate) >= now).sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] || null;
            setStats({ attendance, testsCount: testsSnap.size, projectsCount: projSnap.size, upcomingEvent });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (loading) return <DashSkeleton />;

    const isBacklog = isBacklogStudent(user);
    const firstName = user?.name?.split(' ')[0] || 'Student';

    return (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="relative">

            {/* =============================================== */}
            {/* ── MOBILE LAYOUT (< md) ─────────────────────── */}
            {/* =============================================== */}
            <div className="md:hidden px-4 pt-3 pb-28 space-y-4">

                {/* ── MOBILE HERO ── */}
                <motion.div variants={popUp} className="relative overflow-hidden rounded-[1.75rem] min-h-[200px]">
                    {/* Animated gradient BG */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#E31E24] to-[#ff6b6b]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(255,107,107,0.4),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_120%,rgba(123,44,191,0.3),transparent_50%)]" />
                    {/* Floating orbs */}
                    <div className="absolute top-4 right-8 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
                    <div className="absolute bottom-6 left-4 w-14 h-14 bg-pink-400/20 rounded-full blur-lg" />
                    {/* Glass top line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    <div className="relative z-10 p-5 pb-6 flex flex-col">
                        {/* Top row: Greeting */}
                        <div className="flex items-start mb-4">
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring' }}
                                className="bg-white/15 backdrop-blur-xl text-white/90 text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/10 tracking-wide"
                            >
                                {greeting.emoji} {greeting.text}
                            </motion.span>
                        </div>

                        <h1 className="text-[28px] font-black text-white leading-tight tracking-tight mb-1 flex items-center gap-2 flex-wrap max-w-full">
                            <span>Hey {firstName}!</span> 
                            <span className="inline-block shrink-0" style={{ animation: 'wave 2s ease-in-out infinite', transformOrigin: '70% 70%' }}>👋</span>
                        </h1>
                        <p className="text-white/50 text-[11px] font-semibold mb-4">{greeting.vibe}</p>

                        {/* Info chips */}
                        <div className="flex gap-2 flex-wrap">
                            <span className="bg-white/10 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/5">
                                📚 {user?.courseName?.split(' ').slice(0, 2).join(' ') || 'Student'}
                            </span>
                            <span className="bg-white/10 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/5">
                                🎓 Semester {user?.currentSemester || 1}
                            </span>
                            {user?.academicStatus && user.academicStatus !== 'ACTIVE' && (
                                <StatusBadge status={user.academicStatus} />
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ── MOBILE ACADEMIC ALERT ── */}
                {(isBacklog || hasAnyBacklogs(user)) && (
                    <motion.div variants={popUp}><AcademicTimeline user={user} /></motion.div>
                )}

                {/* ── MOBILE STATS ROW (Grid) ── */}
                {!isBacklog && (
                    <motion.div variants={popUp} className="grid grid-cols-2 gap-3 pb-1">
                        <MobileStatCard to="/student/attendance" value={`${stats.attendance}%`} label="Attendance" icon={<AttendanceRing value={stats.attendance} size={42} />} color="emerald" />
                        <MobileStatCard to="/student/test-history" value={stats.testsCount} label="Tests" icon="📝" color="blue" />
                    </motion.div>
                )}

                {/* ── MOBILE EVENT CARD ── */}
                {stats.upcomingEvent && (
                    <motion.div variants={slideRight}>
                        <Link to="/student/events" className="group flex items-center gap-3 bg-gradient-to-r from-orange-50 to-rose-50 rounded-2xl p-3.5 border border-orange-100/80">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E31E24] to-orange-500 flex items-center justify-center text-lg shadow-md shadow-red-200/40 shrink-0 group-hover:scale-110 transition-transform">
                                🎉
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-[13px] truncate">{stats.upcomingEvent.title}</p>
                                <p className="text-[10px] text-gray-400 font-medium">Upcoming Event →</p>
                            </div>
                        </Link>
                    </motion.div>
                )}

                {/* ── MOBILE QUICK ACCESS (2×2 Grid) ── */}
                <motion.div variants={popUp}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                        <span className="w-4 h-px bg-[#E31E24]/40"></span>Quick Access
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        <MobileTile to="/student/projects" emoji="✨" label="Innovation Hub" desc="Projects" gradient="from-rose-500 to-pink-600" bgTint="bg-rose-50" />
                        <MobileTile to="/student/council" emoji="👑" label="Council" desc="Student Body" gradient="from-violet-500 to-purple-600" bgTint="bg-violet-50" />
                        <MobileTile to="/student/events" emoji="📅" label="Events" desc="Campus Life" gradient="from-emerald-500 to-teal-600" bgTint="bg-emerald-50" />
                        <MobileTile to="/student/test-history" emoji="🏆" label="Test History" desc="Academics" gradient="from-blue-500 to-indigo-600" bgTint="bg-blue-50" />
                    </div>
                </motion.div>

                {/* Mobile Footer */}
                <div className="flex items-center justify-center gap-2 pt-4">
                    <img src="/assets/biyani-logo.png" alt="" className="w-4 h-4 opacity-25 grayscale" />
                    <span className="text-[9px] font-semibold text-gray-300 tracking-widest uppercase">Biyani Digital Campus</span>
                </div>
            </div>

            {/* =============================================== */}
            {/* ── DESKTOP LAYOUT (≥ md) ────────────────────── */}
            {/* =============================================== */}
            <div className="hidden md:block max-w-5xl mx-auto px-8 pt-4 pb-10 space-y-5">

                {/* ── DESKTOP HERO (Wide Banner) ── */}
                <motion.div variants={fadeScale} className="relative overflow-hidden rounded-[2rem] min-h-[220px]">
                    {/* Multi-layer gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#E31E24] to-[#ff6b6b]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-30%,rgba(255,107,107,0.4),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_110%,rgba(99,51,185,0.35),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)]" />
                    {/* Floating orbs */}
                    <div className="absolute top-8 right-24 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse" />
                    <div className="absolute -bottom-8 left-16 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-yellow-300/10 rounded-full blur-xl" />
                    {/* Glass accent */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    <div className="relative z-10 p-10 flex items-center justify-between gap-8">
                        <div className="flex-1 space-y-4">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25, type: 'spring' }}
                                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl text-white/80 text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-2 rounded-full border border-white/10"
                            >
                                {greeting.emoji} {greeting.text} <span className="text-white/40">•</span> <span className="text-white/50">{greeting.vibe}</span>
                            </motion.div>

                            <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
                                Hey, {firstName}! <span style={{ animation: 'wave 2s ease-in-out infinite', transformOrigin: '70% 70%', display: 'inline-block' }}>👋</span>
                            </h1>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="bg-white/12 backdrop-blur-sm text-white/80 px-4 py-1.5 rounded-full text-[11px] font-bold border border-white/8">
                                    📚 {user?.courseName || 'Student'}
                                </span>
                                <span className="bg-white/12 backdrop-blur-sm text-white/80 px-4 py-1.5 rounded-full text-[11px] font-bold border border-white/8">
                                    🎓 Semester {user?.currentSemester || 1}
                                </span>
                                {user?.batchName && (
                                    <span className="bg-white/8 backdrop-blur-sm text-white/60 px-3 py-1.5 rounded-full text-[10px] font-semibold border border-white/5">
                                        📦 {user.batchName}
                                    </span>
                                )}
                                {user?.academicStatus && user.academicStatus !== 'ACTIVE' && (
                                    <StatusBadge status={user.academicStatus} />
                                )}
                            </div>
                        </div>

                        {/* Profile Card */}
                        <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/student/profile')}
                            className="group flex items-center gap-4 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/15 rounded-2xl p-3 pr-6 transition-all shrink-0"
                        >
                            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-[#E31E24] font-black text-xl overflow-hidden ring-2 ring-white/20 shadow-lg">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-black">{firstName[0]}</span>
                                )}
                            </div>
                            <div className="text-left">
                                <p className="text-white font-bold text-base leading-tight">{firstName}</p>
                                <p className="text-white/40 text-[10px] font-semibold group-hover:text-white/70 transition-colors tracking-wide">View Profile →</p>
                            </div>
                        </motion.button>
                    </div>
                </motion.div>

                {/* ── DESKTOP ACADEMIC ALERT ── */}
                {(isBacklog || hasAnyBacklogs(user)) && (
                    <motion.div variants={popUp}><AcademicTimeline user={user} /></motion.div>
                )}

                {/* ── DESKTOP BENTO GRID ── */}
                {!isBacklog && (
                    <motion.div variants={popUp} className="grid grid-cols-12 gap-4">

                        {/* Attendance — Large Card with Ring */}
                        <Link to="/student/attendance" className="col-span-4 group relative bg-white rounded-[1.5rem] p-6 border border-gray-100/60 shadow-sm hover:shadow-xl hover:shadow-emerald-100/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-400 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-45">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </div>
                            <div className="relative flex flex-col items-center text-center">
                                <div className="mb-4"><AttendanceRing value={stats.attendance} size={88} /></div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Attendance</p>
                                <p className="text-[9px] text-gray-300 font-medium mt-1">This semester</p>
                            </div>
                        </Link>

                        {/* Tests */}
                        <Link to="/student/test-history" className="col-span-4 group relative bg-white rounded-[1.5rem] p-6 border border-gray-100/60 shadow-sm hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-400 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-45">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </div>
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-blue-200/50 group-hover:scale-110 group-hover:rotate-3 transition-all">
                                    📝
                                </div>
                                <p className="text-4xl font-black text-gray-900">{stats.testsCount}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Tests Assigned</p>
                            </div>
                        </Link>

                        {/* Projects */}
                        <Link to="/student/projects" className="col-span-4 group relative bg-white rounded-[1.5rem] p-6 border border-gray-100/60 shadow-sm hover:shadow-xl hover:shadow-rose-100/40 transition-all duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-all group-hover:rotate-45">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </div>
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E31E24] to-orange-500 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-red-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all">
                                    🚀
                                </div>
                                <p className="text-4xl font-black text-gray-900">{stats.projectsCount}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">My Projects</p>
                            </div>
                        </Link>
                    </motion.div>
                )}

                {/* ── DESKTOP EVENT + QUICK ACCESS ── */}
                <div className="grid grid-cols-12 gap-4">
                    {/* Event Card */}
                    {stats.upcomingEvent && (
                        <motion.div variants={slideRight} className="col-span-5">
                            <Link to="/student/events" className="group flex items-center gap-4 bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50 rounded-2xl p-5 border border-orange-100/60 hover:shadow-lg hover:shadow-rose-100/30 transition-all h-full">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#E31E24] to-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-red-200/40 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all">
                                    🎉
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-[#E31E24]/60 uppercase tracking-wider mb-1">🔥 Next Up</p>
                                    <p className="font-bold text-gray-800 text-sm truncate group-hover:text-[#E31E24] transition-colors">{stats.upcomingEvent.title}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#E31E24] group-hover:bg-[#E31E24] group-hover:text-white transition-all shrink-0 shadow-sm">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </Link>
                        </motion.div>
                    )}

                    {/* Quick Access Grid */}
                    <motion.div variants={popUp} className={stats.upcomingEvent ? 'col-span-7' : 'col-span-12'}>
                        <div className="grid grid-cols-4 gap-3">
                            <DesktopTile to="/student/projects" emoji="✨" label="Innovation Hub" gradient="from-rose-500 to-pink-600" shadow="shadow-rose-200/40" />
                            <DesktopTile to="/student/council" emoji="👑" label="Student Council" gradient="from-violet-500 to-purple-600" shadow="shadow-violet-200/40" />
                            <DesktopTile to="/student/events" emoji="📅" label="Campus Events" gradient="from-emerald-500 to-teal-600" shadow="shadow-emerald-200/40" />
                            <DesktopTile to="/student/test-history" emoji="🏆" label="Test History" gradient="from-blue-500 to-indigo-600" shadow="shadow-blue-200/40" />
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 pt-4 opacity-30">
                    <img src="/assets/biyani-logo.png" alt="" className="w-4 h-4 grayscale" />
                    <span className="text-[9px] font-bold text-gray-400 tracking-[0.2em] uppercase">Biyani Digital Campus</span>
                </div>
            </div>
        </motion.div>
    );
}

// ══════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════

function AttendanceRing({ value, size = 80 }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const progress = (value / 100) * circ;
    const color1 = value >= 75 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444';
    const color2 = value >= 75 ? '#06d6a0' : value >= 60 ? '#fb923c' : '#f43f5e';
    const gradId = `att-${size}`;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
                <circle
                    cx={size/2} cy={size/2} r={r} fill="none"
                    stroke={`url(#${gradId})`} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${progress} ${circ}`}
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color1} />
                        <stop offset="100%" stopColor={color2} />
                    </linearGradient>
                </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-black" style={{ color: color1, fontSize: size * 0.22 }}>
                {value}%
            </span>
        </div>
    );
}

function MobileStatCard({ to, value, label, icon, color }) {
    const colorMap = {
        emerald: 'from-emerald-50 to-teal-50 border-emerald-100/60',
        blue: 'from-blue-50 to-indigo-50 border-blue-100/60',
        rose: 'from-rose-50 to-pink-50 border-rose-100/60'
    };
    return (
        <Link to={to} className={`w-full bg-gradient-to-b ${colorMap[color]} rounded-2xl p-4 border flex flex-col items-center text-center gap-2`}>
            <div className="text-2xl">{typeof icon === 'string' ? (
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color === 'blue' ? 'from-blue-500 to-indigo-600' : 'from-[#E31E24] to-orange-500'} flex items-center justify-center text-lg shadow-md`}>{icon}</div>
            ) : icon}</div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        </Link>
    );
}

function MobileTile({ to, emoji, label, desc, gradient, bgTint }) {
    return (
        <Link to={to} className={`group ${bgTint} rounded-2xl p-4 border border-gray-100/60 flex flex-col items-center text-center gap-2.5 active:scale-[0.97] transition-transform`}>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-md group-active:scale-110 transition-transform`}>
                {emoji}
            </div>
            <div>
                <p className="text-[12px] font-bold text-gray-800 leading-tight">{label}</p>
                <p className="text-[9px] font-semibold text-gray-400 mt-0.5">{desc}</p>
            </div>
        </Link>
    );
}

function DesktopTile({ to, emoji, label, gradient, shadow }) {
    return (
        <Link to={to} className="group">
            <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white rounded-2xl p-5 border border-gray-100/60 shadow-sm hover:shadow-lg transition-all flex flex-col items-center text-center gap-3 h-full"
            >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-md ${shadow} group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                    {emoji}
                </div>
                <p className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors leading-tight">{label}</p>
            </motion.div>
        </Link>
    );
}

function DashSkeleton() {
    return (
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4 md:max-w-5xl md:px-8">
            <div className="h-[200px] md:h-[220px] rounded-[2rem] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-[1.5rem] bg-gray-100 animate-pulse" />)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-50 animate-pulse" />)}
            </div>
        </div>
    );
}
