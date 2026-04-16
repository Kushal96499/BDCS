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
import Button from '../../../components/Button';
import CampusForm from './CampusForm';
import { motion } from 'framer-motion';

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
        setConfirmDialog({ 
            isOpen: true, 
            campus, 
            action: 'toggle', 
            message: `Are you sure you want to ${campus.status === 'active' ? 'disable' : 'enable'} ${campus.name}?` 
        });
    };

    const handleSafeDelete = async (campus) => {
        if (safeMode) return;

        setLoading(true);
        try {
            const collegesQ = query(collection(db, 'colleges'), where('campusId', '==', campus.id));
            const collegesSnap = await getDocs(collegesQ);
            const collegeCount = collegesSnap.size;

            if (collegeCount > 0) {
                setConfirmDialog({
                    isOpen: true,
                    campus,
                    action: 'archive',
                    title: 'Cannot Hard Delete',
                    message: `This campus has ${collegeCount} colleges linked to it. Hard deletion is prevented. Do you want to ARCHIVE it instead?`
                });
            } else {
                setConfirmDialog({
                    isOpen: true,
                    campus,
                    action: 'delete',
                    title: 'Permanent Delete',
                    message: `Are you sure you want to PERMANENTLY DELETE ${campus.name}? This action cannot be undone.`
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
            render: (row) => <span className="font-mono font-bold text-[#E31E24] tracking-wider">{row.code}</span>
        },
        {
            header: 'Campus Name',
            field: 'name',
            render: (row) => <span className="font-semibold text-gray-900">{row.name}</span>
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Established',
            field: 'createdAt',
            render: (row) => <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-widest">{row.createdAt?.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || 'N/A'}</span>
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Campus Repository</h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Manage institutional locations</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Safe Mode</span>
                        <button
                            onClick={() => setSafeMode(!safeMode)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 ${safeMode ? 'bg-emerald-500' : 'bg-red-500'}`}
                        >
                            <motion.span animate={{ x: safeMode ? 20 : 4 }} className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm" />
                        </button>
                    </div>

                    <Button variant="primary" onClick={handleAdd}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                        <span>Add Campus</span>
                    </Button>
                </div>
            </div>

            {/* Warning Banner */}
            {!safeMode && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-xs font-bold text-red-600">Delete Mode Active: Destructive actions authorized.</p>
                </motion.div>
            )}

            <div className="animate-premium-slide">
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

            <CampusForm
                isOpen={showForm}
                campus={editingCampus}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
            />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, campus: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Validate Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </motion.div>
    );
}
