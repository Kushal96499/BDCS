import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { format } from 'date-fns';

export default function AttendanceMarking() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);

    // Session State - FULL DAY LOGIC (No Period)
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [session, setSession] = useState(null); // Existing session if found
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: 'P' | 'A' }
    const [recordIdMap, setRecordIdMap] = useState({}); // { studentId: docId }
    const [submitting, setSubmitting] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null); // 'PENDING' | 'APPROVED' | 'REJECTED' | null

    useEffect(() => {
        if (user) fetchMyClasses();
    }, [user]);

    const fetchMyClasses = async () => {
        try {
            // Get assignments where teacherId == me
            // Teacher might have multiple subjects for SAME batch. We need UNIQUE batches.
            const q = query(collection(db, 'class_assignments'), where('teacherId', '==', user.uid));
            const snap = await getDocs(q);
            const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Deduplicate by Course + Sem + Section
            const uniqueBatches = [];
            const seen = new Set();

            assignments.forEach(a => {
                const section = a.section || '';
                const batchId = a.batchId || a.id;
                const key = `${batchId}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueBatches.push({
                        id: batchId,
                        courseId: a.courseId,
                        courseName: a.courseName || a.batchName || 'Batch',
                        semester: a.semester,
                        section: section,
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

    // When Class/Date changes, check for existing session or load students
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
            // 1. Check if session exists (Batch + Date) - ONE per day per batch
            // NO Subject Check
            const sessionQuery = query(
                collection(db, 'attendance_sessions'),
                where('courseId', '==', selectedClass.courseId || ''),
                where('semester', '==', selectedClass.semester), // semester is usually string or number in db
                where('section', '==', selectedClass.section || ''),
                where('date', '==', date)
            );

            const sessionSnap = await getDocs(sessionQuery);

            if (!sessionSnap.empty) {
                // SESSION EXISTS - Load it
                const sessionDoc = sessionSnap.docs[0];
                setSession({ id: sessionDoc.id, ...sessionDoc.data() });

                // Load records
                const recordsQuery = query(collection(db, 'attendance_records'), where('sessionId', '==', sessionDoc.id));
                const recordsSnap = await getDocs(recordsQuery);
                const records = recordsSnap.docs.map(d => d.data());

                // Map records to state
                const initialMap = {};
                const recordIds = {}; // New: Store Record IDs to prevent duplicates

                // Reconstruct student list from records to ensure consistency
                const studentList = records.map(r => ({
                    id: r.studentId,
                    name: r.studentName,
                    enrollmentNumber: r.enrollmentNumber
                }));

                records.forEach(r => {
                    initialMap[r.studentId] = r.status === 'PRESENT' ? 'P' : 'A';
                    recordIds[r.studentId] = r.recordId; // Store Firestore Doc ID if available, or we might need to fetch it differently if not in data()
                });

                // NOTE: recordsSnap.docs.map(d => d.data()) only gives data. needed d.id
                const mappedRecords = recordsSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
                mappedRecords.forEach(r => {
                    recordIds[r.studentId] = r.docId;
                });

                setStudents(studentList);
                setAttendanceMap(initialMap);
                setRecordIdMap(recordIds); // Need to add this state

            } else {
                // NEW SESSION - Fetch Students for this Batch
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student'),
                    where('batchId', '==', selectedClass.id),
                    where('status', '==', 'active')
                );

                const studentSnap = await getDocs(studentsQuery);
                const studentList = studentSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(s => s.academicStatus !== 'BACKLOG' && s.academicStatus !== 'REPEAT_YEAR');

                setStudents(studentList);

                // Default Absent
                const initialMap = {};
                studentList.forEach(s => initialMap[s.id] = 'A');
                setAttendanceMap(initialMap);
                setRecordIdMap({});
            }
        } catch (error) {
            console.error('Attendance Loading Error:', error);
            const errorMsg = error.code === 'failed-precondition'
                ? 'Database index required. Please contact admin.'
                : 'Failed to load session data';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // Real-time Unlock Request Listener & Spam Protection
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        if (!selectedClass || !date) return;

        // Import onSnapshot dynamically if not at top, but better at top. 
        // Assuming I'll fix imports later or user has them. 
        // Wait, replace_file_content can't see top. I'll use require for now or assume imports.
        // Actually, let's just use the existing imports if possible, or add onSnapshot to the top import in a separate step if needed.
        // For now I will use require inside useEffect to be safe or just assume it is added. 
        // I will add onSnapshot to the import in a separate step to be clean.



        const q = query(
            collection(db, 'attendance_unlock_requests'),
            where('batchId', '==', selectedClass.id),
            where('date', '==', date)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(d => d.data());
            setRequestCount(requests.length);

            // Find latest request
            const latest = requests.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())[0];

            if (latest) {
                // Check for status change for Toast
                if (latest.status !== requestStatus) {
                    if (latest.status === 'APPROVED' && requestStatus === 'PENDING') {
                        toast.success('Unlock Request APPROVED! You can now edit attendance.');
                        // Reload session to reflect UNLOCKED status in UI (since session update triggers re-render but we need to be sure)
                        loadSessionData();
                    } else if (latest.status === 'REJECTED' && requestStatus === 'PENDING') {
                        toast.error('Unlock Request REJECTED by Principal.');
                    }
                }
                setRequestStatus(latest.status);
            } else {
                setRequestStatus(null);
            }
        });

        return () => unsubscribe();
    }, [selectedClass, date, requestStatus]); // requestStatus dependency to compare change

    const toggleStatus = (studentId) => {
        if (session?.status === 'LOCKED') return;
        setAttendanceMap(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'P' ? 'A' : 'P'
        }));
    };

    const markAll = (status) => {
        if (session?.status === 'LOCKED') return;
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

            // 1. Create/Update Session Header (Batch-wise)
            let sessionRef;
            if (session?.id) {
                // Update Existing Session
                sessionRef = doc(db, 'attendance_sessions', session.id);
                batch.update(sessionRef, {
                    // Update stats
                    totalStudents: stats.total,
                    presentCount: stats.present,
                    lockedAt: serverTimestamp(), // Re-lock time
                    status: 'LOCKED',
                    teacherId: user.uid, // Ensure current teacher is marked as locker
                    teacherName: user.name
                });
            } else {
                // Create New Session
                sessionRef = doc(collection(db, 'attendance_sessions'));
                const sessionData = {
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
                };
                batch.set(sessionRef, sessionData);
            }

            // 2. Create/Update Records
            students.forEach(student => {
                const existingRecordId = recordIdMap[student.id];
                const status = attendanceMap[student.id] === 'P' ? 'PRESENT' : 'ABSENT';

                if (existingRecordId) {
                    // UPDATE Existing Record
                    const recordRef = doc(db, 'attendance_records', existingRecordId);
                    batch.update(recordRef, {
                        status: status,
                        markedBy: user.uid,
                        timestamp: serverTimestamp()
                    });
                } else {
                    // CREATE New Record
                    const recordRef = doc(collection(db, 'attendance_records'));
                    batch.set(recordRef, {
                        sessionId: sessionRef.id,
                        studentId: student.id,
                        studentName: student.name,
                        enrollmentNumber: student.enrollmentNumber,
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

            toast.success('Daily Attendance Locked Successfully');
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
                type: 'UNLOCK_ATTENDANCE', // For future filtering
                sessionId: session.id,
                batchId: selectedClass.id,
                batchName: selectedClass.courseName || 'Batch',
                date: date,

                // Teacher Info
                teacherId: user.uid,
                teacherName: user.name,

                // Principal Filtering
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

    if (!user) return null;

    const stats = calculateStats();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Batch Attendance</h2>
                <p className="text-sm text-gray-600">Mark batch-wise full day attendance</p>
            </div>

            {/* Selectors */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={selectedClass ? JSON.stringify(selectedClass) : ''}
                        onChange={e => {
                            const val = e.target.value;
                            setSelectedClass(val ? JSON.parse(val) : null);
                        }}
                    >
                        <option value="">-- Choose Batch --</option>
                        {classes.map(c => (
                            <option key={`${c.courseId}_${c.semester}_${c.section}`} value={JSON.stringify(c)}>
                                {c.courseName} Sem {c.semester} ({c.section})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        max={format(new Date(), 'yyyy-MM-dd')}
                    />
                </div>
            </div>

            {selectedClass ? (
                <div className="space-y-4">
                    {/* Header & Stats */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${session?.status === 'LOCKED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                {session?.status === 'LOCKED' ? `LOCKED` : 'OPEN'}
                            </div>
                            {!session && <span className="text-gray-500 text-sm">New Record</span>}
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-gray-600 block">Present: {stats.present} / {stats.total}</span>
                            <span className="text-xl font-bold text-gray-900">{stats.percent}%</span>
                        </div>
                    </div>

                    {/* Quick Actions (Open Only) */}
                    {(!session || session.status !== 'LOCKED') && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => markAll('P')}
                                className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded hover:bg-blue-100"
                            >
                                Mark All Present
                            </button>
                            <button
                                onClick={() => markAll('A')}
                                className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded hover:bg-red-100"
                            >
                                Mark All Absent
                            </button>
                        </div>
                    )}

                    {/* Grid */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {students.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                {loading ? 'Loading...' : 'No students found for this batch configuration.'}
                            </div>
                        ) : (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {students.map(student => (
                                    <div
                                        key={student.id}
                                        className={`p-4 rounded-xl border transition-all ${attendanceMap[student.id] === 'A'
                                            ? 'bg-red-50 border-red-200'
                                            : 'bg-white border-gray-100 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-gray-900 truncate" title={student.name}>{student.name}</p>
                                                    <p className="text-xs text-gray-500">{student.enrollmentNumber}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleStatus(student.id)}
                                            disabled={session?.status === 'LOCKED'}
                                            className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${attendanceMap[student.id] === 'P'
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-red-500 text-white shadow-md hover:bg-red-600'
                                                } ${session?.status === 'LOCKED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {attendanceMap[student.id] === 'P' ? 'PRESENT' : 'ABSENT'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Action */}
                    {(!session || session.status !== 'LOCKED') && students.length > 0 && (
                        <div className="fixed bottom-6 right-6 md:sticky md:bottom-0 md:bg-white md:p-4 md:border-t flex justify-end z-10">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-biyani-red text-white px-8 py-3 rounded-xl shadow-lg hover:bg-red-700 font-bold flex items-center gap-2"
                            >
                                {submitting ? 'Locking...' : '🔒 Lock Day Attendance'}
                            </button>
                        </div>
                    )}

                    {/* Locked Message */}
                    {session?.status === 'LOCKED' && (
                        <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-600 flex flex-col md:flex-row items-center justify-center gap-4">
                            <p>🔒 Attendance for {format(new Date(date), 'dd MMM yyyy')} is locked.</p>

                            {requestStatus === 'PENDING' ? (
                                <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-bold border border-yellow-200 flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Unlock Request Pending
                                </span>
                            ) : (
                                <button
                                    onClick={handleRequestEdit}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    Request Admin Unlock
                                </button>
                            )}
                        </div>
                    )}

                </div>
            ) : (
                <div className="bg-gray-50 rounded-lg p-10 text-center border-2 border-dashed border-gray-200">
                    <p className="text-gray-500">Please select a batch to mark attendance</p>
                </div>
            )}
        </div>
    );
}
