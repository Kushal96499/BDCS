import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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
    if (h < 12) return { text: 'Good Morning', sub: 'Institutional Phase: Dawn' };
    if (h < 17) return { text: 'Good Afternoon', sub: 'Institutional Phase: core' };
    return { text: 'Good Evening', sub: 'Institutional Phase: Review' };
}

export default function TeacherDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        assignedClasses: 0,
        pendingEvents: 0,
        todayAttendance: null
    });
    const [loading, setLoading] = useState(true);
    const greeting = useMemo(() => getGreeting(), []);

    useEffect(() => {
        if (!user?.uid) return;

        // ── PERSISTENT STATS LISTENERS ──────────────────────────────
        const unsubBatches = onSnapshot(query(collection(db, 'batches'), where('classTeacherId', '==', user.uid), where('status', '==', 'active')), (snap) => {
            setStats(prev => ({ ...prev, assignedClasses: snap.size }));
            
            if (!snap.empty) {
                const batchId = snap.docs[0].id;
                const batchName = snap.docs[0].data().name;
                const todayStr = new Date().toISOString().split('T')[0];
                
                // Track attendance for primary batch
                onSnapshot(query(collection(db, 'attendance_records'), where('batchId', '==', batchId), where('date', '==', todayStr), limit(1)), (attSnap) => {
                    setStats(prev => ({ 
                        ...prev, 
                        todayAttendance: attSnap.empty ? null : { batchName, status: 'Marked' }
                    }));
                });
            }
        });

        const unsubEvents = onSnapshot(query(collection(db, 'events'), where('status', '==', 'pending'), limit(10)), (snap) => {
            setStats(prev => ({ ...prev, pendingEvents: snap.size }));
        });

        setLoading(false);
        return () => { unsubBatches(); unsubEvents(); };
    }, [user?.uid]);

    if (loading) return <div className="p-12 animate-pulse space-y-8"><div className="h-64 bg-white rounded-[3rem] border border-slate-100" /></div>;

    const firstName = user?.name?.split(' ')[0] || 'Faculty';

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12 pb-32">
            
            {/* ── ACADEMIC COMMAND SPOTLIGHT ───────────────────────── */}
            <motion.div variants={item} className="aether-card p-10 md:p-16 relative overflow-hidden bg-white">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">Command Center</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{greeting.sub}</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-heading text-slate-900 leading-none">
                                {greeting.text}, <span className="text-[#E31E24]">{firstName}</span>.
                            </h1>
                            <p className="mt-6 text-slate-500 text-lg max-w-xl leading-relaxed">
                                Institutional logistics are currently synchronized. Manage your faculty sector and academic transmissions below.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <StatPill label="Department" value={user?.departmentName || 'Core Faculty'} />
                            <StatPill label="Sector" value={user?.collegeName || 'Institutional Core'} />
                            <StatPill label="Auth" value="Verified Faculty" color="emerald" />
                        </div>
                    </div>

                    <div className="hidden lg:block w-px h-32 bg-slate-100" />

                    <div className="flex items-center gap-8 px-8">
                        <div className="text-center group cursor-default">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Batches</p>
                            <h3 className="text-5xl font-heading text-slate-900 group-hover:text-[#E31E24] transition-colors">{stats.assignedClasses}</h3>
                        </div>
                        <div className="text-center group cursor-default">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pending Vector</p>
                            <h3 className="text-5xl font-heading text-slate-900 group-hover:text-[#E31E24] transition-colors">{stats.pendingEvents}</h3>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── BENTO ADMINISTRATIVE GRID ───────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <BentoCard 
                    title="Attendance Registry" 
                    desc="Manage presence logs across your assigned student clusters."
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                    onClick={() => navigate('/teacher/attendance')}
                    stats={stats.todayAttendance ? "Today Synchronized" : "Pending Presence Log"}
                />
                <BentoCard 
                    title="Assessment Repository" 
                    desc="Initialize tests and broadcast performance vectors to student nodes."
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h2M8 17h2M14 13h2M14 17h2" /></svg>}
                    onClick={() => navigate('/teacher/assessments')}
                    stats="Continuous Evaluation"
                />
                <BentoCard 
                    title="Student Directory" 
                    desc="Access student log data and institutional academic profiles."
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                    onClick={() => navigate('/teacher/students')}
                    stats="Sector Directory"
                />
            </div>

            {/* ── LOGISTICS & RECONNAISSANCE ──────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <motion.div variants={item} className="lg:col-span-3 aether-card p-10 flex flex-col justify-between group hover:bg-slate-50/50">
                    <div className="space-y-6">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Pending Transmissions</h3>
                        <div className="space-y-4">
                            {stats.pendingEvents > 0 ? (
                                <>
                                    <h4 className="text-3xl font-heading text-slate-900">{stats.pendingEvents} Requests Pending Review</h4>
                                    <p className="text-slate-500 max-w-md leading-relaxed text-sm">Actionable logistics detected in your sector. Verify and authorize transmissions.</p>
                                </>
                            ) : (
                                <p className="text-slate-400 font-medium">No immediate transmissions require authorization.</p>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/teacher/events')}
                        className="mt-12 action-button w-fit px-8"
                    >
                        Review Logistics
                    </button>
                </motion.div>

                <motion.div variants={item} className="lg:col-span-2 space-y-4">
                    <QuickUplink icon="🏛️" label="Institutional Curriculum" to="/teacher/curriculum" />
                    <QuickUplink icon="📅" label="Department Calendar" to="/teacher/calendar" />
                    <QuickUplink icon="🛡️" label="Crisis Management" to="/teacher/leave-requests" />
                </motion.div>
            </div>

            {/* Footer */}
            <div className="pt-20 text-center opacity-20">
                <span className="text-[10px] font-bold uppercase tracking-[0.8em] text-slate-900 italic">Biyani Digital Campus System // FACULTY VX</span>
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
            className="aether-card p-10 cursor-pointer group flex flex-col justify-between min-h-[280px]"
        >
            <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#E31E24] group-hover:text-white transition-all duration-500">
                    <div className="w-6 h-6">{icon}</div>
                </div>
                <div>
                    <h3 className="text-2xl font-heading text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
            </div>
            <div className="pt-8 flex items-center justify-between border-t border-slate-50 mt-auto">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${stats.includes('Pending') ? 'text-[#E31E24]' : 'text-slate-400'}`}>{stats}</span>
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
