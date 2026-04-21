import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from '../../components/common/PremiumSelect';

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
            <motion.div variants={item} className="aether-card p-12 md:p-16 relative overflow-hidden bg-white shadow-2xl shadow-slate-200/50">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-50/30 to-transparent pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="flex-1 space-y-10">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-lg">Performance Report</div>
                                <div className="px-3 py-1.5 bg-red-50 text-[#E31E24] text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border border-red-100">Class Test</div>
                            </div>
                            <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-[0.85]">
                                Class Test <span className="text-[#E31E24] relative mr-4">
                                    Ledger.
                                    <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
                                        <path d="M0 7C30 7 70 2 100 2" stroke="#E31E24" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.3" />
                                    </svg>
                                </span>
                            </h1>
                            <p className="mt-8 text-slate-500 text-lg max-w-xl leading-relaxed font-semibold opacity-80">
                                Comprehensive breakdown of your class test performance. All data is verified by the institutional academic board.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 relative">
                            <PremiumSelect
                                value={selectedExamId}
                                onChange={(e) => setSelectedExamId(e.target.value)}
                                placeholder="Select Class Test"
                                options={publishedExams.map(e => ({ value: e.id, label: `${e.name} — ${e.academicYear}` }))}
                                className="min-w-[320px]"
                            />
                        </div>
                    </div>

                    {selectedExamId && (
                        <div className="flex flex-col items-center gap-6 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/50 group hover:scale-105 transition-all duration-700 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-vibrant-red" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Overall Score</p>
                                <h3 className={`text-7xl font-black tabular-nums tracking-tighter leading-none ${percentage >= 40 ? 'text-slate-900' : 'text-red-500'}`}>{percentage}%</h3>
                            </div>
                            <div className="flex flex-col items-center gap-4 w-full">
                                <div className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] border text-center shadow-sm ${percentage >= 40 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {percentage >= 40 ? 'Satisfactory Pass' : 'Re-eval Required'}
                                </div>
                                <button 
                                    onClick={() => window.print()} 
                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-950 hover:bg-white hover:border-slate-300 transition-all duration-500 font-black text-[10px] uppercase tracking-widest"
                                >
                                    <span>Download PDF</span>
                                    <span>📄</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── MARKSHEET TRANSCRIPT ────────────────────────────── */}
            {selectedExamId && (
                <motion.div variants={item} className="aether-card overflow-hidden shadow-2xl shadow-slate-200/30">
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">A+</div>
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em]">Transcript Detail</h3>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                            Report ID: {selectedExamId.slice(-8).toUpperCase()}
                        </p>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="p-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Course Description</th>
                                    <th className="p-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Benchmark</th>
                                    <th className="p-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Performance</th>
                                    <th className="p-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {resultDetails.map((res, i) => (
                                    <motion.tr 
                                        key={i} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group hover:bg-slate-50/50 transition-all duration-300"
                                    >
                                        <td className="p-10">
                                            <div className="space-y-1.5">
                                                <p className="font-black text-xl text-slate-900 tracking-tight group-hover:text-[#E31E24] transition-colors uppercase leading-none">{res.subjectName}</p>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Module {res.subjectCode}</p>
                                            </div>
                                        </td>
                                        <td className="p-10 text-center">
                                            <div className="inline-block px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                                                <p className="text-xs font-black text-slate-500 tabular-nums leading-none">{res.maxMarks}</p>
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Scale</p>
                                            </div>
                                        </td>
                                        <td className="p-10 text-center">
                                            <div className="relative inline-block">
                                                <p className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">
                                                    {res.isAbsent ? <span className="text-red-500 italic text-sm font-bold uppercase">Absent</span> : res.marksObtained}
                                                </p>
                                                {!res.isAbsent && (
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(res.marksObtained / res.maxMarks) * 100}%` }}
                                                            className={`h-full ${res.status === 'PASS' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-10 text-right">
                                            <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all duration-500 ${res.status === 'PASS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-red-50 text-red-600 border-red-100 group-hover:bg-red-500 group-hover:text-white'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${res.status === 'PASS' ? 'bg-emerald-500 group-hover:bg-white' : 'bg-red-500 group-hover:bg-white'} animate-pulse`} />
                                                {res.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                                <tr className="bg-slate-950 text-white font-black">
                                    <td className="p-10">
                                        <p className="text-2xl tracking-tighter uppercase">Aggregate Metrics</p>
                                        <p className="text-[10px] opacity-40 uppercase tracking-[0.3em]">Final Semester Standing</p>
                                    </td>
                                    <td className="p-10 text-center text-white/40 tabular-nums text-lg">{totals.max}</td>
                                    <td className="p-10 text-center border-x border-white/10">
                                        <div className="flex flex-col items-center">
                                            <span className="text-4xl tabular-nums tracking-tighter text-[#FF4B5C]">{totals.obtained}</span>
                                            <span className="text-[9px] opacity-40 uppercase tracking-widest mt-1">Net Points</span>
                                        </div>
                                    </td>
                                    <td className="p-10 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xl uppercase tracking-[0.25em] ${resultDetails.some(r => r.status === 'FAIL') ? 'text-red-500' : 'text-emerald-400'}`}>
                                                {resultDetails.some(r => r.status === 'FAIL') ? 'Unsatisfactory' : 'Distinction'}
                                            </span>
                                            <span className="text-[9px] opacity-40 uppercase italic tracking-widest">Certified Status</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {!selectedExamId && (
                <div className="py-40 text-center aether-card bg-slate-50/30 border-dashed border-slate-200">
                    <div className="flex flex-col items-center gap-6 opacity-40">
                        <span className="text-6xl grayscale">🏛️</span>
                        <p className="text-[10px] font-black uppercase tracking-[1em]">Awaiting Transcript Selection</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
