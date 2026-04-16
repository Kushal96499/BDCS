import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from '../../components/common/PremiumSelect';

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
    const [recordIdMap, setRecordIdMap] = useState({}); // { studentId: docId }
    const [submitting, setSubmitting] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null); 

    const isToday = date === format(new Date(), 'yyyy-MM-dd');
    const isEditable = isToday && (session?.status !== 'LOCKED');

    useEffect(() => {
        if (user) fetchMyClasses();
    }, [user]);

    const fetchMyClasses = async () => {
        try {
            const q = query(collection(db, 'class_assignments'), where('teacherId', '==', user.uid));
            const snap = await getDocs(q);
            const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const uniqueBatches = [];
            const seen = new Set();

            assignments.forEach(a => {
                const batchId = a.batchId || a.id;
                const key = `${batchId}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueBatches.push({
                        id: batchId,
                        courseId: a.courseId,
                        courseName: a.courseName || a.batchName || 'Batch',
                        semester: a.semester,
                        section: a.section || '',
                        departmentId: a.departmentId
                    });
                }
            });

            setClasses(uniqueBatches);
            setLoading(false);
        } catch (error) {
            console.error('Error classes:', error);
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
        setRequestStatus(null);

        try {
            const sessionQuery = query(
                collection(db, 'attendance_sessions'),
                where('courseId', '==', selectedClass.courseId || ''),
                where('semester', '==', selectedClass.semester),
                where('section', '==', selectedClass.section || ''),
                where('date', '==', date)
            );

            const sessionSnap = await getDocs(sessionQuery);

            if (!sessionSnap.empty) {
                const sessionDoc = sessionSnap.docs[0];
                setSession({ id: sessionDoc.id, ...sessionDoc.data() });

                const recordsQuery = query(collection(db, 'attendance_records'), where('sessionId', '==', sessionDoc.id));
                const recordsSnap = await getDocs(recordsQuery);
                const records = recordsSnap.docs.map(d => ({ docId: d.id, ...d.data() }));

                const initialMap = {};
                const recordIds = {};

                const studentList = records.map(r => ({
                    id: r.studentId,
                    name: r.studentName,
                    rollNumber: r.rollNumber || r.enrollmentNumber || 'N/A'
                }));

                records.forEach(r => {
                    initialMap[r.studentId] = r.status === 'PRESENT' ? 'P' : 'A';
                    recordIds[r.studentId] = r.docId;
                });

                setStudents(studentList);
                setAttendanceMap(initialMap);
                setRecordIdMap(recordIds);
            } else {
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student'),
                    where('batchId', '==', selectedClass.id),
                    where('status', '==', 'active')
                );

                const studentSnap = await getDocs(studentsQuery);
                const studentList = studentSnap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        name: data.name,
                        rollNumber: data.rollNumber || data.enrollmentNumber || 'N/A'
                    };
                }).filter(s => s.academicStatus !== 'BACKLOG' && s.academicStatus !== 'REPEAT_YEAR');

                setStudents(studentList);
                const initialMap = {};
                studentList.forEach(s => initialMap[s.id] = 'A');
                setAttendanceMap(initialMap);
                setRecordIdMap({});
            }
        } catch (error) {
            console.error('Attendance Loading Error:', error);
            toast.error('Failed to load session data');
        } finally {
            setLoading(false);
        }
    };

    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        if (!selectedClass || !date) return;

        const q = query(
            collection(db, 'attendance_unlock_requests'),
            where('batchId', '==', selectedClass.id),
            where('date', '==', date)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(d => d.data());
            setRequestCount(requests.length);
            const latest = requests.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())[0];

            if (latest) {
                if (latest.status !== requestStatus) {
                    if (latest.status === 'APPROVED' && requestStatus === 'PENDING') {
                        toast.success('Unlock Request APPROVED!');
                        loadSessionData();
                    } else if (latest.status === 'REJECTED' && requestStatus === 'PENDING') {
                        toast.error('Unlock Request REJECTED.');
                    }
                }
                setRequestStatus(latest.status);
            } else {
                setRequestStatus(null);
            }
        });

        return () => unsubscribe();
    }, [selectedClass, date, requestStatus]);

    const toggleAttendance = (studentId, status) => {
        if (!isEditable) return;
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: status === 'PRESENT' ? 'P' : 'A'
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
                    teacherName: user.name
                });
            } else {
                sessionRef = doc(collection(db, 'attendance_sessions'));
                batch.set(sessionRef, {
                    date,
                    type: 'FULL_DAY',
                    startTime: serverTimestamp(),
                    courseId: selectedClass.courseId || '',
                    semester: selectedClass.semester,
                    section: selectedClass.section || '',
                    teacherId: user.uid,
                    teacherName: user.name,
                    status: 'LOCKED',
                    totalStudents: stats.total,
                    presentCount: stats.present,
                    createdAt: serverTimestamp(),
                    lockedAt: serverTimestamp()
                });
            }

            students.forEach(student => {
                const existingRecordId = recordIdMap[student.id];
                const status = attendanceMap[student.id] === 'P' ? 'PRESENT' : 'ABSENT';

                if (existingRecordId) {
                    batch.update(doc(db, 'attendance_records', existingRecordId), {
                        status: status,
                        markedBy: user.uid,
                        timestamp: serverTimestamp()
                    });
                } else {
                    const recordRef = doc(collection(db, 'attendance_records'));
                    batch.set(recordRef, {
                        sessionId: sessionRef.id,
                        studentId: student.id,
                        studentName: student.name,
                        rollNumber: student.rollNumber,
                        date,
                        courseId: selectedClass.courseId,
                        semester: selectedClass.semester,
                        status: status,
                        markedBy: user.uid,
                        timestamp: serverTimestamp()
                    });
                }
            });

            await batch.commit();
            toast.success('Attendance Locked Successfully');
            loadSessionData();
        } catch (error) {
            console.error('Error submitting:', error);
            toast.error('Failed to submit attendance');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestEdit = async () => {
        if (!session || !selectedClass) return;
        try {
            await addDoc(collection(db, 'attendance_unlock_requests'), {
                type: 'UNLOCK_ATTENDANCE',
                sessionId: session.id,
                batchId: selectedClass.id,
                batchName: selectedClass.courseName || 'Batch',
                date: date,
                teacherId: user.uid,
                teacherName: user.name,
                campusId: user.campusId,
                collegeId: user.collegeId,
                departmentId: user.departmentId,
                status: 'PENDING',
                createdAt: serverTimestamp()
            });
            setRequestStatus('PENDING');
            toast.success('Unlock request sent to Principal');
        } catch (error) {
            console.error('Error requesting unlock:', error);
            toast.error('Failed to send request');
        }
    };

    const statsData = calculateStats();

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Attendance Ledger</h2>
                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        Live Batch Sync • Faculty Control
                    </p>
                </div>
                
                <AnimatePresence>
                    {isToday && (!session || session.status !== 'LOCKED') && students.length > 0 && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-[#E31E24] text-white px-8 py-3.5 rounded-2xl shadow-xl shadow-red-200/50 hover:bg-red-700 font-black uppercase tracking-widest text-xs flex items-center gap-3 active:scale-95 transition-all border border-white/20"
                        >
                            {submitting ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Execute Daily Lock
                                </>
                            )}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Config Hub */}
            <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                <PremiumSelect 
                    label="Batch Authority"
                    placeholder="Identify Target Batch"
                    value={selectedClass ? JSON.stringify(selectedClass) : ''}
                    onChange={e => {
                        const val = e.target.value;
                        setSelectedClass(val ? JSON.parse(val) : null);
                    }}
                    options={classes.map(c => ({
                        label: `${c.courseName} S${c.semester}${c.section ? ` - ${c.section}` : ''}`,
                        value: JSON.stringify(c)
                    }))}
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" /></svg>}
                />

                <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Temporal Marker</label>
                    <div className="relative group">
                        <input
                            type="date"
                            className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-black text-gray-900 outline-none transition-all focus:ring-4 focus:ring-violet-50 focus:border-violet-300 hover:bg-gray-50/50 cursor-pointer"
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
                                session?.status === 'LOCKED' ? 'bg-red-500 text-white border-red-400' : isToday ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-gray-200 text-gray-600 border-gray-300'
                            }`}>
                                {session?.status === 'LOCKED' ? `LOCKED` : isToday ? 'OPEN' : 'READ-ONLY'}
                            </div>
                            
                            {isEditable && (
                                <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-violet-100">
                                    <button 
                                        onClick={() => markAll('P')}
                                        className="text-[9px] font-black text-emerald-600 px-4 py-2 hover:bg-emerald-50 rounded-lg transition-colors uppercase tracking-widest"
                                    >
                                        Mass Present
                                    </button>
                                    <div className="w-px h-4 bg-violet-100" />
                                    <button 
                                        onClick={() => markAll('A')}
                                        className="text-[9px] font-black text-red-600 px-4 py-2 hover:bg-red-50 rounded-lg transition-colors uppercase tracking-widest"
                                    >
                                        Mass Absent
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Density</p>
                                <p className="text-xl font-black text-gray-900 tracking-tighter">{statsData.present} <span className="text-gray-300">/</span> {statsData.total}</p>
                            </div>
                            <div className="w-px h-10 bg-violet-100" />
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Yield</p>
                                <p className="text-3xl font-black text-violet-600 tracking-tighter">{statsData.percent}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Student List Grid */}
                    <div className="bg-white/50 rounded-[2.5rem] border border-gray-100 overflow-hidden min-h-[400px]">
                        {students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-[1.5rem] flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-black text-gray-900">No Roster Isolated</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight max-w-xs mt-2">Verify batch configuration or enrollment status in faculty portal.</p>
                            </div>
                        ) : (
                            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {students.map((student, idx) => {
                                    const isPresent = attendanceMap[student.id] === 'P';
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.02 }}
                                            key={student.id}
                                            className={`relative group p-6 rounded-[2rem] border transition-all duration-300 overflow-hidden ${
                                                isPresent ? 'bg-white border-gray-100 shadow-sm' : 'bg-red-50 border-red-100 shadow-sm shadow-red-100'
                                            }`}
                                        >
                                            <div className="relative z-10 flex flex-col gap-5">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-colors duration-500 ${
                                                        isPresent ? 'bg-violet-50 text-violet-600' : 'bg-red-500 text-white'
                                                    }`}>
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-black text-gray-900 truncate tracking-tight">{student.name}</h4>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 opacity-60 truncate">{student.rollNumber}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 p-1.5 bg-gray-50/50 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                                                    <button
                                                        onClick={() => toggleAttendance(student.id, 'PRESENT')}
                                                        disabled={!isEditable}
                                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            isPresent ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                                                        } ${!isEditable ? 'cursor-not-allowed' : ''}`}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        onClick={() => toggleAttendance(student.id, 'ABSENT')}
                                                        disabled={!isEditable}
                                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            !isPresent ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                                                        } ${!isEditable ? 'cursor-not-allowed' : ''}`}
                                                    >
                                                        Absent
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full blur-2xl transition-opacity duration-700 ${isPresent ? 'bg-violet-500/10' : 'bg-red-500/20'}`} />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Locked Actions Overlay */}
                    {session?.status === 'LOCKED' && (
                        <div className="bg-gray-900/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-gray-200/50 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-xl">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 text-lg tracking-tight leading-none mb-1">Session Vault Protected</h4>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Attendance locked on {format(new Date(date), 'dd MMM yyyy')}</p>
                                </div>
                            </div>

                            {requestStatus === 'PENDING' ? (
                                <div className="px-8 py-4 bg-amber-50 text-amber-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-amber-200 flex items-center gap-3 shadow-lg shadow-amber-100">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                    Awaiting Presidential Approval
                                </div>
                            ) : (
                                <button
                                    onClick={handleRequestEdit}
                                    className="px-8 py-4 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 hover:bg-gray-900 hover:text-white transition-all shadow-xl group flex items-center gap-3 active:scale-95"
                                >
                                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                        <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Request Vault Unlock
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            ) : (
                <div className="bg-gray-50/50 rounded-[3rem] p-24 text-center border-4 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-sm text-gray-300 mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Identify batch authorization to initiate marking</p>
                </div>
            )}
        </div>
    );
}
