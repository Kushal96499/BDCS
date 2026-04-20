import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function StudentResults() {
    const { user } = useAuth();
    const [publishedExams, setPublishedExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [resultDetails, setResultDetails] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchExams = async () => {
            const q = query(
                collection(db, 'exams'),
                where('status', '==', 'published'),
                orderBy('startDate', 'desc')
            );
            const snap = await getDocs(q);
            setPublishedExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchExams();
    }, []);

    useEffect(() => {
        if (!selectedExamId || !user) return;

        const fetchResults = async () => {
            setLoading(true);
            try {
                const configQ = query(collection(db, 'exam_subjects'), where('examId', '==', selectedExamId));
                const configSnap = await getDocs(configQ);
                const subjectConfig = {};
                configSnap.docs.forEach(d => {
                    const data = d.data();
                    subjectConfig[data.subjectId] = data;
                });

                const marksQ = query(
                    collection(db, 'marks'),
                    where('examId', '==', selectedExamId),
                    where('studentId', '==', user.uid)
                );
                const marksSnap = await getDocs(marksQ);

                const results = marksSnap.docs.map(d => {
                    const m = d.data();
                    const conf = subjectConfig[m.subjectId] || {};
                    return {
                        subjectName: conf.subjectName || 'Unknown Subject',
                        subjectCode: conf.subjectCode || '---',
                        maxMarks: conf.maxMarks || 100,
                        passingMarks: conf.passingMarks || 40,
                        marksObtained: m.marksObtained,
                        isAbsent: m.isAbsent,
                        remarks: m.remarks,
                        status: m.isAbsent || m.marksObtained < (conf.passingMarks || 40) ? 'FAIL' : 'PASS'
                    };
                });
                setResultDetails(results);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [selectedExamId, user]);

    const totals = useMemo(() => {
        return resultDetails.reduce((acc, curr) => ({
            obtained: acc.obtained + (curr.isAbsent ? 0 : parseFloat(curr.marksObtained)),
            max: acc.max + curr.maxMarks
        }), { obtained: 0, max: 0 });
    }, [resultDetails]);

    const percentage = totals.max > 0 ? ((totals.obtained / totals.max) * 100).toFixed(2) : 0;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12 pb-32">
            
            {/* ── EXAM SPOTLIGHT ──────────────────────────────────── */}
            <motion.div variants={item} className="aether-card p-10 md:p-14 relative overflow-hidden bg-white">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-[0.2em] rounded-md">Exam Records</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End-Semester Examinations</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-heading text-slate-900 leading-tight">
                                Exam <span className="text-[#E31E24]">Results.</span>
                            </h1>
                            <p className="mt-6 text-slate-500 text-lg max-w-xl leading-relaxed font-medium">
                                Check your marks and download your marksheet here. All data is verified by the college.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <select
                                value={selectedExamId}
                                onChange={(e) => setSelectedExamId(e.target.value)}
                                className="bg-slate-50 border-none rounded-xl px-6 py-4 font-heading text-lg text-slate-900 focus:ring-2 focus:ring-[#E31E24]/20 transition-all outline-none appearance-none cursor-pointer min-w-[300px]"
                            >
                                <option value="">Select Exam</option>
                                {publishedExams.map(e => (
                                    <option key={e.id} value={e.id}>{e.name} // {e.academicYear}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="hidden lg:block w-px h-32 bg-slate-100" />

                    {selectedExamId && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-center group cursor-default">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Total Score</p>
                                <h3 className={`text-6xl font-heading tabular-nums ${percentage >= 40 ? 'text-slate-900' : 'text-red-500'}`}>{percentage}%</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`px-4 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${percentage >= 40 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {percentage >= 40 ? 'Pass' : 'Re-exam Needed'}
                                </div>
                                <button onClick={() => window.print()} className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
                                    🖨️
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── MARKSHEET TRANSCRIPT ────────────────────────────── */}
            {selectedExamId && (
                <motion.div variants={item} className="aether-card overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em]">Marks Detail</h3>
                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                            Exam: {publishedExams.find(e => e.id === selectedExamId)?.name}
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="p-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Subject</th>
                                    <th className="p-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Max Marks</th>
                                    <th className="p-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Marks Obtained</th>
                                    <th className="p-8 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {resultDetails.map((res, i) => (
                                    <tr key={i} className="group hover:bg-slate-50/30 transition-colors">
                                        <td className="p-8">
                                            <div>
                                                <p className="font-heading text-lg text-slate-900">{res.subjectName}</p>
                                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">CODE: {res.subjectCode}</p>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center text-sm font-medium text-slate-400">
                                            {res.maxMarks} PT
                                        </td>
                                        <td className="p-8 text-center">
                                            <p className="text-xl font-heading text-slate-900">
                                                {res.isAbsent ? <span className="text-red-500 italic text-sm font-bold uppercase">Absent</span> : res.marksObtained}
                                            </p>
                                        </td>
                                        <td className="p-8 text-right">
                                            <span className={`inline-block px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all ${res.status === 'PASS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-red-50 text-red-600 border-red-100 group-hover:bg-red-600 group-hover:text-white'}`}>
                                                {res.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50/30 font-bold border-t-2 border-slate-100">
                                    <td className="p-8 text-lg font-heading text-slate-900">Total</td>
                                    <td className="p-8 text-center text-slate-400 font-medium">{totals.max}</td>
                                    <td className="p-8 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl font-heading text-[#E31E24]">{totals.obtained}</span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Marks</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-right underline decoration-[#E31E24] decoration-2 underline-offset-8">
                                        <span className={`text-sm font-black uppercase tracking-[0.2em] ${resultDetails.some(r => r.status === 'FAIL') ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {resultDetails.some(r => r.status === 'FAIL') ? 'Fail' : 'Success'}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {!selectedExamId && (
                <div className="py-32 text-center aether-card opacity-30">
                    <p className="text-[10px] font-bold uppercase tracking-[0.8em]">Select an exam to see results</p>
                </div>
            )}
        </motion.div>
    );
}
