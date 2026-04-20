import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from '../admin/Toast';
import { useAuth } from '../../hooks/useAuth';
import {
    promoteBatchWithBacklogs,
    markBatchPassout,
    getSemesterYear,
    getRollbackSemester,
    getRollbackYear,
} from '../../services/batchPromotionService';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';
import { useScrollLock } from '../../hooks/useScrollLock';

const STATUS_CONFIG = {
    PROMOTED: {
        label: 'Promote',
        emoji: '✅',
        color: 'emerald',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        activeBg: 'bg-emerald-600',
        activeText: 'text-white',
        description: 'All clear — moves to next semester'
    },
    BACK_PROMOTED: {
        label: 'Back Promote',
        emoji: '⚠️',
        color: 'amber',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        activeBg: 'bg-amber-500',
        activeText: 'text-white',
        description: 'ATKT — next sem with carry-forward backs'
    },
    NOT_PROMOTED: {
        label: 'Not Promoted',
        emoji: '🚫',
        color: 'red',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        activeBg: 'bg-red-600',
        activeText: 'text-white',
        description: 'Detained — stays back / junior batch'
    }
};

export default function PromoteBatchModal({ isOpen, onClose, batch, onSuccess }) {
    useScrollLock(isOpen);
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [maxSemesters, setMaxSemesters] = useState(null);
    const [studentSelections, setStudentSelections] = useState({});

    const currentSem = parseInt(batch?.currentSemester || 1);
    const nextSem = currentSem + 1;
    const currentYear = getSemesterYear(currentSem);
    const nextYear = getSemesterYear(nextSem);
    const rollbackSem = getRollbackSemester(currentSem);
    const rollbackYear = getRollbackYear(currentSem);
    const isFinalSemester = maxSemesters !== null && currentSem >= maxSemesters;

    useEffect(() => {
        if (isOpen && batch) {
            fetchStudents();
            fetchSubjects();
            fetchCourseDuration();
            setStudentSelections({});
        }
    }, [isOpen, batch]);

    const fetchCourseDuration = async () => {
        try {
            if (batch?.courseId) {
                const courseDoc = await getDoc(doc(db, 'courses', batch.courseId));
                if (courseDoc.exists()) {
                    const duration = parseInt(courseDoc.data().duration) || 3;
                    setMaxSemesters(duration * 2);
                }
            }
        } catch (error) {}
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('batchId', '==', batch.id), where('role', '==', 'student'));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setStudents(data.filter(s => s.academicStatus !== 'REPEAT_YEAR' && s.academicStatus !== 'PASSOUT').sort((a, b) => (a.rollNumber || a.name || '').localeCompare(b.rollNumber || b.name || '')));
        } catch (error) { toast.error("Failed to load students"); } finally { setLoading(false); }
    };

    const fetchSubjects = async () => {
        try {
            const q = query(collection(db, 'subjects'), where('courseId', '==', batch.courseId), where('semester', '==', currentSem), where('status', '==', 'active'));
            const snap = await getDocs(q);
            setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {}
    };

    const setStudentMode = (studentId, mode) => {
        setStudentSelections(prev => {
            const curr = prev[studentId];
            if (mode === 'PROMOTED') {
                const next = { ...prev };
                delete next[studentId];
                return next;
            }
            return { ...prev, [studentId]: { mode, subjects: curr?.subjects || [] } };
        });
    };

    const toggleSubject = (studentId, subject) => {
        setStudentSelections(prev => {
            const curr = prev[studentId] || { mode: 'BACK_PROMOTED', subjects: [] };
            const exists = curr.subjects.find(s => s.code === subject.code);
            let updated = exists ? curr.subjects.filter(s => s.code !== subject.code) : [...curr.subjects, { name: subject.name, code: subject.code }];
            return { ...prev, [studentId]: { ...curr, subjects: updated } };
        });
    };

    const handlePromote = async () => {
        const isValid = Object.entries(studentSelections).every(([_, sel]) => sel.subjects.length > 0);
        if (!isValid && Object.keys(studentSelections).length > 0) {
            toast.error('Select failed subjects for all non-promoted students');
            return;
        }

        const msg = isFinalSemester ? `Mark batch as PASSOUT?` : `Promote batch to Semester ${nextSem}?`;
        if (!confirm(msg)) return;

        setProcessing(true);
        try {
            if (isFinalSemester) {
                if (Object.keys(studentSelections).length > 0) await promoteBatchWithBacklogs(batch.id, studentSelections, user);
                await markBatchPassout(batch.id, user);
                toast.success(`🎓 Batch completed!`);
            } else {
                await promoteBatchWithBacklogs(batch.id, studentSelections, user);
                toast.success(`Batch promoted to Sem ${nextSem}`);
            }
            onSuccess(); onClose();
        } catch (error) { toast.error(error.message || 'Promotion failure'); } finally { setProcessing(false); }
    };

    if (typeof document === 'undefined') return null;

    const promotedCount = students.filter(s => !studentSelections[s.id] || studentSelections[s.id].mode === 'PROMOTED').length;
    const backPromotedCount = students.filter(s => studentSelections[s.id]?.mode === 'BACK_PROMOTED').length;
    const notPromotedCount = students.filter(s => studentSelections[s.id]?.mode === 'NOT_PROMOTED').length;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-8 sm:p-10 border-b border-gray-50 flex justify-between items-start sm:items-center bg-gray-50/20 shrink-0">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{isFinalSemester ? '🎓 Final Clearance' : '📋 Tenure Advancement'}</h2>
                                <p className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest mt-1">
                                    {batch?.name} • Sem {currentSem} → {isFinalSemester ? 'Graduation' : `Sem ${nextSem}`}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-400 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white/50 space-y-8 custom-scrollbar overscroll-contain">
                             {/* Stats Dashboard */}
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard label="Direct Pipeline" count={promotedCount} color="emerald" icon="✅" />
                                <StatCard label="Partial Deficit" count={backPromotedCount} color="amber" icon="⚠️" />
                                <StatCard label="Jurisdiction Hold" count={notPromotedCount} color="red" icon="🚫" />
                             </div>

                             {/* Faculty List */}
                             <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Candidate Assessment</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setStudentSelections({})} className="text-[9px] font-black text-emerald-600 uppercase transition-colors hover:opacity-70">Fast-Track All ✅</button>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr className="bg-gray-50/50">
                                                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest pl-10">Candidate Identity</th>
                                                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Clearance Protocol</th>
                                                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Backlog / Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {loading ? [1,2,3].map(i=>(
                                                    <tr key={i} className="animate-pulse">
                                                        <td colSpan="3" className="p-10"><div className="h-12 bg-gray-50 rounded-2xl w-full" /></td>
                                                    </tr>
                                                )) : 
                                                    students.map(student => (
                                                        <CandidateLine 
                                                            key={student.id} 
                                                            student={student} 
                                                            mode={studentSelections[student.id]?.mode || 'PROMOTED'} 
                                                            onModeChange={(m) => setStudentMode(student.id, m)}
                                                            subjects={subjects}
                                                            selectedSubjects={studentSelections[student.id]?.subjects || []}
                                                            onToggleSubject={(s) => toggleSubject(student.id, s)}
                                                        />
                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-gray-50 bg-white shrink-0 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Automated Pipeline</div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#E31E24]" /> Manual Overrides: {Object.keys(studentSelections).length}</div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <Button variant="secondary" onClick={onClose} className="flex-1 md:px-10 py-4 text-[10px]">Discard Session</Button>
                                <Button onClick={handlePromote} disabled={processing} className="flex-2 md:px-12 py-4 text-[10px]">
                                    {processing ? 'Synchronizing...' : isFinalSemester ? '🎓 Finalize Passout' : 'Commit Promotion'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

const StatCard = ({ label, count, color, icon }) => (
    <div className={`p-6 rounded-[2rem] border transition-all ${color === 'emerald' ? 'bg-emerald-50/50 border-emerald-100/50' : color === 'amber' ? 'bg-amber-50/50 border-amber-100/50' : 'bg-red-50/50 border-red-100/50'}`}>
        <div className="flex justify-between items-start">
            <span className="text-2xl">{icon}</span>
            <span className={`text-3xl font-black ${color === 'emerald' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : 'text-red-600'}`}>{count}</span>
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">{label}</p>
    </div>
);

const CandidateLine = ({ student, mode, onModeChange, subjects, selectedSubjects, onToggleSubject }) => {
    const activeCfg = STATUS_CONFIG[mode];
    const needsSubjects = mode !== 'PROMOTED';
    
    return (
        <tr className={`transition-all group ${mode === 'PROMOTED' ? 'bg-white' : activeCfg.bg + '/30 hover:' + activeCfg.bg + '/50'}`}>
            <td className="p-6 pl-10 whitespace-nowrap">
                <div className="flex flex-col">
                    <p className="text-sm font-black text-gray-900 leading-tight uppercase tracking-tight">{student.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{student.rollNumber}</p>
                </div>
            </td>
            
            <td className="p-6">
                <div className="flex gap-2 justify-center">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button key={key} onClick={() => onModeChange(key)} 
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border shrink-0 ${mode === key ? `${cfg.activeBg} ${cfg.activeText} border-transparent shadow-lg shadow-${cfg.color}-100` : `bg-white border-gray-100 text-gray-400 hover:border-${cfg.color}-200`}`}>
                            {cfg.emoji} {cfg.label}
                        </button>
                    ))}
                </div>
            </td>

            <td className="p-6 pr-10">
                <div className="flex flex-wrap gap-2">
                    {needsSubjects ? (
                        <>
                            {subjects.map(subj => {
                                const isSelected = selectedSubjects.some(s => s.code === subj.code);
                                return (
                                    <button key={subj.id} onClick={() => onToggleSubject(subj)}
                                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight border transition-all ${isSelected ? `${activeCfg.activeBg} ${activeCfg.activeText} border-transparent shadow-sm` : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                                        {subj.name}
                                    </button>
                                );
                            })}
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-100/30">
                            <span className="animate-pulse">✨</span> Operational Clearance Active
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}
