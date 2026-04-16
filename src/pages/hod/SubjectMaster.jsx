// ============================================
// BDCS - Subject Master (HOD)
// Create & Manage Subjects for Department Courses
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
import { motion, AnimatePresence } from 'framer-motion';

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
        type: 'Theory',
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
        if (user?.departmentId) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const coursesQ = query(collection(db, 'courses'), where('status', '==', 'active'));
            const coursesSnap = await getDocs(coursesQ);
            setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            const subjectsQ = query(collection(db, 'subjects'), where('departmentId', '==', user.departmentId));
            const subjectsSnap = await getDocs(subjectsQ);
            setSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load academic hub');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingSubject(null);
        setFormData({ name: '', code: '', courseId: '', semester: '1', type: 'Theory', credits: '4', status: 'active' });
        setShowForm(true);
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code,
            courseId: subject.courseId,
            semester: String(subject.semester),
            type: subject.type || 'Theory',
            credits: String(subject.credits || '4'),
            status: subject.status
        });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.code || !formData.courseId) {
            toast.error('Subject Name, Code, and Course are required');
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
                departmentName: user.departmentName,
                status: formData.status,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            };

            if (editingSubject) {
                await updateDoc(doc(db, 'subjects', editingSubject.id), payload);
                await logUpdate('subjects', editingSubject.id, editingSubject, payload, user);
                toast.success('Curriculum Updated');
            } else {
                payload.createdAt = serverTimestamp();
                payload.createdBy = user.uid;
                const ref = await addDoc(collection(db, 'subjects'), payload);
                await logCreate('subjects', ref.id, payload, user);
                toast.success('New Subject Cataloged');
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            toast.error('Manifest synchronization failed');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (subject) => {
        if (!window.confirm(`Are you sure you want to delete ${subject.name}?`)) return;
        try {
            await deleteDoc(doc(db, 'subjects', subject.id));
            toast.success('Subject removed');
            fetchData();
        } catch (error) {
            toast.error('Deletion failed');
        }
    };

    const columns = [
        {
            header: 'Subject Details',
            field: 'name',
            render: (row) => (
                <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black text-xs shadow-sm border border-red-100">
                        {row.code}
                    </div>
                    <div>
                        <div className="font-black text-gray-900 tracking-tight">{row.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {row.type} • {row.credits} Credits
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Course & Semester',
            field: 'courseName',
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{row.courseName}</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1 h-3 bg-emerald-500 rounded-full" />
                        Semester {row.semester}
                    </span>
                </div>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusPill status={row.status} />
        },
        {
            header: 'Actions',
            field: 'actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2.5 bg-white text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white transition-all border border-gray-100 shadow-sm"
                        title="Edit Subject"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15" /></svg>
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="p-2.5 bg-white text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-50 shadow-sm"
                        title="Delete Subject"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Subjects</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        Manage Department Subjects • {user?.departmentName}
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl shadow-xl shadow-gray-200 hover:bg-red-600 font-black uppercase tracking-widest text-xs flex items-center gap-3 active:scale-95 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Subject
                </button>
            </div>

            {/* Filter Suite */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <PremiumSelect
                    label="Course"
                    placeholder="All Courses"
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    options={courses.map(c => ({ label: c.name, value: c.id }))}
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" /></svg>}
                />

                <PremiumSelect
                    label="Semester"
                    placeholder="All Semesters"
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    options={Array.from({ length: 10 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1) }))}
                    disabled={!filterCourse}
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                
                <div className="flex justify-end h-full items-center">
                    {(filterCourse || filterSemester) && (
                        <button 
                            onClick={() => { setFilterCourse(''); setFilterSemester(''); }}
                            className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-black transition-colors"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredSubjects}
                    loading={loading}
                    emptyMessage="No subjects found in the catalog."
                    actions={false}
                />
            </div>

            <FormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSubmit={handleSubmit}
                title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
                submitText={editingSubject ? 'Save Changes' : 'Create Subject'}
                loading={formLoading}
            >
                <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <PremiumSelect
                            label="Course *"
                            value={formData.courseId}
                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value, semester: '1' })}
                            options={courses.map(c => ({ label: c.name, value: c.id }))}
                        />
                        <PremiumSelect
                            label="Semester *"
                            value={String(formData.semester)}
                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                            options={Array.from({ length: 10 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1) }))}
                            disabled={!formData.courseId}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <Input label="Subject Name *" placeholder="e.g. Computer Networks" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <Input label="Subject Code *" placeholder="BCA-501" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <PremiumSelect
                            label="Subject Type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            options={[
                                { label: 'Theory', value: 'Theory' },
                                { label: 'Practical / Lab', value: 'Practical' },
                                { label: 'Lab Only', value: 'Lab' },
                                { label: 'Elective', value: 'Elective' }
                            ]}
                        />
                        <Input label="Credits" type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} />
                    </div>

                    <PremiumSelect
                        label="Status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]}
                    />
                </div>
            </FormModal>
        </div>
    );
}
