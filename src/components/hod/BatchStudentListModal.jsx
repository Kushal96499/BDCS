import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from '../admin/Toast';
import { getSemesterYear, getTotalBacklogCount } from '../../services/batchPromotionService';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../../hooks/useScrollLock';

const ACADEMIC_STATUS_CONFIG = {
    ACTIVE: { label: 'Active', emoji: '✅', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    BACK_PROMOTED: { label: 'Back Promoted', emoji: '⚠️', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    NOT_PROMOTED: { label: 'Not Promoted', emoji: '🚫', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    BACKLOG: { label: 'Backlog', emoji: '📋', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    REPEAT_YEAR: { label: 'Repeat Year', emoji: '🔁', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    PASSOUT: { label: 'Passout', emoji: '🎓', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const DEFAULT_STATUS = { label: 'Active', emoji: '✅', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };

export default function BatchStudentListModal({ isOpen, onClose, batch }) {
    useScrollLock(isOpen);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && batch) {
            fetchStudents();
        }
    }, [isOpen, batch]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('batchId', '==', batch.id), where('role', '==', 'student'));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => (a.rollNumber || a.name || '').localeCompare(b.rollNumber || b.name || ''));
            setStudents(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const { utils, writeFile } = await import('xlsx');
            const exportData = students.map(s => ({
                'Roll No': s.rollNumber,
                'Name': s.name,
                'Email': s.email,
                'Status': s.status,
                'Academic Status': s.academicStatus || 'ACTIVE',
                'Year': s.currentYear || getSemesterYear(s.currentSemester || batch.currentSemester),
                'Backlog Subjects': (s.backlogSubjects || []).join(', ') || '—',
                'Phone': s.phoneNumber || 'N/A'
            }));
            const ws = utils.json_to_sheet(exportData);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Students");
            writeFile(wb, `${batch.name}_Students.xlsx`);
            toast.success("Excel Exported!");
        } catch (error) {
            console.error(error);
            toast.error("Export Failed");
        }
    };

    if (typeof document === 'undefined') return null;

    const activeCount = students.filter(s => !s.academicStatus || s.academicStatus === 'ACTIVE').length;
    const backPromotedCount = students.filter(s => s.academicStatus === 'BACK_PROMOTED').length;
    const notPromotedCount = students.filter(s => s.academicStatus === 'NOT_PROMOTED' || s.academicStatus === 'BACKLOG' || s.academicStatus === 'REPEAT_YEAR').length;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-8 sm:p-10 border-b border-gray-50 flex justify-between items-start sm:items-center gap-6 bg-gray-50/30">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Student Registry</h2>
                                <p className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest mt-1">
                                    {batch?.name} • {students.length} Entries
                                </p>
                                {/* Quick Stats */}
                                <div className="flex gap-2 mt-4 flex-wrap">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-tight rounded-lg">
                                        ✅ {activeCount} Active
                                    </span>
                                    {backPromotedCount > 0 && (
                                        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-tight rounded-lg">
                                            ⚠️ {backPromotedCount} Partial Promo
                                        </span>
                                    )}
                                    {notPromotedCount > 0 && (
                                        <span className="px-3 py-1 bg-red-50 text-[#E31E24] border border-red-100 text-[10px] font-black uppercase tracking-tight rounded-lg">
                                            🚫 {notPromotedCount} Detained
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <button
                                    onClick={handleExport}
                                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2 active:scale-95"
                                >
                                    Export Ledger
                                </button>
                                <button onClick={onClose} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-400 hover:text-gray-900 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto p-0 overscroll-contain custom-scrollbar">
                            <table className="w-full text-left text-sm border-separate border-spacing-0">
                                <thead className="bg-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Identity Hash</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Legal Name</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Communication</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-center">Semester Rank</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-center">Academic Standing</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 text-center">Access Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-20 text-center">
                                            <div className="inline-block w-8 h-8 border-[4px] border-gray-100 border-t-[#E31E24] rounded-full animate-spin"></div>
                                            <p className="mt-4 text-xs font-black text-gray-400 uppercase tracking-widest">Hydrating Registry...</p>
                                        </td></tr>
                                    ) : students.length === 0 ? (
                                        <tr><td colSpan={6} className="p-20 text-center">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No candidates isolated in this sector.</p>
                                        </td></tr>
                                    ) : (
                                        students.map(student => {
                                            const academicStatus = student.academicStatus || 'ACTIVE';
                                            const cfg = ACADEMIC_STATUS_CONFIG[academicStatus] || DEFAULT_STATUS;
                                            const year = student.currentYear || getSemesterYear(student.currentSemester || batch.currentSemester);
                                            const sem = student.currentSemester || batch.currentSemester;
                                            const backlogCount = getTotalBacklogCount(student);

                                            return (
                                                <tr key={student.id} className={`group hover:bg-gray-50/50 transition-all ${
                                                    academicStatus === 'NOT_PROMOTED' || academicStatus === 'BACKLOG' || academicStatus === 'REPEAT_YEAR'
                                                        ? 'bg-red-50/10' 
                                                        : academicStatus === 'BACK_PROMOTED' 
                                                            ? 'bg-amber-50/10' 
                                                            : ''
                                                }`}>
                                                    <td className="px-8 py-6 font-mono font-black text-[10px] text-gray-400 group-hover:text-gray-900 transition-colors uppercase tracking-tight">{student.rollNumber || '---'}</td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-[#E31E24] group-hover:text-white transition-all capitalize">
                                                                {student.name?.[0]}
                                                            </div>
                                                            <span className="font-black text-gray-900 text-sm tracking-tight">{student.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">{student.email}</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-tight border border-blue-100">
                                                                SEM {sem}
                                                            </span>
                                                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Year {year}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${cfg.bg} ${cfg.text} ${cfg.border} border shadow-sm`}>
                                                                {cfg.emoji} {cfg.label}
                                                            </span>
                                                            {backlogCount > 0 && (
                                                                <span className="text-[9px] font-black text-[#E31E24] uppercase tracking-tighter">
                                                                    {backlogCount} Deficits Pending
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${
                                                            student.status === 'active' 
                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                                : 'bg-gray-100 text-gray-400 border border-gray-100'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-400' : 'bg-gray-300'}`}></span>
                                                            {student.status || 'OFFLINE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex justify-end">
                            <button onClick={onClose} className="px-10 py-4 bg-white border border-gray-100 rounded-2xl font-black text-[10px] text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-all shadow-sm active:scale-95">Discard View</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
