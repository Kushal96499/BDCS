// ============================================
// BDCS - Batch Management (HOD)
// The Core Hub: Create Batches & Assign Class Teachers
// Modernized "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { logCreate, logUpdate } from '../../utils/auditLogger';
import DataTable from '../../components/admin/DataTable';
import StatusPill from '../../components/common/StatusPill';
import FormModal from '../../components/admin/FormModal';
import Input from '../../components/Input';
import PremiumSelect from '../../components/common/PremiumSelect';
import BatchStudentListModal from '../../components/hod/BatchStudentListModal';
import PromoteBatchModal from '../../components/hod/PromoteBatchModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function BatchManagement() {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    // Modal States
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [activeBatch, setActiveBatch] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        courseId: '',
        sessionStart: new Date().getFullYear(),
        sessionEnd: new Date().getFullYear() + 3,
        currentSemester: '1',
        classTeacherId: '',
        status: 'active'
    });

    useEffect(() => {
        if (user?.departmentId) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const coursesQ = query(collection(db, 'courses'), where('status', '==', 'active'));
            const coursesSnap = await getDocs(coursesQ);
            setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const teachersQ = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('role', '==', 'teacher'),
                where('status', '==', 'active')
            );
            const teachersSnap = await getDocs(teachersQ);
            setTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const batchesQ = query(collection(db, 'batches'), where('departmentId', '==', user.departmentId));
            const batchesSnap = await getDocs(batchesQ);
            setBatches(batchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load batch data');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingBatch(null);
        setFormData({
            name: '',
            courseId: '',
            sessionStart: new Date().getFullYear(),
            sessionEnd: new Date().getFullYear() + 3,
            currentSemester: '1',
            classTeacherId: '',
            status: 'active'
        });
        setShowForm(true);
    };

    const handleEdit = (batch) => {
        setEditingBatch(batch);
        setFormData({
            name: batch.name,
            courseId: batch.courseId,
            sessionStart: batch.sessionStart,
            sessionEnd: batch.sessionEnd,
            currentSemester: String(batch.currentSemester),
            classTeacherId: batch.classTeacherId || '',
            status: batch.status
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.courseId || !formData.classTeacherId) {
            toast.error('Required fields: Name, Course, and Faculty');
            return;
        }

        setFormLoading(true);
        try {
            const selectedCourse = courses.find(c => c.id === formData.courseId);
            const selectedTeacher = teachers.find(t => t.id === formData.classTeacherId);

            const payload = {
                name: formData.name,
                courseId: formData.courseId,
                courseName: selectedCourse?.name || 'Unknown Course',
                courseCode: selectedCourse?.code || '',
                sessionStart: parseInt(formData.sessionStart),
                sessionEnd: parseInt(formData.sessionEnd),
                currentSemester: parseInt(formData.currentSemester),
                classTeacherId: formData.classTeacherId,
                classTeacherName: selectedTeacher?.name || 'Unknown',
                departmentId: user.departmentId,
                departmentName: user.departmentName,
                status: formData.status,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            };

            if (editingBatch) {
                const batchRef = doc(db, 'batches', editingBatch.id);
                await updateDoc(batchRef, payload);

                // Sync students if semester changed
                if (parseInt(editingBatch.currentSemester) !== parseInt(formData.currentSemester)) {
                    const { writeBatch: createWriteBatch } = await import('firebase/firestore');
                    const { getSemesterYear } = await import('../../services/batchPromotionService');
                    const studentsQ = query(collection(db, 'users'), where('batchId', '==', editingBatch.id), where('role', '==', 'student'));
                    const studentsSnap = await getDocs(studentsQ);
                    if (!studentsSnap.empty) {
                        const batchSync = createWriteBatch(db);
                        studentsSnap.docs.forEach(studentDoc => {
                            const studentData = studentDoc.data();
                            if (studentData.academicStatus !== 'NOT_PROMOTED' && studentData.academicStatus !== 'PASSOUT') {
                                batchSync.update(doc(db, 'users', studentDoc.id), {
                                    currentSemester: parseInt(formData.currentSemester),
                                    currentYear: getSemesterYear(parseInt(formData.currentSemester)),
                                    updatedAt: serverTimestamp()
                                });
                            }
                        });
                        await batchSync.commit();
                    }
                }
                await logUpdate('batches', editingBatch.id, editingBatch, payload, user);
                toast.success('Batch Updated Successfully');
            } else {
                payload.createdAt = serverTimestamp();
                payload.createdBy = user.uid;
                const ref = await addDoc(collection(db, 'batches'), payload);
                await logCreate('batches', ref.id, payload, user);
                toast.success('New Batch Created');
            }

            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Error saving batch:', error);
            toast.error('Failed to save batch');
        } finally {
            setFormLoading(false);
        }
    };

    const columns = [
        {
            header: 'Batch Details',
            field: 'name',
            render: (row) => (
                <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs shadow-sm shadow-emerald-100/50">
                        {row.name.split(' ')[0][0]}{row.name.split(' ').pop()[0]}
                    </div>
                    <div>
                        <div className="font-black text-gray-900 tracking-tight">{row.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{row.courseName}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Semester',
            field: 'currentSemester',
            render: (row) => (
                <div className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm shadow-blue-100/20">
                    Semester {row.currentSemester}
                </div>
            )
        },
        {
            header: 'Class Teacher',
            field: 'classTeacherName',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center text-[10px] font-black border border-violet-100 shadow-sm">
                        {row.classTeacherName?.[0] || '?'}
                    </div>
                    <span className="text-sm font-bold text-gray-700 tracking-tight">{row.classTeacherName}</span>
                </div>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusPill status={row.status} />
        },
        {
            header: 'Operations',
            field: 'management',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setActiveBatch(row); setShowStudentModal(true); }}
                        title="View Student Roster"
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-100/30"
                    >
                        Roster
                    </button>
                    <button
                        onClick={() => { setActiveBatch(row); setShowPromoteModal(true); }}
                        title="Promote to Next Semester"
                        className="px-4 py-2 bg-[#E31E24] text-white rounded-xl hover:bg-black transition-all text-[10px] font-black uppercase tracking-widest border border-white/20 shadow-lg shadow-red-200"
                    >
                        Promote
                    </button>
                    <button
                        onClick={() => handleEdit(row)}
                        title="Configure Parameters"
                        className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white transition-all border border-gray-100"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Executive Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Batch List</h2>
                    <p className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#E31E24] rounded-full animate-pulse" />
                        Active Batch Groups • {user?.departmentName}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-end">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Batches</span>
                        <span className="text-xl font-black text-gray-900">{batches.length} Active</span>
                    </div>
                    <button
                        onClick={handleAdd}
                        title="Add New Batch Profile"
                        className="bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-xl shadow-gray-200 hover:bg-[#E31E24] font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 active:scale-95 transition-all border border-white/10"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M12 4v16m8-8H4"/></svg>
                        Create New Batch
                    </button>
                </div>
            </div>

            {/* Tabular Batch Ledger */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-blue-500/5 min-h-[400px]">
                <DataTable
                    columns={columns}
                    data={batches}
                    loading={loading}
                    emptyMessage="No classes found in the list yet."
                    actions={false}
                />
            </div>

            <FormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSubmit={handleSubmit}
                title={editingBatch ? 'Edit Batch' : 'Add New Batch'}
                submitText={editingBatch ? 'Save Changes' : 'Add Batch'}
                loading={formLoading}
            >
                <div className="space-y-6 pt-4">
                    <PremiumSelect
                        label="Course *"
                        placeholder="Select Course"
                        value={formData.courseId}
                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                        options={courses.map(c => ({ label: `${c.name} (${c.code})`, value: c.id }))}
                        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" /></svg>}
                    />

                    <Input
                        label="Batch Name *"
                        placeholder="e.g. BCA 2023-26 Section A"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Session Start Year"
                            type="number"
                            value={formData.sessionStart}
                            onChange={(e) => setFormData({ ...formData, sessionStart: e.target.value })}
                        />
                        <Input
                            label="Session End Year"
                            type="number"
                            value={formData.sessionEnd}
                            onChange={(e) => setFormData({ ...formData, sessionEnd: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <PremiumSelect
                            label="Current Semester"
                            value={String(formData.currentSemester)}
                            onChange={(e) => setFormData({ ...formData, currentSemester: e.target.value })}
                            options={Array.from({ length: 12 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1) }))}
                            disabled={!formData.courseId}
                        />
                        <PremiumSelect
                            label="Status"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            options={[
                                { label: 'Active', value: 'active' },
                                { label: 'Completed', value: 'completed' },
                                { label: 'Archived', value: 'archived' }
                            ]}
                        />
                    </div>

                    <div className="p-6 bg-red-50/50 rounded-[1.5rem] border border-red-100 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#E31E24] rounded-full" />
                            <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">Class Teacher Details</h4>
                        </div>
                        <PremiumSelect
                            label="Select Teacher *"
                            placeholder="Select a teacher for this batch"
                            value={formData.classTeacherId}
                            onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                            options={teachers.map(t => ({ label: `${t.name} (${t.employeeId})`, value: t.id }))}
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 4.354l-8 4 8 4 8-4-8-4zM4 12.354l8 4 8-4" /></svg>}
                        />
                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter text-center">This teacher will manage daily attendance for the batch.</p>
                    </div>
                </div>
            </FormModal>

            <BatchStudentListModal
                isOpen={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                batch={activeBatch}
            />

            <PromoteBatchModal
                isOpen={showPromoteModal}
                onClose={() => setShowPromoteModal(false)}
                batch={activeBatch}
                onSuccess={() => { setShowPromoteModal(false); fetchData(); }}
            />
        </div>
    );
}
