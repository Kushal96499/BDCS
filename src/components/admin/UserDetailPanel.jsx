// ============================================
// BDCS - User Detail Panel Component
// Modern slide-out panel with tabs for user details
// Portaled to ensure full-screen coverage
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, orderBy, getDocs, limit, doc, deleteDoc } from 'firebase/firestore';
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

export default function UserDetailPanel({ user: targetUser, onClose, onUserDeleted, onUserUpdated }) {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [auditLogs, setAuditLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [validatingDelete, setValidatingDelete] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [showValidationDialog, setShowValidationDialog] = useState(false);
    const [overrideMode, setOverrideMode] = useState(false);

    useEffect(() => {
        if (activeTab === 'audit' && targetUser?.id) {
            fetchUserAuditLogs();
        }
    }, [activeTab, targetUser?.id]);

    const fetchUserAuditLogs = async () => {
        if (!targetUser?.id) return;
        try {
            setLogsLoading(true);
            const subjectQuery = query(collection(db, 'auditLogs'), where('documentId', '==', targetUser.id), orderBy('timestamp', 'desc'), limit(20));
            const performerQuery = query(collection(db, 'auditLogs'), where('performedBy', '==', targetUser.id), orderBy('timestamp', 'desc'), limit(20));
            const [subjectSnapshot, performerSnapshot] = await Promise.all([getDocs(subjectQuery), getDocs(performerQuery)]);
            const subjectLogs = subjectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), logType: 'subject' }));
            const performerLogs = performerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), logType: 'performer' }));
            const allLogs = [...subjectLogs, ...performerLogs];
            const uniqueLogs = Array.from(new Map(allLogs.map(log => [log.id, log])).values());
            uniqueLogs.sort((a, b) => (b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) - (a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp)));
            setAuditLogs(uniqueLogs.slice(0, 30));
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleForceDeleteClick = async () => {
        if (overrideMode) {
            setDeleteDialog(true);
            return;
        }
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

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'role-assignments', label: 'Role Assignments', icon: '🎭' },
        { id: 'role-history', label: 'Role History', icon: '📊' },
        { id: 'status', label: 'Status Timeline', icon: '⏱️' },
        { id: 'audit', label: 'Audit Logs', icon: '📋' }
    ];

    const getActionColor = (action) => {
        if (action?.includes('delete') || action === 'disable') return 'text-red-600 bg-red-50';
        if (action === 'relieve_user' || action === 'archive_user') return 'text-orange-600 bg-orange-50';
        if (action?.includes('create') || action === 'enable') return 'text-green-600 bg-green-50';
        return 'text-gray-600 bg-gray-50';
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence mode="wait">
            {targetUser && (
                <div className="fixed inset-0 z-[900] overflow-hidden">
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Slide-out Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 300 }}
                        dragElastic={0.05}
                        onDragEnd={(e, info) => {
                            if (info.offset.x > 150) onClose();
                        }}
                        className="absolute right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl flex flex-col focus:outline-none"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#E31E24] to-red-800 text-white p-4 sm:p-8 shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black border border-white/20">
                                        {targetUser?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl sm:text-2xl font-black truncate leading-tight tracking-tight">{targetUser?.name}</h2>
                                        <p className="text-xs sm:text-sm text-red-100/60 truncate font-bold uppercase tracking-widest">{targetUser?.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/10 rounded-xl border border-white/5">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${overrideMode ? 'text-yellow-400' : 'text-white/40'}`}>
                                            {overrideMode ? 'Lethal Mode' : 'Secured'}
                                        </span>
                                        <button
                                            onClick={() => setOverrideMode(!overrideMode)}
                                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none ${overrideMode ? 'bg-yellow-400' : 'bg-white/10'}`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${overrideMode ? 'translate-x-5.5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl transition-all border border-white/10"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-50 bg-white sticky top-0 z-20 shrink-0">
                            <div className="flex overflow-x-auto no-scrollbar px-4">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2.5 px-6 py-5 text-sm font-black whitespace-nowrap border-b-2 transition-all shrink-0 ${activeTab === tab.id
                                            ? 'border-[#E31E24] text-[#E31E24] bg-red-50/30'
                                            : 'border-transparent text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-xl">{tab.icon}</span>
                                        <span className="uppercase tracking-tighter">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 space-y-6 pb-32 no-scrollbar">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">Core Identity</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                            <DetailItem label="Full Legal Name" value={targetUser?.name} />
                                            <DetailItem label="Primary Email" value={targetUser?.email} />
                                            <DetailItem label="Operational Status" value={targetUser?.status} isStatus />
                                            <DetailItem label="Employee Identity" value={targetUser?.employeeId || 'NOT ASSIGNED'} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">Hierarchy Scope</h3>
                                        <div className="space-y-4">
                                            <ScopeItem icon="🏢" label="Campus" value={targetUser?.campusName} />
                                            <ScopeItem icon="🎓" label="College" value={targetUser?.collegeName} />
                                            <ScopeItem icon="🏛️" label="Department" value={targetUser?.departmentName} />
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2.5rem] bg-red-50/50 border border-red-100 relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h3 className="text-lg font-black text-red-900 mb-2 flex items-center gap-2">Termination Protocol</h3>
                                            <p className="text-xs font-bold text-red-600/70 mb-6 uppercase tracking-widest">Execute permanent data purge</p>
                                            <button
                                                onClick={handleForceDeleteClick}
                                                disabled={validatingDelete}
                                                className="px-8 py-4 bg-red-600 text-white text-xs font-black rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 uppercase tracking-widest"
                                            >
                                                {validatingDelete ? 'Verifying...' : 'Initialize Purge'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'role-assignments' && <RoleAssignmentPanel targetUser={targetUser} onUpdate={onUserUpdated} />}
                            {activeTab === 'role-history' && <RoleHistory userId={targetUser?.id} />}
                            {activeTab === 'status' && <StatusTimeline userId={targetUser?.id} />}
                            {activeTab === 'audit' && (
                                <div className="space-y-4">
                                    {logsLoading ? <div className="animate-pulse flex flex-col gap-4">{[1,2,3].map(i=><div key={i} className="h-24 bg-white rounded-3xl" />)}</div> : 
                                        auditLogs.map(log => <AuditLogItem key={log.id} log={log} getActionColor={getActionColor} />)}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <ConfirmDialog
                        isOpen={deleteDialog}
                        onClose={() => setDeleteDialog(false)}
                        onConfirm={handleForceDelete}
                        title="IRREVERSIBLE PURGE"
                        message={`Expunge ${targetUser?.name} and all associated metadata from the global directory? This action cannot be rescinded.`}
                        variant="danger"
                        confirmText={deleteLoading ? "Purging..." : "Execute Purge"}
                        loading={deleteLoading}
                    />
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

const DetailItem = ({ label, value, isStatus }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
        {isStatus ? (
            <div><span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${value === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{value}</span></div>
        ) : (
            <p className="text-sm font-bold text-gray-900 bg-gray-50/50 px-4 py-3 rounded-xl border border-gray-50">{value || 'N/A'}</p>
        )}
    </div>
);

const ScopeItem = ({ icon, label, value }) => (
    <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
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
        <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">Initiated By <span className="text-gray-900">{log.performedByName || 'Autonomous Process'}</span></p>
    </div>
);
