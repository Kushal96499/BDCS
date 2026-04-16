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
import Button from '../../../components/Button';
import DepartmentForm from './DepartmentForm';
import { motion, AnimatePresence } from 'framer-motion';

export default function DepartmentList() {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, dept: null, action: null, message: '' });
    const [safeMode, setSafeMode] = useState(true);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const q = query(collection(db, 'departments'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDepartments(data);
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = (dept) => {
        setConfirmDialog({ 
            isOpen: true, 
            dept, 
            action: 'toggle', 
            message: `Are you sure you want to ${dept.status === 'active' ? 'disable' : 'enable'} the Department of ${dept.name}?` 
        });
    };

    const handleSafeDelete = async (dept) => {
        if (safeMode) return;
        setLoading(true);
        try {
            // Check Dependencies (Courses)
            const coursesQ = query(collection(db, 'courses'), where('departmentId', '==', dept.id));
            const coursesSnap = await getDocs(coursesQ);
            const courseCount = coursesSnap.size;

            if (courseCount > 0) {
                setConfirmDialog({
                    isOpen: true,
                    dept,
                    action: 'archive',
                    title: 'Dependency Conflict',
                    message: `This department has ${courseCount} courses linked. \n\nHard deletion blocked. Archive instead?`
                });
            } else {
                setConfirmDialog({
                    isOpen: true,
                    dept,
                    action: 'delete',
                    title: 'Permanent Delete',
                    message: `Delete ${dept.name}? This cannot be undone.`
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
        { 
            header: 'Department Identity', 
            mobileFullWidth: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-gray-900 font-bold tracking-tight">{row.name}</span>
                    <span className="text-[10px] font-mono font-bold text-[#E31E24] tracking-widest mt-1 uppercase">{row.code}</span>
                </div>
            ) 
        },
        { 
            header: 'Institutional Affiliation', 
            render: (row) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-semibold">{row.collegeName}</span>
                        <span className="text-[10px] bg-red-50 text-[#E31E24] px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                            {row.collegeAffiliation || 'UOR'}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{row.campusName || 'Main Campus'}</span>
                </div>
            )
        },
        { header: 'HOD', field: 'hodName', render: (row) => <span className="font-semibold">{row.hodName || 'Not Assigned'}</span> },
        { header: 'Status', field: 'status', render: (row) => <StatusBadge status={row.status} /> },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Departments</h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Institutional structure and governance</p>
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

                    <Button variant="primary" onClick={() => { setEditingDept(null); setShowForm(true); }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                        <span>Add Dept</span>
                    </Button>
                </div>
            </div>

            {/* Warning Banner */}
            {!safeMode && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-xs font-bold text-red-600">Delete Mode Active: Structure changes are permanent.</p>
                </motion.div>
            )}

            <div className="animate-premium-slide">
                <DataTable
                    columns={columns}
                    data={departments}
                    loading={loading}
                    onEdit={(dept) => { setEditingDept(dept); setShowForm(true); }}
                    onStatusToggle={handleStatusToggle}
                    onDelete={!safeMode ? handleSafeDelete : null}
                    emptyMessage="No departments found."
                />
            </div>

            <AnimatePresence>
                {showForm && (
                    <DepartmentForm
                        dept={editingDept}
                        onClose={() => { setShowForm(false); setEditingDept(null); }}
                        onSuccess={() => { setShowForm(false); setEditingDept(null); fetchDepartments(); }}
                    />
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, dept: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Confirm Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </motion.div>
    );
}
