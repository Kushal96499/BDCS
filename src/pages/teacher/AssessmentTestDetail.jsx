// ============================================
// BDCS - Assessment Test Detail Page (Teacher)
// View test, enter marks, promote students, export results
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getTestById, publishTest } from '../../services/testService';
import { getTestResults, uploadMarks, initializeTestResults } from '../../services/testResultService';
import { exportTestResultsToExcel } from '../../services/assessmentExportService';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AssessmentTestDetail() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [test, setTest] = useState(null);
    const [results, setResults] = useState([]);
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [attendanceStatus, setAttendanceStatus] = useState('loading'); // 'loading' | 'missing' | 'verified' | 'future'
    const [presentStudentIds, setPresentStudentIds] = useState(new Set());

    useEffect(() => {
        loadTestData();
    }, [testId]);

    const loadTestData = async () => {
        try {
            setLoading(true);

            // Get test data first
            const testData = await getTestById(testId);
            setTest(testData);

            // --- Attendance Check Logic ---
            const testDate = testData.testDate.toDate ? testData.testDate.toDate() : new Date(testData.testDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tDate = new Date(testDate);
            tDate.setHours(0, 0, 0, 0);

            if (tDate > today) {
                setAttendanceStatus('future');
            } else {
                // Fetch Batch for query params
                const batchRef = doc(db, 'batches', testData.batchId);
                const batchSnap = await getDoc(batchRef);

                if (batchSnap.exists()) {
                    const batchData = batchSnap.data();
                    const dateStr = format(testDate, 'yyyy-MM-dd');

                    // Find Session (Using same logic as AttendanceMarking)
                    const q = query(
                        collection(db, 'attendance_sessions'),
                        where('courseId', '==', batchData.courseId || ''),
                        where('semester', '==', String(batchData.currentSemester || batchData.semester)), // Ensure string/number match
                        where('section', '==', batchData.section || ''),
                        where('date', '==', dateStr)
                    );
                    const sessionSnap = await getDocs(q);

                    if (!sessionSnap.empty) {
                        const sessionDoc = sessionSnap.docs[0];
                        // Fetch Records (Only Present)
                        const recQ = query(
                            collection(db, 'attendance_records'),
                            where('sessionId', '==', sessionDoc.id),
                            where('status', '==', 'PRESENT')
                        );
                        const recSnap = await getDocs(recQ);
                        const presentIds = new Set(recSnap.docs.map(d => d.data().studentId));
                        setPresentStudentIds(presentIds);
                        setAttendanceStatus('verified');
                    } else {
                        setAttendanceStatus('missing');
                    }
                } else {
                    console.warn("Batch not found for test, assuming attendance missing");
                    setAttendanceStatus('missing');
                }
            }

            // Initialize student results if they don't exist
            console.log('Checking if results need initialization...');
            await initializeTestResults(testId);

            // Load results (now they will exist)
            const resultsData = await getTestResults(testId);
            console.log('Loaded results:', resultsData);
            setResults(resultsData);

            // Initialize marks from existing results
            const marksMap = {};
            resultsData.forEach(result => {
                marksMap[result.student] = {
                    marksObtained: result.marksObtained,
                    remarks: result.remarks || ''
                };
            });
            setMarks(marksMap);
        } catch (error) {
            console.error('Error loading test data:', error);
            toast.error('Failed to load test details');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId, value) => {
        let numericValue = parseFloat(value);

        // Validation
        if (numericValue < 0) numericValue = 0;
        if (numericValue > test.maxMarks) {
            toast.error(`Maximum marks allowed is ${test.maxMarks}`);
            numericValue = test.maxMarks;
        }

        setMarks({
            ...marks,
            [studentId]: {
                ...marks[studentId],
                marksObtained: value === '' ? '' : numericValue
            }
        });
    };

    const handleRemarksChange = (studentId, value) => {
        setMarks({
            ...marks,
            [studentId]: {
                ...marks[studentId],
                remarks: value
            }
        });
    };

    const handleSaveMarks = async () => {
        // Check if test date has passed
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const testDate = new Date(test.testDate);
        testDate.setHours(0, 0, 0, 0);

        if (today < testDate) {
            toast.error(`Cannot enter marks before test date (${format(test.testDate, 'MMM dd, yyyy')})`);
            return;
        }

        try {
            setSaving(true);

            // Prepare marks array
            const marksArray = Object.entries(marks)
                .filter(([studentId, data]) => data.marksObtained !== undefined && data.marksObtained !== '')
                .map(([studentId, data]) => ({
                    studentId,
                    marksObtained: parseFloat(data.marksObtained),
                    remarks: data.remarks || ''
                }));

            if (marksArray.length === 0) {
                toast.error('Please enter at least one mark');
                return;
            }

            await uploadMarks(testId, marksArray, user);
            toast.success(`Marks saved for ${marksArray.length} students`);
            await loadTestData(); // Reload to get updated stats
        } catch (error) {
            console.error('Error saving marks:', error);
            toast.error(error.message || 'Failed to save marks');
        } finally {
            setSaving(false);
        }
    };

    const handlePublishTest = async () => {
        // Transition from Draft → Scheduled (make visible to students)
        try {
            setPublishing(true);
            await updateDoc(doc(db, 'tests', testId), {
                status: 'scheduled',
                publishedAt: serverTimestamp()
            });
            toast.success('Test published! Now visible to students.');
            await loadTestData();
        } catch (error) {
            console.error('Error publishing test:', error);
            toast.error('Failed to publish test');
        } finally {
            setPublishing(false);
        }
    };

    const handlePublishResults = async () => {
        if (test.resultsMissing > 0) {
            toast.error(`Cannot publish: ${test.resultsMissing} marks still missing`);
            return;
        }

        try {
            setPublishing(true);
            await publishTest(testId, user);
            toast.success('Results published! Students can now see their marks.');
            await loadTestData();
        } catch (error) {
            console.error('Error publishing results:', error);
            toast.error(error.message || 'Failed to publish results');
        } finally {
            setPublishing(false);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const filename = await exportTestResultsToExcel(testId);
            toast.success(`Exported to ${filename}`);
        } catch (error) {
            console.error('Error exporting:', error);
            toast.error('Failed to export results');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded mb-4"></div>
                </div>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="p-6 max-w-7xl mx-auto text-center">
                <p className="text-gray-600">Test not found</p>
                <button onClick={() => navigate('/teacher/assessment')} className="mt-4 text-biyani-red">
                    ← Back to Assessment
                </button>
            </div>
        );
    }

    // Filter results based on attendance
    const applicableResults = results.filter(r => {
        if (attendanceStatus === 'verified') return presentStudentIds.has(r.student);
        return true;
    });

    const totalApplicable = applicableResults.length;

    // Count evaluated among applicable
    const evaluatedApplicable = applicableResults.filter(r => {
        const m = marks[r.student]?.marksObtained;
        return m !== '' && m !== undefined && m !== null;
    }).length;

    const progress = totalApplicable > 0 ? (evaluatedApplicable / totalApplicable) * 100 : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header / Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 p-10 text-white shadow-2xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#E31E24] opacity-5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600 opacity-5 blur-[80px] rounded-full -ml-32 -mb-32"></div>
                
                <div className="relative z-10 space-y-8">
                    <button
                        onClick={() => navigate('/teacher/tests')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-all group"
                    >
                        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#E31E24] transition-all border border-white/5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest">Return to Assessment Catalog</span>
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="px-4 py-1.5 rounded-full bg-white/5 text-gray-300 text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 shadow-sm">
                                    {test.batchName}
                                </span>
                                <span className="px-4 py-1.5 rounded-full bg-[#E31E24]/10 text-[#E31E24] text-[10px] font-black uppercase tracking-[0.2em] border border-[#E31E24]/20 shadow-sm">
                                    Semester {test.semester}
                                </span>
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-3">
                                    {test.subjectName}
                                </h1>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-1 bg-[#E31E24] rounded-full" />
                                    <p className="text-lg text-gray-400 font-bold tracking-tight uppercase">{test.topic || 'General Assessment'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`px-8 py-4 rounded-[2rem] border backdrop-blur-md shadow-2xl transition-all ${
                            test.status === 'published' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            test.status === 'scheduled' && new Date() > new Date(test.testDate) 
                                ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                            'bg-white/5 border-white/10 text-white'
                        }`}>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <span className={`block w-3 h-3 rounded-full ${test.status === 'published' ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                                    <span className={`absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75 ${test.status === 'published' ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">State Marker</p>
                                    <span className="font-black tracking-[0.2em] text-xs">
                                        {test.status === 'scheduled' && new Date() > new Date(test.testDate) ? 'CONDUCTED' : test.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Test Date</p>
                            <p className="text-lg font-bold text-gray-900">{format(test.testDate.toDate ? test.testDate.toDate() : new Date(test.testDate), 'MMMM dd, yyyy')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Max Marks</p>
                            <p className="text-lg font-bold text-gray-900">{test.maxMarks} Marks</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Present</p>
                            <p className="text-lg font-bold text-gray-900">{totalApplicable} Students</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workflow & Actions Area */}
            <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Progress */}
                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                        {test.status === 'draft' && (
                            <button onClick={handlePublishTest} disabled={publishing} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm sm:text-base">
                                {publishing ? <span className="animate-spin text-xs">⏳</span> : 'Publish Test'}
                            </button>
                        )}

                        {test.status !== 'draft' && test.status !== 'archived' && (
                            <>
                                <button
                                    onClick={handleSaveMarks}
                                    disabled={saving || test.status === 'published'}
                                    className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-900/20 flex items-center justify-center gap-2 text-sm sm:text-base"
                                >
                                    {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                                    <span className="whitespace-nowrap">Save Draft</span>
                                </button>

                                <button
                                    onClick={handlePublishResults}
                                    disabled={publishing || test.status === 'published' || test.resultsMissing > 0}
                                    className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base
                                        ${test.status === 'published'
                                            ? 'bg-green-600 shadow-green-500/20 cursor-default'
                                            : 'bg-green-600 hover:bg-green-700 shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                                >
                                    {test.status === 'published' ? (
                                        <><span className="text-xs sm:text-sm">✓</span> <span className="whitespace-nowrap">Published</span></>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            <span className="whitespace-nowrap">Publish</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleExport}
                            disabled={exporting || results.length === 0}
                            className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                            {exporting ? '...' : <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                            <span className="whitespace-nowrap">Export</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Attendance Warning */}
            {attendanceStatus === 'missing' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-yellow-800">Attendance Not Marked</h3>
                            <p className="text-yellow-700">
                                You cannot enter marks because attendance has not been marked for <strong>{format(test.testDate.toDate ? test.testDate.toDate() : new Date(test.testDate), 'dd MMM yyyy')}</strong>.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/teacher/attendance')}
                        className="bg-yellow-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-700 transition-shadow shadow-lg shadow-yellow-500/20 whitespace-nowrap"
                    >
                        Go to Attendance →
                    </button>
                </div>
            )}

            {/* Marks Table / Mobile Cards */}
            {attendanceStatus !== 'missing' && (
                <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    {/* Desktop View (md+) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">S.No</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Marks Obtained</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Percentage</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {results
                                    .filter(r => attendanceStatus === 'verified' ? presentStudentIds.has(r.student) : true)
                                    .map((result, index) => {
                                        const studentMarks = marks[result.student]?.marksObtained || result.marksObtained || '';
                                        const percentage = studentMarks ? ((studentMarks / test.maxMarks) * 100).toFixed(2) : '0';
                                        const passFailStatus = parseFloat(percentage) >= 40 ? 'PASS' : 'FAIL';

                                        return (
                                            <tr key={result.student} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-6 text-sm font-medium text-gray-400">{String(index + 1).padStart(2, '0')}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 group-hover:text-biyani-red transition-colors">{result.studentName}</span>
                                                        <span className="text-xs font-medium text-gray-400 font-mono mt-0.5">{result.enrollmentNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={test.maxMarks}
                                                            value={studentMarks}
                                                            onChange={(e) => handleMarkChange(result.student, e.target.value)}
                                                            disabled={test.status === 'published'}
                                                            className="w-24 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-center focus:ring-2 focus:ring-biyani-red/20 focus:border-biyani-red outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            placeholder="-"
                                                        />
                                                        <span className="text-sm font-semibold text-gray-400">/ {test.maxMarks}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${passFailStatus === 'PASS' ? 'bg-green-500' : 'bg-red-500'}`}
                                                                style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-600 w-12 text-right">{percentage}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide border ${passFailStatus === 'PASS'
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : 'bg-red-50 text-red-700 border-red-100'
                                                        }`}>
                                                        {passFailStatus}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <input
                                                        type="text"
                                                        value={marks[result.student]?.remarks || result.remarks || ''}
                                                        onChange={(e) => handleRemarksChange(result.student, e.target.value)}
                                                        disabled={test.status === 'published'}
                                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-biyani-red/20 focus:border-biyani-red outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400"
                                                        placeholder="Add remarks..."
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View (<md) */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {results
                            .filter(r => attendanceStatus === 'verified' ? presentStudentIds.has(r.student) : true)
                            .map((result, index) => {
                                const studentMarks = marks[result.student]?.marksObtained || result.marksObtained || '';
                                const percentage = studentMarks ? ((studentMarks / test.maxMarks) * 100).toFixed(2) : '0';
                                const passFailStatus = parseFloat(percentage) >= 40 ? 'PASS' : 'FAIL';

                                return (
                                    <div key={result.student} className="p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Student {String(index + 1).padStart(2, '0')}</span>
                                                <span className="text-base font-black text-gray-900">{result.studentName}</span>
                                                <span className="text-[10px] font-bold text-gray-500 font-mono">{result.enrollmentNumber}</span>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border ${passFailStatus === 'PASS'
                                                ? 'bg-green-50 text-green-700 border-green-100'
                                                : 'bg-red-50 text-red-700 border-red-100'
                                                }`}>
                                                {passFailStatus}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Marks Obtained</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={test.maxMarks}
                                                        value={studentMarks}
                                                        onChange={(e) => handleMarkChange(result.student, e.target.value)}
                                                        disabled={test.status === 'published'}
                                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-center focus:ring-2 focus:ring-biyani-red/20 focus:border-biyani-red outline-none transition-all disabled:opacity-50"
                                                        placeholder="-"
                                                    />
                                                    <span className="text-xs font-bold text-gray-400">/ {test.maxMarks}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 text-right">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Performance</label>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-sm font-black text-gray-900">{percentage}%</span>
                                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${passFailStatus === 'PASS' ? 'bg-green-500' : 'bg-red-500'}`}
                                                            style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Remarks</label>
                                            <input
                                                type="text"
                                                value={marks[result.student]?.remarks || result.remarks || ''}
                                                onChange={(e) => handleRemarksChange(result.student, e.target.value)}
                                                disabled={test.status === 'published'}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-biyani-red/20 focus:border-biyani-red outline-none transition-all disabled:opacity-50"
                                                placeholder="Add remarks for student..."
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {results.filter(r => attendanceStatus === 'verified' ? presentStudentIds.has(r.student) : true).length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-gray-400 font-bold">No students were present on this date.</p>
                        </div>
                    )}
                </div>
            )}

        </div >
    );
}
