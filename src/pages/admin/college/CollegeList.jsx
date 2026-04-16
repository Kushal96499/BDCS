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
import Button from '../../../components/Button';
import CollegeForm from './CollegeForm';
import { motion, AnimatePresence } from 'framer-motion';

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
        { 
            header: 'Identity', 
            mobileFullWidth: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-gray-900 font-bold tracking-tight">{row.name}</span>
                    <span className="text-[10px] font-mono font-bold text-[#E31E24] tracking-widest mt-1 uppercase">{row.code}</span>
                </div>
            ) 
        },
        { header: 'Affiliation', field: 'affiliation', render: (row) => <span className="font-semibold text-[#E31E24]">{row.affiliation || 'University of Rajasthan'}</span> },
        { header: 'Campus', field: 'campusName', render: (row) => <span className="font-semibold">{row.campusName}</span> },
        { header: 'Type', field: 'type', render: (row) => <span className="capitalize font-semibold">{row.type}</span> },
        { header: 'Status', field: 'status', render: (row) => <StatusBadge status={row.status} /> },
        { 
            header: 'Timeline', 
            render: (row) => (
                <div className="flex flex-col text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                    <span>Incepted</span>
                    <span className="text-gray-900">{row.createdAt?.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) || 'N/A'}</span>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">College Portfolio</h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Manage institutional campuses & facilities</p>
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

                    <Button variant="primary" onClick={() => { setEditingCollege(null); setShowForm(true); }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                        <span>Add College</span>
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
                    data={colleges}
                    loading={loading}
                    onEdit={(college) => { setEditingCollege(college); setShowForm(true); }}
                    onStatusToggle={handleStatusToggle}
                    onDelete={!safeMode ? handleSafeDelete : null}
                    emptyMessage="No colleges found."
                />
            </div>

            <AnimatePresence>
                {showForm && (
                    <CollegeForm
                        college={editingCollege}
                        onClose={() => { setShowForm(false); setEditingCollege(null); }}
                        onSuccess={() => { setShowForm(false); setEditingCollege(null); fetchColleges(); }}
                    />
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, college: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Confirm Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </motion.div>
    );
}
