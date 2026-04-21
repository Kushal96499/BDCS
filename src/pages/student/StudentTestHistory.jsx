import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getStudentResults } from '../../services/testResultService';
import { format, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { getTestsByBatch } from '../../services/testService';
import PremiumSelect from '../../components/common/PremiumSelect';
import { 
    TrendingUp, 
    CheckCircle2, 
    GraduationCap, 
    Calendar, 
    Hourglass, 
    Check 
} from 'lucide-react';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function StudentTestHistory() {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [upcomingTests, setUpcomingTests] = useState([]);
    const [awaitingResults, setAwaitingResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedSem, setSelectedSem] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');

    // Reset subject filter when semester changes
    useEffect(() => {
        setSubjectFilter('all');
    }, [selectedSem]);

    useEffect(() => {
        if (user) loadResults();
    }, [user]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const [allResults, allTests] = await Promise.all([
                getStudentResults(user.uid),
                user.batchId ? getTestsByBatch(user.batchId) : Promise.resolve([])
            ]);

            const today = startOfDay(new Date());
            const resultsByTestId = {};
            allResults.forEach(r => {
                const tid = r.test || r.testId || r.testDetails?.id;
                if (tid) resultsByTestId[tid] = r;
            });

            const past = [];
            const awaiting = [];
            const upcoming = [];

            allTests.forEach(test => {
                if (!test.testDate) return;
                const testDate = new Date(test.testDate);
                const testDateStart = startOfDay(testDate);
                const result = resultsByTestId[test.id];

                if (test.status === 'published') {
                    past.push({
                        ...result,
                        testId: test.id,
                        maxMarks: test.maxMarks,
                        semester: test.semester,
                        testDetails: result?.testDetails || {
                            id: test.id,
                            topic: test.topic,
                            testDate: testDate,
                            subjectName: test.subjectName,
                            testType: test.testType,
                            semester: test.semester
                        }
                    });
                } else {
                    if (testDateStart.getTime() <= today.getTime()) {
                        awaiting.push(test);
                    } else {
                        upcoming.push(test);
                    }
                }
            });

            setResults(past.sort((a, b) => new Date(b.testDetails.testDate) - new Date(a.testDetails.testDate)));
            setAwaitingResults(awaiting.sort((a, b) => new Date(b.testDate) - new Date(a.testDate)));
            setUpcomingTests(upcoming.sort((a, b) => new Date(a.testDate) - new Date(b.testDate)));

        } catch (error) {
            console.error('Error loading results:', error);
        } finally {
            setLoading(false);
        }
    };

    const semStats = useMemo(() => {
        const semMatch = results.filter(r => 
            selectedSem === 'all' || String(r.semester || r.testDetails?.semester) === String(selectedSem)
        );

        const average = semMatch.length > 0 
            ? (semMatch.reduce((sum, r) => sum + (r.percentage || 0), 0) / semMatch.length)
            : 0;

        const getStanding = (pct) => {
            if (pct >= 90) return { label: 'Outstanding', grade: 'O' };
            if (pct >= 80) return { label: 'Excellence', grade: 'A+' };
            if (pct >= 70) return { label: 'Very Good', grade: 'A' };
            if (pct >= 60) return { label: 'Good', grade: 'B+' };
            if (pct >= 50) return { label: 'Satisfactory', grade: 'B' };
            return { label: 'Average', grade: 'C' };
        };

        const standing = getStanding(average);

        // Calculate best subject
        const subjectAverages = {};
        semMatch.forEach(r => {
            const sub = r.testDetails?.subjectName || 'Unknown';
            if (!subjectAverages[sub]) subjectAverages[sub] = { total: 0, count: 0 };
            subjectAverages[sub].total += (r.percentage || 0);
            subjectAverages[sub].count += 1;
        });

        let bestSub = { name: '---', score: 0 };
        Object.entries(subjectAverages).forEach(([name, data]) => {
            const avg = data.total / data.count;
            if (avg > bestSub.score) {
                bestSub = { name, score: avg };
            }
        });

        return {
            total: semMatch.length,
            pass: semMatch.filter(r => r.passFailStatus === 'PASS').length,
            average: average.toFixed(1),
            standing,
            bestSub: {
                ...bestSub,
                score: bestSub.score.toFixed(1)
            }
        };
    }, [results, selectedSem]);

    const filtered = results.filter(r => {
        const passMatch = filter === 'all' || (r.passFailStatus && r.passFailStatus.toLowerCase() === filter);
        const semMatch = selectedSem === 'all' || String(r.semester || r.testDetails?.semester) === String(selectedSem);
        const subjectMatch = subjectFilter === 'all' || (r.testDetails?.subjectName === subjectFilter);
        return passMatch && semMatch && subjectMatch;
    });

    const semesters = useMemo(() => {
        const sems = new Set(results.map(r => r.semester || r.testDetails?.semester).filter(Boolean));
        return ['all', ...Array.from(sems).sort((a, b) => a - b)];
    }, [results]);

    const subjects = useMemo(() => {
        const filteredResults = selectedSem === 'all' 
            ? results 
            : results.filter(r => String(r.semester || r.testDetails?.semester) === String(selectedSem));
            
        const subs = new Set(filteredResults.map(r => r.testDetails?.subjectName).filter(Boolean));
        return ['all', ...Array.from(subs).sort()];
    }, [results, selectedSem]);

    if (loading) return (
        <div className="animate-pulse space-y-8">
            <div className="h-48 bg-white rounded-3xl border border-slate-100" />
            <div className="h-96 bg-white rounded-3xl border border-slate-100" />
        </div>
    );

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-32 pt-2">
            
            {/* ── CLEAN PREMIUM HEADER ──────────────────────────── */}
            <motion.header variants={item} className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/40 p-8 rounded-[2.5rem] backdrop-blur-3xl border border-white/60 shadow-xl shadow-slate-100/30">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                         <div className="px-2.5 py-1 bg-red-50/50 rounded-full border border-red-100/50 flex items-center gap-1.5 backdrop-blur-md">
                             <span className="w-1.5 h-1.5 bg-[#E31E24] rounded-full animate-pulse shadow-[0_0_8px_rgba(227,30,36,0.3)]" />
                             <p className="text-[8px] font-black text-[#E31E24] uppercase tracking-[0.2em]">Class Test Records</p>
                         </div>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">
                        Test History<span className="text-[#E31E24]">.</span>
                    </h1>
                </div>

                <div className="w-full lg:w-72 bg-slate-50/50 p-2 rounded-2xl border border-slate-100 overflow-visible backdrop-blur-xl transition-all">
                    <PremiumSelect
                        label="Semester"
                        value={selectedSem}
                        onChange={(e) => setSelectedSem(e.target.value)}
                        options={semesters.map(sem => ({
                            value: sem,
                            label: sem === 'all' ? 'Overall View' : `Semester ${sem}`
                        }))}
                    />
                </div>
            </motion.header>

            {/* ── STATS ROW: COMPACT EDITION ────────────────────── */}
            <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard label="Average Score" value={`${Math.round(semStats.average)}%`} icon={<TrendingUp className="w-5 h-5" />} color="red" />
                <StatCard label="Class Tests Cleared" value={`${semStats.pass} / ${semStats.total}`} icon={<CheckCircle2 className="w-5 h-5" />} color="emerald" />
                <StatCard 
                    label="Subject Strength" 
                    value={semStats.bestSub.name === '---' ? '---' : semStats.bestSub.name}
                    subValue={semStats.bestSub.name === '---' ? '' : `${semStats.bestSub.score}% Mastery`}
                    icon={<GraduationCap className="w-5 h-5" />} 
                    color="violet" 
                />
            </motion.div>

            {/* ── UPCOMING & PENDING ──────────────────────────── */}
            {(upcomingTests.length > 0 || awaitingResults.length > 0) && (
                <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {upcomingTests.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Upcoming Tests
                            </h3>
                            <div className="space-y-3">
                                {upcomingTests.slice(0, 2).map(t => <StatusCard key={t.id} test={t} type="upcoming" />)}
                            </div>
                        </div>
                    )}
                    {awaitingResults.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> Pending Marks
                            </h3>
                            <div className="space-y-3">
                                {awaitingResults.slice(0, 2).map(t => <StatusCard key={t.id} test={t} type="pending" />)}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── RESULTS LIST ──────────────────────────────── */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">History</h3>
                    <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                        <div className="min-w-[140px]">
                            <PremiumSelect
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                options={[
                                    { value: 'all', label: 'All Subjects' },
                                    ...subjects.filter(s => s !== 'all').map(s => ({ value: s, label: s }))
                                ]}
                            />
                        </div>
                        <div className="min-w-[140px]">
                            <PremiumSelect
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                options={[
                                    { value: 'all', label: 'All Records' },
                                    { value: 'pass', label: 'Passed' },
                                    { value: 'fail', label: 'Failed' }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((res) => (
                            <SimpleResultCard key={res.id} result={res} />
                        ))}
                    </AnimatePresence>

                    {filtered.length === 0 && (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No results found for this filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function StatusCard({ test, type }) {
    const isUpcoming = type === 'upcoming';
    return (
        <div className={`aether-card p-5 flex items-center justify-between group cursor-default transition-all duration-500 border border-slate-100/50 ${isUpcoming ? 'hover:border-amber-200 bg-amber-50/10' : 'hover:border-blue-200 bg-blue-50/10'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-500 ${isUpcoming ? 'bg-amber-50 text-amber-500 shadow-sm' : 'bg-blue-50 text-blue-500 shadow-sm'}`}>
                    {isUpcoming ? <Calendar className="w-5 h-5" /> : <Hourglass className="w-5 h-5" />}
                </div>
                <div>
                    <h4 className="text-base font-black text-slate-900 uppercase tracking-tight group-hover:text-slate-950 transition-colors leading-none">{test.subjectName}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 opacity-70 truncate w-32 md:w-auto">{test.topic}</p>
                </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${isUpcoming ? 'bg-slate-900 text-white' : 'bg-slate-900 text-white'}`}>
                {test.status === 'postponed' ? (
                    <span className="text-amber-400">Postponed</span>
                ) : (
                    isUpcoming ? format(new Date(test.testDate), 'MMM dd') : 'Awaiting Marks'
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, subValue, icon, color }) {
    const colors = {
        red: 'text-[#E31E24] hover:border-red-200 bg-red-50/20',
        emerald: 'text-emerald-600 hover:border-emerald-200 bg-emerald-50/20',
        indigo: 'text-indigo-600 hover:border-indigo-200 bg-indigo-50/20',
        violet: 'text-violet-600 hover:border-violet-200 bg-violet-50/20'
    };
    return (
        <div className={`aether-card p-6 group transition-all duration-500 border border-slate-100/50 ${colors[color]}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">{label}</p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-[#E31E24] transition-colors truncate">{value}</h3>
                    {subValue && <p className="text-[10px] font-bold text-slate-400 truncate">{subValue}</p>}
                </div>
                <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:rotate-12 transition-all duration-500`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

const SimpleResultCard = React.forwardRef(({ result }, ref) => {
    const isPass = result.passFailStatus === 'PASS';
    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`aether-card p-5 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all duration-500 group border border-slate-100/50 ${isPass ? 'hover:border-emerald-200' : 'hover:border-red-200'}`}
        >
            <div className="flex items-center gap-6 flex-1 w-full">
                <div className="relative">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all duration-700 group-hover:scale-105 ${isPass ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                        <span className="text-sm font-black tabular-nums tracking-tighter leading-none">{Math.round(result.percentage)}%</span>
                        <span className="text-[6px] font-black uppercase tracking-widest mt-0.5 opacity-50">Score</span>
                    </div>
                </div>
                
                <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 bg-slate-950 text-white text-[7px] font-black uppercase tracking-[0.2em] rounded-md">Sem {result.semester}</div>
                        <div className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-[0.2em] border shadow-sm ${isPass ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {result.passFailStatus === 'PASS' ? 'Passed' : 'Failed'}
                        </div>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none truncate group-hover:text-[#E31E24] transition-colors">
                        {result.testDetails?.subjectName || 'Internal Test'}
                    </h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] truncate opacity-80">{result.testDetails?.topic || 'Curriculum Check'}</p>
                </div>
            </div>

            <div className="flex items-center gap-8 w-full md:w-auto px-4 md:px-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                <div className="text-center md:text-right flex-1 md:min-w-[100px]">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Net Marks</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">
                        {result.marksObtained} <span className="text-slate-200 text-base mx-1 tabular-nums">/</span> {result.maxMarks}
                    </p>
                </div>
                {result.testDetails?.testDate && (
                    <div className="w-12 flex flex-col items-center border-l border-slate-50 pl-6 md:pl-8">
                        <span className="text-[10px] font-black text-slate-900 group-hover:text-[#E31E24] transition-colors leading-none uppercase">{format(new Date(result.testDetails.testDate), 'MMM')}</span>
                        <span className="text-[9px] font-black text-slate-300 uppercase mt-1 leading-none tabular-nums font-bold">{format(new Date(result.testDetails.testDate), 'yyyy')}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
});
