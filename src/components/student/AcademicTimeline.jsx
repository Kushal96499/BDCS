// ============================================
// BDCS - Academic Timeline Component
// Shows student's semester-by-semester journey
// with status badges and backlog tracking
// ============================================

import React from 'react';
import { motion } from 'framer-motion';

const STATUS_STYLES = {
    PROMOTED: {
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-200',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        label: 'Promoted',
        emoji: '✅'
    },
    BACK_PROMOTED: {
        dot: 'bg-amber-500',
        ring: 'ring-amber-200',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        label: 'Back Promoted',
        emoji: '⚠️'
    },
    NOT_PROMOTED: {
        dot: 'bg-red-500',
        ring: 'ring-red-200',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        label: 'Not Promoted',
        emoji: '🚫'
    },
    BACKLOG: {
        dot: 'bg-red-500',
        ring: 'ring-red-200',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        label: 'Backlog',
        emoji: '📋'
    },
    BACKLOG_CLEARED: {
        dot: 'bg-blue-500',
        ring: 'ring-blue-200',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        label: 'Backlog Cleared',
        emoji: '🔓'
    },
    REJOIN: {
        dot: 'bg-purple-500',
        ring: 'ring-purple-200',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        label: 'Rejoined',
        emoji: '🔄'
    },
    PASSOUT: {
        dot: 'bg-green-600',
        ring: 'ring-green-200',
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        label: 'Passout',
        emoji: '🎓'
    },
    REPEAT_YEAR: {
        dot: 'bg-orange-500',
        ring: 'ring-orange-200',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        label: 'Repeat Year',
        emoji: '🔁'
    }
};

const DEFAULT_STYLE = {
    dot: 'bg-gray-400',
    ring: 'ring-gray-200',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    label: 'Unknown',
    emoji: '❓'
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

export default function AcademicTimeline({ user }) {
    const history = user?.progressionHistory || [];
    const backlogLedger = user?.backlogLedger || {};

    // Sort by date
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Count pending backlogs
    const pendingBacklogs = Object.entries(backlogLedger)
        .filter(([_, subjects]) => Array.isArray(subjects) && subjects.length > 0);
    const totalPending = pendingBacklogs.reduce((t, [_, s]) => t + s.length, 0);

    if (sorted.length === 0 && pendingBacklogs.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
                <p className="text-gray-400 text-sm font-medium">No academic progression history yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Current Status Badge */}
            {user?.academicStatus && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 flex-wrap"
                >
                    <StatusBadge status={user.academicStatus} large />
                    {totalPending > 0 && (
                        <span className="px-3 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold">
                            {totalPending} Pending Backlog{totalPending > 1 ? 's' : ''}
                        </span>
                    )}
                </motion.div>
            )}

            {/* Pending Backlogs Summary */}
            {pendingBacklogs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4"
                >
                    <h4 className="text-xs font-black text-red-800 uppercase tracking-wider mb-3">
                        ⚠️ Pending Backlogs
                    </h4>
                    <div className="space-y-2">
                        {pendingBacklogs.map(([sem, subjects]) => (
                            <div key={sem} className="flex items-start gap-2">
                                <span className="px-2 py-0.5 bg-red-200 text-red-800 text-[10px] font-black rounded-md uppercase shrink-0 mt-0.5">
                                    {sem.replace('sem_', 'Sem ')}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {subjects.map((sub, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-white border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                                            {sub}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                <div className="space-y-1">
                    {sorted.map((entry, idx) => {
                        const style = STATUS_STYLES[entry.action] || DEFAULT_STYLE;
                        const isLast = idx === sorted.length - 1;

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative pl-10 py-3"
                            >
                                {/* Dot */}
                                <div className={`absolute left-2 top-5 w-5 h-5 rounded-full ${style.dot} ring-4 ${style.ring} z-10 ${isLast ? 'animate-pulse' : ''}`}></div>

                                {/* Card */}
                                <div className={`${style.bg} border ${style.border} rounded-xl p-3.5 transition-all hover:shadow-sm`}>
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{style.emoji}</span>
                                            <span className={`font-bold text-sm ${style.text}`}>{style.label}</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-gray-400">{formatDate(entry.date)}</span>
                                    </div>

                                    {/* Details */}
                                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                                        {entry.fromSemester != null && entry.toSemester != null && (
                                            <p>
                                                Sem {entry.fromSemester} → Sem {entry.toSemester}
                                                {entry.batchName && <span className="text-gray-400"> • {entry.batchName}</span>}
                                            </p>
                                        )}
                                        {entry.fromBatch && entry.toBatch && (
                                            <p>{entry.fromBatch} → {entry.toBatch}</p>
                                        )}
                                        {entry.semester && entry.clearedSubjects && (
                                            <p>
                                                Cleared from <strong>{entry.semester.replace('sem_', 'Sem ')}</strong>:
                                                {' '}{entry.clearedSubjects.join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Subjects Pills */}
                                    {entry.subjects?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {entry.subjects.map((sub, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-white/80 border border-gray-200 text-gray-700 text-[10px] font-bold rounded-md">
                                                    {sub}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── STATUS BADGE ────────────────────────────────
export function StatusBadge({ status, large = false }) {
    const style = STATUS_STYLES[status] || DEFAULT_STYLE;
    return (
        <span className={`inline-flex items-center gap-1.5 ${style.bg} border ${style.border} ${style.text} font-bold rounded-xl ${large ? 'px-4 py-2 text-sm' : 'px-2.5 py-1 text-xs'}`}>
            <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
            {style.emoji} {style.label}
        </span>
    );
}
