// ============================================
// BDCS - User List Component (Admin)
// Manage all users with role-based filtering
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logStatusChange, logSystemAction, logArchiveUser } from '../../../utils/auditLogger';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import UserForm from './UserForm';
import RelieveUserModal from '../../../components/admin/RelieveUserModal';
import UserDetailPanel from '../../../components/admin/UserDetailPanel';

export default function UserList() {
    const { user, loading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, user: null, action: '' });
    const [relieveDialog, setRelieveDialog] = useState({ isOpen: false, user: null });
    const [detailPanel, setDetailPanel] = useState({ isOpen: false, user: null });
    const [filters, setFilters] = useState({ role: 'all', status: 'all', search: '' });
    const [hardDeleteEnabled, setHardDeleteEnabled] = useState(() => {
        // Load from localStorage, default to false for safety
        const saved = localStorage.getItem('bdcs_hardDeleteEnabled');
        return saved === 'true';
    });

    useEffect(() => {
        // Only fetch users when auth is loaded and user exists
        if (!authLoading && user) {
            fetchUsers();
        }
    }, [filters.role, filters.status, authLoading, user]);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            // Check if user is logged in
            if (!user || !user.uid) {
                console.error('User not authenticated or UID missing:', user);
                toast.error('Authentication error. Please refresh and try again.');
                setLoading(false);
                return;
            }

            console.log('Fetching users created by:', user.uid);
            let q = collection(db, 'users');

            // Build query constraints
            const constraints = [];

            // CRITICAL: Show ONLY users created by this admin
            constraints.push(where('createdBy', '==', user.uid));

            // IMPORTANT: Admin should ONLY see users they manage:
            // - Admins ✅
            // - Principals ✅
            // - System-level users ✅
            // EXCLUDE:
            // - HODs (managed by Principals)
            // - Teachers (managed by Principals/HODs)
            // - Students (managed by Principals/HODs)

            // Role filter
            if (filters.role && filters.role !== 'all') {
                constraints.push(where('role', '==', filters.role));
            }

            // Status filter
            if (filters.status && filters.status !== 'all') {
                constraints.push(where('status', '==', filters.status));
            }

            // Apply constraints
            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);

            let allUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // REMOVED: Strict filtering that was hiding HODs/Teachers created by Admin.
            // If the Admin created the user (enforced by Firestore query), they should be able to see them.
            // This fixes the issue where "Pinky Sankhla" (Principal+HOD) and "Sachin Bagoriya" (HOD) were hidden.

            // Apply search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                allUsers = allUsers.filter(user =>
                    user.name?.toLowerCase().includes(searchLower) ||
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.employeeId?.toLowerCase().includes(searchLower) ||
                    user.enrollmentNumber?.toLowerCase().includes(searchLower)
                );
            }

            // Client-side sorting (newest first) to avoid Firestore composite index requirements
            allUsers.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setUsers(allUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = (targetUser) => {
        setConfirmDialog({
            isOpen: true,
            user: targetUser,
            action: 'disable',
            title: 'Disable User',
            message: `Are you sure you want to disable ${targetUser.name}? They will not be able to log in.`
        });
    };

    const handleEnable = (targetUser) => {
        setConfirmDialog({
            isOpen: true,
            user: targetUser,
            action: 'enable',
            title: 'Enable User',
            message: `Are you sure you want to enable ${targetUser.name}?`
        });
    };

    const handleRelieve = (targetUser) => {
        setRelieveDialog({ isOpen: true, user: targetUser });
    };

    const handleArchive = (targetUser) => {
        setConfirmDialog({
            isOpen: true,
            user: targetUser,
            action: 'archive',
            title: 'Archive User',
            message: `Are you sure you want to archive ${targetUser.name}? This will make their account READ-ONLY.`
        });
    };

    const toggleHardDelete = () => {
        const newValue = !hardDeleteEnabled;
        setHardDeleteEnabled(newValue);
        localStorage.setItem('bdcs_hardDeleteEnabled', newValue.toString());

        if (newValue) {
            toast.warning('⚠️ Hard Delete Enabled - Use with extreme caution!');
        } else {
            toast.success('Hard Delete Disabled');
        }
    };

    const handleHardDelete = async (targetUser) => {
        // Safe Delete Check: Verify dependencies before allowing delete
        const loadingToast = toast.loading('Checking dependencies...');
        try {
            const checks = [];

            // 1. Check if Active HOD of any department
            const deptsQuery = query(collection(db, 'departments'), where('currentHOD', '==', targetUser.id));
            checks.push(getDocs(deptsQuery));

            // 2. Check for active Role Assignments
            const assignmentsQuery = query(collection(db, 'roleAssignments'), where('userId', '==', targetUser.id), where('status', '==', 'active'));
            checks.push(getDocs(assignmentsQuery));

            const [deptsSnap, assignSnap] = await Promise.all(checks);
            toast.dismiss(loadingToast);

            if (!deptsSnap.empty || !assignSnap.empty) {
                const deptNames = deptsSnap.docs.map(d => d.data().name).join(', ');
                const roleCount = assignSnap.size;

                let warningMsg = `Cannot delete ${targetUser.name} because of active dependencies:`;
                if (!deptsSnap.empty) warningMsg += `\n• Active HOD of: ${deptNames}`;
                if (!assignSnap.empty) warningMsg += `\n• Has ${roleCount} active Role Assignment(s)`;

                warningMsg += `\n\nPlease use the 'Relieve' action or manually remove these dependencies first.`;

                // Show blocking alert (using window.confirm for simplicity or Toast)
                alert(warningMsg);
                return;
            }

            // No dependencies found - Proceed to confirmation
            setConfirmDialog({
                isOpen: true,
                user: targetUser,
                action: 'hardDelete',
                title: '🚨 PERMANENT DELETE',
                message: `⚠️ WARNING: This will PERMANENTLY DELETE ${targetUser.name}. Dependency check passed (Safely isolated). \n\nAre you absolutely sure?`
            });

        } catch (error) {
            console.error('Error checking user dependencies:', error);
            toast.dismiss(loadingToast);
            toast.error('Failed to verify user dependencies');
        }
    };

    const confirmAction = async () => {
        const { user: targetUser, action } = confirmDialog;

        try {
            const userRef = doc(db, 'users', targetUser.id);
            const beforeData = { ...targetUser };
            let updateData = {};

            switch (action) {
                case 'disable':
                    updateData = {
                        status: 'inactive',
                        updatedAt: serverTimestamp(),
                        updatedBy: user.uid
                    };
                    break;
                case 'enable':
                    updateData = {
                        status: 'active',
                        updatedAt: serverTimestamp(),
                        updatedBy: user.uid
                    };
                    break;
                case 'archive':
                    updateData = {
                        status: 'archived',
                        permissions: {
                            canRead: true,
                            canWrite: false
                        },
                        updatedAt: serverTimestamp(),
                        updatedBy: user.uid
                    };
                    await logArchiveUser(targetUser.id, { previousStatus: targetUser.status }, user);
                    break;
                case 'hardDelete':
                    // Double confirmation for hard delete
                    const finalConfirm = window.confirm(
                        `FINAL CONFIRMATION:\n\nDeleting: ${targetUser.name}\nEmail: ${targetUser.email}\n\nThis action is IRREVERSIBLE.\n\nType 'DELETE' in the next prompt to proceed.`
                    );
                    if (!finalConfirm) {
                        setConfirmDialog({ isOpen: false, user: null, action: '' });
                        return;
                    }

                    const deleteConfirmText = window.prompt('Type DELETE to confirm permanent deletion:');
                    if (deleteConfirmText !== 'DELETE') {
                        toast.error('Delete cancelled - confirmation text did not match');
                        setConfirmDialog({ isOpen: false, user: null, action: '' });
                        return;
                    }

                    // Log before deletion
                    await logSystemAction('users', targetUser.id, 'HARD_DELETE', {
                        userName: targetUser.name,
                        userEmail: targetUser.email,
                        userRole: targetUser.role,
                        deletedBy: user.uid,
                        deletedByName: user.name,
                        timestamp: new Date().toISOString()
                    }, user, { label: targetUser.name });

                    // Import deleteDoc
                    const { deleteDoc } = await import('firebase/firestore');
                    await deleteDoc(doc(db, 'users', targetUser.id));

                    toast.success('User permanently deleted');
                    fetchUsers();
                    setConfirmDialog({ isOpen: false, user: null, action: '' });
                    return; // Early return to skip normal updateDoc flow
            }

            await updateDoc(userRef, updateData);
            const afterData = { ...targetUser, ...updateData };

            if (action !== 'archive') {
                await logStatusChange('users', targetUser.id, beforeData, afterData, user);
            }

            toast.success(`User ${action}d successfully`);
            fetchUsers();
            setConfirmDialog({ isOpen: false, user: null, action: '' });
        } catch (error) {
            console.error(`Error ${confirmDialog.action}ing user:`, error);
            toast.error(`Failed to ${confirmDialog.action} user`);
        }
    };

    // Delete functionality permanently removed - users are never deleted
    // Instead, users progress through lifecycle: active → inactive → relieved → archived

    const handleResetPassword = async (targetUser) => {
        try {
            await sendPasswordResetEmail(auth, targetUser.email);
            toast.success(`Password reset link sent to ${targetUser.email}`);
            await logSystemAction('users', targetUser.id, 'PASSWORD_RESET_EMAIl_SENT', { email: targetUser.email }, user);
        } catch (error) {
            console.error('Error sending reset email:', error);
            toast.error('Failed to send reset email');
        }
    };

    const roleLabels = {
        admin: 'Admin',
        director: 'Director',
        principal: 'Principal',
        hod: 'HOD',
        // teacher: 'Teacher',
        // student: 'Student', // Removed from display mapping to avoid confusion if they appear

        exam_cell: 'Exam Cell',
        placement: 'Placement',
        hr: 'HR'
    };

    const columns = [
        {
            header: 'Name',
            field: 'name',
            render: (row) => (
                <div>
                    <div className="font-semibold text-gray-900">{row.name}</div>
                    <div className="text-sm text-gray-500">{row.email}</div>
                </div>
            )
        },
        {
            header: 'Role',
            field: 'role',
            render: (row) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {roleLabels[row.role] || row.role}
                </span>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => {
                const statusColors = {
                    active: 'bg-green-100 text-green-800',
                    inactive: 'bg-gray-100 text-gray-800',
                    relieved: 'bg-orange-100 text-orange-800',
                    archived: 'bg-red-100 text-red-800'
                };
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-800'}`}>
                        {row.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                );
            }
        },
        {
            header: 'Scope',
            field: 'scope',
            render: (row) => (
                <div className="text-sm text-gray-600">
                    {row.departmentName ? (
                        <div>{row.departmentName}</div>
                    ) : row.collegeName ? (
                        <div>{row.collegeName}</div>
                    ) : row.campusName ? (
                        <div>{row.campusName}</div>
                    ) : (
                        <span className="text-gray-400">System-wide</span>
                    )}
                </div>
            )
        },
        {
            header: 'Actions',
            render: (row) => {
                const isArchived = ['relieved', 'archived'].includes(row.status);
                const isActive = row.status === 'active';
                const isInactive = row.status === 'inactive';

                return (
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* View Details Button - Always Available */}
                        <button
                            onClick={() => setDetailPanel({ isOpen: true, user: row })}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                            title="View user details"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Details
                        </button>

                        <button
                            onClick={() => { setEditingUser(row); setShowForm(true); }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                            disabled={isArchived}
                            title={isArchived ? 'Cannot edit archived users' : 'Edit user'}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </button>

                        {isActive && (
                            <>
                                <button
                                    onClick={() => handleDisable(row)}
                                    className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                >
                                    Disable
                                </button>
                                <button
                                    onClick={() => handleRelieve(row)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                    Relieve
                                </button>
                            </>
                        )}

                        {isInactive && (
                            <>
                                <button
                                    onClick={() => handleEnable(row)}
                                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                                >
                                    Enable
                                </button>
                                <button
                                    onClick={() => handleArchive(row)}
                                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                >
                                    Archive
                                </button>
                            </>
                        )}

                        {row.status === 'relieved' && (
                            <button
                                onClick={() => handleArchive(row)}
                                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                            >
                                Archive
                            </button>
                        )}

                        {!isArchived && (
                            <button
                                onClick={() => handleResetPassword(row)}
                                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center gap-1"
                                title="Send Password Reset Email"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                Reset
                            </button>
                        )}

                        {/* Hard Delete Button - Only visible when toggle is ON */}
                        {hardDeleteEnabled && (
                            <button
                                onClick={() => handleHardDelete(row)}
                                className="text-red-700 hover:text-red-900 text-sm font-bold flex items-center gap-1 border border-red-300 px-2 py-1 rounded bg-red-50 hover:bg-red-100"
                                title="⚠️ PERMANENT DELETE - Cannot be undone!"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                DELETE
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                    <p className="text-sm text-gray-600">Create, manage and monitor system users</p>
                </div>
                <div className="flex gap-3">
                    {/* Purge Button - Protected by Hard Delete Mode */}
                    {hardDeleteEnabled && (
                        <button
                            onClick={handleBulkPurge}
                            className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 flex items-center gap-2 animate-pulse shadow-lg"
                            title="Delete all non-privileged users"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            PURGE DATA
                        </button>
                    )}

                    <button
                        onClick={toggleHardDelete}
                        className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${hardDeleteEnabled ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        title={hardDeleteEnabled ? "Disable Hard Delete Mode" : "Enable Hard Delete Mode (Caution)"}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {hardDeleteEnabled ? 'Hard Delete ON' : 'Hard Delete OFF'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingUser(null);
                            setShowForm(true);
                        }}
                        className="bg-biyani-red text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New User
                    </button>
                </div>
            </div>

            {/* Filters */}
            < div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input
                            type="text"
                            placeholder="Name, email, ID..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            onBlur={fetchUsers}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={filters.role}
                            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="director">Director</option>
                            <option value="principal">Principal</option>
                            <option value="hr">HR Manager</option>
                            <option value="exam_cell">Exam Cell Head</option>
                            <option value="placement">Placement Officer</option>
                            <option value="sports">Sports Incharge</option>
                            <option value="warden">Hostel Warden</option>
                            <option value="transport">Transport Incharge</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="relieved">Relieved</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={() => setFilters({ role: 'all', status: 'all', search: '' })}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div >

            {/* Table */}
            < div className="bg-white rounded-lg shadow-sm border border-gray-200" >
                <DataTable
                    columns={columns}
                    data={users}
                    loading={loading}

                    actions={false}
                    emptyMessage="No users found. Create your first user to get started."
                />
            </div >

            {/* Form Modal */}
            {
                showForm && (
                    <UserForm
                        user={editingUser}
                        onClose={() => { setShowForm(false); setEditingUser(null); }}
                        onSuccess={() => { setShowForm(false); setEditingUser(null); fetchUsers(); }}
                    />
                )
            }

            {/* Confirm Dialog - Status/Archive Actions */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, user: null, action: '' })}
                onConfirm={confirmAction}
                title={confirmDialog.title || 'Confirm Action'}
                message={confirmDialog.message || 'Are you sure?'}
                variant={confirmDialog.action === 'archive' ? 'danger' : 'warning'}
            />

            {/* Relieve User Modal */}
            {
                relieveDialog.isOpen && (
                    <RelieveUserModal
                        user={relieveDialog.user}
                        onClose={() => setRelieveDialog({ isOpen: false, user: null })}
                        onSuccess={() => {
                            setRelieveDialog({ isOpen: false, user: null });
                            fetchUsers();
                        }}
                    />
                )
            }

            {/* User Detail Panel */}
            {
                detailPanel.isOpen && (
                    <UserDetailPanel
                        user={detailPanel.user}
                        onClose={() => setDetailPanel({ isOpen: false, user: null })}
                        onUserDeleted={fetchUsers}
                        onUserUpdated={fetchUsers}
                    />
                )
            }
        </div >
    );
}
