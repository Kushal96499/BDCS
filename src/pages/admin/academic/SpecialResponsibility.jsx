// ============================================
// BDCS - Special Responsibility Assignment
// Assign roles like Student Council, Sports Incharge, etc.
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { toast } from '../../../components/admin/Toast';
import { useAuth } from '../../../hooks/useAuth';
import DataTable from '../../../components/admin/DataTable';

export default function SpecialResponsibility() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [teachers, setTeachers] = useState([]);
    const [assignments, setAssignments] = useState([]);

    const [selectedRole, setSelectedRole] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState('');

    const specialRoles = [
        { value: 'student_council_incharge', label: 'Student Council Incharge' },
        { value: 'sports_incharge', label: 'Sports Incharge' },
        { value: 'cultural_incharge', label: 'Cultural Incharge' },
        { value: 'discipline_incharge', label: 'Discipline Incharge' },
        { value: 'exam_coordinator', label: 'Exam Coordinator' },
        { value: 'placement_coordinator', label: 'Placement Coordinator' }
    ];

    useEffect(() => {
        fetchInitialData();
        fetchAssignments();
    }, []);

    const fetchInitialData = async () => {
        try {
            const teacherSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher'), where('status', '==', 'active')));
            setTeachers(teacherSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const snap = await getDocs(collection(db, 'special_responsibilities'));
            setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedRole || !selectedTeacher) {
            toast.error('Select role and teacher');
            return;
        }

        try {
            const roleLabel = specialRoles.find(r => r.value === selectedRole)?.label;
            const teacher = teachers.find(t => t.id === selectedTeacher);

            await addDoc(collection(db, 'special_responsibilities'), {
                role: selectedRole,
                roleName: roleLabel,
                teacherId: selectedTeacher,
                teacherName: teacher?.name,
                teacherEmail: teacher?.email,
                assignedBy: user.uid,
                assignedAt: serverTimestamp()
            });

            toast.success('Responsibility assigned');
            fetchAssignments();
            setSelectedRole('');
            setSelectedTeacher('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to assign');
        }
    };

    const handleRemove = async (id) => {
        if (!window.confirm('Remove this responsibility?')) return;
        try {
            await deleteDoc(doc(db, 'special_responsibilities', id));
            toast.success('Removed successfully');
            fetchAssignments();
        } catch (error) {
            toast.error('Failed to remove');
        }
    };

    const columns = [
        { key: 'roleName', label: 'Responsibility' },
        { key: 'teacherName', label: 'Assigned To' },
        { key: 'teacherEmail', label: 'Email' },
        {
            key: 'actions', label: 'Actions', render: (row) => (
                <button onClick={() => handleRemove(row.id)} className="text-red-600 hover:text-red-800">Remove</button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Special Responsibilities</h2>
                <p className="text-sm text-gray-600">Assign non-academic roles to faculty</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsibility</label>
                    <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full border-gray-300 rounded-lg">
                        <option value="">Select Role</option>
                        {specialRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={assignments}
                    loading={loading}
                    emptyMessage="No special responsibilities assigned."
                />
            </div>
        </div>
    );
}
