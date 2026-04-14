// ============================================
// BDCS - Student Assessment View
// Modern UI for academic results
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getStudentResults } from '../../services/testResultService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentAssessmentView() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState('all');

    useEffect(() => {
        if (user) loadResults();
    }, [user]);

    useEffect(() => {
        applyFilters();
    }, [results, selectedSemester]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const resultsData = await getStudentResults(user.uid, { isPublished: true });
            setResults(resultsData);
        } catch (error) {
            console.error('Error loading results:', error);
            toast.error('Failed to load test results');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...results];
        if (selectedSemester !== 'all') {
            filtered = filtered.filter(r => r.semester == selectedSemester);
        }
        setFilteredResults(filtered.sort((a, b) => b.testDetails?.testDate?.seconds - a.testDetails?.testDate?.seconds));
    };

    const uniqueSemesters = [...new Set(results.map(r => r.semester))].sort();

    const stats = {
        total: filteredResults.length,
        passed: filteredResults.filter(r => r.passFailStatus === 'PASS').length,
        avgPercentage: filteredResults.length > 0
            ? Math.round(filteredResults.reduce((sum, r) => sum + r.percentage, 0) / filteredResults.length)
            : 0
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-8 pb-24"
        >
            {/* Sexy Header & Stats */}
            <div className="bg-gradient-to-br from-gray-900 via-[#E31E24] to-red-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-red-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-300 to-white/50" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl font-heading font-black tracking-tight uppercase italic drop-shadow-md">Continuous Assessment</h1>
                        <p className="text-white/90 font-medium mt-2">Track your real-time performance</p>

                        <div className="flex gap-4 mt-6 justify-center md:justify-start">
                            <select
                                value={selectedSemester}
                                onChange={(e) => setSelectedSemester(e.target.value)}
                                className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-biyani-red outline-none backdrop-blur-md"
                            >
                                <option value="all" className="text-black">All Semesters</option>
                                {uniqueSemesters.map(sem => (
                                    <option key={sem} value={sem} className="text-black">Semester {sem}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center md:justify-end">
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center w-24">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tests</p>
                            <p className="text-xl font-black text-white">{stats.total}</p>
                        </div>
                        <div className="bg-green-500/20 backdrop-blur-md border border-green-500/20 p-4 rounded-2xl text-center w-24">
                            <p className="text-[10px] font-bold text-green-300 uppercase tracking-widest mb-1">Passed</p>
                            <p className="text-xl font-black text-white">{stats.passed}</p>
                        </div>
                        <div className="bg-red-500/20 backdrop-blur-md border border-red-500/20 p-4 rounded-2xl text-center w-24">
                            <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-1">Failed</p>
                            <p className="text-xl font-black text-white">{stats.total - stats.passed}</p>
                        </div>
                        <div className="bg-biyani-red p-4 rounded-2xl text-center w-24 shadow-lg shadow-red-900/20">
                            <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-1">Avg %</p>
                            <p className="text-xl font-black text-white">{stats.avgPercentage}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Feed */}
            <div className="space-y-4">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-48 bg-white rounded-[2rem] animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredResults.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-16 text-center border border-gray-100 shadow-sm">
                        <span className="text-6xl mb-4 block">🌵</span>
                        <h3 className="text-xl font-bold text-gray-900">No Assessments Yet</h3>
                        <p className="text-gray-500">Wait for your teachers to publish your scores.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredResults.map(result => (
                            <ResultCard key={result.id} result={result} />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function ResultCard({ result }) {
    const testDate = result.testDetails?.testDate?.toDate ? result.testDetails.testDate.toDate() : new Date(result.testDetails?.testDate);

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black
                        ${result.passFailStatus === 'PASS' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {result.percentage}%
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{result.testDetails?.subjectName || 'Subject'}</h3>
                        <p className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md inline-block mt-1">
                            {result.testDetails?.topic || 'Test'}
                        </p>
                    </div>
                </div>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase
                    ${result.passFailStatus === 'PASS' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {result.passFailStatus}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Score</p>
                    <p className="font-black text-gray-900">{result.marksObtained} <span className="text-gray-400 font-bold">/ {result.maxMarks}</span></p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="font-bold text-gray-900">{format(testDate, 'MMM dd, yyyy')}</p>
                </div>
            </div>

            {result.remarks && (
                <div className="bg-blue-50/50 p-4 rounded-[1.5rem] flex items-start gap-3">
                    <span className="text-lg">💬</span>
                    <p className="text-sm text-blue-800 font-medium italic">"{result.remarks}"</p>
                </div>
            )}
        </motion.div>
    );
}
