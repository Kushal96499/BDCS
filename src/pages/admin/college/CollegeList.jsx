// ============================================
// BDCS - College List Component
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
import CollegeForm from './CollegeForm';

export default function CollegeList() {
    const { user } = useAuth();
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCollege, setEditingCollege] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, college: null, action: null, message: '' });
    const [safeMode, setSafeMode] = useState(true);

    useEffect(() => {
        fetchColleges();
    }, []);

    const fetchColleges = async () => {
        try {
            const q = query(collection(db, 'colleges'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setColleges(data);
        } catch (error) {
            console.error('Error fetching colleges:', error);
            toast.error('Failed to load colleges');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = (college) => {
        setConfirmDialog({ isOpen: true, college, action: 'toggle', message: `Are you sure you want to ${college.status === 'active' ? 'disable' : 'enable'} ${college.name}?` });
    };

    const handleSafeDelete = async (college) => {
        if (safeMode) return;

        setLoading(true);
        try {
            // Check Dependencies (Departments)
            const deptsQ = query(collection(db, 'departments'), where('collegeId', '==', college.id));
            const deptsSnap = await getDocs(deptsQ);
            const deptCount = deptsSnap.size;

            if (deptCount > 0) {
                setConfirmDialog({
                    isOpen: true,
                    college,
                    action: 'archive',
                    title: 'Cannot Hard Delete',
                    message: `This college has ${deptCount} departments linked to it. \n\nHard deletion is prevented. \n\nDo you want to ARCHIVE it instead?`
                });
            } else {
                setConfirmDialog({
                    isOpen: true,
                    college,
                    action: 'delete',
                    title: 'Permanent Delete',
                    message: `Are you sure you want to PERMANENTLY DELETE ${college.name}? \n\nThis action cannot be undone.`
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
        const { college, action } = confirmDialog;
        if (!college || !action) return;

        try {
            if (action === 'toggle') {
                const newStatus = college.status === 'active' ? 'inactive' : 'active';
                const collegeRef = doc(db, 'colleges', college.id);
                const beforeData = { ...college };
                const afterData = { ...college, status: newStatus, updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(collegeRef, { status: newStatus, updatedAt: new Date(), updatedBy: user.uid });
                await logStatusChange('colleges', college.id, beforeData, afterData, user);
                toast.success(`College ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
            }
            else if (action === 'archive') {
                const collegeRef = doc(db, 'colleges', college.id);
                const beforeData = { ...college };
                const afterData = { ...college, status: 'archived', updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(collegeRef, { status: 'archived', updatedAt: new Date(), updatedBy: user.uid });
                await logAudit('colleges', college.id, 'archive', beforeData, afterData, user, { label: college.name });
                toast.success(`College archived`);
            }
            else if (action === 'delete') {
                await deleteDoc(doc(db, 'colleges', college.id));
                await logDelete('colleges', college.id, college, user, { label: college.name });
                toast.success(`College permanently deleted`);
            }

            setConfirmDialog({ isOpen: false, college: null, action: null, message: '' });
            fetchColleges();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        { header: 'Code', field: 'code', render: (row) => <span className="font-mono font-semibold">{row.code}</span> },
        { header: 'Name', field: 'name' },
        { header: 'Campus', field: 'campusName' },
        { header: 'Type', field: 'type', render: (row) => <span className="capitalize">{row.type}</span> },
        { header: 'Status', field: 'status', render: (row) => <StatusBadge status={row.status} /> },
        { header: 'Created', field: 'createdAt', render: (row) => row.createdAt?.toDate().toLocaleDateString() || 'N/A' }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">College Management</h2>
                    <p className="text-sm text-gray-600">Manage colleges under campuses</p>
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
                        onClick={() => { setEditingCollege(null); setShowForm(true); }}
                        className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add College
                    </button>
                </div>
            </div>

            {/* Warning Banner */}
            {!safeMode && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-sm text-red-700"><strong>Delete Mode Active:</strong> You can now permanently delete colleges.</p>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={colleges}
                    loading={loading}
                    onEdit={(college) => { setEditingCollege(college); setShowForm(true); }}
                    onStatusToggle={handleStatusToggle}
                    onDelete={!safeMode ? handleSafeDelete : null}
                    emptyMessage="No colleges found."
                />
            </div>

            {showForm && (
                <CollegeForm
                    college={editingCollege}
                    onClose={() => { setShowForm(false); setEditingCollege(null); }}
                    onSuccess={() => { setShowForm(false); setEditingCollege(null); fetchColleges(); }}
                />
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, college: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Confirm Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </div>
    );
}
