import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { format, isSunday, startOfMonth, endOfMonth } from 'date-fns';
import { exportMonthlyAttendanceToExcel } from '../../services/attendanceExportService';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from '../../components/common/PremiumSelect';
import { logAudit } from '../../utils/auditLogger';

export default function AttendanceMarking() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);

    // Session State - FULL DAY LOGIC
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [session, setSession] = useState(null); 
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: 'P' | 'A' }
    const [recordIdMap, setRecordIdMap] = useState({});
    const [originalAttendanceMap, setOriginalAttendanceMap] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [requestingUnlock, setRequestingUnlock] = useState(false);
    const [existingRequest, setExistingRequest] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));

    const isToday = date === format(new Date(), 'yyyy-MM-dd');
    const isSundaySelected = isSunday(new Date(date));
    
    // INSTITUTIONAL PHASE LOCK
    // Lock editing if the batch has been promoted beyond this subject's semester
    const isHistorical = selectedClass && (parseInt(selectedClass.semester) < parseInt(selectedClass.currentSemester || 0));
    const isEditable = isToday && (session?.status !== 'LOCKED') && !isHistorical;

    useEffect(() => {
        if (user) fetchMyClasses();
    }, [user]);

    const fetchMyClasses = async () => {
        try {
            const batchMap = new Map();

            // 1. Fetch Subject Assignments
            const assignmentsQ = query(collection(db, 'class_assignments'), where('teacherId', '==', user.uid));
            const assignmentsSnap = await getDocs(assignmentsQ);
            
            // Fetch all active batches for this department to sync semesters
            const activeBatchesSnap = await getDocs(query(collection(db, 'batches'), where('departmentId', '==', user.departmentId), where('status', '==', 'active')));
            const activeBatchesMap = new Map(activeBatchesSnap.docs.map(d => [d.id, d.data()]));

            assignmentsSnap.forEach(d => {
                const data = d.data();
                const id = data.batchId;
                const activeBatch = activeBatchesMap.get(id);
                
                // If it's an active batch, prioritize its CURRENT semester for today's attendance
                const effectiveSemester = (activeBatch && activeBatch.currentSemester) ? activeBatch.currentSemester : data.semester;

                batchMap.set(id, {
                    id,
                    courseId: data.courseId,
                    courseName: data.courseName || data.batchName || 'Batch',
                    semester: String(effectiveSemester),
                    currentSemester: activeBatch?.currentSemester || data.semester,
                    section: data.section || '',
                    departmentId: data.departmentId
                });
            });

            // 2. Fetch Class Teacher Batches (if not already found)
            activeBatchesSnap.docs.forEach(d => {
                if (d.data().classTeacherId === user.uid && !batchMap.has(d.id)) {
                    const data = d.data();
                    batchMap.set(d.id, {
                        id: d.id,
                        courseId: '', // General batch view
                        courseName: data.name,
                        semester: String(data.currentSemester),
                        currentSemester: data.currentSemester,
                        section: '',
                        departmentId: data.departmentId
                    });
                }
            });

            setClasses(Array.from(batchMap.values()));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching classes:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedClass && date) {
            loadSessionData();
        }
    }, [selectedClass, date]);

    const loadSessionData = async () => {
        setLoading(true);
        setSession(null);
        setStudents([]);
        setAttendanceMap({});
        try {
            // 1. Fetch Fresh Roster
            const studentsQuery = query(
                collection(db, 'users'),
                where('batchId', '==', selectedClass.id)
            );

            const studentSnap = await getDocs(studentsQuery);
            const roster = studentSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name,
                    rollNumber: data.rollNumber || data.enrollmentNumber || '',
                    nocStatus: data.nocStatus || 'pending',
                    fatherName: data.fatherName || 'N/A',
                    phone: data.phone || '',
                    parentPhone: data.parentPhone || '',
                    attendancePercent: data.attendanceStats?.overallPercentage || '0',
                    totalSessions: data.attendanceStats?.totalSessions || 0,
                    presentSessions: data.attendanceStats?.presentSessions || 0,
                    status: data.status,
                    role: data.role
                };
            }).filter(s => 
                (s.role?.toLowerCase() === 'student' || s.role?.toLowerCase() === 'president 👑' || s.role?.toLowerCase() === 'representative') && 
                (s.status?.toLowerCase() === 'active')
            ).sort((a, b) => {
                if (a.rollNumber && b.rollNumber) return a.rollNumber.localeCompare(b.rollNumber);
                return a.name.localeCompare(b.name);
            });

            // 2. Fetch Session Data
            const sessionQuery = query(
                collection(db, 'attendance_sessions'),
                where('courseId', '==', selectedClass.courseId || ''),
                where('semester', '==', selectedClass.semester),
                where('section', '==', selectedClass.section || ''),
                where('date', '==', date)
            );

            const sessionSnap = await getDocs(sessionQuery);
            const initialMap = {};
            const recordIds = {};

            // Initialize every student as Absent
            roster.forEach(s => initialMap[s.id] = 'A');

            if (!sessionSnap.empty) {
                const sessionDoc = sessionSnap.docs[0];
                setSession({ id: sessionDoc.id, ...sessionDoc.data() });

                // 3. Overlay Records
                const recordsQuery = query(collection(db, 'attendance_records'), where('sessionId', '==', sessionDoc.id));
                const recordsSnap = await getDocs(recordsQuery);
                
                recordsSnap.forEach(r => {
                    const data = r.data();
                    if (initialMap.hasOwnProperty(data.studentId)) {
                        const s = data.status === 'PRESENT' ? 'P' : 'A';
                        initialMap[data.studentId] = s;
                        recordIds[data.studentId] = r.id;
                    }
                });
                // 4. Check for existing unlock requests
                const reqQuery = query(
                    collection(db, 'attendance_unlock_requests'),
                    where('sessionId', '==', sessionDoc.id),
                    where('status', '==', 'PENDING')
                );
                const reqSnap = await getDocs(reqQuery);
                if (!reqSnap.empty) {
                    setExistingRequest({ id: reqSnap.docs[0].id, ...reqSnap.docs[0].data() });
                }
            }

            setStudents(roster);
            setAttendanceMap({ ...initialMap });
            setOriginalAttendanceMap({ ...initialMap });
            setRecordIdMap(recordIds);
        } catch (error) {
            console.error('Attendance Loading Error:', error);
            toast.error('Failed to load roster data');
        } finally {
            setLoading(false);
        }
    };


    const toggleStatus = (studentId) => {
        if (!isEditable) return;
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'P' ? 'A' : 'P'
        }));
    };

    const markAll = (status) => {
        if (!isEditable) return;
        const newMap = {};
        students.forEach(s => newMap[s.id] = status);
        setAttendanceMap(newMap);
    };

    const calculateStats = () => {
        const total = students.length;
        if (total === 0) return { total: 0, present: 0, percent: 0 };
        const present = Object.values(attendanceMap).filter(s => s === 'P').length;
        const percent = ((present / total) * 100).toFixed(1);
        return { total, present, percent };
    };

    const handleSubmit = async () => {
        if (!window.confirm('Submitting will LOCK the attendance for this day. Continue?')) return;

        setSubmitting(true);
        try {
            const stats = calculateStats();
            const batch = writeBatch(db);

            let sessionRef;
            if (session?.id) {
                sessionRef = doc(db, 'attendance_sessions', session.id);
                batch.update(sessionRef, {
                    totalStudents: stats.total,
                    presentCount: stats.present,
                    lockedAt: serverTimestamp(),
                    status: 'LOCKED',
                    teacherId: user.uid,
                    teacherName: user.name,
                    batchId: selectedClass.id, // Link to specific batch
                    batchName: selectedClass.courseName || '', // Store readable name for fallback search
                    courseName: selectedClass.courseName || ''
                });
            } else {
                sessionRef = doc(collection(db, 'attendance_sessions'));
                batch.set(sessionRef, {
                    date,
                    type: 'FULL_DAY',
                    startTime: serverTimestamp(),
                    batchId: selectedClass.id, // Explicit link to batch
                    courseId: selectedClass.courseId || '',
                    semester: selectedClass.semester,
                    section: selectedClass.section || '',
                    teacherId: user.uid,
                    teacherName: user.name,
                    status: 'LOCKED',
                    totalStudents: stats.total,
                    presentCount: stats.present,
                    batchName: selectedClass.courseName || '', // Metadata for search resilience
                    courseName: selectedClass.courseName || '',
                    createdAt: serverTimestamp(),
                    lockedAt: serverTimestamp()
                });
            }

            students.forEach(student => {
                const existingRecordId = recordIdMap[student.id];
                
                // Smart Status Detection
                let currentMark;
                if (student.nocStatus === 'cleared' || student.nocStatus === 'approved') {
                    currentMark = 'NOC';
                } else {
                    currentMark = attendanceMap[student.id] === 'P' ? 'PRESENT' : 'ABSENT';
                }

                const originalMarkStr = originalAttendanceMap[student.id] ? (originalAttendanceMap[student.id] === 'P' ? 'PRESENT' : (originalAttendanceMap[student.id] === 'NOC' ? 'NOC' : 'ABSENT')) : null;
                // If the original record was fetched from DB, it might already be 'NOC'
                const originalMark = originalAttendanceMap[student.id] === 'NOC' ? 'NOC' : originalMarkStr;

                // 1. Update Attendance Record
                if (existingRecordId) {
                    batch.update(doc(db, 'attendance_records', existingRecordId), {
                        status: currentMark,
                        markedBy: user.uid,
                        timestamp: serverTimestamp()
                    });
                } else {
                    const recordRef = doc(collection(db, 'attendance_records'));
                    batch.set(recordRef, {
                        sessionId: sessionRef.id,
                        studentId: student.id,
                        studentName: student.name,
                        rollNumber: student.rollNumber || '',
                        date,
                        courseId: selectedClass.courseId,
                        semester: selectedClass.semester,
                        status: currentMark,
                        markedBy: user.uid,
                        timestamp: serverTimestamp()
                    });
                }

                // 2. Update Student User Stats
                let newTotal = student.totalSessions || 0;
                let newPresent = student.presentSessions || 0;

                // Logic: Only increment TOTAL if this is the FIRST time we are LOCKING this day.
                // If the session was already locked, we are just EDITING, so we only adjust Present count.
                const isFinalizingFirstTime = !session?.status || session.status !== 'LOCKED';

                if (isFinalizingFirstTime) {
                    newTotal += 1;
                    if (currentMark === 'PRESENT' || currentMark === 'NOC') newPresent += 1;
                } else if (originalMark !== currentMark) {
                    // It was already locked, but we changed a status
                    const wasEffectivelyPresent = originalMark === 'PRESENT' || originalMark === 'NOC';
                    const isEffectivelyPresent = currentMark === 'PRESENT' || currentMark === 'NOC';

                    if (!wasEffectivelyPresent && isEffectivelyPresent) {
                        newPresent += 1;
                    } else if (wasEffectivelyPresent && !isEffectivelyPresent) {
                        newPresent -= 1;
                    }
                }

                // Defensive fix: If total is 0 but records exist, force 1 (Recovery)
                if (newTotal === 0 && currentMark) newTotal = 1;

                const newPercent = newTotal > 0 ? ((newPresent / newTotal) * 100).toFixed(2) : '0.00';

                batch.update(doc(db, 'users', student.id), {
                    'attendanceStats.totalSessions': newTotal,
                    'attendanceStats.presentSessions': newPresent,
                    'attendanceStats.overallPercentage': newPercent,
                    'attendanceStats.lastUpdated': serverTimestamp()
                });
            });

            await batch.commit();

            // 4. Create Standardized Audit Log
            await logAudit(user, 'MARK_ATTENDANCE', sessionRef.id, 'ATTENDANCE', `${selectedClass.courseName} (S${selectedClass.semester})`, {
                date,
                presentCount: stats.present,
                totalStudents: stats.total
            }, `Marked attendance for ${stats.total} students (${stats.present} Present)`);

            toast.success('Attendance Finalized Successfully');
            loadSessionData();
        } catch (error) {
            console.error('Error submitting:', error);
            toast.error('Failed to submit attendance');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeclareHoliday = async () => {
        if (!window.confirm('Are you sure you want to declare this day as an Institutional Holiday? All students will be marked. Continuation will LOCK this day.')) return;
        
        setSubmitting(true);
        try {
            const batch = writeBatch(db);
            const sessionRef = doc(collection(db, 'attendance_sessions'));
            
            // 1. Create Session
            batch.set(sessionRef, {
                date,
                type: 'HOLIDAY',
                batchId: selectedClass.id,
                courseId: selectedClass.courseId || '',
                semester: selectedClass.semester,
                section: selectedClass.section || '',
                teacherId: user.uid,
                teacherName: user.name,
                status: 'LOCKED',
                totalStudents: students.length,
                presentCount: 0,
                createdAt: serverTimestamp(),
                lockedAt: serverTimestamp()
            });

            // 2. Mark Records
            students.forEach(student => {
                const recordRef = doc(collection(db, 'attendance_records'));
                batch.set(recordRef, {
                    sessionId: sessionRef.id,
                    studentId: student.id,
                    studentName: student.name,
                    rollNumber: student.rollNumber || '',
                    date,
                    courseId: selectedClass.courseId,
                    semester: selectedClass.semester,
                    status: 'HOLIDAY',
                    markedBy: user.uid,
                    timestamp: serverTimestamp()
                });
            });

            await batch.commit();
            await logAudit(user, 'DECLARE_HOLIDAY', sessionRef.id, 'ATTENDANCE', `${selectedClass.courseName}`, { date }, `Declared holiday for ${date}`);
            toast.success('Holiday Declared Successfully');
            loadSessionData();
        } catch (error) {
            console.error('Holiday Error:', error);
            toast.error('Failed to declare holiday');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportExcel = async (exportMonth = new Date()) => {
        if (!selectedClass) return;
        setExporting(true);
        try {
            // Fetch all records for this month and batch
            const start = format(startOfMonth(exportMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(exportMonth), 'yyyy-MM-dd');
            
            const q = query(
                collection(db, 'attendance_records'),
                where('courseId', '==', selectedClass.courseId || ''),
                where('semester', '==', selectedClass.semester),
                where('date', '>=', start),
                where('date', '<=', end)
            );
            
            const snap = await getDocs(q);
            const records = snap.docs.map(d => d.data());
            
            await exportMonthlyAttendanceToExcel(selectedClass, exportMonth, students, records);
            toast.success('Report generated successfully');
        } catch (error) {
            console.error('Export Error:', error);
            toast.error('Failed to generate Excel report');
        } finally {
            setExporting(false);
        }
    };

    const handleRequestUnlock = async () => {
        const reason = window.prompt('Please provide a reason for unlocking this attendance session:');
        if (!reason) return;

        setRequestingUnlock(true);
        try {
            await addDoc(collection(db, 'attendance_unlock_requests'), {
                sessionId: session.id,
                teacherId: user.uid,
                teacherName: user.name,
                departmentId: user.departmentId,
                batchId: selectedClass.id,
                batchName: selectedClass.courseName,
                date: date,
                reason: reason,
                status: 'PENDING',
                createdAt: serverTimestamp()
            });

            toast.success('Unlock request submitted to HOD');
            loadSessionData();
        } catch (error) {
            console.error('Error requesting unlock:', error);
            toast.error('Failed to submit request');
        } finally {
            setRequestingUnlock(false);
        }
    };


    const statsData = calculateStats();

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Daily Attendance</h2>
                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Live Batch Sync • Faculty Control
                    </p>
                </div>
                
                <AnimatePresence mode="wait">
                    {students.length > 0 && isToday && session?.status !== 'LOCKED' && !isHistorical && (
                        <motion.div
                            key={`save-actions-${session?.id || 'new'}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-3"
                        >
                            <button
                                onClick={handleDeclareHoliday}
                                disabled={submitting}
                                className="bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-amber-200/40 hover:bg-amber-600 font-black uppercase tracking-widest text-[9px] flex items-center gap-2 active:scale-95 transition-all outline-none"
                            >
                                🏝️ Holiday
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-[#E31E24] text-white px-6 py-3 rounded-xl shadow-lg shadow-red-200/40 hover:bg-red-700 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 active:scale-95 transition-all outline-none"
                            >
                                {submitting ? (
                                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Save & Lock
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sunday / Holiday Legend Alert */}
            {isSundaySelected && !session && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Sunday Detected</p>
                        <p className="text-[9px] font-bold text-amber-600 uppercase">This day is identified as a weekend. You can still declare it as a holiday or mark attendance if needed.</p>
                    </div>
                </div>
            )}

            {/* Config Hub */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                <PremiumSelect 
                    label="Select Your Class"
                    placeholder="Select Class"
                    value={selectedClass ? JSON.stringify(selectedClass) : ''}
                    onChange={e => {
                        const val = e.target.value;
                        setSelectedClass(val ? JSON.parse(val) : null);
                    }}
                    options={classes.map(c => ({
                        label: `${c.courseName} S${c.semester}${c.section ? ` - ${c.section}` : ''}`,
                        value: JSON.stringify(c)
                    }))}
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" /></svg>}
                />

                <div className="flex flex-col gap-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Attendance Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-xl text-xs font-black text-gray-900 outline-none transition-all focus:ring-4 focus:ring-violet-50 focus:border-violet-200 hover:bg-gray-100/50 cursor-pointer"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            max={format(new Date(), 'yyyy-MM-dd')}
                        />
                    </div>
                </div>
            </div>

            {selectedClass ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Status Ribbon */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-violet-50/50 backdrop-blur-md p-6 rounded-[2rem] border border-violet-100 gap-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                session?.status === 'LOCKED' ? (session.type === 'HOLIDAY' ? 'bg-amber-500 text-white border-amber-400' : 'bg-red-500 text-white border-red-400') : isToday ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-gray-200 text-gray-600 border-gray-300'
                            }`}>
                                {session?.status === 'LOCKED' ? (session.type === 'HOLIDAY' ? 'HOLIDAY' : 'LOCKED') : isToday ? 'OPEN' : 'READ-ONLY'}
                            </div>
                            
                            {isEditable && (
                                <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-violet-100">
                                    <button 
                                        onClick={() => markAll('P')}
                                        className="text-[9px] font-black text-emerald-600 px-4 py-2 hover:bg-emerald-50 rounded-lg transition-colors uppercase tracking-widest"
                                    >
                                        Mark All Present
                                    </button>
                                    <div className="w-px h-4 bg-violet-100" />
                                    <button 
                                        onClick={() => markAll('A')}
                                        className="text-[9px] font-black text-red-600 px-4 py-2 hover:bg-red-50 rounded-lg transition-colors uppercase tracking-widest"
                                    >
                                        Mark All Absent
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Students Present</p>
                                <p className="text-xl font-black text-gray-900 tracking-tighter">{statsData.present} <span className="text-gray-300">/</span> {statsData.total}</p>
                            </div>
                            <div className="w-px h-10 bg-violet-100" />
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Percentage</p>
                                <p className="text-xl font-black text-violet-600 tracking-tighter">{statsData.percent}%</p>
                            </div>
                        </div>
                    </div>
                    {/* Tabular Attendance View */}
                    <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 overflow-hidden min-h-[400px]">
                        {students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-[1.5rem] flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-black text-gray-900">No Students Found</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight max-w-xs mt-2">Please select a class or check if students are enrolled in this batch.</p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Optimized Dense View */}
                                <div className="block md:hidden">
                                     {/* Mock Admin Header for Mobile Theme Consistency */}
                                     <div className="bg-[#E31E24] p-3 text-center mb-1">
                                         <div className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Attendance Management System</div>
                                     </div>

                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-tighter w-10 text-center">Sr.</th>
                                                <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-tighter">Student / %</th>
                                                <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-tighter">Father / Contact</th>
                                                <th className="p-3 text-[9px] font-black text-gray-400 uppercase tracking-tighter text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {students.map((student, idx) => {
                                                const isPresent = attendanceMap[student.id] === 'P';
                                                const isNoc = student.nocStatus === 'cleared' || student.nocStatus === 'approved';
                                                return (
                                                    <tr key={student.id} className={`${isNoc ? 'bg-violet-50/50' : !isPresent ? 'bg-red-50/10' : ''}`}>
                                                        <td className="p-3 text-[10px] font-black text-gray-400 text-center border-r border-gray-50">{idx + 1}</td>
                                                        <td className="p-3 border-r border-gray-50">
                                                            <div className="text-[11px] font-black text-gray-900 leading-tight uppercase tracking-tighter">{student.name}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 mt-1">{student.rollNumber} / {student.attendancePercent}%</div>
                                                        </td>
                                                        <td className="p-3 border-r border-gray-50">
                                                            <div className="text-[10px] font-bold text-gray-700 leading-tight uppercase">{student.fatherName}</div>
                                                            <div className="text-[9px] font-bold text-gray-400 mt-0.5">({student.parentPhone || student.phone || 'N/A'})</div>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                onClick={() => !isNoc && toggleStatus(student.id)}
                                                                disabled={!isEditable || isNoc}
                                                                className={`
                                                                    w-10 h-10 rounded-lg flex items-center justify-center font-black text-[10px] transition-all
                                                                    ${isNoc 
                                                                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                                                                        : isPresent 
                                                                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' 
                                                                            : 'bg-red-500 text-white shadow-sm shadow-red-200'}
                                                                    ${(!isEditable || isNoc) ? 'opacity-90 cursor-default' : 'active:scale-90'}
                                                                `}
                                                            >
                                                                {isNoc ? 'NOC' : isPresent ? 'P' : 'A'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Desktop Premium View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead>
                                            <tr className="bg-gray-50/20">
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Student Details / %</th>
                                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Father Name / Contact</th>
                                                <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">NOC Status</th>
                                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Attendance (A / P)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white/30 backdrop-blur-sm">
                                            {students.map((student, idx) => {
                                                const isPresent = attendanceMap[student.id] === 'P';
                                                const isNoc = student.nocStatus === 'cleared' || student.nocStatus === 'approved';
                                                return (
                                                    <tr key={student.id} className={`transition-all group hover:bg-gray-50/50 ${isNoc ? 'bg-violet-50/40' : !isPresent ? 'bg-red-50/20' : ''}`}>
                                                        <td className="px-8 py-3 whitespace-nowrap border-r border-gray-50">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[9px] transition-colors ${
                                                                    isPresent ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                                }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div>
                                                                    <div className="text-[13px] font-black text-gray-900 tracking-tight">{student.name}</div>
                                                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{student.rollNumber} / {student.attendancePercent}%</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-3 whitespace-nowrap border-r border-gray-50">
                                                            <div className="text-[10px] font-black text-gray-700 leading-tight uppercase tracking-tight">{student.fatherName}</div>
                                                            <div className="text-[9px] font-bold text-gray-400 mt-0.5">({student.parentPhone || student.phone || 'N/A'})</div>
                                                        </td>
                                                        <td className="px-8 py-3 text-center whitespace-nowrap border-r border-gray-50">
                                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                                student.nocStatus === 'cleared' 
                                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                                    : 'bg-orange-50 text-orange-600 border-orange-100'
                                                            }`}>
                                                                {student.nocStatus === 'cleared' ? 'CLEARED' : 'PENDING'}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-3 text-right whitespace-nowrap">
                                                            <button
                                                                onClick={() => !isNoc && toggleStatus(student.id)}
                                                                disabled={!isEditable || isNoc}
                                                                className={`
                                                                    w-12 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all 
                                                                    ml-auto shadow-sm border-2
                                                                    ${isNoc
                                                                        ? 'bg-violet-600 text-white border-violet-400 shadow-violet-200'
                                                                        : isPresent 
                                                                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-200' 
                                                                            : 'bg-red-500 text-white border-red-400 shadow-red-200'}
                                                                    ${(!isEditable || isNoc) ? 'opacity-90 cursor-default grayscale-0' : 'hover:scale-105 active:scale-90'}
                                                                `}
                                                            >
                                                                {isNoc ? 'NOC' : isPresent ? 'P' : 'A'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Locked Actions Overlay */}
                    {session?.status === 'LOCKED' && (
                        <div className="bg-gray-900/5 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-200/50 flex items-center gap-6 mb-12">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-gray-900 text-lg tracking-tight leading-none mb-1">Attendance Locked & Secure</h4>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Attendance locked on {format(new Date(date), 'dd MMM yyyy')}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                {existingRequest ? (
                                    <div className="px-5 py-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Request Pending HOD Approval</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleRequestUnlock}
                                        disabled={requestingUnlock}
                                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Request Unlock
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    {/* Reporting Hub */}
                    <div className="bg-slate-900 p-8 md:p-10 rounded-[2.5rem] mt-12 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1">Monthly Command Registry</h3>
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Generate comprehensive Institutional Reports (Excel)</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest ml-1">Select Month</label>
                                    <input
                                        type="month"
                                        value={exportMonth}
                                        onChange={e => setExportMonth(e.target.value)}
                                        max={format(new Date(), 'yyyy-MM')}
                                        className="px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white text-[11px] font-bold outline-none focus:ring-2 focus:ring-white/20 cursor-pointer"
                                    />
                                </div>
                                <button
                                    onClick={() => handleExportExcel(new Date(exportMonth + '-01'))}
                                    disabled={exporting || !selectedClass}
                                    className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 self-end"
                                >
                                    {exporting ? 'Processing...' : 'Download Matrix'}
                                    {!exporting && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="bg-gray-50/50 rounded-[3rem] p-24 text-center border-4 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-sm text-gray-300 mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Select a class from above to start taking attendance</p>
                </div>
            )}
        </div>
    );
}

