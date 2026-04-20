import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getStudentAcademicHistory } from '../../services/batchPromotionService';
import { exportStudentHistoryToExcel } from '../../services/assessmentExportService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function StudentProgressTimeline() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (user) loadHistory();
    }, [user]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await getStudentAcademicHistory(user.uid);
            setHistory(data);
        } catch (error) {
            console.error('Error loading history:', error);
            toast.error('Failed to load academic history');
        } finally {
            setLoading(false);
        }
    }

    const handleExport = async () => {
        try {
            setExporting(true);
            const filename = await exportStudentHistoryToExcel(user.uid, user.name);
            toast.success(`Exported to ${filename}`);
        } catch (error) {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="p-12 animate-pulse space-y-8"><div className="h-64 bg-white rounded-[3rem] border border-slate-100" /></div>;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12 pb-32">
            
            {/* ── ACADEMIC JOURNEY SPOTLIGHT ───────────────────────── */}
            <motion.div variants={item} className="aether-card p-10 md:p-14 relative overflow-hidden bg-white">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => navigate('/student/test-history')}
                                    className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    ←
                                </button>
                                <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">Achievement History</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Records</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-heading text-slate-900 leading-tight">
                                Progress <span className="text-[#E31E24]">Timeline.</span>
                            </h1>
                            <p className="mt-6 text-slate-500 text-lg max-w-xl leading-relaxed font-medium">
                                A verified history of your academic progress and promotion through the college.
                            </p>
                        </div>
                    </div>

                    <div className="hidden lg:block w-px h-32 bg-slate-100" />

                    <div className="flex flex-col items-center gap-6">
                        <button 
                            onClick={handleExport}
                            disabled={exporting || history.length === 0}
                            className="action-button px-10"
                        >
                            {exporting ? 'Processing...' : 'Export Transcript'}
                        </button>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Official College Record</p>
                    </div>
                </div>
            </motion.div>

            {/* ── CHRONOLOGICAL FEED ─────────────────────────────── */}
            <div className="relative px-4">
                {/* Visual Line */}
                <div className="absolute left-16 top-0 bottom-0 w-px bg-slate-100" />

                <div className="space-y-16">
                    {history.map((record, index) => (
                        <TimelineNode key={record.id} record={record} index={index} />
                    ))}

                    {history.length === 0 && (
                        <div className="py-32 text-center aether-card">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">No Academic History Found</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function TimelineNode({ record, index }) {
    const isPassout = record.status?.toUpperCase() === 'PASSOUT';
    const isActive = record.status?.toUpperCase() === 'ACTIVE';
    
    return (
        <motion.div 
            variants={item}
            className="relative flex gap-12 group"
        >
            {/* Visual Dot */}
            <div className="relative z-10 mt-6">
                <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm ring-4 ring-slate-50 transition-all duration-500
                    ${isActive ? 'bg-blue-500 animate-pulse' : isPassout ? 'bg-[#E31E24]' : 'bg-emerald-500'}`} />
            </div>

            {/* Content Card */}
            <div className="flex-1 aether-card p-8 hover:bg-slate-50/50 transition-all duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{record.academicYear}</span>
                             <span className="w-1 h-1 bg-slate-200 rounded-full" />
                             <span className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">Sem {record.semester}</span>
                        </div>
                        <h3 className="text-3xl font-heading text-slate-900 group-hover:text-[#E31E24] transition-colors">{record.batchName}</h3>
                    </div>
                    <div className={`px-4 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest border
                        ${isActive ? 'bg-blue-50 text-blue-600 border-blue-100' : isPassout ? 'bg-[#E31E24] text-white border-[#E31E24]' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {record.status}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <LogStat label="Admission Date" value={format(record.joinedAt?.toDate ? record.joinedAt.toDate() : new Date(record.joinedAt), 'dd MMM, yy')} />
                    <LogStat label="Total Tests" value={record.testsCompleted || 0} />
                    <LogStat label="Passed" value={`${record.passCount || 0} Tests`} />
                    <LogStat label="Overall Marks" value={`${record.averagePercentage?.toFixed(1) || 0}%`} />
                </div>

                {record.remarks && (
                    <div className="mt-8 pt-8 border-t border-slate-50">
                         <div className="flex items-start gap-4">
                            <span className="text-slate-300">⚡</span>
                            <p className="text-sm text-slate-500 font-medium italic leading-relaxed">"{record.remarks}"</p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function LogStat({ label, value }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{label}</p>
            <p className="text-xl font-heading text-slate-900">{value}</p>
        </div>
    );
}
