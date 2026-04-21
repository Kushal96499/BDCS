// ============================================
// BDCS - User Detail Panel Component
// Modern slide-out panel with tabs for user details
// Portaled to ensure full-screen coverage
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, orderBy, getDocs, limit, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import RoleHistory from './RoleHistory';
import StatusTimeline from './StatusTimeline';
import ConfirmDialog from './ConfirmDialog';
import { toast } from './Toast';
import { logDelete } from '../../utils/auditLogger';
import { validateUserDeletion } from '../../utils/userValidation';
import RoleAssignmentPanel from './RoleAssignmentPanel';

export default function UserDetailPanel({ user: targetUser, onClose, onUserDeleted, onUserUpdated, extraActions = [] }) {
    const { user: currentUser } = useAuth();
    const [auditLogs, setAuditLogs] = useState([]);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [validatingDelete, setValidatingDelete] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [showValidationDialog, setShowValidationDialog] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [editData, setEditData] = useState({
        name: targetUser?.name || '',
        email: targetUser?.email || '',
        phone: targetUser?.phone || targetUser?.phoneNumber || '',
        employeeId: targetUser?.employeeId || ''
    });

    useEffect(() => {
        if (targetUser) {
            setEditData({
                name: targetUser.name || '',
                email: targetUser.email || '',
                phone: targetUser.phone || targetUser.phoneNumber || '',
                employeeId: targetUser.employeeId || ''
            });
        }
    }, [targetUser]);

    const handleUpdate = async () => {
        if (!targetUser?.id) return;
        if (!editData.name || !editData.email) {
            toast.error('Name and Email are required');
            return;
        }

        try {
            setUpdateLoading(true);
            const userRef = doc(db, 'users', targetUser.id);
            await updateDoc(userRef, {
                name: editData.name,
                email: editData.email,
                phone: editData.phone,
                employeeId: editData.employeeId,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid
            });

            toast.success('Profile updated successfully');
            setIsEditing(false);
            onUserUpdated?.();
            // We usually want to close and reload or update local state
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update profile');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleForceDeleteClick = async () => {
        setValidatingDelete(true);
        try {
            const result = await validateUserDeletion(targetUser);
            if (!result.valid) {
                setValidationErrors(result.errors || [result.reason]);
                setShowValidationDialog(true);
            } else setDeleteDialog(true);
        } catch (error) {
            toast.error('Failed to validate user deletion safety');
        } finally {
            setValidatingDelete(false);
        }
    };

    const handleForceDelete = async () => {
        if (!targetUser?.id) return;
        try {
            setDeleteLoading(true);
            await logDelete('users', targetUser.id, targetUser, currentUser);
            await deleteDoc(doc(db, 'users', targetUser.id));
            toast.success(`User ${targetUser.name} has been permanently deleted`);
            setDeleteDialog(false);
            onUserDeleted?.();
            onClose();
        } catch (error) {
            toast.error('Failed to delete user');
        } finally {
            setDeleteLoading(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence mode="wait">
            {targetUser && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-950/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 350,
                            mass: 0.5
                        }}
                        className="relative w-full max-w-2xl bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl shadow-gray-900/15 flex flex-col overflow-hidden max-h-[94vh] md:max-h-[85vh] border border-gray-100/50"
                    >
                        {/* Header */}
                        <div className="bg-white p-6 sm:p-10 md:p-12 shrink-0 relative overflow-hidden border-b border-gray-50/50">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>

                            {/* Absolute Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 z-50 p-3 bg-gray-50/80 backdrop-blur-sm hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-red-100"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 relative z-10 pr-12 sm:pr-0">
                                <div className="flex items-center gap-5 sm:gap-8">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.8rem] bg-gray-900 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-2xl shadow-blue-900/10 shrink-0 border-4 border-white transform -rotate-3">
                                        {targetUser?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                            <h2 className="text-xl sm:text-3xl font-black text-gray-900 leading-none tracking-tight truncate max-w-[200px] sm:max-w-md">{targetUser?.name}</h2>
                                            <span className="px-2.5 py-1 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest h-fit">
                                                {targetUser?.role || 'Staff'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold uppercase tracking-widest">{targetUser?.email}</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${targetUser?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{targetUser?.status || 'Active'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`px-5 py-3 sm:px-8 sm:py-4 rounded-2xl transition-all border active:scale-95 flex items-center gap-3 ${isEditing ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm' : 'bg-gray-950 text-white border-gray-900 hover:bg-black shadow-2xl shadow-gray-200'}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                            <path d={isEditing ? "M6 18L18 6M6 6l12 12" : "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"} strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 pt-0 bg-white space-y-8 sm:space-y-10 no-scrollbar">
                            <div className="space-y-8">
                                <div className="bg-slate-50/50 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 p-4 sm:p-8 md:p-10 shadow-inner">
                                    <h3 className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 sm:mb-10 flex items-center gap-3 ml-1">
                                        <div className="w-2 h-2 bg-red-600 rounded-full" />
                                        Identity Architecture
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {isEditing ? (
                                            <>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                                    <input
                                                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-[1.2rem] text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                                                        value={editData.name}
                                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                                    <input
                                                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-[1.2rem] text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                                                        value={editData.email}
                                                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                                    <input
                                                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-[1.2rem] text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                                                        value={editData.phone}
                                                        onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Faculty ID (EMP)</label>
                                                    <input
                                                        className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-[1.2rem] text-sm font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                                                        value={editData.employeeId}
                                                        placeholder="institutional id"
                                                        onChange={e => setEditData({ ...editData, employeeId: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex items-end pb-1">
                                                    <button
                                                        onClick={handleUpdate}
                                                        disabled={updateLoading}
                                                        className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95"
                                                    >
                                                        {updateLoading ? 'Saving...' : 'Save Changes'}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <DetailItem label="Name" value={targetUser?.name} />
                                                <DetailItem label="Email" value={targetUser?.email} />
                                                <DetailItem label="Phone" value={targetUser?.phone || targetUser?.phoneNumber || 'N/A'} />
                                                <DetailItem label="Faculty ID (EMP)" value={targetUser?.employeeId || 'NOT SET'} />
                                                <DetailItem label="Account Status" value={targetUser?.status} isStatus />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 p-4 sm:p-8 md:p-10 shadow-sm">
                                    <h3 className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 sm:mb-10 flex items-center gap-3 ml-1">
                                        <div className="w-2 h-2 bg-[#E31E24] rounded-full" />
                                        Institutional Scope
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <ScopeItem icon="🏫" label="Campus" value={targetUser?.campusName} />
                                        <ScopeItem icon="🏢" label="College" value={targetUser?.collegeName} />
                                        <ScopeItem icon="📂" label="Department" value={targetUser?.departmentName} />
                                    </div>
                                </div>

                                {/* Custom Administrative Actions */}
                                {extraActions.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {extraActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={action.onClick}
                                                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${action.variant === 'danger'
                                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                                                    : action.variant === 'warning'
                                                        ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white'
                                                        : 'bg-gray-900 text-white border-gray-900 hover:bg-[#E31E24]'
                                                    }`}
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex flex-col text-slate-900">
                                        <h4 className="text-xs font-black tracking-tight">Delete User</h4>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Remove this account from the system</p>
                                    </div>
                                    <button
                                        onClick={handleForceDeleteClick}
                                        disabled={validatingDelete}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-[10px] font-black rounded-2xl transition-all uppercase tracking-widest active:scale-95 border border-red-100 hover:border-red-600"
                                    >
                                        {validatingDelete ? 'Checking...' : 'Delete User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <ConfirmDialog
                        isOpen={deleteDialog}
                        onClose={() => setDeleteDialog(false)}
                        onConfirm={handleForceDelete}
                        title="DANGER: Permanent Deletion"
                        message={`Confirm absolute deletion of account: ${targetUser?.name}. All records will be removed.`}
                        variant="danger"
                        confirmText={deleteLoading ? "Deleting..." : "Confirm Delete"}
                        loading={deleteLoading}
                    />
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

const DetailItem = ({ label, value, isStatus }) => (
    <div className="space-y-2 group">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-hover:text-blue-500">{label}</label>
        {isStatus ? (
            <div className="pt-1"><span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${value === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-100/50' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{value}</span></div>
        ) : (
            <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm transition-all group-hover:border-blue-100 group-hover:translate-x-1">
                <p className="text-[11px] sm:text-xs font-black text-gray-900 tracking-tight">{value || 'NOT SET'}</p>
            </div>
        )}
    </div>
);

const ScopeItem = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm">{icon}</div>
        <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            <span className="text-sm font-bold text-gray-900">{value || 'NOT ASSIGNED'}</span>
        </div>
    </div>
);

const AuditLogItem = ({ log, getActionColor }) => (
    <div className="bg-white border text-black border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                {log.action?.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                {format(log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp), 'MMM d, h:mm a')}
            </span>
        </div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">Updated By <span className="text-gray-900">{log.performedByName || 'System Update'}</span></p>
    </div>
);
