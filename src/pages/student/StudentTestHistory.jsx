import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getStudentResults } from '../../services/testResultService';
import { format, isAfter, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { getTestsByBatch } from '../../services/testService';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function StudentTestHistory() {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [upcomingTests, setUpcomingTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (user) loadResults();
    }, [user]);

    const loadResults = async () => {
        try {
            setLoading(true);
            
            // Fetch Past Results
            const historicalData = await getStudentResults(user.uid, { isPublished: true });
            setResults(historicalData);

            // Fetch Upcoming Tests for Student's Batch
            if (user.batchId) {
                const allTests = await getTestsByBatch(user.batchId);
                const today = startOfDay(new Date());
                
                // Filter for tests that are scheduled for today or in the future
                // AND haven't been published (released results) yet
                const upcoming = allTests.filter(test => {
                    if (!test.testDate) return false;
                    
                    const testDateStart = startOfDay(new Date(test.testDate));
                    const isFutureOrToday = testDateStart.getTime() >= today.getTime();
                    
                    // Show if results are not published yet
                    const isNotPublished = test.status !== 'published';
                    
                    // If student already has a result and it IS published, then it's not "upcoming"
                    // (Some tests might be published while others are still being graded)
                    const hasPublishedResult = historicalData.some(r => r.test === test.id && r.isPublished);
                    
                    return isFutureOrToday && isNotPublished && !hasPublishedResult;
                });
                
                // Sort by date ascending for upcoming
                setUpcomingTests(upcoming.sort((a, b) => new Date(a.testDate) - new Date(b.testDate)));
            }
        } catch (error) {
            console.error('Error loading student assessment data:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: results.length,
        pass: results.filter(r => r.passFailStatus === 'PASS').length,
        fail: results.filter(r => r.passFailStatus === 'FAIL').length,
        average: results.length > 0 ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1) : 0
    };

    const filtered = results.filter(r => filter === 'all' || r.passFailStatus.toLowerCase() === filter);

    if (loading) return <div className="p-12 animate-pulse space-y-8"><div className="h-64 bg-white rounded-[3rem] border border-slate-100" /></div>;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12 pb-32">
            
            {/* ── PERFORMANCE SPOTLIGHT ────────────────────────────── */}
            <motion.div variants={item} className="aether-card p-10 md:p-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">Academic Results</span>
                                <span className="px-3 py-1 bg-[#E31E24] text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">Confirmed Results</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Year 2025-26</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-heading text-slate-900 leading-none">
                                My <span className="text-[#E31E24]">Performance.</span>
                            </h1>
                            <p className="mt-6 text-slate-500 text-lg max-w-xl leading-relaxed">
                                Check your marks and performance in unit tests and class exams.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <StatBadge label="Tests Taken" value={stats.total} />
                            <StatBadge label="Pass Count" value={stats.pass} color="emerald" />
                            <StatBadge label="Fail Count" value={stats.fail} color="red" />
                        </div>
                    </div>

                    <div className="hidden lg:block w-px h-32 bg-slate-100" />

                    <div className="flex items-center gap-8 px-8">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Average Marks</p>
                            <h3 className="text-7xl font-heading text-slate-900 tabular-nums">{Math.round(stats.average)}%</h3>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── UPCOMING ASSESSMENTS ──────────────────────────── */}
            {upcomingTests.length > 0 && (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-[0.3em] flex items-center gap-3">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                            Scheduled Tests & Exams
                        </h3>
                        <span className="text-[10px] font-bold text-slate-300">{upcomingTests.length} Upcoming Tests</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {upcomingTests.map((test) => (
                            <UpcomingCard key={test.id} test={test} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── FILTERING & LISTING ──────────────────────────────── */}
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Past Test Results</h3>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter by Sem:</span>
                        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                            <button className="px-6 py-2 rounded-lg text-[10px] font-bold bg-slate-900 text-white shadow-md uppercase tracking-widest">All</button>
                        </div>
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                        {['all', 'pass', 'fail'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}
                            >
                                {f === 'all' ? 'Show All' : f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((result) => (
                            <ResultCard key={result.id} result={result} />
                        ))}
                    </AnimatePresence>

                    {filtered.length === 0 && (
                        <div className="py-24 text-center">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">No results found</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────

function UpcomingCard({ test }) {
    const testDate = test.testDate || new Date();
    const today = startOfDay(new Date());
    const isToday = format(testDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    const isTomorrow = format(testDate, 'yyyy-MM-dd') === format(new Date(today.getTime() + 86400000), 'yyyy-MM-dd');
    
    let dateLabel = format(testDate, 'EEE, MMM dd');
    if (isToday) dateLabel = 'Happening Today';
    else if (isTomorrow) dateLabel = 'Tomorrow';

    return (
        <motion.div
            variants={item}
            className="aether-card p-0 border-none bg-white group overflow-hidden relative"
        >
            {/* Ambient Background Gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50 group-hover:bg-amber-100/30 transition-colors duration-700" />
            
            <div className="relative p-10 flex flex-col h-full">
                {/* Upper Section */}
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-500 ${isToday ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isToday ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {test.testType?.replace('_', ' ') || 'Internal'}
                                </span>
                                {test.status === 'postponed' && (
                                    <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-md text-[8px] font-black uppercase tracking-widest animate-pulse">Postponed</span>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {dateLabel}
                                {test.startTime && ` • ${test.startTime}`}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Marks</p>
                        <p className="text-lg font-heading text-slate-900">{test.maxMarks}</p>
                    </div>
                </div>

                {/* Main Identity */}
                <div className="space-y-3 mb-10">
                    <h4 className="text-3xl font-heading text-slate-900 leading-none group-hover:text-amber-600 transition-colors uppercase tracking-tight">
                        {test.subjectName}
                    </h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        {test.topic}
                    </p>
                </div>

                {/* Footer Matrix */}
                <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {test.createdByName?.charAt(0) || 'F'}
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Assigned By</span>
                            <span className="text-[11px] font-bold text-slate-700">{test.createdByName || 'Institutional Faculty'}</span>
                        </div>
                    </div>
                    
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:rotate-45">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StatBadge({ label, value, color = 'slate' }) {
    const colors = {
        slate: 'bg-slate-50 text-slate-900 border-slate-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        red: 'bg-red-50 text-red-600 border-red-100'
    };
    return (
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${colors[color]}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{label}:</span>
            <span className="text-[11px] font-bold uppercase">{value}</span>
        </div>
    );
}

function ResultCard({ result }) {
    const isPass = result.passFailStatus === 'PASS';
    const date = result.testDetails?.testDate?.toDate ? result.testDetails.testDate.toDate() : new Date();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="aether-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-slate-50/50"
        >
            <div className="flex items-center gap-8 flex-1">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center relative shadow-sm group-hover:border-[#E31E24]/20 transition-all">
                    <span className={`text-xl font-heading ${isPass ? 'text-emerald-500' : 'text-red-500'}`}>
                        {Math.round(result.percentage)}%
                    </span>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isPass ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                
                <div>
                    <h4 className="text-xl font-heading text-slate-900 group-hover:text-[#E31E24] transition-colors uppercase tracking-tight">
                        {result.testDetails?.subjectName || 'Institutional Assessment'}
                    </h4>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(date, 'MMM dd, yyyy')}
                        </span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {result.testDetails?.topic || 'Test Detail'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-12 px-8">
                <div className="text-center md:text-right">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Marks Obtained</p>
                    <p className="text-2xl font-heading text-slate-900 tabular-nums">
                        {result.marksObtained} <span className="text-slate-300">/</span> {result.maxMarks}
                    </p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${isPass ? 'bg-emerald-900 text-white' : 'bg-red-900 text-white'}`}>
                    {result.passFailStatus}
                </div>
            </div>
        </motion.div>
    );
}
