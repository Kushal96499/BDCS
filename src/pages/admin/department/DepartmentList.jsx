// ============================================
// BDCS - Department List Component
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
import DepartmentForm from './DepartmentForm';

export default function DepartmentList() {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, dept: null, action: null, message: '' });
    const [safeMode, setSafeMode] = useState(true); // Default: Safe Mode ON (Delete Hidden)

    useEffect(() => { fetchDepartments(); }, []);

    const fetchDepartments = async () => {
        try {
            const q = query(collection(db, 'departments'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = (dept) => setConfirmDialog({ isOpen: true, dept, action: 'toggle', message: `Are you sure you want to ${dept.status === 'active' ? 'disable' : 'enable'} ${dept.name}?` });

    const handleSafeDelete = async (dept) => {
        if (safeMode) return; // Should not be callable in safe mode, but double check

        setLoading(true);
        try {
            // Check Dependencies
            const usersQ = query(collection(db, 'users'), where('departmentId', '==', dept.id));
            const coursesQ = query(collection(db, 'courses'), where('departmentId', '==', dept.id));

            const [usersSnap, coursesSnap] = await Promise.all([getDocs(usersQ), getDocs(coursesQ)]);
            const userCount = usersSnap.size;
            const courseCount = coursesSnap.size;

            if (userCount > 0 || courseCount > 0) {
                // Has dependencies -> Suggest Archive
                setConfirmDialog({
                    isOpen: true,
                    dept,
                    action: 'archive',
                    title: 'Cannot Hard Delete',
                    message: `This department has ${userCount} users and ${courseCount} courses linked to it. \n\nHard deletion is prevented to protect data. \n\nDo you want to ARCHIVE it instead? (This will hide it from new selections but keep history).`
                });
            } else {
                // No dependencies -> Allow Hard Delete
                setConfirmDialog({
                    isOpen: true,
                    dept,
                    action: 'delete',
                    title: 'Permanent Delete',
                    message: `Are you sure you want to PERMANENTLY DELETE ${dept.name}? \n\nThis action cannot be undone. Check audit logs for restoration if needed (only if backed up).`
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
        const { dept, action } = confirmDialog;
        if (!dept || !action) return;

        try {
            if (action === 'toggle') {
                const newStatus = dept.status === 'active' ? 'inactive' : 'active';
                const deptRef = doc(db, 'departments', dept.id);
                const beforeData = { ...dept };
                const afterData = { ...dept, status: newStatus, updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(deptRef, { status: newStatus, updatedAt: new Date(), updatedBy: user.uid });
                await logStatusChange('departments', dept.id, beforeData, afterData, user);
                toast.success(`Department ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
            }
            else if (action === 'archive') {
                const deptRef = doc(db, 'departments', dept.id);
                const beforeData = { ...dept };
                const afterData = { ...dept, status: 'archived', updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(deptRef, { status: 'archived', updatedAt: new Date(), updatedBy: user.uid });
                await logAudit('departments', dept.id, 'archive', beforeData, afterData, user, { label: dept.name });
                toast.success(`Department archived`);
            }
            else if (action === 'delete') {
                await deleteDoc(doc(db, 'departments', dept.id));
                await logDelete('departments', dept.id, dept, user, { label: dept.name });
                toast.success(`Department permanently deleted`);
            }

            setConfirmDialog({ isOpen: false, dept: null, action: null, message: '' });
            fetchDepartments();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        { header: 'Code', field: 'code', render: (row) => <span className="font-mono font-semibold">{row.code}</span> },
        { header: 'Name', field: 'name' },
        { header: 'College', field: 'collegeName' },
        { header: 'HOD', field: 'hodName', render: (row) => row.hodName || <span className="text-gray-400">Not Assigned</span> },
        { header: 'Status', field: 'status', render: (row) => <StatusBadge status={row.status} /> }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Department Management</h2>
                    <p className="text-sm text-gray-600">Manage departments and HOD assignments</p>
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

                    <button onClick={() => { setEditingDept(null); setShowForm(true); }} className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Department
                    </button>
                </div>
            </div>

            {/* Warning Banner when Safe Mode is OFF */}
            {!safeMode && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                <strong>Delete Mode Active:</strong> You can now permanently delete departments. Please be careful.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={departments}
                    loading={loading}
                    onEdit={(dept) => { setEditingDept(dept); setShowForm(true); }}
                    onStatusToggle={handleStatusToggle}
                    onDelete={!safeMode ? handleSafeDelete : null} // Only pass logic if unsafe
                    emptyMessage="No departments found."
                />
            </div>

            {showForm && <DepartmentForm department={editingDept} onClose={() => { setShowForm(false); setEditingDept(null); }} onSuccess={() => { setShowForm(false); setEditingDept(null); fetchDepartments(); }} />}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, dept: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Confirm Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </div>
    );
}
