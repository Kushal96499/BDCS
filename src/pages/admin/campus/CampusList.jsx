// ============================================
// BDCS - Campus List Component
// Displays all campuses with CRUD actions
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logStatusChange, logDelete, logAudit } from '../../../utils/auditLogger';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import CampusForm from './CampusForm';

export default function CampusList() {
    const { user } = useAuth();
    const [campuses, setCampuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCampus, setEditingCampus] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, campus: null, action: null, message: '' });
    const [safeMode, setSafeMode] = useState(true);

    useEffect(() => {
        fetchCampuses();
    }, []);

    const fetchCampuses = async () => {
        try {
            const q = query(collection(db, 'campuses'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCampuses(data);
        } catch (error) {
            console.error('Error fetching campuses:', error);
            toast.error('Failed to load campuses');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingCampus(null);
        setShowForm(true);
    };

    const handleEdit = (campus) => {
        setEditingCampus(campus);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingCampus(null);
    };

    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingCampus(null);
        fetchCampuses();
    };

    const handleStatusToggle = (campus) => {
        setConfirmDialog({ isOpen: true, campus, action: 'toggle', message: `Are you sure you want to ${campus.status === 'active' ? 'disable' : 'enable'} ${campus.name}?` });
    };

    const handleSafeDelete = async (campus) => {
        if (safeMode) return;

        setLoading(true);
        try {
            // Check Dependencies (Colleges)
            const collegesQ = query(collection(db, 'colleges'), where('campusId', '==', campus.id));
            const collegesSnap = await getDocs(collegesQ);
            const collegeCount = collegesSnap.size;

            if (collegeCount > 0) {
                setConfirmDialog({
                    isOpen: true,
                    campus,
                    action: 'archive',
                    title: 'Cannot Hard Delete',
                    message: `This campus has ${collegeCount} colleges linked to it. \n\nHard deletion is prevented. \n\nDo you want to ARCHIVE it instead?`
                });
            } else {
                setConfirmDialog({
                    isOpen: true,
                    campus,
                    action: 'delete',
                    title: 'Permanent Delete',
                    message: `Are you sure you want to PERMANENTLY DELETE ${campus.name}? \n\nThis action cannot be undone.`
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to check dependencies");
        } finally {
            setLoading(false);
        }
    };

    const executeAction = async () => {
        const { campus, action } = confirmDialog;
        if (!campus || !action) return;

        try {
            if (action === 'toggle') {
                const newStatus = campus.status === 'active' ? 'inactive' : 'active';
                const campusRef = doc(db, 'campuses', campus.id);
                const beforeData = { ...campus };
                const afterData = { ...campus, status: newStatus, updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(campusRef, { status: newStatus, updatedAt: new Date(), updatedBy: user.uid });
                await logStatusChange('campuses', campus.id, beforeData, afterData, user);
                toast.success(`Campus ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
            }
            else if (action === 'archive') {
                const campusRef = doc(db, 'campuses', campus.id);
                const beforeData = { ...campus };
                const afterData = { ...campus, status: 'archived', updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(campusRef, { status: 'archived', updatedAt: new Date(), updatedBy: user.uid });
                await logAudit('campuses', campus.id, 'archive', beforeData, afterData, user, { label: campus.name });
                toast.success(`Campus archived`);
            }
            else if (action === 'delete') {
                await deleteDoc(doc(db, 'campuses', campus.id));
                await logDelete('campuses', campus.id, campus, user, { label: campus.name });
                toast.success(`Campus permanently deleted`);
            }

            setConfirmDialog({ isOpen: false, campus: null, action: null, message: '' });
            fetchCampuses();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        {
            header: 'Code',
            field: 'code',
            render: (row) => <span className="font-mono font-semibold text-gray-900">{row.code}</span>
        },
        {
            header: 'Name',
            field: 'name'
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Created',
            field: 'createdAt',
            render: (row) => row.createdAt?.toDate().toLocaleDateString() || 'N/A'
        }
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Campus Management</h2>
                    <p className="text-sm text-gray-600">Manage campus locations and facilities</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Safe Mode Toggle */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <span className="text-xs font-medium text-gray-600">Safe Mode</span>
                        <button
                            onClick={() => setSafeMode(!safeMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${safeMode ? 'bg-green-500' : 'bg-red-500'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${safeMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-xs font-bold ${safeMode ? 'text-green-600' : 'text-red-600'}`}>
                            {safeMode ? 'ON' : 'OFF'}
                        </span>
                    </div>

                    <button
                        onClick={handleAdd}
                        className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Campus
                    </button>
                </div>
            </div>

            {/* Warning Banner */}
            {!safeMode && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-sm text-red-700"><strong>Delete Mode Active:</strong> You can now permanently delete campuses.</p>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={campuses}
                    loading={loading}
                    onEdit={handleEdit}
                    onStatusToggle={handleStatusToggle}
                    onDelete={!safeMode ? handleSafeDelete : null}
                    emptyMessage="No campuses found."
                />
            </div>

            {/* Form Modal */}
            {showForm && (
                <CampusForm
                    campus={editingCampus}
                    onClose={handleFormClose}
                    onSuccess={handleFormSuccess}
                />
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, campus: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Confirm Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </div>
    );
}
