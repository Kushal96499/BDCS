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

    const [showAll, setShowAll] = useState(false);

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
                setShowAll(false); // Reset showAll when specific batch is selected
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

    // Filter assignments based on selection
    const filteredAssignments = selectedBatchId 
        ? assignments.filter(a => a.batchId === selectedBatchId)
        : assignments;

    const listVisible = selectedBatchId || showAll;

    return (
        <div className="space-y-10 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Academic Allocation</h2>
                <p className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest mt-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#E31E24] rounded-full animate-pulse" />
                    Faculty Assignment • Subject Mapping
                </p>
            </div>

            {/* Assignment Form Section */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-1 border border-white shadow-2xl relative z-10">
                <div className="bg-white rounded-[2.2rem] p-8 lg:p-10 space-y-8 shadow-inner border border-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Step 01: Select Batch</label>
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Step 02: Select Subject</label>
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
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Step 03: Assign Teacher</label>
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

            {/* List Section - Table View */}
            <div className="space-y-6 pb-20">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full transition-colors ${listVisible ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                            {selectedBatchId ? `${selectedBatchDetails?.name} Allocations` : 'Allocation Registry'}
                        </h3>
                    </div>
                    {!selectedBatchId && (
                        <button 
                            onClick={() => setShowAll(!showAll)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                showAll ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            {showAll ? 'Hide Registry' : 'Show Full Registry'}
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm min-h-[400px] flex flex-col">
                    {!listVisible ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-gray-50/10">
                            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-gray-100 border border-gray-50 mb-6 shadow-sm">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth={2} /></svg>
                            </div>
                            <h4 className="text-xl font-black text-gray-900 mb-2 tracking-tight uppercase tracking-tighter">Systematic View Only</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-sm leading-relaxed">
                                Please select a specific batch above to view institutional mappings, or click "Show Full Registry" to view all active faculty allocations.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="p-8 text-[9px] font-black text-gray-400 uppercase tracking-widest pl-10 whitespace-nowrap">Subject Details</th>
                                        <th className="p-8 text-[9px] font-black text-gray-400 uppercase tracking-widest">Batch Account</th>
                                        <th className="p-8 text-[9px] font-black text-gray-400 uppercase tracking-widest">Assigned Teacher</th>
                                        <th className="p-8 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Semester / Status</th>
                                        <th className="p-8 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right pr-10">Operations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        [1, 2, 3].map(i => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan="5" className="p-10"><div className="h-10 bg-gray-50 rounded-2xl w-full" /></td>
                                            </tr>
                                        ))
                                    ) : filteredAssignments.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-32 text-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-3xl mx-auto flex items-center justify-center text-gray-300 mb-6 font-black uppercase tracking-widest text-[10px]">Registry Empty</div>
                                                <h4 className="text-lg font-black text-gray-900 mb-1 tracking-tight">No allocations found</h4>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">System ready for deployment.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAssignments.sort((a,b) => {
                                        const batchA = batches.find(bx => bx.id === a.batchId);
                                        const batchB = batches.find(bx => bx.id === b.batchId);
                                        const isHistA = batchA && (parseInt(a.semester) < parseInt(batchA.currentSemester || 0));
                                        const isHistB = batchB && (parseInt(b.semester) < parseInt(batchB.currentSemester || 0));
                                        if (isHistA && !isHistB) return 1;
                                        if (!isHistA && isHistB) return -1;
                                        return 0;
                                    }).map((assign) => {
                                        const targetBatch = batches.find(b => b.id === assign.batchId);
                                        const isHistorical = targetBatch && (parseInt(assign.semester) < parseInt(targetBatch.currentSemester || 0));

                                        return (
                                            <tr key={assign.id} className={`transition-all group ${isHistorical ? 'bg-slate-50/30' : 'hover:bg-emerald-50/20'}`}>
                                                <td className="p-8 pl-10 whitespace-nowrap">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:text-emerald-500 transition-colors shadow-sm uppercase">
                                                            {assign.subjectCode?.substring(0, 3)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 leading-tight uppercase tracking-tighter">{assign.subjectName}</p>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{assign.subjectCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-8 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{assign.batchName}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Student List</p>
                                                    </div>
                                                </td>
                                                <td className="p-8 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-gray-200 uppercase">
                                                            {assign.teacherName?.[0]}
                                                        </div>
                                                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{assign.teacherName}</p>
                                                    </div>
                                                </td>
                                                <td className="p-8 text-center whitespace-nowrap">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                        isHistorical ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                        {isHistorical ? 'ARCHIVED' : `Semester ${assign.semester}`}
                                                    </span>
                                                </td>
                                                <td className="p-8 text-right pr-10 whitespace-nowrap">
                                                    {!isHistorical ? (
                                                        <button
                                                            onClick={() => handleDelete(assign.id)}
                                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 group/btn"
                                                            title="Revoke Allocation"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        </button>
                                                    ) : (
                                                        <div className="p-3 text-slate-200" title="Locked Record">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
}
