// ============================================
// BDCS - Subject Master (HOD)
// Create & Manage Subjects for Department Courses
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

export default function SubjectMaster() {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        courseId: '',
        semester: '1',
        type: 'Theory', // Theory, Practical, Lab
        credits: '4',
        status: 'active'
    });

    // Filter States
    const [filterCourse, setFilterCourse] = useState('');
    const [filterSemester, setFilterSemester] = useState('');

    const filteredSubjects = subjects.filter(subject => {
        if (filterCourse && subject.courseId !== filterCourse) return false;
        if (filterSemester && subject.semester !== parseInt(filterSemester)) return false;
        return true;
    });

    useEffect(() => {
        if (user?.departmentId) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Department Courses (or all active for selection)
            const coursesQ = query(collection(db, 'courses'), where('status', '==', 'active'));
            const coursesSnap = await getDocs(coursesQ);
            setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 2. Fetch Subjects for this Department
            const subjectsQ = query(collection(db, 'subjects'), where('departmentId', '==', user.departmentId));
            const subjectsSnap = await getDocs(subjectsQ);
            setSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load subject data');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingSubject(null);
        setFormData({
            name: '',
            code: '',
            courseId: '',
            semester: '1',
            type: 'Theory',
            credits: '4',
            status: 'active'
        });
        setShowForm(true);
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code,
            courseId: subject.courseId,
            semester: subject.semester,
            type: subject.type || 'Theory',
            credits: subject.credits || '4',
            status: subject.status
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.code || !formData.courseId) {
            toast.error('Please fill all required fields');
            return;
        }

        setFormLoading(true);
        try {
            const selectedCourse = courses.find(c => c.id === formData.courseId);

            const payload = {
                name: formData.name,
                code: formData.code.toUpperCase(),
                courseId: formData.courseId,
                courseName: selectedCourse?.name || 'Unknown',
                semester: parseInt(formData.semester),
                type: formData.type,
                credits: parseInt(formData.credits),

                departmentId: user.departmentId,
                departmentName: user.departmentName, // Assuming stored on user

                status: formData.status,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            };

            if (editingSubject) {
                const docRef = doc(db, 'subjects', editingSubject.id);
                await updateDoc(docRef, payload);
                await logUpdate('subjects', editingSubject.id, editingSubject, payload, user);
                toast.success('Subject updated successfully');
            } else {
                payload.createdAt = serverTimestamp();
                payload.createdBy = user.uid;
                const ref = await addDoc(collection(db, 'subjects'), payload);
                await logCreate('subjects', ref.id, payload, user);
                toast.success('Subject created successfully');
            }

            setShowForm(false);
            fetchData();
        } catch (error) {
            console.error('Error saving subject:', error);
            toast.error('Failed to save subject');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (subject) => {
        if (!window.confirm(`Are you sure you want to delete ${subject.name}?`)) return;
        try {
            await deleteDoc(doc(db, 'subjects', subject.id));
            toast.success('Subject deleted');
            fetchData();
        } catch (error) {
            console.error('Error deleting subject:', error);
            toast.error('Failed to delete subject');
        }
    };

    const columns = [
        {
            header: 'Code',
            field: 'code',
            render: (row) => <span className="font-mono font-bold text-gray-700">{row.code}</span>
        },
        {
            header: 'Subject Name',
            field: 'name',
            render: (row) => (
                <div>
                    <div className="font-semibold text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.type} • {row.credits} Credits</div>
                </div>
            )
        },
        {
            header: 'Course/Sem',
            field: 'courseName',
            render: (row) => (
                <div className="text-sm">
                    <span className="font-medium">{row.courseName}</span>
                    <span className="mx-1 text-gray-400">|</span>
                    <span className="text-blue-600 font-semibold">Sem {row.semester}</span>
                </div>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Subject Master</h2>
                    <p className="text-sm text-gray-600">Define subjects for each course semester</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Subject
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
                <div className="w-full md:w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Course</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red focus:border-biyani-red"
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                    >
                        <option value="">All Courses</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Semester</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red focus:border-biyani-red"
                        value={filterSemester}
                        onChange={(e) => setFilterSemester(e.target.value)}
                        disabled={!filterCourse}
                    >
                        <option value="">All Semesters</option>
                        {filterCourse && (() => {
                            const selectedCourse = courses.find(c => c.id === filterCourse);
                            const duration = selectedCourse?.duration ? parseInt(selectedCourse.duration) : 4;
                            const maxSemesters = duration * 2 || 8;
                            return Array.from({ length: maxSemesters }, (_, i) => i + 1).map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ));
                        })()}
                    </select>
                </div>

                <div className="flex-1 flex justify-end">
                    {/* Placeholder for future search or export */}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={filteredSubjects}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    emptyMessage="No subjects found matching your filters."
                />
            </div>

            {showForm && (
                <FormModal
                    isOpen={true}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleSubmit}
                    title={editingSubject ? 'Edit Subject' : 'Create New Subject'}
                    submitText={editingSubject ? 'Update Subject' : 'Create Subject'}
                    loading={formLoading}
                >
                    <div className="space-y-4">
                        {/* Course & Semester */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                                <select
                                    value={formData.courseId}
                                    onChange={(e) => {
                                        const selected = courses.find(c => c.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            courseId: e.target.value,
                                            // Reset semester if out of range, or keep if valid
                                            semester: '1'
                                        });
                                    }}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    required
                                >
                                    <option value="">Select Course</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                                <select
                                    value={formData.semester}
                                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    disabled={!formData.courseId}
                                >
                                    {(() => {
                                        const selectedCourse = courses.find(c => c.id === formData.courseId);
                                        // Default to 8 if duration not found, otherwise duration * 2
                                        const duration = selectedCourse?.duration ? parseInt(selectedCourse.duration) : 4;
                                        const maxSemesters = duration * 2 || 8;

                                        return Array.from({ length: maxSemesters }, (_, i) => i + 1).map(sem => (
                                            <option key={sem} value={sem}>Semester {sem}</option>
                                        ));
                                    })()}
                                </select>
                            </div>
                        </div>

                        {/* Subject Details */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <Input
                                    label="Subject Name *"
                                    placeholder="e.g. Data Structures"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Input
                                    label="Subject Code *"
                                    placeholder="e.g. BCA-301"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Type & Credits */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="Theory">Theory</option>
                                    <option value="Practical">Practical</option>
                                    <option value="Lab">Lab</option>
                                    <option value="Elective">Elective</option>
                                </select>
                            </div>
                            <div>
                                <Input
                                    label="Credits"
                                    type="number"
                                    value={formData.credits}
                                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </FormModal>
            )}
        </div>
    );
}
