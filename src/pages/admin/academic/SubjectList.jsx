// ============================================
// BDCS - Subject List (Admin/HOD)
// Manage academic subjects
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import SubjectForm from './SubjectForm';
import { toast } from '../../../components/admin/Toast';
import { logStatusChange } from '../../../utils/auditLogger';

export default function SubjectList() {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            let q;

            // HODs only see their department's subjects
            if (user.role === 'hod') {
                q = query(
                    collection(db, 'subjects'),
                    where('departmentId', '==', user.departmentId),
                    orderBy('code')
                );
            } else {
                // Admins see all
                q = query(collection(db, 'subjects'), orderBy('code'));
            }

            const snapshot = await getDocs(q);
            setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching subjects:', error);
            toast.error('Failed to fetch subjects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, [user]);

    const handleAdd = () => {
        setEditingSubject(null);
        setShowForm(true);
    };

    const handleEdit = (subject) => {
        setEditingSubject(subject);
        setShowForm(true);
    };

    const handleStatusToggle = async (subject) => {
        try {
            const newStatus = subject.status === 'active' ? 'inactive' : 'active';
            await updateDoc(doc(db, 'subjects', subject.id), { status: newStatus });
            await logStatusChange('subjects', subject.id, subject, { ...subject, status: newStatus }, user);

            setSubjects(prev => prev.map(s =>
                s.id === subject.id ? { ...s, status: newStatus } : s
            ));
            toast.success('Subject status updated');
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const columns = [
        {
            header: 'Code',
            field: 'code',
            render: (row) => <span className="font-mono font-semibold">{row.code}</span>
        },
        { header: 'Name', field: 'name' },
        { header: 'Type', field: 'type', render: (row) => <span className="capitalize">{row.type}</span> },
        { header: 'Credits', field: 'credits' },
        { header: 'Semester', field: 'semester' },
        {
            header: 'Department',
            field: 'departmentName',
            render: (row) => user.role === 'admin' ? row.departmentName : null,
            hidden: user.role === 'hod'
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        }
    ];

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Subject Master</h2>
                    <p className="text-sm text-gray-600">Manage academic subjects and curriculum</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-biyani-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Subject
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={subjects}
                    loading={loading}
                    onEdit={handleEdit}
                    onStatusToggle={handleStatusToggle}
                    emptyMessage="No subjects found."
                />
            </div>

            {showForm && (
                <SubjectForm
                    isOpen={showForm}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                        fetchSubjects();
                    }}
                    initialData={editingSubject}
                />
            )}
        </div>
    );
}
