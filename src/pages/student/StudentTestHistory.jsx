import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getStudentResults } from '../../services/testResultService';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function StudentTestHistory() {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (user) loadResults();
    }, [user]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const data = await getStudentResults(user.uid, { isPublished: true });
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: results.length,
        pass: results.filter(r => r.passFailStatus === 'PASS').length,
        fail: results.filter(r => r.passFailStatus === 'FAIL').length,
        average: results.length > 0 ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1) : 0
    };

    const filtered = results.filter(r => filter === 'all' || r.passFailStatus.toLowerCase() === filter);

    if (loading) return (
        <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-biyani-red"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">

            {/* 1. RESULTS BANNER (Gradient Navy -> Purple) */}
            <div className="relative rounded-[2.5rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 p-10 overflow-hidden text-white shadow-2xl shadow-indigo-200">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <span className="bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block">
                        Exam Cell
                    </span>
                    <h1 className="text-4xl font-heading font-bold mb-2">Continuous Assessment</h1>
                    <p className="text-white/70 font-medium text-lg max-w-2xl">
                        Your academic performance journey. Consistent improvement is the key to success.
                    </p>
                </div>
            </div>

            {/* 2. METRIC CARDS (Colorful & Glow) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Tests"
                    value={stats.total}
                    color="text-slate-900"
                    bg="bg-white"
                    border="border-slate-100"
                />
                <StatCard
                    label="Passed"
                    value={stats.pass}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    border="border-emerald-100"
                    glow="shadow-emerald-100"
                />
                <StatCard
                    label="Failed"
                    value={stats.fail}
                    color="text-rose-600"
                    bg="bg-rose-50"
                    border="border-rose-100"
                    glow="shadow-rose-100"
                />
                <StatCard
                    label="Avg Score"
                    value={`${stats.average}%`}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    border="border-indigo-100"
                    glow="shadow-indigo-100"
                />
            </div>

            {/* 3. PERFORMANCE LIST */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h3 className="text-xl font-heading font-bold text-gray-900">Recent Results</h3>

                    <div className="flex p-1 bg-gray-50 rounded-xl w-fit">
                        {['all', 'pass', 'fail'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {filtered.map((result) => (
                        <motion.div
                            key={result.id}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="group p-6 rounded-3xl border border-gray-100 bg-white hover:border-gray-200 transition-all hover:shadow-lg flex flex-col md:flex-row items-center gap-6"
                        >
                            {/* Score Ring */}
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 text-xl font-black shrink-0 ${result.passFailStatus === 'PASS' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'border-rose-100 text-rose-600 bg-rose-50'}`}>
                                {result.percentage}%
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <h4 className="text-lg font-bold text-gray-900">{result.testDetails?.subjectName || 'Subject'}</h4>
                                <p className="text-gray-500 font-medium text-sm mt-1">{result.testDetails?.topic || 'Assessment'}</p>
                                <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                                    <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest">
                                        {format(result.testDetails?.testDate?.toDate ? result.testDetails.testDate.toDate() : new Date(), 'MMM dd, yyyy')}
                                    </span>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${result.passFailStatus === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {result.passFailStatus}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right hidden md:block">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score</p>
                                <p className="text-2xl font-black text-gray-900">{result.marksObtained} <span className="text-gray-300 text-lg">/ {result.maxMarks}</span></p>
                            </div>
                        </motion.div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="py-20 text-center text-gray-400 font-medium">
                            No results found for this filter.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color, bg, border, glow = '' }) {
    return (
        <div className={`p-6 rounded-[2rem] border ${bg} ${border} ${glow ? `shadow-lg ${glow}` : 'shadow-sm'} flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
            <span className={`text-4xl font-heading font-black mb-2 ${color}`}>{value}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${color}`}>{label}</span>
        </div>
    );
}
