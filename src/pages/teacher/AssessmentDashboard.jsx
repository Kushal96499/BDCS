import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getTestsByTeacher } from '../../services/testService';
import { motion, AnimatePresence } from 'framer-motion';
import CreateTestModal from '../../components/teacher/CreateTestModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PremiumSelect from '../../components/common/PremiumSelect';
import { useMyBatches } from '../../hooks/useMyBatches';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function AssessmentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [filteredTests, setFilteredTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({
        batch: 'all',
        semester: 'all',
        status: 'all'
    });

    const { batches: rawBatches } = useMyBatches(user?.uid);

    const assignedBatches = useMemo(() => {
        const seen = new Set();
        return rawBatches.filter(b => {
            const id = b.batchId || b.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [rawBatches]);

    useEffect(() => {
        if (user) loadTests();
    }, [user]);

    useEffect(() => {
        applyFilters();
    }, [tests, filters]);

    const loadTests = async () => {
        try {
            setLoading(true);
            const testsData = await getTestsByTeacher(user.uid);
            setTests(testsData);
        } catch (error) {
            console.error('Error loading tests:', error);
            toast.error('Failed to load assessment repository');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...tests];
        if (filters.batch !== 'all') filtered = filtered.filter(test => test.batchId === filters.batch);
        if (filters.semester !== 'all') filtered = filtered.filter(test => String(test.semester) === String(filters.semester));
        if (filters.status !== 'all') filtered = filtered.filter(test => test.status === filters.status);
        setFilteredTests(filtered);
    };

    const statsOverview = {
        total: tests.length,
        pending: tests.filter(t => (t.status === 'completed' || (t.status === 'scheduled' && new Date() >= new Date(t.testDate))) && t.resultsMissing > 0).length,
        toPublish: tests.filter(t => (t.status === 'completed' || (t.status === 'scheduled' && new Date() >= new Date(t.testDate))) && t.resultsMissing === 0).length,
        published: tests.filter(t => t.status === 'published').length
    };

    const uniqueSemesters = [...new Set(tests.map(t => t.semester).filter(Boolean))].sort();

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12 pb-32">
            
            {/* ── INSTITUTIONAL HEADER ────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-[#E31E24] text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">Tests</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Year 2025</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-heading text-slate-900 leading-none">
                        Assessment <span className="text-slate-300">Catalog.</span>
                    </h1>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="action-button w-full md:w-auto px-10 flex items-center justify-center gap-3"
                    title="Start New Test"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2.5} strokeLinecap="round" /></svg>
                    Create New Test
                </button>
            </div>

            {/* ── BENTO PERFORMANCE METRICS ────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricRing title="Total" value={statsOverview.total} color="slate" />
                <MetricRing title="Evaluation Pending" value={statsOverview.pending} color="amber" />
                <MetricRing title="Ready" value={statsOverview.toPublish} color="emerald" />
                <MetricRing title="Published" value={statsOverview.published} color="crimson" />
            </div>

            {/* ── FILTERING PROTOCOL ──────────────────────────────── */}
            <motion.div variants={item} className="aether-card p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                <PremiumSelect
                    label="Select Class"
                    placeholder="All Batches"
                    value={filters.batch}
                    onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
                    options={assignedBatches.map(b => ({ label: b.name, value: b.batchId || b.id }))}
                />

                <PremiumSelect
                    label="Select Semester"
                    placeholder="All Semesters"
                    value={String(filters.semester)}
                    onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                    options={uniqueSemesters.map(sem => ({ label: `Semester ${sem}`, value: String(sem) }))}
                />

                <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Phase Filter</label>
                    <div className="bg-slate-50 p-1 rounded-xl flex gap-1 border border-slate-100">
                        {['all', 'draft', 'published'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilters({ ...filters, status: s })}
                                className={`flex-1 py-2 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all ${filters.status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* ── ASSESSMENT REPOSITORY ──────────────────────────── */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Previous Tests</h3>
                    <span className="text-[10px] font-bold text-slate-300">{filteredTests.length} Records Detected</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-[2.5rem] bg-white animate-pulse border border-slate-50" />)}
                    </div>
                ) : filteredTests.length === 0 ? (
                    <div className="aether-card py-32 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">No assessments matching current protocol</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredTests.map((test, idx) => (
                            <AssessmentCard key={test.id} test={test} idx={idx} onClick={() => navigate(`/teacher/tests/${test.id}`)} />
                        ))}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateTestModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => { setShowCreateModal(false); loadTests(); }}
                    teacherUser={user}
                />
            )}
        </motion.div>
    );
}

// ── SUB-COMPONENTS ──────────────────────────────────────────

function MetricRing({ title, value, color }) {
    const colors = {
        slate: 'border-slate-100 text-slate-900',
        amber: 'border-amber-100 text-amber-600',
        emerald: 'border-emerald-100 text-emerald-600',
        crimson: 'border-[#E31E24]/10 text-[#E31E24]'
    };
    return (
        <motion.div variants={item} className={`aether-card p-8 flex flex-col items-center justify-center text-center border-t-2 ${colors[color]}`}>
            <span className="text-4xl font-heading mb-1">{value}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{title}</span>
        </motion.div>
    );
}

function AssessmentCard({ test, onClick, idx }) {
    const isPublished = test.status === 'published';
    const progress = (test.resultsEntered / test.totalStudents) * 100 || 0;

    return (
        <motion.div
            variants={item}
            whileHover={{ y: -5 }}
            className="aether-card p-8 cursor-pointer group hover:border-[#E31E24]/20 transition-all flex flex-col justify-between min-h-[320px]"
            onClick={onClick}
        >
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest border transition-all ${isPublished ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        {test.status}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{format(new Date(test.testDate), 'MMM dd, yyyy')}</span>
                </div>

                <div>
                    <h3 className="text-2xl font-heading text-slate-900 group-hover:text-[#E31E24] transition-colors leading-tight truncate">
                        {test.subjectName}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 truncate italic">{test.topic || 'General Assessment'}</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    <span>{test.batchName}</span>
                    <span className="text-slate-900">{test.maxMarks} Marks</span>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest">
                        <span className="text-slate-300">Sync Progress</span>
                        <span className="text-slate-900">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-[#E31E24]'}`}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

