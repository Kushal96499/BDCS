// ============================================
// BDCS - Class Assignment (HOD)
// Assign Subjects to Teachers (Batch-Based Flow)
// Modernized "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClassAssignment() {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);

    const [form, setForm] = useState({
        teacherId: '',
        subjectId: ''
    });

    useEffect(() => {
        if (user?.departmentId) fetchInitialData();
    }, [user]);

    const fetchInitialData = async () => {
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

            // 3. Fetch Assignments
            const snap = await getDocs(collection(db, 'class_assignments'));
            const allAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAssignments(allAssignments.filter(a => a.assignedBy === user.uid));

        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Sync failed');
        } finally {
            setLoading(false);
        }
    };

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
                const subjectsQ = query(
                    collection(db, 'subjects'),
                    where('courseId', '==', batch.courseId),
                    where('semester', '==', batch.currentSemester),
                    where('status', '==', 'active')
                );
                const snap = await getDocs(subjectsQ);
                setAvailableSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setForm({ teacherId: '', subjectId: '' });
            } catch (error) {
                console.error('Error fetching subjects:', error);
            }
        };

        loadBatchSubjects();
    }, [selectedBatchId, batches]);

    const handleAssign = async () => {
        if (!form.teacherId || !form.subjectId || !selectedBatchId) {
            toast.error('Invalid Protocol Configuration');
            return;
        }

        const exists = assignments.find(a => a.batchId === selectedBatchId && a.subjectId === form.subjectId);
        if (exists && !window.confirm('Subject conflict detected. Override?')) return;

        try {
            const teacher = teachers.find(t => t.id === form.teacherId);
            const subject = availableSubjects.find(s => s.id === form.subjectId);
            const batch = batches.find(b => b.id === selectedBatchId);

            const payload = {
                batchId: batch.id, batchName: batch.name, courseId: batch.courseId, semester: batch.currentSemester,
                subjectId: subject.id, subjectName: subject.name, subjectCode: subject.code,
                teacherId: teacher.id, teacherName: teacher.name,
                assignedBy: user.uid, assignedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'class_assignments'), payload);
            setAssignments(prev => [...prev, { id: docRef.id, ...payload }]);
            toast.success('Allocation Authorized');
            setForm(prev => ({ ...prev, teacherId: '' }));
        } catch (error) {
            toast.error('Authorization failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Revoke this allocation?')) return;
        try {
            await deleteDoc(doc(db, 'class_assignments', id));
            setAssignments(prev => prev.filter(a => a.id !== id));
            toast.success('Allocation Revoked');
        } catch (error) {
            toast.error('Revocation failed');
        }
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Academic Allocation</h2>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Faculty Mapping • Resource Distribution
                </p>
            </div>

            {/* Assignment Form Section */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-1 border border-white shadow-2xl relative z-10">
                <div className="bg-white rounded-[2.2rem] p-8 lg:p-10 space-y-8 shadow-inner border border-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phase 01: Cohort Selection</label>
                            <div className="relative group">
                                <select
                                    className="w-full pl-6 pr-12 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-gray-900 outline-none transition-all focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 hover:bg-white cursor-pointer group-hover:shadow-lg appearance-none"
                                    value={selectedBatchId}
                                    onChange={e => setSelectedBatchId(e.target.value)}
                                >
                                    <option value="">SELECT BATCH</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()} (SEM {b.currentSemester})</option>)}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phase 02: Subject Protocol</label>
                            <div className="relative group">
                                <select
                                    className="w-full pl-6 pr-12 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-gray-900 outline-none transition-all focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 hover:bg-white cursor-pointer group-hover:shadow-lg appearance-none disabled:opacity-50"
                                    value={form.subjectId}
                                    onChange={e => setForm({ ...form, subjectId: e.target.value })}
                                    disabled={!selectedBatchId}
                                >
                                    <option value="">SELECT SUBJECT</option>
                                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.code} • {s.name.toUpperCase()}</option>)}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phase 03: Faculty Assignment</label>
                            <div className="flex gap-4">
                                <div className="relative group flex-1">
                                    <select
                                        className="w-full pl-6 pr-12 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-black text-gray-900 outline-none transition-all focus:ring-4 focus:ring-emerald-50 focus:border-emerald-500 hover:bg-white cursor-pointer group-hover:shadow-lg appearance-none disabled:opacity-50"
                                        value={form.teacherId}
                                        onChange={e => setForm({ ...form, teacherId: e.target.value })}
                                        disabled={!form.subjectId}
                                    >
                                        <option value="">SELECT FACULTY</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAssign}
                                    disabled={!form.teacherId}
                                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Authorize
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Active Allocations</h3>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-[2.5rem] bg-white animate-pulse border border-gray-50 shadow-sm" />)}
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="bg-gray-50/50 rounded-[3rem] p-24 text-center border-4 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-sm text-gray-300 mb-6 font-black uppercase tracking-widest text-[10px]">Registry Empty</div>
                        <h4 className="text-xl font-black text-gray-900 mb-2 tracking-tight transition-colors">No academic allocations found</h4>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">System queue is optimized. Start allocating faculty above.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <AnimatePresence mode="popLayout">
                            {assignments.map((assign, idx) => (
                                <motion.div
                                    key={assign.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-2xl hover:border-emerald-100 transition-all group relative overflow-hidden"
                                >
                                    <div className="relative z-10 flex flex-col h-full space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h4 className="text-lg font-black text-gray-900 tracking-tighter leading-none group-hover:text-emerald-500 transition-colors uppercase">{assign.subjectName}</h4>
                                                <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase">{assign.subjectCode}</p>
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                                Sem {assign.semester}
                                            </div>
                                        </div>

                                        <div className="p-5 rounded-[1.5rem] bg-gray-50 border border-gray-100 group-hover:bg-emerald-50/30 transition-colors">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Cohort Signature</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:text-emerald-500 transition-colors">
                                                    {assign.batchName?.charAt(0)}
                                                </div>
                                                <p className="font-black text-gray-900 text-sm tracking-tight uppercase">{assign.batchName}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-auto">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-xs shadow-xl shadow-gray-200">
                                                    {assign.teacherName?.[0]}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Faculty lead</p>
                                                    <p className="font-black text-gray-900 text-sm tracking-tighter uppercase leading-none">{assign.teacherName}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(assign.id)}
                                                data-tooltip="Revoke Allocation"
                                                className="p-3 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full group-hover:scale-150 transition-transform duration-700" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
