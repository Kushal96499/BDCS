// ============================================
// BDCS - Subject Master (HOD)
// Create & Manage Subjects for Department Courses
// Modernized "Aether Ledger" Table Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { logCreate, logUpdate } from '../../utils/auditLogger';
import StatusPill from '../../components/common/StatusPill';
import FormModal from '../../components/admin/FormModal';
import Input from '../../components/Input';
import PremiumSelect from '../../components/common/PremiumSelect';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
};

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
    }).sort((a, b) => parseInt(a.semester) - parseInt(b.semester) || a.name.localeCompare(b.name));

    useEffect(() => {
        if (user?.departmentId) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const coursesQ = query(collection(db, 'courses'), where('status', '==', 'active'));
            const coursesSnap = await getDocs(coursesQ);
            setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const subjectsQ = query(collection(db, 'subjects'), where('departmentId', '==', user.departmentId));
            const subjectsSnap = await getDocs(subjectsQ);
            setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Manifest sync failed');
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
            toast.error('Identifier and Nomenclature required');
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
                toast.success('Vector Updated');
            } else {
                payload.createdAt = serverTimestamp();
                payload.createdBy = user.uid;
                const ref = await addDoc(collection(db, 'subjects'), payload);
                await logCreate('subjects', ref.id, payload, user);
                toast.success('Node Cataloged');
            }
            setShowForm(false);
            fetchData();
        } catch (error) {
            toast.error('Commit failed');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (subject) => {
        if (!window.confirm(`Sanction deletion of ${subject.name}?`)) return;
        try {
            await deleteDoc(doc(db, 'subjects', subject.id));
            toast.success('Node Terminated');
            fetchData();
        } catch (error) {
            toast.error('Deletion failed');
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Subject Master</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 bg-[#E31E24] rounded-full" />
                        Departmental Inventory // {user?.departmentName}
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl shadow-xl shadow-slate-200 hover:bg-[#E31E24] font-black uppercase tracking-widest text-[10px] flex items-center gap-3 active:scale-95 transition-all outline-none"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
                    New Subject
                </button>
            </div>

            {/* Filter Section */}
            <div className="bg-white/80 backdrop-blur-3xl p-6 rounded-[2rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <PremiumSelect
                    label="Filter Course"
                    placeholder="All Programs"
                    value={filterCourse}
                    onChange={(e) => { setFilterCourse(e.target.value); setFilterSemester(''); }}
                    options={courses.map(c => ({ label: c.name, value: c.id }))}
                />
                <PremiumSelect
                    label="Filter Phase"
                    placeholder="All Semesters"
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    options={Array.from({ length: 12 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1) }))}
                    disabled={!filterCourse}
                />
                <div className="flex h-[54px] items-center px-4">
                    {(filterCourse || filterSemester) && (
                        <button 
                            onClick={() => { setFilterCourse(''); setFilterSemester(''); }}
                            className="text-[10px] font-black text-[#E31E24] hover:text-slate-900 transition-colors uppercase tracking-widest"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject Code</th>
                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject Name</th>
                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Semester</th>
                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Credits</th>
                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="p-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Commit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-8"><div className="h-6 bg-slate-50 rounded-lg w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredSubjects.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">No academic nodes isolated</p>
                                    </td>
                                </tr>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {filteredSubjects.map((subject, idx) => (
                                        <motion.tr 
                                            key={subject.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="group hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="w-fit px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-tight group-hover:bg-[#E31E24] group-hover:text-white group-hover:border-[#E31E24] transition-all">
                                                    {subject.code}
                                                </div>
                                            </td>
                                            <td className="p-6 min-w-[250px]">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-[#E31E24] transition-colors">{subject.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{subject.type}</p>
                                                </div>
                                            </td>
                                            <td className="p-6 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black text-slate-700 uppercase">{subject.courseName}</span>
                                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                                        <span className="w-1 h-3 bg-emerald-500 rounded-full" />
                                                        Semester {subject.semester}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6 whitespace-nowrap">
                                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md">{subject.credits} CR</span>
                                            </td>
                                            <td className="p-6 text-center whitespace-nowrap">
                                                <StatusPill status={subject.status} />
                                            </td>
                                            <td className="p-6 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(subject)}
                                                        title="Modify Subject Details"
                                                        className="p-2.5 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(subject)}
                                                        title="Permanently Delete Subject"
                                                        className="p-2.5 text-slate-300 hover:text-[#E31E24] hover:bg-red-50 rounded-xl transition-all active:scale-95"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            <FormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSubmit={handleSubmit}
                title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
                submitText={editingSubject ? 'Save Changes' : 'Add Subject'}
                loading={formLoading}
            >
                <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <PremiumSelect
                            label="Course Context *"
                            value={formData.courseId}
                            onChange={(e) => setFormData({ ...formData, courseId: e.target.value, semester: '1' })}
                            options={courses.map(c => ({ label: c.name, value: c.id }))}
                        />
                        <PremiumSelect
                            label="Academic Phase *"
                            value={String(formData.semester)}
                            onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                            options={Array.from({ length: 12 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1) }))}
                            disabled={!formData.courseId}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <Input label="Subject Nomenclature *" placeholder="e.g. Machine Learning" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <Input label="System Code *" placeholder="BCA-601" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <PremiumSelect
                            label="Resource Type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            options={[
                                { label: 'Theory Vector', value: 'Theory' },
                                { label: 'Practical Phase', value: 'Practical' },
                                { label: 'Laboratory Node', value: 'Lab' },
                                { label: 'Advanced Elective', value: 'Elective' }
                            ]}
                        />
                        <Input label="Credit Value" type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} />
                    </div>

                    <PremiumSelect
                        label="Operating Status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[{ label: 'Operational (Active)', value: 'active' }, { label: 'Decommissioned (Inactive)', value: 'inactive' }]}
                    />
                </div>
            </FormModal>
        </div>
    );
}
