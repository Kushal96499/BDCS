// ============================================
// BDCS - Academic Responsibility Assignment
// Assign Class Teachers and Subject Teachers
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { toast } from '../../../components/admin/Toast';
import { useAuth } from '../../../hooks/useAuth';
import DataTable from '../../../components/admin/DataTable';

export default function AcademicResponsibility() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('class_teacher'); // class_teacher or subject_teacher

    // Data State
    const [departments, setDepartments] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [assignments, setAssignments] = useState([]);

    // Form State
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedSem, setSelectedSem] = useState('1');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDept && selectedSem) {
            fetchAssignments();
            if (activeTab === 'subject_teacher') {
                fetchSubjects();
            }
        }
    }, [selectedDept, selectedSem, activeTab]);

    const fetchInitialData = async () => {
        try {
            // Fetch Departments
            const deptSnap = await getDocs(query(collection(db, 'departments'), where('status', '==', 'active')));
            setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Fetch Teachers
            const teacherSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'), where('status', '==', 'active')));
            setTeachers(teacherSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
            toast.error('Failed to load initial data');
        }
    };

    const fetchSubjects = async () => {
        try {
            const q = query(
                collection(db, 'subjects'),
                where('departmentId', '==', selectedDept),
                where('semester', '==', parseInt(selectedSem)),
                where('status', '==', 'active')
            );
            const snap = await getDocs(q);
            setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            let q;
            if (activeTab === 'class_teacher') {
                q = query(
                    collection(db, 'class_teachers'),
                    where('departmentId', '==', selectedDept),
                    where('semester', '==', parseInt(selectedSem))
                );
            } else {
                q = query(
                    collection(db, 'subject_teachers'),
                    where('departmentId', '==', selectedDept),
                    where('semester', '==', parseInt(selectedSem))
                );
            }
            const snap = await getDocs(q);
            setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedDept || !selectedTeacher) {
            toast.error('Please select all required fields');
            return;
        }

        try {
            const teacher = teachers.find(t => t.id === selectedTeacher);
            const dept = departments.find(d => d.id === selectedDept);
            const commonData = {
                departmentId: selectedDept,
                departmentName: dept?.name,
                semester: parseInt(selectedSem),
                teacherId: selectedTeacher,
                teacherName: teacher?.name,
                assignedBy: user.uid,
                assignedAt: serverTimestamp()
            };

            if (activeTab === 'class_teacher') {
                // Determine if assignment already exists for this sem/dept
                // Ideally should replace or warn. For now, simple add, but Firestore query above shows list so user sees it.
                // Better: Check active assignments in validataion.
                const existing = assignments.find(a => a.semester === parseInt(selectedSem) && a.departmentId === selectedDept);
                if (existing) {
                    if (!window.confirm('A Class Teacher is already assigned for this class. Overwrite?')) return;
                    await deleteDoc(doc(db, 'class_teachers', existing.id));
                }

                await addDoc(collection(db, 'class_teachers'), commonData);
            } else {
                if (!selectedSubject) {
                    toast.error('Select a subject');
                    return;
                }
                const subject = subjects.find(s => s.id === selectedSubject);
                await addDoc(collection(db, 'subject_teachers'), {
                    ...commonData,
                    subjectId: selectedSubject,
                    subjectName: subject?.name,
                    subjectCode: subject?.code
                });
            }

            toast.success('Responsibility assigned successfully');
            fetchAssignments();
            setSelectedTeacher('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to assign responsibility');
        }
    };

    const handleRemove = async (id, collectionName) => {
        if (!window.confirm('Remove this assignment?')) return;
        try {
            await deleteDoc(doc(db, collectionName, id));
            toast.success('Removed successfully');
            fetchAssignments();
        } catch (error) {
            toast.error('Failed to remove');
        }
    };

    const columns = activeTab === 'class_teacher' ? [
        { key: 'departmentName', label: 'Department' },
        { key: 'semester', label: 'Semester' },
        { key: 'teacherName', label: 'Class Teacher' },
        {
            key: 'actions', label: 'Actions', render: (row) => (
                <button onClick={() => handleRemove(row.id, 'class_teachers')} className="text-red-600 hover:text-red-800">Remove</button>
            )
        }
    ] : [
        { key: 'subjectName', label: 'Subject' },
        { key: 'subjectCode', label: 'Code' },
        { key: 'teacherName', label: 'Subject Teacher' },
        {
            key: 'actions', label: 'Actions', render: (row) => (
                <button onClick={() => handleRemove(row.id, 'subject_teachers')} className="text-red-600 hover:text-red-800">Remove</button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Academic Responsibility</h2>
                <p className="text-sm text-gray-600">Assign Class Teachers and Subject Teachers</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`px-6 py-3 font-medium text-sm ${activeTab === 'class_teacher' ? 'border-b-2 border-biyani-red text-biyani-red' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('class_teacher')}
                >
                    Class Teachers
                </button>
                <button
                    className={`px-6 py-3 font-medium text-sm ${activeTab === 'subject_teacher' ? 'border-b-2 border-biyani-red text-biyani-red' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('subject_teacher')}
                >
                    Subject Teachers
                </button>
            </div>

            {/* Assignment Form */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full border-gray-300 rounded-lg">
                        <option value="">Select Department</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} className="w-full border-gray-300 rounded-lg">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                    </select>
                </div>

                {activeTab === 'subject_teacher' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full border-gray-300 rounded-lg">
                            <option value="">Select Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                    <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="w-full border-gray-300 rounded-lg">
                        <option value="">Select Teacher</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>)}
                    </select>
                </div>

                <div>
                    <button onClick={handleAssign} className="w-full bg-biyani-red text-white py-2 rounded-lg hover:bg-red-700">Assign</button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={assignments}
                    loading={loading}
                    emptyMessage="No assignments found."
                />
            </div>
        </div>
    );
}
