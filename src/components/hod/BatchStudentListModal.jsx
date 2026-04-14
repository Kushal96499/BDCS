import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from '../admin/Toast';
import { getSemesterYear, getTotalBacklogCount } from '../../services/batchPromotionService';

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

    if (!isOpen) return null;

    const activeCount = students.filter(s => !s.academicStatus || s.academicStatus === 'ACTIVE').length;
    const backPromotedCount = students.filter(s => s.academicStatus === 'BACK_PROMOTED').length;
    const notPromotedCount = students.filter(s => s.academicStatus === 'NOT_PROMOTED' || s.academicStatus === 'BACKLOG' || s.academicStatus === 'REPEAT_YEAR').length;

    return (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-md">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">Student List</h2>
                        <p className="text-gray-500 text-sm">
                            {batch?.name} • {students.length} Students
                        </p>
                        {/* Quick Stats */}
                        <div className="flex gap-2 mt-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">
                                ✅ {activeCount} Active
                            </span>
                            {backPromotedCount > 0 && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md">
                                    ⚠️ {backPromotedCount} Back Promoted
                                </span>
                            )}
                            {notPromotedCount > 0 && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-md">
                                    🚫 {notPromotedCount} Detained/Backlog
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={handleExport}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2"
                        >
                            <span>📊</span> Export Excel
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto overflow-x-auto p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-bold text-gray-700">Roll No</th>
                                <th className="p-4 font-bold text-gray-700">Name</th>
                                <th className="p-4 font-bold text-gray-700">Email</th>
                                <th className="p-4 font-bold text-gray-700 text-center">Sem / Year</th>
                                <th className="p-4 font-bold text-gray-700 text-center">Academic Status</th>
                                <th className="p-4 font-bold text-gray-700 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={6} className="p-10 text-center">
                                    <div className="inline-block w-6 h-6 border-3 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
                                    <p className="mt-2 text-gray-400 text-sm">Loading students...</p>
                                </td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={6} className="p-10 text-center text-gray-400">No students found assigned to this batch.</td></tr>
                            ) : (
                                students.map(student => {
                                    const academicStatus = student.academicStatus || 'ACTIVE';
                                    const cfg = ACADEMIC_STATUS_CONFIG[academicStatus] || DEFAULT_STATUS;
                                    const year = student.currentYear || getSemesterYear(student.currentSemester || batch.currentSemester);
                                    const sem = student.currentSemester || batch.currentSemester;
                                    const backlogCount = getTotalBacklogCount(student);

                                    return (
                                        <tr key={student.id} className={`hover:bg-gray-50/80 transition-colors ${
                                            academicStatus === 'NOT_PROMOTED' || academicStatus === 'BACKLOG' || academicStatus === 'REPEAT_YEAR'
                                                ? 'bg-red-50/30' 
                                                : academicStatus === 'BACK_PROMOTED' 
                                                    ? 'bg-amber-50/30' 
                                                    : ''
                                        }`}>
                                            <td className="p-4 font-mono font-bold text-gray-600 text-xs">{student.rollNumber || '-'}</td>
                                            <td className="p-4 font-bold text-gray-900">{student.name}</td>
                                            <td className="p-4 text-gray-500 text-xs">{student.email}</td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                                        Sem {sem}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">Year {year}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                                                        {cfg.emoji} {cfg.label}
                                                    </span>
                                                    {backlogCount > 0 && (
                                                        <span className="text-[10px] font-bold text-red-500">
                                                            {backlogCount} back{backlogCount > 1 ? 's' : ''} pending
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                    student.status === 'active' 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                                    {student.status === 'active' ? 'Active' : student.status || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-right">
                    <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
}
