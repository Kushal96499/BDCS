// ============================================
// BDCS - Student Results
// View published exam results
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';

export default function StudentResults() {
    const { user } = useAuth();
    const [publishedExams, setPublishedExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [resultDetails, setResultDetails] = useState([]); // Array of marks
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchExams = async () => {
            // Find exams that are published and matching student's sem/year history?
            // Simplified: Just show all published exams where this student has marks.
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
                // Fetch All Marks for this student & exam
                // We JOIN with exam_subjects to get Subject Names/Max Marks

                // 1. Get Exam Config (Subjects)
                const configQ = query(collection(db, 'exam_subjects'), where('examId', '==', selectedExamId));
                const configSnap = await getDocs(configQ);
                const subjectConfig = {};
                configSnap.docs.forEach(d => {
                    const data = d.data();
                    subjectConfig[data.subjectId] = data;
                });

                // 2. Get Student Marks
                const marksQ = query(
                    collection(db, 'marks'),
                    where('examId', '==', selectedExamId),
                    where('studentId', '==', user.uid)
                );
                const marksSnap = await getDocs(marksQ);

                // 3. Combine
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

    const calculateTotal = () => {
        return resultDetails.reduce((acc, curr) => {
            return {
                obtained: acc.obtained + (curr.isAbsent ? 0 : parseFloat(curr.marksObtained)),
                max: acc.max + curr.maxMarks
            };
        }, { obtained: 0, max: 0 });
    };

    const totals = calculateTotal();
    const percentage = totals.max > 0 ? ((totals.obtained / totals.max) * 100).toFixed(2) : 0;

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Results</h2>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                <select
                    className="border p-2 rounded w-full max-w-md"
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                >
                    <option value="">-- Choose Exam --</option>
                    {publishedExams.map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.academicYear})</option>
                    ))}
                </select>
            </div>

            {selectedExamId && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
                    <div className="p-6 border-b bg-gray-50 flex justify-between items-center print:bg-white">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {publishedExams.find(e => e.id === selectedExamId)?.name}
                            </h3>
                            <p className="text-gray-600">Name: {user.name} • Roll: {user.enrollmentNumber}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-biyani-red">{percentage}%</div>
                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Percentage</div>
                        </div>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 print:bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Max Marks</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Obtained</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {resultDetails.map((res, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{res.subjectName}</div>
                                        <div className="text-xs text-gray-500">{res.subjectCode}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                                        {res.maxMarks}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                                        {res.isAbsent ? <span className="text-red-600">ABS</span> : res.marksObtained}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${res.status === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {res.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {/* Total Row */}
                            <tr className="bg-gray-50 font-bold">
                                <td className="px-6 py-4 text-right" colSpan="2">Grand Total</td>
                                <td className="px-6 py-4 text-center text-biyani-red">
                                    {totals.obtained} / {totals.max}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {resultDetails.some(r => r.status === 'FAIL') ? 'FAIL' : 'PASS'}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="p-4 bg-gray-50 border-t print:hidden">
                        <button
                            onClick={() => window.print()}
                            className="text-gray-600 hover:text-gray-900 text-sm font-medium underline"
                        >
                            🖨️ Print Marksheet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
