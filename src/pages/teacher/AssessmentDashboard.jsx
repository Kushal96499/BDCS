// ============================================
// BDCS - Assessment Dashboard (Teacher)
// Main interface for continuous assessment system
// Modernized "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getTestsByTeacher } from '../../services/testService';
import { motion, AnimatePresence } from 'framer-motion';
import CreateTestModal from '../../components/teacher/CreateTestModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PremiumSelect from '../../components/common/PremiumSelect';

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
            toast.error('Failed to load academic assessments');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...tests];
        if (filters.batch !== 'all') filtered = filtered.filter(test => test.batchId === filters.batch);
        if (filters.semester !== 'all') filtered = filtered.filter(test => test.semester === parseInt(filters.semester));
        if (filters.status !== 'all') filtered = filtered.filter(test => test.status === filters.status);
        setFilteredTests(filtered);
    };

    const handleTestCreated = () => {
        setShowCreateModal(false);
        loadTests();
        toast.success('Assessment Cataloged');
    };

    const uniqueBatches = [...new Set(tests.map(t => t.batchId).filter(Boolean))];
    const uniqueSemesters = [...new Set(tests.map(t => t.semester).filter(Boolean))].sort();

    const statsOverview = {
        total: tests.length,
        pending: tests.filter(t => (t.status === 'completed' || (t.status === 'scheduled' && new Date() >= new Date(t.testDate))) && t.resultsMissing > 0).length,
        toPublish: tests.filter(t => (t.status === 'completed' || (t.status === 'scheduled' && new Date() >= new Date(t.testDate))) && t.resultsMissing === 0).length,
        published: tests.filter(t => t.status === 'published').length
    };

    const MetricCard = ({ title, value, colorClass, icon }) => (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col justify-between overflow-hidden relative group">
            <div className={`w-12 h-12 rounded-xl ${colorClass.bg} flex items-center justify-center ${colorClass.icon} mb-4 transition-transform group-hover:rotate-6 shadow-sm`}>
                {icon}
            </div>
            <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{title}</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{value}</h3>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 rounded-full ${colorClass.bg} opacity-5 group-hover:scale-150 transition-transform duration-700`} />
        </div>
    );

    return (
        <div className="space-y-10 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Assessment Engine</h2>
                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        Continuous Evaluation • Academic Merit
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#E31E24] text-white px-8 py-3.5 rounded-2xl shadow-xl shadow-red-200/50 hover:bg-black font-black uppercase tracking-widest text-xs flex items-center gap-3 active:scale-95 transition-all border border-white/20"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Deploy New Test
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Total Assessments" value={statsOverview.total} colorClass={{ bg: 'bg-violet-50', icon: 'text-violet-600' }} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5" /></svg>} />
                <MetricCard title="Awaiting Marks" value={statsOverview.pending} colorClass={{ bg: 'bg-amber-50', icon: 'text-amber-600' }} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <MetricCard title="Ready to Sync" value={statsOverview.toPublish} colorClass={{ bg: 'bg-blue-50', icon: 'text-blue-600' }} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <MetricCard title="Yield Published" value={statsOverview.published} colorClass={{ bg: 'bg-emerald-50', icon: 'text-emerald-600' }} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </div>

            {/* Filter Suite */}
            <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <PremiumSelect
                    label="Cohort Authority"
                    placeholder="All Student Batches"
                    value={filters.batch}
                    onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
                    options={uniqueBatches.map(id => ({ label: tests.find(t => t.batchId === id)?.batchName || id, value: id }))}
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0" /></svg>}
                />

                <PremiumSelect
                    label="Academic Phase"
                    placeholder="All Semesters"
                    value={String(filters.semester)}
                    onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                    options={uniqueSemesters.map(sem => ({ label: `Semester ${sem}`, value: String(sem) }))}
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14" /></svg>}
                />

                <PremiumSelect
                    label="Lifecycle Status"
                    placeholder="All Active States"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    options={[
                        { label: 'Draft Mode', value: 'draft' },
                        { label: 'Scheduled Tasks', value: 'scheduled' },
                        { label: 'Terminated / Completed', value: 'completed' },
                        { label: 'Synchronized / Published', value: 'published' }
                    ]}
                />
            </div>

            {/* Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-2 h-8 bg-violet-500 rounded-full" />
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Assessment Catalog</h2>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-[2.5rem] bg-white animate-pulse border border-gray-50" />)}
                    </div>
                ) : filteredTests.length === 0 ? (
                    <div className="bg-gray-50/50 rounded-[3rem] p-24 text-center border-4 border-dashed border-gray-100 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm text-gray-300 mb-6 font-black uppercase tracking-widest text-[10px]">
                            Empty Hub
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">No Active Protocols Found</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs mx-auto mb-8 leading-relaxed">System filters return zero matches for the current faculty authorization.</p>
                        <button onClick={() => setShowCreateModal(true)} className="px-8 py-3 bg-[#E31E24] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-black transition-all">Launch First Assessment</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredTests.map((test, idx) => (
                            <TestCard key={test.id} test={test} idx={idx} onClick={() => navigate(`/teacher/tests/${test.id}`)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Test Modal */}
            {showCreateModal && (
                <CreateTestModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleTestCreated}
                    teacherUser={user}
                />
            )}
        </div>
    );
}

function TestCard({ test, onClick, idx }) {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'draft': return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
            case 'scheduled': return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' };
            case 'completed': return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' };
            case 'published': return { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' };
            default: return { bg: 'bg-gray-50', text: 'text-gray-400', dot: 'bg-gray-300' };
        }
    };

    const style = getStatusStyle(test.status);
    const progressPercent = (test.resultsEntered / test.totalStudents) * 100 || 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-violet-100 transition-all cursor-pointer group relative overflow-hidden"
            onClick={onClick}
        >
            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div className={`px-4 py-1.5 rounded-full ${style.bg} ${style.text} text-[9px] font-black uppercase tracking-widest border border-current opacity-70 flex items-center gap-2`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
                        {test.status}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Yield Target</p>
                        <p className="font-black text-xs text-gray-900 tracking-widest">{test.maxMarks}M</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight group-hover:text-violet-600 transition-colors">
                        {test.subjectName}
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic truncate">{test.topic || 'General Assessment'}</p>
                </div>

                <div className="flex items-center justify-between py-4 border-y border-gray-50">
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Chronology</span>
                        <span className="text-xs font-black text-gray-700">{format(new Date(test.testDate), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex flex-col text-right gap-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cohort</span>
                        <span className="text-xs font-black text-gray-700 truncate max-w-[100px]">{test.batchName}</span>
                    </div>
                </div>

                {test.status !== 'draft' && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Processing Density</span>
                            <span className="text-[10px] font-black text-gray-900">{test.resultsEntered}/{test.totalStudents}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1 }}
                                className={`h-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-violet-600'} rounded-full`} 
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                        Inspect Protocol
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    {progressPercent === 100 && test.status !== 'published' && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    )}
                </div>
            </div>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-violet-500/5 blur-[50px]" />
        </motion.div>
    );
}
