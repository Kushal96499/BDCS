import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { initializeTestResults, updateStudentMark, uploadMarks } from '../../services/testResultService';
import { publishTest, postponeTest } from '../../services/testService';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

export default function AssessmentTestDetail() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [test, setTest] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    
    // UI Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [marks, setMarks] = useState({}); // studentId -> {marksObtained, remarks}
    const [showPresentOnly, setShowPresentOnly] = useState(false);
    const [presentStudentIds, setPresentStudentIds] = useState(new Set());
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [attendanceStatus, setAttendanceStatus] = useState('pending'); // pending, verified, missing
    const [showPicker, setShowPicker] = useState(false);
    const [candidateSessions, setCandidateSessions] = useState([]);
    
    // Postpone State
    const [isPostponing, setIsPostponing] = useState(false);
    const [newTestDate, setNewTestDate] = useState('');

    // ── INITIALIZATION ──────────────────────────────────────────
    useEffect(() => {
        if (!testId) return;

        const loadContent = async () => {
            console.log('Loading Test Data:', testId);
            try {
                const testDoc = await getDoc(doc(db, 'tests', testId));
                if (!testDoc.exists()) {
                    toast.error('Test data not found');
                    navigate('/teacher/tests');
                    return;
                }
                const testData = testDoc.data();
                const resolvedBatchId = testData.batchId || (typeof testData.batch === 'string' ? testData.batch : testData.batch?.id);
                
                // ACADEMIC YEAR CHECK: Verify if batch has progressed
                let isHistorical = false;
                if (resolvedBatchId) {
                    try {
                        const batchDoc = await getDoc(doc(db, 'batches', resolvedBatchId));
                        if (batchDoc.exists()) {
                            const batchData = batchDoc.data();
                            if (parseInt(testData.semester) < parseInt(batchData.currentSemester || 0)) {
                                isHistorical = true;
                            }
                        }
                    } catch (e) {
                        console.warn('Phase check bypass:', e);
                    }
                }
                
                setTest({ id: testDoc.id, ...testData, batchId: resolvedBatchId, isHistorical });

                // Initialize holders for all batch students - Wrap to prevent hang
                try {
                    await initializeTestResults(testId);
                } catch (e) {
                    console.error('Initialization service failure:', e);
                }
                
                // Verify Attendance Session
                checkAttendanceSession({ ...testData, batchId: resolvedBatchId });
            } catch (error) {
                console.error('Initialization error:', error);
                toast.error('Sync failure');
            } finally {
                setLoading(false);
                console.log('Test Data Loaded');
            }
        };

        loadContent();

        // Real-time results listener
        const unsubResults = onSnapshot(
            query(collection(db, 'test_results'), where('test', '==', testId)),
            (snap) => {
                const resultsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setResults(resultsData.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || '')));
                
                // Update local marks state if not already populated
                setMarks(prev => {
                    const next = { ...prev };
                    resultsData.forEach(r => {
                        if (next[r.student] === undefined) {
                            next[r.student] = { 
                                marksObtained: r.marksObtained === null ? '' : r.marksObtained,
                                remarks: r.remarks || ''
                            };
                        }
                    });
                    return next;
                });
            },
            (error) => {
                console.error('Results sync failure:', error);
                setSyncing(false);
            }
        );

        return () => unsubResults();
    }, [testId]);

    const linkAttendanceSession = async (sessionId, tId, dStr) => {
        if (!sessionId) return;
        
        // Fetch Present List with real-time listener for high-trust sync
        const recsQueries = query(
            collection(db, 'attendance_records'),
            where('sessionId', '==', sessionId),
            where('status', '==', 'PRESENT')
        );
        
        onSnapshot(recsQueries, (recSnap) => {
            const presentIds = new Set(recSnap.docs.map(d => d.data().studentId));
            console.log(`Synced ${presentIds.size} present students from session ${sessionId}`);
            setPresentStudentIds(presentIds);
            setAttendanceStatus('verified');
        });

        // Save association back to the test if it's not already linked (Self-Healing)
        // We use testId from component scope
        try {
            await updateDoc(doc(db, 'tests', testId), {
                attendanceSessionId: sessionId,
                attendanceVerified: true,
                attendanceDateMatched: dStr
            });
        } catch (e) {
            console.warn('Failed to self-heal attendance link:', e);
        }
    };

    const checkAttendanceSession = async (testData) => {
        try {
            // Support both Timestamp objects and ISO strings
            const testDateObj = testData.testDate?.toDate ? testData.testDate.toDate() : new Date(testData.testDate);
            if (isNaN(testDateObj.getTime())) {
                console.warn('Invalid test date detected:', testData.testDate);
                setAttendanceStatus('missing');
                return;
            }
            
            const dateStr = format(testDateObj, 'yyyy-MM-dd');

            // 0. CHECK PERSISTED LINK (Highest Priority - Self-Healing)
            if (testData.attendanceSessionId) {
                const sessionDoc = await getDoc(doc(db, 'attendance_sessions', testData.attendanceSessionId));
                if (sessionDoc.exists()) {
                    console.log('Using Persisted Attendance Link:', testData.attendanceSessionId);
                    linkAttendanceSession(testData.attendanceSessionId, testId, dateStr);
                    return;
                }
            }
            
            // RESILIENT SEARCH ENGINE: Multiple strategies to find the attendance link
            let sessionSnap = null;
            const targetBatchId = testData.batchId || (typeof testData.batch === 'string' ? testData.batch : testData.batch?.id);
            const targetBatchName = testData.batchName || (typeof testData.batch === 'object' ? testData.batch?.name : null);
            const targetCourseId = testData.courseId || (typeof testData.course === 'string' ? testData.course : testData.course?.id);
            const targetCourseName = testData.courseName || (typeof testData.course === 'object' ? testData.course?.name : null);
            
            // Normalize Semester for type-agnostic search
            const semNum = parseInt(testData.semester);
            const semStr = String(testData.semester);

            // Strategy 1: Strict ID Linkage (Most Precise)
            if (targetBatchId) {
                const idQuery = query(
                    collection(db, 'attendance_sessions'),
                    where('batchId', '==', targetBatchId),
                    where('date', '==', dateStr)
                );
                sessionSnap = await getDocs(idQuery);
            }

            // Strategy 2: Type-Agnostic Metadata Search (Course ID + Sem)
            if ((!sessionSnap || sessionSnap.empty) && targetCourseId) {
                console.log('Strategy 1 failed, trying course-id fallback');
                const semToTry = [semNum, semStr].filter(v => v !== undefined && v !== null);
                
                for (const s of semToTry) {
                    const q = query(
                        collection(db, 'attendance_sessions'),
                        where('courseId', '==', targetCourseId),
                        where('date', '==', dateStr),
                        where('semester', '==', s)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        sessionSnap = snap;
                        break;
                    }
                }
            }

            // Strategy 3: Human-Readable Name Fallback (Batch Name)
            if ((!sessionSnap || sessionSnap.empty) && targetBatchName) {
                console.log('Strategy 2 failed, trying fallback: Batch Name');
                const nameQuery = query(
                    collection(db, 'attendance_sessions'),
                    where('date', '==', dateStr),
                    where('batchName', '==', targetBatchName)
                );
                const nameSnap = await getDocs(nameQuery);
                if (!nameSnap.empty) {
                    sessionSnap = nameSnap;
                }
            }

            // Strategy 4: Fuzzy Logic - Course Name Search
            if ((!sessionSnap || sessionSnap.empty) && targetCourseName) {
                console.log('Strategy 3 failed, trying fallback: Course Name');
                const courseNameQuery = query(
                    collection(db, 'attendance_sessions'),
                    where('date', '==', dateStr),
                    where('courseName', '==', targetCourseName)
                );
                const courseNameSnap = await getDocs(courseNameQuery);
                if (!courseNameSnap.empty) {
                    sessionSnap = courseNameSnap;
                }
            }

            // Strategy 5: Teacher-Centric Context Discovery (Ultimate Fallback)
            if ((!sessionSnap || sessionSnap.empty) && user?.uid) {
                console.log('Fuzzy strategies failed, trying ultimate discovery: Teacher + Date');
                const discoveryQuery = query(
                    collection(db, 'attendance_sessions'),
                    where('teacherId', '==', user.uid),
                    where('date', '==', dateStr)
                );
                const discoverySnap = await getDocs(discoveryQuery);
                
                if (!discoverySnap.empty) {
                    const matches = discoverySnap.docs.filter(d => 
                        String(d.data().semester) === semStr || parseInt(d.data().semester) === semNum
                    );
                    if (matches.length > 0) {
                        sessionSnap = { docs: matches, empty: false };
                        console.log('Contextual Bingo! Session found via teacher context');
                    }
                }
            }
            
            let finalSession = (sessionSnap && !sessionSnap.empty) ? sessionSnap.docs[0] : null;
            
            if (finalSession) {
                console.log(`Bingo! Attendance session found: ${finalSession.id}`);
                linkAttendanceSession(finalSession.id, testId, dateStr);
            } else {
                console.warn('Attendance Lookup Exhausted: No matching session found for', {dateStr, targetBatchId, targetBatchName});
                setAttendanceStatus('missing');
            }
        } catch (error) {
            console.error('Error in resilient attendance search:', error);
            setAttendanceStatus('missing');
        } finally {
            setAttendanceLoading(false);
        }
    };

    // ── DATA LOGIC ──────────────────────────────────────────────
    const applicableResults = useMemo(() => {
        return results.filter(r => {
            const matchesSearch = r.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 r.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;
            
            if (showPresentOnly && attendanceStatus === 'verified') {
                return presentStudentIds.has(r.student);
            }
            
            return true;
        });
    }, [results, searchTerm, showPresentOnly, presentStudentIds, attendanceStatus]);

    const handleMarkChange = (studentId, field, value) => {
        if (field === 'marksObtained') {
            const val = parseFloat(value);
            if (!isNaN(val) && val > test.maxMarks) {
                toast.error(`Limit: ${test.maxMarks}`, { id: 'limit-err' });
                return;
            }
        }
        setMarks(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [field]: value, isDirty: true }
        }));
    };

    const saveMark = async (studentId) => {
        const studentMark = marks[studentId];
        if (!studentMark?.isDirty) return;

        try {
            const val = studentMark.marksObtained === '' ? null : parseFloat(studentMark.marksObtained);
            
            if (val !== null && (isNaN(val) || val < 0 || val > test.maxMarks)) {
                toast.error(`Invalid Marks for student: 0-${test.maxMarks}`);
                return;
            }

            // If we are marking as 0 and remarks is ABSENT, it's an absent sync
            await updateStudentMark(testId, studentId, val, studentMark.remarks, user);
            setMarks(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], isDirty: false }
            }));
        } catch (error) {
            console.error('Error saving student mark:', studentId, error);
            throw error;
        }
    };

    const handleAutoMarkAbsents = async () => {
        const absentStudentIds = results
            .filter(r => !presentStudentIds.has(r.student) && r.marksObtained === null)
            .map(r => r.student);

        if (absentStudentIds.length === 0) {
            toast.success('All absent students are already marked');
            return;
        }

        try {
            setSyncing(true);
            let count = 0;
            for (const sId of absentStudentIds) {
                // ABSENT = FAIL with 0 marks as per user request
                await updateStudentMark(testId, sId, 0, 'ABSENT', user);
                count++;
            }
            toast.success(`Successfully marked ${count} absent students as FAIL`);
        } catch (error) {
            console.error('Auto-mark failed:', error);
            toast.error('Partial failure marking absents');
        } finally {
            setSyncing(false);
        }
    };

    const saveAllMarks = async () => {
        const dirtyIds = Object.keys(marks).filter(id => marks[id].isDirty);
        if (dirtyIds.length === 0) {
            toast.success('Everything is up to date');
            return;
        }

        try {
            setSyncing(true);
            // Save sequentially to avoid Firestore burst limits and ensure audit trail integrity
            for (const studentId of dirtyIds) {
                await saveMark(studentId);
            }
            toast.success(`Successfully saved ${dirtyIds.length} changes`);
        } catch (error) {
            toast.error('Partial or full save failure. Please check inputs.');
        } finally {
            setSyncing(false);
        }
    };

    const handlePostponeTest = async () => {
        if (!newTestDate) {
            toast.error('Please select a new date');
            return;
        }
        
        try {
            setSyncing(true);
            await postponeTest(testId, newTestDate, user);
            
            toast.success('Test Postponed & Attendance Reset');
            setIsPostponing(false);
            
            // Reload to re-check attendance and refresh UI
            window.location.reload(); 
        } catch (error) {
            console.error('Postpone Error:', error);
            toast.error(error.message || 'Postpone failed');
        } finally {
            setSyncing(false);
        }
    };

    const handlePublishResults = async () => {
        // Validation: Only require marks for PRESENT students.
        // Absent students are automatically handled by the system.
        const missingMarksForPresent = results.filter(r => 
            presentStudentIds.has(r.student) && (r.marksObtained === null || r.marksObtained === undefined)
        ).length;

        const dirtyMarks = Object.values(marks).filter(m => m.isDirty);
        const unsavedCount = dirtyMarks.length;

        if (unsavedCount > 0) {
            toast.error(`Cannot publish: You have ${unsavedCount} unsaved changes. Please click 'Save All Changes' first.`);
            return;
        }

        if (missingMarksForPresent > 0) {
            toast.error(`Publish Blocked: ${missingMarksForPresent} present students are missing marks.`);
            return;
        }

        const confirmPublish = window.confirm(
            "FINAL PUBLICATION NOTICE:\n\n" +
            "You are about to publish results for this test. Once published:\n" +
            "1. Students will receive instant access to their marks.\n" +
            "2. Academic records will be locked for editing.\n" +
            "Do you wish to proceed?"
        );
        if (!confirmPublish) return;

        try {
            setSyncing(true);
            await publishTest(testId, user);
            toast.success('Results Published Successfully!');
            // Delay navigation slightly to let state settle
            setTimeout(() => navigate('/teacher/tests'), 1000);
        } catch (error) {
            console.error('Publication Error:', error);
            toast.error(error.message || 'Publish failed. Please check your connection.');
        } finally {
            setSyncing(false);
        }
    };

    const testDate = test?.testDate ? (test.testDate.toDate ? test.testDate.toDate() : new Date(test.testDate)) : null;
    const today = startOfDay(new Date());
    const isFutureTest = testDate ? startOfDay(testDate) > today : false;

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-[#E31E24] rounded-full animate-spin"></div>
            <p className="animate-pulse text-slate-400 text-xs font-black uppercase tracking-widest">Loading Test Details...</p>
        </div>
    );

    const stats = {
        total: results.length,
        entered: results.filter(r => r.marksObtained !== null).length,
        average: results.filter(r => r.marksObtained !== null).length > 0 
            ? results.filter(r => r.marksObtained !== null).reduce((acc, curr) => acc + (curr.percentage || 0), 0) / (results.filter(r => r.marksObtained !== null).length)
            : 0
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12 pb-32">
            
            {/* ── BACK NAVIGATION ────────────────────────────── */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/teacher/tests')}
                    className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 text-slate-400 hover:text-slate-900 group flex items-center gap-2"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={3} strokeLinecap="round" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest pr-2">Back to Tests</span>
                </button>
            </div>
            
            {/* ── PERFORMANCE SPOTLIGHT ───────────────────────────── */}
            <motion.div variants={item} className="aether-card p-10 md:p-14 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-12 relative z-10">
                    <div className="flex-1 space-y-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`px-3 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest ${test.status === 'published' ? 'bg-emerald-50 text-emerald-600' : test.status === 'postponed' ? 'bg-amber-50 text-amber-600' : 'bg-[#E31E24]/10 text-[#E31E24]'}`}>
                                    Status: {test.status}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{test.batchName} // SEMESTER {test.semester}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date: {test.testDate ? format(test.testDate instanceof Date ? test.testDate : test.testDate.toDate ? test.testDate.toDate() : new Date(test.testDate), 'PPP') : 'N/A'}</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-heading text-slate-900 leading-tight">
                                {test.subjectName}
                            </h1>
                            <p className="text-slate-500 text-lg mt-2 font-medium">{test.topic || 'Ongoing Assessment'}</p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <StatPill label="Total Marks" value={`${test.maxMarks}`} />
                            <StatPill label="Progress" value={`${Math.round((stats.entered/stats.total)*100)}%`} />
                            <StatPill label="Average" value={`${Math.round(stats.average)}%`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full lg:w-auto">
                        <div className="flex flex-wrap gap-2 justify-center lg:justify-end">
                             {!test.isHistorical && test.status !== 'published' && (
                                <>
                                    {attendanceStatus === 'verified' && results.some(r => !presentStudentIds.has(r.student) && r.marksObtained === null) && !isFutureTest && (
                                        <button 
                                            onClick={handleAutoMarkAbsents}
                                            disabled={syncing}
                                            className="px-6 py-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all active:scale-95"
                                        >
                                            {syncing ? 'Wait...' : 'Auto-Mark Absents'}
                                        </button>
                                    )}

                                    <button 
                                        onClick={() => setIsPostponing(!isPostponing)}
                                        className="px-6 py-4 border border-slate-100 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        {isPostponing ? 'Cancel' : 'Postpone Test'}
                                    </button>
                                    
                                    {!isFutureTest && (
                                        <button 
                                            onClick={saveAllMarks}
                                            disabled={syncing || !Object.values(marks).some(m => m.isDirty)}
                                            className={`px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${Object.values(marks).some(m => m.isDirty) ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                        >
                                            {syncing ? 'Saving Process...' : 'Save All Changes'}
                                        </button>
                                    )}
                                </>
                             )}
                            <button 
                                onClick={handlePublishResults}
                                disabled={results.filter(r => presentStudentIds.has(r.student) && r.marksObtained === null).length > 0 || test.status === 'published' || syncing || test.isHistorical || Object.values(marks).some(m => m.isDirty) || isFutureTest}
                                className={`action-button px-10 py-5 text-sm ${test.status === 'published' || results.filter(r => presentStudentIds.has(r.student) && r.marksObtained === null).length > 0 || test.isHistorical || Object.values(marks).some(m => m.isDirty) || isFutureTest ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            >
                                {test.isHistorical ? 'Read Only' : 'Publish Results'}
                            </button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">
                                {stats.entered < stats.total ? `${stats.total - stats.entered} Marks Not Entered` : 'All Marks Completed'}
                            </p>
                            {Object.values(marks).some(m => m.isDirty) && (
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest text-center animate-pulse">Save required before publishing</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-slate-50/50 to-transparent pointer-events-none" />
            </motion.div>

            <AnimatePresence>
                {isPostponing && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-6 bg-amber-50/50 border border-amber-100 rounded-[2rem] flex items-center justify-between gap-6"
                    >
                        <div className="flex-1">
                            <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest ml-1">New Test Date</label>
                            <input 
                                type="date"
                                value={newTestDate}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                onChange={(e) => setNewTestDate(e.target.value)}
                                className="w-full mt-1 bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                        </div>
                        <button 
                            onClick={handlePostponeTest}
                            disabled={syncing}
                            className="px-8 py-4 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all active:scale-95 mt-5"
                        >
                            Confirm Postpone
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── ATTENDANCE PROTOCOL ALERT ───────────────────────── */}
            <AnimatePresence>
                {attendanceStatus === 'missing' && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm mb-6"
                    >
                        <div className="flex items-center gap-4 text-amber-700">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {new Date(test.testDate) > new Date() ? 'Information' : 'Attendance Not Found'}
                                </p>
                                <p className="text-[11px] font-medium opacity-70 mt-1.5">
                                    {new Date(test.testDate) > new Date() 
                                        ? "This test is scheduled for a future date. Attendance will be synced once the test is conducted."
                                        : "We couldn't find an attendance record for this date automatically."
                                    }
                                </p>
                            </div>
                        </div>

                        {!test.isHistorical && new Date(test.testDate) <= new Date() && (
                            <button 
                                onClick={async () => {
                                    setAttendanceLoading(true);
                                    try {
                                        const testDateObj = test.testDate?.toDate ? test.testDate.toDate() : new Date(test.testDate);
                                        const dStr = format(testDateObj, 'yyyy-MM-dd');
                                        const q = query(
                                            collection(db, 'attendance_sessions'),
                                            where('teacherId', '==', user.uid),
                                            where('date', '==', dStr)
                                        );
                                        const snap = await getDocs(q);
                                        setCandidateSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                                        setShowPicker(true);
                                    } catch (e) {
                                        console.error('Error fetching sessions:', e);
                                    } finally {
                                        setAttendanceLoading(false);
                                    }
                                }}
                                className="px-6 py-3 bg-white text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all border border-amber-200 shadow-sm whitespace-nowrap"
                            >
                                {attendanceLoading ? 'Scanning...' : 'Select Session Manually'}
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── SESSION PICKER MODAL (FALLBACK) ────────────────── */}
            <AnimatePresence>
                {showPicker && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPicker(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Select Attendance Session</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Found {candidateSessions.length} sessions for this date</p>
                                </div>
                                <button onClick={() => setShowPicker(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5}/></svg>
                                </button>
                            </div>
                            
                            <div className="p-4 max-h-[400px] overflow-y-auto">
                                {candidateSessions.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                                        No matching sessions found on this date.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {candidateSessions.map(session => (
                                            <button
                                                key={session.id}
                                                onClick={() => {
                                                    const dStr = format(test.testDate?.toDate ? test.testDate.toDate() : new Date(test.testDate), 'yyyy-MM-dd');
                                                    linkAttendanceSession(session.id, testId, dStr);
                                                    setShowPicker(false);
                                                }}
                                                className="w-full p-6 rounded-[1.5rem] border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 flex items-center justify-between group transition-all text-left"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 group-hover:text-violet-600 transition-colors">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth={2} /></svg>
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900 group-hover:text-violet-900 transition-colors">{session.batchName || session.courseName || 'Daily Attendance'}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-violet-500 uppercase tracking-widest bg-violet-100/50 px-2 py-0.5 rounded-full">S{session.semester}</span>
                                                            <span className="text-[10px] font-bold text-slate-400">{session.presentCount || 0} / {session.totalStudents || 0} Present</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-violet-300 group-hover:text-violet-500 transform transition-all group-hover:translate-x-1">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={3} /></svg>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── PERFORMANCE MATRIX (LEDGER) ──────────────────────── */}
            <motion.div variants={item} className="aether-card overflow-hidden">
                <div className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="relative w-full md:w-96 group">
                        <input 
                            type="text" 
                            placeholder="SEARCH STUDENT NAME OR ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-12 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-[#E31E24]/20 transition-all outline-none"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Present only</span>
                            <button 
                                onClick={() => setShowPresentOnly(!showPresentOnly)}
                                className={`w-12 h-6 rounded-full transition-all relative ${showPresentOnly ? 'bg-slate-900' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showPresentOnly ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{applicableResults.length} / {results.length} Students</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Student Information</th>
                                <th className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Attendance</th>
                                <th className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Marks Obtained</th>
                                <th className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Remarks</th>
                                <th className="px-6 py-5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {applicableResults.map((result) => {
                                const isPresent = presentStudentIds.has(result.student);
                                const hasMarks = result.marksObtained !== null;
                                
                                return (
                                     <tr key={result.id} className={`group transition-colors ${!isPresent ? 'bg-red-50/20' : 'hover:bg-slate-50/20'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="font-heading text-sm md:text-base text-slate-900 leading-tight">{result.studentName}</p>
                                                {!isPresent && (
                                                    <span className="text-[7px] font-black bg-red-100 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter w-fit mt-1">Absent Student</span>
                                                )}
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{result.rollNumber || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {attendanceStatus === 'verified' ? (
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md w-fit border ${isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                    <div className={`w-1 h-1 rounded-full ${isPresent ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">{isPresent ? 'Present' : 'Absent'}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Legacy Data</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative flex items-center">
                                                <input 
                                                    type="number" 
                                                    max={test.maxMarks}
                                                    min="0"
                                                    disabled={test.status === 'published' || test.isHistorical || isFutureTest || (!isPresent && marks[result.student]?.marksObtained === '')}
                                                    value={marks[result.student]?.marksObtained ?? ''}
                                                    onChange={(e) => handleMarkChange(result.student, 'marksObtained', e.target.value)}
                                                    className={`w-16 bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm font-black focus:bg-white focus:border-[#E31E24] focus:ring-4 focus:ring-red-50 outline-none transition-all ${hasMarks || marks[result.student]?.marksObtained !== '' ? 'text-slate-900' : 'text-slate-400 placeholder:text-slate-300'} ${!isPresent || isFutureTest ? 'opacity-50' : ''}`}
                                                    placeholder="0"
                                                />
                                                <span className="ml-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">/ {test.maxMarks}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="text" 
                                                    disabled={test.status === 'published' || test.isHistorical || isFutureTest}
                                                    value={marks[result.student]?.remarks ?? ''}
                                                    onChange={(e) => handleMarkChange(result.student, 'remarks', e.target.value)}
                                                    className="flex-1 bg-transparent border-none py-2 text-[11px] text-slate-600 font-bold focus:ring-0 outline-none placeholder:text-slate-200"
                                                    placeholder="Add note..."
                                                />
                                                
                                                {/* LIVE RESULT BADGE */}
                                                {(marks[result.student]?.marksObtained !== '' && marks[result.student]?.marksObtained !== undefined && marks[result.student]?.marksObtained !== null) && (
                                                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm ${
                                                        (parseFloat(marks[result.student].marksObtained) / test.maxMarks * 100) >= 40 
                                                        ? 'bg-emerald-500 text-white' 
                                                        : 'bg-red-500 text-white'
                                                    }`}>
                                                        {marks[result.student]?.remarks === 'ABSENT' ? 'FAIL (ABSENT)' : (parseFloat(marks[result.student].marksObtained) / test.maxMarks * 100) >= 40 ? 'PASS' : 'FAIL'}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {marks[result.student]?.isDirty ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse">Unsaved</span>
                                                    <p className="text-[7px] font-bold text-amber-400 uppercase tracking-tighter">Needs global save</p>
                                                </div>
                                            ) : hasMarks ? (
                                                <div className="flex items-center justify-end gap-2 text-emerald-600">
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Recorded</span>
                                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[10px]">✓</div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2 text-slate-200">
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Pending</span>
                                                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[10px]">?</div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {applicableResults.length === 0 && (
                        <div className="p-20 text-center">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em]">No matching students found</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

function StatPill({ label, value }) {
    return (
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-3 shadow-sm flex flex-col items-center min-w-[120px]">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</span>
            <span className="text-xl font-heading text-slate-900 leading-tight">{value}</span>
        </div>
    );
}
