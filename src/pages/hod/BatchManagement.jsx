// ============================================
// BDCS - Batch Management (HOD)
// The Core Hub: Create Batches & Assign Class Teachers
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { logCreate, logUpdate } from '../../utils/auditLogger';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import FormModal from '../../components/admin/FormModal';
import Input from '../../components/Input';
import BatchStudentListModal from '../../components/hod/BatchStudentListModal';
import PromoteBatchModal from '../../components/hod/PromoteBatchModal';

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

            // 1. Fetch Department Courses
            const coursesQ = query(collection(db, 'courses'), where('status', '==', 'active'));
            const coursesSnap = await getDocs(coursesQ);
            setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 2. Fetch Department Teachers
            const teachersQ = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('role', '==', 'teacher'),
                where('status', '==', 'active')
            );
            const teachersSnap = await getDocs(teachersQ);
            setTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 3. Fetch Batches for this Department
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
            currentSemester: batch.currentSemester,
            classTeacherId: batch.classTeacherId || '',
            status: batch.status
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.courseId || !formData.classTeacherId) {
            toast.error('Please fill all required fields');
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

                // ── SYNC STUDENTS IF SEMESTER CHANGED ──
                const oldSem = parseInt(editingBatch.currentSemester);
                const newSem = parseInt(formData.currentSemester);
                if (oldSem !== newSem) {
                    const { writeBatch: createWriteBatch, query: fbQuery, where: fbWhere, collection: fbCollection } = await import('firebase/firestore');
                    const { getSemesterYear } = await import('../../services/batchPromotionService');
                    
                    const studentsQ = query(
                        collection(db, 'users'),
                        where('batchId', '==', editingBatch.id),
                        where('role', '==', 'student')
                    );
                    const studentsSnap = await getDocs(studentsQ);
                    
                    if (!studentsSnap.empty) {
                        const batch = createWriteBatch(db);
                        studentsSnap.docs.forEach(studentDoc => {
                            const studentData = studentDoc.data();
                            // Only update ACTIVE and BACK_PROMOTED students (not NOT_PROMOTED/detained)
                            if (studentData.academicStatus !== 'NOT_PROMOTED' && studentData.academicStatus !== 'PASSOUT') {
                                batch.update(doc(db, 'users', studentDoc.id), {
                                    currentSemester: newSem,
                                    currentYear: getSemesterYear(newSem),
                                    updatedAt: serverTimestamp()
                                });
                            }
                        });
                        await batch.commit();
                        console.log(`Synced ${studentsSnap.size} students to Sem ${newSem}`);
                    }
                }

                await logUpdate('batches', editingBatch.id, editingBatch, payload, user);
                toast.success('Batch updated successfully');
            } else {
                payload.createdAt = serverTimestamp();
                payload.createdBy = user.uid;
                const ref = await addDoc(collection(db, 'batches'), payload);
                await logCreate('batches', ref.id, payload, user);
                toast.success('Batch created successfully');
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

    const handleDelete = async (batch) => {
        if (!window.confirm(`Are you sure you want to delete ${batch.name}?`)) return;
        try {
            await deleteDoc(doc(db, 'batches', batch.id));
            toast.success('Batch deleted');
            fetchData();
        } catch (error) {
            console.error('Error deleting batch:', error);
            toast.error('Failed to delete batch');
        }
    };

    const openStudentModal = (batch) => {
        setActiveBatch(batch);
        setShowStudentModal(true);
    };

    const openPromoteModal = (batch) => {
        setActiveBatch(batch);
        setShowPromoteModal(true);
    };

    const columns = [
        {
            header: 'Batch Infos',
            field: 'name',
            render: (row) => (
                <div>
                    <div className="font-bold text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.courseName}</div>
                </div>
            )
        },
        {
            header: 'Session',
            field: 'sessionStart',
            render: (row) => <span className="text-sm font-mono">{row.sessionStart}-{row.sessionEnd}</span>
        },
        {
            header: 'Current Sem',
            field: 'currentSemester',
            render: (row) => (
                <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    Sem {row.currentSemester}
                </span>
            )
        },
        {
            header: 'Class Teacher',
            field: 'classTeacherName',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        {row.classTeacherName?.[0] || '?'}
                    </div>
                    <span className="text-sm">{row.classTeacherName}</span>
                </div>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Management',
            field: 'management',
            render: (row) => (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <button
                        onClick={() => openStudentModal(row)}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-bold flex items-center gap-1"
                        title="View Students"
                    >
                        <span>👥</span> Students
                    </button>

                    <button
                        onClick={() => openPromoteModal(row)}
                        className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-bold flex items-center gap-1"
                        title="Promote Batch"
                    >
                        <span>🚀</span> Promote
                    </button>
                </div>
            )
        },
        {
            header: 'Actions',
            field: 'actions',
            render: (row) => (
                <div className="flex items-center gap-2 mt-1">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Settings"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>

                    <button
                        onClick={() => handleDelete(row)}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Batches & Classes</h2>
                    <p className="text-sm text-gray-600">Create batches and assign Class Teachers for attendance</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Batch
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={batches}
                    loading={loading}
                    emptyMessage="No batches found. Initialize your first batch."
                    actions={false}
                />
            </div>

            {showForm && (
                <FormModal
                    isOpen={true}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleSubmit}
                    title={editingBatch ? 'Edit Batch Configuration' : 'Create New Batch'}
                    submitText={editingBatch ? 'Update Batch' : 'Create Batch'}
                    loading={formLoading}
                >
                    <div className="space-y-4">
                        {/* Course Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Course *</label>
                            <select
                                value={formData.courseId}
                                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-biyani-red"
                                required
                            >
                                <option value="">-- Choose Course --</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        </div>

                        {/* Batch Name */}
                        <Input
                            label="Batch Name *"
                            placeholder="e.g. BCA 2023-2026 Batch A"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        {/* Session */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Session Start"
                                type="number"
                                value={formData.sessionStart}
                                onChange={(e) => setFormData({ ...formData, sessionStart: e.target.value })}
                                required
                            />
                            <Input
                                label="Session End"
                                type="number"
                                value={formData.sessionEnd}
                                onChange={(e) => setFormData({ ...formData, sessionEnd: e.target.value })}
                                required
                            />
                        </div>

                        {/* Current Configuration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Semester</label>
                                <select
                                    value={formData.currentSemester}
                                    onChange={(e) => setFormData({ ...formData, currentSemester: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    disabled={!formData.courseId}
                                >
                                    {(() => {
                                        const selectedCourse = courses.find(c => c.id === formData.courseId);
                                        const duration = selectedCourse?.duration ? parseInt(selectedCourse.duration) : 4;
                                        const maxSemesters = duration * 2 || 8;

                                        return Array.from({ length: maxSemesters }, (_, i) => i + 1).map(sem => (
                                            <option key={sem} value={sem}>Semester {sem}</option>
                                        ));
                                    })()}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="active">Active (Running)</option>
                                    <option value="completed">Completed</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>

                        {/* Class Teacher Assignment */}
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <label className="block text-sm font-bold text-red-800 mb-1">Assign Class Teacher *</label>
                            <p className="text-xs text-red-600 mb-2">This teacher will be responsible for FULL DAY attendance.</p>
                            <select
                                value={formData.classTeacherId}
                                onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                                className="w-full border border-red-200 rounded-lg px-3 py-2 bg-white"
                                required
                            >
                                <option value="">-- Select Faculty --</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                                ))}
                            </select>
                        </div>

                    </div>
                </FormModal>
            )}

            {/* View Students Modal */}
            <BatchStudentListModal
                isOpen={showStudentModal}
                onClose={() => setShowStudentModal(false)}
                batch={activeBatch}
            />

            {/* Promote Batch Modal */}
            <PromoteBatchModal
                isOpen={showPromoteModal}
                onClose={() => setShowPromoteModal(false)}
                batch={activeBatch}
                onSuccess={() => {
                    setShowPromoteModal(false);
                    fetchData(); // Refresh list to see updated semester
                }}
            />
        </div>
    );
}
