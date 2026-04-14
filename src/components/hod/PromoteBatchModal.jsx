import React, { useState, useEffect } from 'react';
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

// ── STATUS CONFIG ──────────────────────────────
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
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [maxSemesters, setMaxSemesters] = useState(null);

    // studentSelections: { studentId: { mode: 'PROMOTED' | 'BACK_PROMOTED' | 'NOT_PROMOTED', subjects: [...] } }
    const [studentSelections, setStudentSelections] = useState({});

    const currentSem = parseInt(batch?.currentSemester || 1);
    const nextSem = currentSem + 1;
    const currentYear = getSemesterYear(currentSem);
    const nextYear = getSemesterYear(nextSem);
    const rollbackSem = getRollbackSemester(currentSem);
    const rollbackYear = getRollbackYear(currentSem);

    // Detect if this is the FINAL semester
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
        } catch (error) {
            console.error('Error fetching course:', error);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'users'),
                where('batchId', '==', batch.id),
                where('role', '==', 'student')
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const activeStudents = data.filter(s =>
                s.academicStatus !== 'REPEAT_YEAR' && s.academicStatus !== 'PASSOUT'
            );
            activeStudents.sort((a, b) => (a.rollNumber || a.name || '').localeCompare(b.rollNumber || b.name || ''));
            setStudents(activeStudents);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            const q = query(
                collection(db, 'subjects'),
                where('courseId', '==', batch.courseId),
                where('semester', '==', currentSem),
                where('status', '==', 'active')
            );
            const snap = await getDocs(q);
            setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    // ── SELECTION HANDLERS ──────────────────────

    const setStudentMode = (studentId, mode) => {
        setStudentSelections(prev => {
            const curr = prev[studentId];
            if (mode === 'PROMOTED') {
                // Remove from selections (default = PROMOTED)
                const next = { ...prev };
                delete next[studentId];
                return next;
            }
            return {
                ...prev,
                [studentId]: {
                    mode,
                    subjects: curr?.subjects || []
                }
            };
        });
    };

    const toggleSubject = (studentId, subject) => {
        setStudentSelections(prev => {
            const curr = prev[studentId] || { mode: 'BACK_PROMOTED', subjects: [] };
            const exists = curr.subjects.find(s => s.code === subject.code);
            let updated;
            if (exists) {
                updated = curr.subjects.filter(s => s.code !== subject.code);
            } else {
                updated = [...curr.subjects, { name: subject.name, code: subject.code }];
            }
            return { ...prev, [studentId]: { ...curr, subjects: updated } };
        });
    };

    const bulkSetMode = (mode) => {
        if (mode === 'PROMOTED') {
            setStudentSelections({});
        } else {
            const newSelections = {};
            students.forEach(s => {
                newSelections[s.id] = { mode, subjects: [] };
            });
            setStudentSelections(newSelections);
        }
    };

    // ── COMPUTED STATS ──────────────────────────

    const getStudentMode = (studentId) => studentSelections[studentId]?.mode || 'PROMOTED';

    const promotedCount = students.filter(s => getStudentMode(s.id) === 'PROMOTED').length;
    const backPromotedCount = students.filter(s => getStudentMode(s.id) === 'BACK_PROMOTED').length;
    const notPromotedCount = students.filter(s => getStudentMode(s.id) === 'NOT_PROMOTED').length;

    // Validation: every non-promoted student must have at least 1 subject
    const isValid = Object.entries(studentSelections).every(
        ([_, sel]) => sel.subjects.length > 0
    );

    // ── PROMOTION HANDLER ───────────────────────

    const handlePromote = async () => {
        if (!isValid && Object.keys(studentSelections).length > 0) {
            toast.error('Please select at least 1 failed subject for each Back/Not-Promoted student');
            return;
        }

        const summaryLines = [
            `✅ ${promotedCount} Promoted → Sem ${nextSem}`,
            backPromotedCount > 0 ? `⚠️ ${backPromotedCount} Back-Promoted (ATKT) → Sem ${nextSem}` : null,
            notPromotedCount > 0 ? `🚫 ${notPromotedCount} Not Promoted → Junior Batch` : null
        ].filter(Boolean).join('\n');

        const msg = isFinalSemester
            ? `Mark batch as PASSOUT?\n\n🎓 ${promotedCount} students → PASSOUT\n${backPromotedCount > 0 ? `⚠️ ${backPromotedCount} Back-Promoted\n` : ''}${notPromotedCount > 0 ? `🚫 ${notPromotedCount} Not Promoted` : ''}`
            : `Promote batch to Semester ${nextSem}?\n\n${summaryLines}`;

        if (!confirm(msg)) return;

        setProcessing(true);
        try {
            if (isFinalSemester) {
                // Handle backlogs first, then passout
                if (Object.keys(studentSelections).length > 0) {
                    await promoteBatchWithBacklogs(batch.id, studentSelections, user);
                }
                await markBatchPassout(batch.id, user);
                toast.success(`🎓 Batch completed! ${promotedCount} students are now PASSOUT`);
            } else {
                const result = await promoteBatchWithBacklogs(batch.id, studentSelections, user);
                toast.success(`Batch promoted! ${result.promoted} promoted, ${result.backlog} back/detained`);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Promotion Error:', error);
            toast.error(error.message || 'Failed to promote batch');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-md">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-start sm:items-center gap-3">
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                            {isFinalSemester ? '🎓 Mark Batch Passout' : '📋 Promote Batch'}
                        </h2>
                        <p className="text-sm text-gray-500 truncate">
                            {isFinalSemester ? (
                                <>
                                    <span className="font-bold text-gray-800">{batch?.name}</span> has completed Sem {currentSem} (final semester).
                                    {' '}<span className="text-green-600 font-bold">Ready for Passout</span>
                                </>
                            ) : (
                                <>
                                    Moving <span className="font-bold text-gray-800">{batch?.name}</span> from Sem {currentSem} (Year {currentYear}) → <span className="text-green-600 font-bold">Sem {nextSem} (Year {nextYear})</span>
                                </>
                            )}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl font-bold shrink-0">×</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                    {loading ? (
                        <div className="text-center py-10">
                            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
                            <p className="mt-3 text-gray-500 font-medium">Loading Students...</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Info Banner: Three promotion modes */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl">
                                <h4 className="font-bold text-blue-900 text-sm mb-2">📋 How Promotion Works</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                        <div key={key} className={`${cfg.bg} ${cfg.border} border rounded-lg p-2.5`}>
                                            <span className="font-bold">{cfg.emoji} {cfg.label}</span>
                                            <p className={`${cfg.text} mt-0.5 opacity-80`}>{cfg.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                    <span className="text-3xl font-black text-emerald-600">{promotedCount}</span>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mt-1 text-emerald-600">
                                        {isFinalSemester ? 'Passout 🎓' : `Promoted → Sem ${nextSem}`}
                                    </p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                    <span className="text-3xl font-black text-amber-600">{backPromotedCount}</span>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">Back Promoted ⚠️</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                    <span className="text-3xl font-black text-red-600">{notPromotedCount}</span>
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1">Not Promoted 🚫</p>
                                </div>
                            </div>

                            {/* Bulk Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bulk:</span>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                    <button
                                        key={key}
                                        onClick={() => bulkSetMode(key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:shadow-sm ${cfg.bg} ${cfg.border} ${cfg.text}`}
                                    >
                                        {cfg.emoji} All {cfg.label}
                                    </button>
                                ))}
                            </div>

                            {/* Student List — Desktop Table */}
                            <div className="hidden sm:block border rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-4 font-bold text-gray-700 w-[22%]">Student Info</th>
                                            <th className="p-4 font-bold text-gray-700 text-center w-[38%]">Promotion Status</th>
                                            <th className="p-4 font-bold text-gray-700 w-[40%]">Failed Subjects</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {students.length === 0 ? (
                                            <tr><td colSpan={3} className="p-8 text-center text-gray-400">No active students found.</td></tr>
                                        ) : students.map(student => {
                                            const mode = getStudentMode(student.id);
                                            const cfg = STATUS_CONFIG[mode];
                                            const selectedSubjects = studentSelections[student.id]?.subjects || [];
                                            const needsSubjects = mode !== 'PROMOTED';

                                            return (
                                                <tr key={student.id} className={`${cfg.bg} transition-colors`}>
                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-900">{student.name}</div>
                                                        <div className="text-xs text-gray-400 font-mono">{student.rollNumber || student.email}</div>
                                                        {student.academicStatus === 'BACK_PROMOTED' && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md">
                                                                Has Existing Backs
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {Object.entries(STATUS_CONFIG).map(([key, statusCfg]) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => setStudentMode(student.id, key)}
                                                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                        mode === key
                                                                            ? `${statusCfg.activeBg} ${statusCfg.activeText} shadow-md scale-105 border-transparent`
                                                                            : `bg-white ${statusCfg.border} ${statusCfg.text} hover:${statusCfg.bg}`
                                                                    }`}
                                                                    title={statusCfg.description}
                                                                >
                                                                    {statusCfg.emoji} {statusCfg.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {needsSubjects ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {subjects.length === 0 ? (
                                                                    <span className="text-xs text-gray-400 italic">No subjects configured for Sem {currentSem}</span>
                                                                ) : subjects.map(subject => {
                                                                    const isSelected = selectedSubjects.some(s => s.code === subject.code);
                                                                    return (
                                                                        <button
                                                                            key={subject.id}
                                                                            onClick={() => toggleSubject(student.id, subject)}
                                                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${isSelected
                                                                                ? `${cfg.activeBg} ${cfg.activeText} border-transparent shadow-sm`
                                                                                : `bg-white text-gray-600 border-gray-200 hover:border-gray-400`
                                                                            }`}
                                                                            title={subject.code}
                                                                        >
                                                                            {subject.name}
                                                                        </button>
                                                                    );
                                                                })}
                                                                {selectedSubjects.length === 0 && subjects.length > 0 && (
                                                                    <span className="text-xs text-red-500 font-medium">← Select failed subjects</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">All cleared ✓</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="sm:hidden space-y-3">
                                {students.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">No students found.</p>
                                ) : students.map(student => {
                                    const mode = getStudentMode(student.id);
                                    const cfg = STATUS_CONFIG[mode];
                                    const selectedSubjects = studentSelections[student.id]?.subjects || [];
                                    const needsSubjects = mode !== 'PROMOTED';

                                    return (
                                        <div key={student.id} className={`border rounded-xl p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
                                            {/* Student Info */}
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{student.name}</div>
                                                <div className="text-xs text-gray-500">{student.rollNumber}</div>
                                            </div>

                                            {/* Tri-State Selector */}
                                            <div className="flex gap-1.5">
                                                {Object.entries(STATUS_CONFIG).map(([key, statusCfg]) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => setStudentMode(student.id, key)}
                                                        className={`flex-1 px-2 py-2 rounded-xl text-[10px] font-bold transition-all border text-center ${
                                                            mode === key
                                                                ? `${statusCfg.activeBg} ${statusCfg.activeText} border-transparent shadow-md`
                                                                : `bg-white ${statusCfg.border} ${statusCfg.text}`
                                                        }`}
                                                    >
                                                        {statusCfg.emoji}<br/>{statusCfg.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Subject Selection */}
                                            {needsSubjects && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {subjects.length === 0 ? (
                                                        <span className="text-xs text-gray-400 italic">No subjects configured</span>
                                                    ) : subjects.map(subject => {
                                                        const isSelected = selectedSubjects.some(s => s.code === subject.code);
                                                        return (
                                                            <button
                                                                key={subject.id}
                                                                onClick={() => toggleSubject(student.id, subject)}
                                                                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all border ${isSelected
                                                                    ? `${cfg.activeBg} ${cfg.activeText} border-transparent`
                                                                    : 'bg-white text-gray-600 border-gray-200'
                                                                }`}
                                                            >
                                                                {subject.name}
                                                            </button>
                                                        );
                                                    })}
                                                    {selectedSubjects.length === 0 && subjects.length > 0 && (
                                                        <span className="text-xs text-red-500">← Select failed subjects</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Not-Promoted Info */}
                            {notPromotedCount > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <p className="text-sm text-red-800">
                                        <strong>🚫 {notPromotedCount} student(s)</strong> will be moved to{' '}
                                        <strong>Junior Batch (Year {rollbackYear}, Sem {rollbackSem})</strong>.
                                        Their restrictions will be activated until HOD clears their backlogs.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-gray-50 rounded-b-2xl">
                    <div className="text-sm text-gray-500">
                        {Object.keys(studentSelections).length > 0 && !isValid && (
                            <span className="text-red-500 font-medium">⚠ Select failed subjects for all Back/Not-Promoted students</span>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePromote}
                            disabled={loading || processing || (Object.keys(studentSelections).length > 0 && !isValid)}
                            className={`px-8 py-3 rounded-xl font-bold text-white shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${isFinalSemester
                                    ? 'bg-green-700 hover:bg-green-800'
                                    : 'bg-gray-900 hover:bg-black'
                                }`}
                        >
                            {processing ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : isFinalSemester
                                ? `🎓 Confirm Passout (${promotedCount} Students)`
                                : `Confirm Promotion → Sem ${nextSem}`
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
