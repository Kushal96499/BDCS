// ============================================
// BDCS - Class Assignment (HOD) - REFACTORED
// Assign Subjects to Teachers (Batch-Based Flow)
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';

export default function ClassAssignment() {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]); // Subjects for selected Batch's Sem
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);

    const [form, setForm] = useState({
        teacherId: '',
        subjectId: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    // Fetch Batches & Teachers (Initial Load)
    const fetchInitialData = async () => {
        if (!user?.departmentId) return;

        try {
            setLoading(true);

            // 1. Fetch Teachers
            const teachersQ = query(collection(db, 'users'), where('departmentId', '==', user.departmentId), where('role', '==', 'teacher'));
            const teachersSnap = await getDocs(teachersQ);
            setTeachers(teachersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // 2. Fetch Batches
            const batchesQ = query(collection(db, 'batches'), where('departmentId', '==', user.departmentId), where('status', '==', 'active'));
            const batchesSnap = await getDocs(batchesQ);
            setBatches(batchesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // 3. Fetch Existing Assignments
            await fetchAssignments();

        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load initial data');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async () => {
        // Optimized: In production, filter query by department
        const snap = await getDocs(collection(db, 'class_assignments'));
        const allAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter mainly for this HOD/Dept
        const deptAssigns = allAssignments.filter(a => a.assignedBy === user.uid); // Simple filter
        setAssignments(deptAssigns);
    };

    // When Batch is Selected -> Auto-Fetch Subjects for its Semester
    useEffect(() => {
        if (!selectedBatchId) {
            setAvailableSubjects([]);
            setSelectedBatchDetails(null);
            return;
        }

        const loadBatchSubjects = async () => {
            const batch = batches.find(b => b.id === selectedBatchId);
            setSelectedBatchDetails(batch);

            if (!batch) return;

            try {
                // Fetch subjects where courseId == batch.courseId AND semester == batch.currentSemester
                const subjectsQ = query(
                    collection(db, 'subjects'),
                    where('courseId', '==', batch.courseId),
                    where('semester', '==', batch.currentSemester),
                    where('status', '==', 'active')
                );
                const snap = await getDocs(subjectsQ);
                setAvailableSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Clear previous form selections
                setForm({ teacherId: '', subjectId: '' });

            } catch (error) {
                console.error('Error fetching subjects for batch:', error);
                toast.error('Failed to load subjects for this batch');
            }
        };

        loadBatchSubjects();
    }, [selectedBatchId, batches]);

    const handleAssign = async () => {
        if (!form.teacherId || !form.subjectId || !selectedBatchId) {
            toast.error('Please select Batch, Subject, and Teacher');
            return;
        }

        // Check Duplicate
        const exists = assignments.find(a =>
            a.batchId === selectedBatchId &&
            a.subjectId === form.subjectId
        );

        if (exists) {
            // Optional: Allow multiple teachers? Usually one teacher per subject per batch.
            // For now, warn.
            if (!window.confirm('This subject is already assigned for this batch. Assign another teacher?')) return;
        }

        try {
            const teacher = teachers.find(t => t.id === form.teacherId);
            const subject = availableSubjects.find(s => s.id === form.subjectId);
            const batch = batches.find(b => b.id === selectedBatchId);

            const payload = {
                // Batch Context
                batchId: batch.id,
                batchName: batch.name,
                courseId: batch.courseId,
                semester: batch.currentSemester,

                // Academic
                subjectId: subject.id,
                subjectName: subject.name,
                subjectCode: subject.code,

                // Teacher
                teacherId: teacher.id,
                teacherName: teacher.name,

                // Meta
                assignedBy: user.uid,
                assignedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'class_assignments'), payload);
            setAssignments(prev => [...prev, { id: docRef.id, ...payload }]);
            toast.success('Subject assigned to teacher');
            setForm(prev => ({ ...prev, teacherId: '' })); // Keep subject selected? Or clear?
        } catch (error) {
            console.error('Error assigning:', error);
            toast.error('Failed to assign');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Revoke this assignment?')) return;
        try {
            await deleteDoc(doc(db, 'class_assignments', id));
            setAssignments(prev => prev.filter(a => a.id !== id));
            toast.success('Assignment revoked');
        } catch (error) {
            toast.error('Failed to delete assignment');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Academic Allocation</h2>
                <p className="text-sm text-gray-600">Assign Subject Teachers to Batches</p>
            </div>

            {/* Assignment Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* 1. Select Batch */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Step 1: Select Batch</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-biyani-red"
                            value={selectedBatchId}
                            onChange={e => setSelectedBatchId(e.target.value)}
                        >
                            <option value="">-- Choose Batch --</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name} (Sem {b.currentSemester})</option>
                            ))}
                        </select>
                        {selectedBatchDetails && (
                            <p className="text-xs text-blue-600 mt-1">
                                Found {availableSubjects.length} subjects for {selectedBatchDetails.courseName} Sem {selectedBatchDetails.currentSemester}
                            </p>
                        )}
                    </div>

                    {/* 2. Select Subject (Only if Batch Selected) */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Step 2: Select Subject</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                            value={form.subjectId}
                            onChange={e => setForm({ ...form, subjectId: e.target.value })}
                            disabled={!selectedBatchId}
                        >
                            <option value="">-- Choose Subject --</option>
                            {availableSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Assign Teacher */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Step 3: Assign Teacher</label>
                        <div className="flex gap-2">
                            <select
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                                value={form.teacherId}
                                onChange={e => setForm({ ...form, teacherId: e.target.value })}
                                disabled={!selectedBatchId || !form.subjectId}
                            >
                                <option value="">-- Choose Faculty --</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAssign}
                                disabled={!form.teacherId || !form.subjectId}
                                className="bg-biyani-red text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                Allow
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Assignments Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Current Allocations</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Batch / Class</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Faculty</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {assignments.map(assign => (
                            <tr key={assign.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{assign.batchName}</div>
                                    <div className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100 mt-1">
                                        Sem {assign.semester}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 font-medium">{assign.subjectName}</div>
                                    <div className="text-xs text-gray-500 font-mono">{assign.subjectCode}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {assign.teacherName?.[0]}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{assign.teacherName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDelete(assign.id)}
                                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition-colors"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {assignments.length === 0 && !loading && (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    <p>No subjects allocated yet.</p>
                                    <p className="text-sm">Select a batch above to start assigning teachers.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
