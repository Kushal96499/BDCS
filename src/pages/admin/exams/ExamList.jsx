// ============================================
// BDCS - Exam List (Admin)
// Manage institutional exams
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import { toast } from '../../../components/admin/Toast';
import ExamForm from './ExamForm';
import { useNavigate } from 'react-router-dom';

export default function ExamList() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingExam, setEditingExam] = useState(null);

    useEffect(() => {
        if (user) fetchExams();
    }, [user]);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'exams'), orderBy('startDate', 'desc'));
            const snap = await getDocs(q);
            setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching exams:', error);
            toast.error('Failed to load exams');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This will delete all configuration for this exam.')) return;
        try {
            await deleteDoc(doc(db, 'exams', id));
            toast.success('Exam deleted');
            fetchExams();
        } catch (error) {
            toast.error('Failed to delete exam');
        }
    };

    const columns = [
        { key: 'name', label: 'Exam Name' },
        { key: 'type', label: 'Type', render: (row) => <span className="uppercase">{row.type}</span> },
        { key: 'academicYear', label: 'Academic Year' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'actions', label: 'Actions', render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => { setEditingExam(row); setShowForm(true); }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => navigate(`/admin/exams/${row.id}/subjects`)}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                        Subjects
                    </button>
                    {row.status === 'draft' && (
                        <button
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                            Delete
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
                    <p className="text-sm text-gray-600">View institutional exams (Managed by Exam Cell)</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={exams}
                    loading={loading}
                    emptyMessage="No exams found."
                />
            </div>

            {showForm && (
                <ExamForm
                    isOpen={showForm}
                    onClose={() => setShowForm(false)}
                    initialData={editingExam}
                    onSuccess={() => {
                        setShowForm(false);
                        fetchExams();
                    }}
                />
            )}
        </div>
    );
}
