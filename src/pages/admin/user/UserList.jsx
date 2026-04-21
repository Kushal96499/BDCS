// ============================================
// BDCS - Premium User List Component (Admin)
// Manage all users with role-based filtering
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logStatusChange, logSystemAction, logArchiveUser } from '../../../utils/auditLogger';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import UserForm from './UserForm';
import RelieveUserModal from '../../../components/admin/RelieveUserModal';
import UserDetailPanel from '../../../components/admin/UserDetailPanel';
import Select from '../../../components/admin/Select';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserList() {
    const { user, loading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, user: null, action: '', title: '', message: '' });
    const [relieveDialog, setRelieveDialog] = useState({ isOpen: false, user: null });
    const [detailPanel, setDetailPanel] = useState({ isOpen: false, user: null });
    const [syncing, setSyncing] = useState(false);
    const [filters, setFilters] = useState({ role: 'all', status: 'all', search: '' });
    const [hardDeleteEnabled, setHardDeleteEnabled] = useState(() => {
        const saved = localStorage.getItem('bdcs_hardDeleteEnabled');
        return saved === 'true';
    });

    useEffect(() => {
        if (!authLoading && user) {
            fetchUsers();
        }
    }, [filters.role, filters.status, authLoading, user]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            if (!user || !user.uid) {
                toast.error('Authentication error. Please refresh.');
                setLoading(false);
                return;
            }

            let q = collection(db, 'users');
            const constraints = [where('createdBy', '==', user.uid)];

            if (filters.role && filters.role !== 'all') constraints.push(where('role', '==', filters.role));
            if (filters.status && filters.status !== 'all') constraints.push(where('status', '==', filters.status));

            q = query(q, ...constraints);
            const snapshot = await getDocs(q);

            let allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                allUsers = allUsers.filter(u =>
                    u.name?.toLowerCase().includes(searchLower) ||
                    u.email?.toLowerCase().includes(searchLower) ||
                    u.employeeId?.toLowerCase().includes(searchLower)
                );
            }

            allUsers.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setUsers(allUsers);
        } catch (error) {
            console.error('Action error:', error);
            toast.error("Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        toast.info("Updating staff list...");
        await fetchUsers();
        setSyncing(false);
    };

    const handleAction = (u, action, title, message) => {
        setConfirmDialog({ isOpen: true, user: u, action, title, message });
    };

    const toggleHardDelete = () => {
        const newValue = !hardDeleteEnabled;
        setHardDeleteEnabled(newValue);
        localStorage.setItem('bdcs_hardDeleteEnabled', newValue.toString());
        if (newValue) toast.warning('Delete Mode Enabled');
        else toast.success('Delete Mode Disabled');
    };

    const confirmAction = async () => {
        const { user: targetUser, action } = confirmDialog;
        try {
            const userRef = doc(db, 'users', targetUser.id);
            let updateData = { updatedAt: serverTimestamp(), updatedBy: user.uid };

            if (action === 'disable') updateData.status = 'inactive';
            else if (action === 'enable') updateData.status = 'active';
            else if (action === 'archive') {
                updateData.status = 'archived';
                updateData.permissions = { canRead: true, canWrite: false };
                await logArchiveUser(targetUser.id, { previousStatus: targetUser.status }, user);
            }
            else if (action === 'hardDelete') {
                if (window.confirm('Type DELETE to confirm permanent removal')) {
                    const confirmText = window.prompt('Confirm removal of ' + targetUser.name);
                    if (confirmText === 'DELETE') {
                        await deleteDoc(doc(db, 'users', targetUser.id));
                        toast.success('User Removed');
                        fetchUsers();
                        setConfirmDialog({ isOpen: false, user: null, action: '' });
                        return;
                    }
                }
                return;
            }

            await updateDoc(userRef, updateData);
            toast.success(`User ${action}d successfully`);
            fetchUsers();
            setConfirmDialog({ isOpen: false, user: null, action: '' });
        } catch (error) {
            toast.error(`Failed to ${action} user`);
        }
    };

    const roleLabels = {
        admin: 'Admin',
        director: 'Director',
        principal: 'Principal',
        hod: 'Head of Department',
        exam_cell: 'Exam Cell',
        placement: 'Placement',
        hr: 'HR Manager'
    };

    const columns = [
        {
            header: 'Staff Member',
            mobileFullWidth: true,
            render: (row) => (
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#E31E24] flex items-center justify-center font-bold text-sm shrink-0 border border-red-100/50 shadow-sm shadow-red-500/5">
                        {row.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 leading-tight truncate tracking-tight">{row.name}</span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest truncate mt-0.5">{row.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Role',
            mobileFullWidth: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#E31E24] tracking-tight">{roleLabels[row.role] || row.role}</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">{row.departmentName || 'Institutional'}</span>
                </div>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Options',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => setDetailPanel({ isOpen: true, user: row })} 
                        data-tooltip="View Details"
                        className="p-2 rounded-xl active:scale-95 transition-all text-gray-400 hover:text-[#E31E24] hover:bg-red-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2.5}/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth={2.5}/></svg>
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => { setEditingUser(row); setShowForm(true); }} 
                        data-tooltip="Edit Details"
                        className="p-2 rounded-xl active:scale-95 transition-all border-gray-100 hover:border-[#E31E24]/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth={2.5}/></svg>
                    </Button>
                </div>
            )
        }
    ];

    const roleOptions = [
        { value: 'all', label: 'All Roles' },
        ...Object.entries(roleLabels).map(([val, label]) => ({ value: val, label }))
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Staff List</h2>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        Admin Panel • Management
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="p-3.5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-900 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                        <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={2.5}/></svg>
                    </button>
                    <Button onClick={() => { setEditingUser(null); setShowForm(true); }} className="px-8 py-3.5">
                        Add Staff
                    </Button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="relative z-30 bg-white/40 backdrop-blur-md rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                         <Input 
                            id="personnel-search"
                            label="Search Personnel"
                            name="search"
                            placeholder="Name, email or employee ID..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            autoComplete="name"
                         />
                    </div>
                    <div>
                        <Select 
                            id="personnel-role-filter"
                            label="Assign. Role"
                            name="role"
                            value={filters.role}
                            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                            options={roleOptions}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button variant="secondary" onClick={() => setFilters({ role: 'all', status: 'all', search: '' })} className="w-full h-[46px] rounded-xl border-gray-100 hover:bg-gray-50 text-xs font-bold uppercase tracking-widest">
                            Reset View
                        </Button>
                    </div>
                </div>
            </div>

            {/* Directory Table */}
            <div className="animate-premium-slide">
                <DataTable
                    columns={columns}
                    data={users}
                    loading={loading}
                    onStatusToggle={(u) => handleAction(u, u.status === 'active' ? 'disable' : 'enable', 'Status Change', `Toggle status for ${u.name}?`)}
                    onDelete={hardDeleteEnabled ? (u) => handleAction(u, 'hardDelete', 'Permanent Purge', `Erase ${u.name} from records?`) : null}
                    emptyMessage="No personnel records discovered."
                />
            </div>

            {/* Modals */}
            <AnimatePresence mode="wait">
                {showForm && (
                    <UserForm
                        isOpen={showForm}
                        user={editingUser}
                        onClose={() => { setShowForm(false); setEditingUser(null); }}
                        onSuccess={() => { setShowForm(false); setEditingUser(null); fetchUsers(); }}
                    />
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, user: null, action: '' })}
                onConfirm={confirmAction}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'hardDelete' ? 'danger' : 'warning'}
            />

            {relieveDialog.isOpen && (
                <RelieveUserModal
                    isOpen={relieveDialog.isOpen}
                    user={relieveDialog.user}
                    onClose={() => setRelieveDialog({ isOpen: false, user: null })}
                    onSuccess={() => { setRelieveDialog({ isOpen: false, user: null }); fetchUsers(); }}
                />
            )}

            {detailPanel.isOpen && (
                <UserDetailPanel
                    isOpen={detailPanel.isOpen}
                    user={detailPanel.user}
                    onClose={() => setDetailPanel({ isOpen: false, user: null })}
                    onUpdated={fetchUsers}
                />
            )}
        </motion.div>
    );
}
