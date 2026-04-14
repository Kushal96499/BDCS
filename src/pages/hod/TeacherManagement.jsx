// ============================================
// BDCS - Teacher Management (HOD)
// HOD can create/manage teachers in their department only
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, setDoc } from 'firebase/firestore'; // Added setDoc
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { logCreate, logUpdate, logStatusChange } from '../../utils/auditLogger';
import { validateRequired, sanitizeInput } from '../../utils/validators';
import { generateTempPassword, validateEmail, validatePhone } from '../../utils/passwordGenerator';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import FormModal from '../../components/admin/FormModal';
import UserDetailPanel from '../../components/admin/UserDetailPanel';
import Input from '../../components/Input';

export default function TeacherManagement() {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, teacher: null });
    const [tempPassword, setTempPassword] = useState('');
    const [selectedTeacherForDetails, setSelectedTeacherForDetails] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        employeeId: '',
        joiningDate: '',
        designation: '',
        status: 'active'
    });
    const [errors, setErrors] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    const fetchTeachers = async () => {
        if (!user?.departmentId) {
            // Wait for user data to be fully loaded
            return;
        }

        try {
            setLoading(true);
            const q = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('role', '==', 'teacher')
            );
            const snapshot = await getDocs(q);
            setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching teachers:', error);
            toast.error('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.departmentId) {
            fetchTeachers();
        }
    }, [user]);

    // NEW PRESET PASSWORD LOGIC: First Name + Last 4 digits of phone
    useEffect(() => {
        if (!editingTeacher && showForm) {
            const fName = formData.firstName ? formData.firstName.trim().toLowerCase() : '';
            const phoneStr = formData.phone ? formData.phone.slice(-4) : '';

            if (fName && phoneStr.length === 4) {
                setTempPassword(`${fName}${phoneStr}`);
            } else {
                setTempPassword('Complete name & phone to generate');
            }
        }
    }, [formData.firstName, formData.phone, showForm, editingTeacher]);

    const handleAdd = () => {
        setEditingTeacher(null);
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            address: '',
            employeeId: '',
            joiningDate: '',
            designation: '',
            status: 'active'
        });
        setTempPassword('');
        setErrors({});
        setShowForm(true);
    };

    const handleEdit = (teacher) => {
        setEditingTeacher(teacher);

        // Split existing full name if possible
        const nameParts = (teacher.name || '').split(' ');
        const fName = nameParts[0] || '';
        const lName = nameParts.slice(1).join(' ') || '';

        setFormData({
            firstName: teacher.firstName || fName,
            lastName: teacher.lastName || lName,
            email: teacher.email || '',
            phone: teacher.phone || '',
            address: teacher.address || '',
            employeeId: teacher.employeeId || '',
            joiningDate: teacher.joiningDate?.toDate ? teacher.joiningDate.toDate().toISOString().split('T')[0] : '',
            designation: teacher.designation || '',
            status: teacher.status || 'active'
        });
        setErrors({});
        setShowForm(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['firstName', 'lastName', 'email', 'employeeId', 'joiningDate', 'phone']);
        if (!requiredValidation.valid) Object.assign(newErrors, requiredValidation.errors);

        if (formData.email && !validateEmail(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (formData.phone && !validatePhone(formData.phone)) {
            newErrors.phone = 'Invalid phone number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setFormLoading(true);

        try {
            const fullName = `${sanitizeInput(formData.firstName)} ${sanitizeInput(formData.lastName)}`;

            const teacherData = {
                firstName: sanitizeInput(formData.firstName),
                lastName: sanitizeInput(formData.lastName),
                name: fullName, // Keep for backward compatibility
                email: sanitizeInput(formData.email),
                role: 'teacher',
                phone: sanitizeInput(formData.phone) || null,
                address: sanitizeInput(formData.address) || null,
                employeeId: formData.employeeId,
                joiningDate: formData.joiningDate ? new Date(formData.joiningDate) : null,
                designation: sanitizeInput(formData.designation) || null,

                // Inherit scope from HOD
                campusId: user.campusId,
                campusName: user.campusName,
                collegeId: user.collegeId,
                collegeName: user.collegeName,
                departmentId: user.departmentId,
                departmentName: user.departmentName,

                status: formData.status
            };

            if (editingTeacher) {
                const teacherRef = doc(db, 'users', editingTeacher.id);
                const updateData = {
                    ...teacherData,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                };
                await updateDoc(teacherRef, updateData);
                await logUpdate('users', editingTeacher.id, editingTeacher, { ...editingTeacher, ...updateData }, user);
                toast.success('Teacher updated successfully');
            } else {
                // Check if password is valid
                if (!formData.firstName || !formData.phone || formData.phone.length < 4) {
                    toast.error('First Name and Phone are required to generate password');
                    setFormLoading(false);
                    return;
                }

                const finalTempPassword = `${formData.firstName.toLowerCase().trim()}${formData.phone.slice(-4)}`;

                // HACK: Use a secondary app to create user without logging out the current admin
                // This prevents the automatic sign-in behavior of createUserWithEmailAndPassword
                const { initializeApp, deleteApp } = await import('firebase/app');
                const { getAuth, createUserWithEmailAndPassword: createAuthUser, signOut: signOutSecondary } = await import('firebase/auth');

                const firebaseConfig = {
                    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                    appId: import.meta.env.VITE_FIREBASE_APP_ID
                };

                const secondaryAppName = 'secondaryApp-' + new Date().getTime();
                const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
                const secondaryAuth = getAuth(secondaryApp);

                try {
                    const authResult = await createAuthUser(secondaryAuth, formData.email, finalTempPassword);
                    const newTeacher = {
                        uid: authResult.user.uid,
                        ...teacherData,
                        mustResetPassword: true,
                        createdAt: serverTimestamp(),
                        createdBy: user.uid,
                        updatedAt: serverTimestamp(),
                        updatedBy: user.uid
                    };

                    await setDoc(doc(db, 'users', authResult.user.uid), newTeacher);
                    await logCreate('users', authResult.user.uid, newTeacher, user);

                    // Cleanup secondary auth
                    await signOutSecondary(secondaryAuth);
                    toast.success(`✅ Teacher "${fullName}" created! They must reset their password on first login.`);

                } finally {
                    await deleteApp(secondaryApp);
                }
            }

            setShowForm(false);
            fetchTeachers();
        } catch (error) {
            console.error('Error saving teacher:', error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error('Email already in use');
            } else if (error.code === 'auth/weak-password') {
                toast.error('Password generated is too weak. Ensure name and phone are valid.');
            } else {
                toast.error('Failed to save teacher');
            }
        } finally {
            setFormLoading(false);
        }
    };

    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [selectedTeacherForReset, setSelectedTeacherForReset] = useState(null);

    const handleStatusToggle = (teacher) => {
        setConfirmDialog({ isOpen: true, teacher });
    };

    const handleDeleteTeacher = async (teacher) => {
        if (!window.confirm(`Are you sure you want to delete ${teacher.name}? This action cannot be undone.`)) return;

        try {
            await import('firebase/firestore').then(module => {
                const { deleteDoc } = module;
                return deleteDoc(doc(db, 'users', teacher.id));
            });

            // Log deletion
            await logUpdate('users', teacher.id, teacher, { status: 'DELETED' }, user);

            toast.success('Teacher deleted successfully');
            fetchTeachers();
        } catch (error) {
            console.error('Error deleting teacher:', error);
            toast.error('Failed to delete teacher');
        }
    };

    const handleResetPassword = (teacher) => {
        setSelectedTeacherForReset(teacher);
        setResetDialogOpen(true);
    };

    const confirmStatusToggle = async () => {
        const teacher = confirmDialog.teacher;
        const newStatus = teacher.status === 'active' ? 'inactive' : 'active';

        try {
            const teacherRef = doc(db, 'users', teacher.id);
            const beforeData = { ...teacher };
            const afterData = { ...teacher, status: newStatus, updatedAt: new Date(), updatedBy: user.uid };

            await updateDoc(teacherRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            });

            await logStatusChange('users', teacher.id, beforeData, afterData, user);
            toast.success(`Teacher ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
            fetchTeachers();
            setConfirmDialog({ isOpen: false, teacher: null });
        } catch (error) {
            console.error('Error updating teacher status:', error);
            toast.error('Failed to update teacher status');
        }
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
            header: 'Employee ID',
            field: 'employeeId',
            render: (row) => <span className="font-mono text-sm">{row.employeeId}</span>
        },
        {
            header: 'Designation',
            field: 'designation',
            render: (row) => <span className="text-sm">{row.designation || '-'}</span>
        },
        {
            header: 'Phone',
            field: 'phone',
            render: (row) => <span className="text-sm">{row.phone || '-'}</span>
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        }
    ];

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Department Faculty</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage active teachers for {user?.departmentName || 'your department'}</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Teacher
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={[
                        ...columns,
                        {
                            header: 'Actions',
                            field: 'actions',
                            render: (row) => (
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setSelectedTeacherForDetails(row)}
                                        className="text-gray-500 hover:text-biyani-red hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                        title="View Details"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleEdit(row)}
                                        className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleStatusToggle(row)}
                                        className={`${row.status === 'active' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'} p-1.5 rounded-lg transition-colors`}
                                        title={row.status === 'active' ? 'Disable' : 'Enable'}
                                    >
                                        {row.status === 'active' ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTeacher(row)}
                                        className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    data={teachers}
                    loading={loading}
                    actions={false} // Disable default actions
                    emptyMessage="No teachers found. Create your first teacher to get started."
                />
            </div>

            {/* Form Modal */}
            {showForm && (
                <FormModal
                    isOpen={true}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleSubmit}
                    title={editingTeacher ? 'Edit Teacher' : 'Create New Teacher'}
                    submitText={editingTeacher ? 'Update' : 'Create'}
                    loading={formLoading}
                    size="lg"
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} required />
                            <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Email" name="email" value={formData.email} onChange={handleChange} error={errors.email} required disabled={!!editingTeacher} />
                            <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} placeholder="+91-9876543210" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} error={errors.employeeId} required placeholder="EMP001" />
                            <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} placeholder="Assistant Professor" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Joining Date" name="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} error={errors.joiningDate} required />
                            <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Department Info (Read-only) */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Assigned Department</p>
                            <p className="text-gray-900 font-semibold">{user?.departmentName}</p>
                            <p className="text-sm text-gray-600">{user?.collegeName} • {user?.campusName}</p>
                        </div>

                        {!editingTeacher && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-yellow-800">Temporary Password</p>
                                        <p className="text-sm text-yellow-700 mt-1 font-mono font-semibold">
                                            {tempPassword || <span className="text-gray-400 italic">Enter First Name & Phone (last 4) to generate</span>}
                                        </p>
                                        <p className="text-xs text-yellow-600 mt-1">
                                            Format: firstname + last 4 digits of phone
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </FormModal>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, teacher: null })}
                onConfirm={confirmStatusToggle}
                title={`${confirmDialog.teacher?.status === 'active' ? 'Deactivate' : 'Activate'} Teacher`}
                message={`Are you sure you want to ${confirmDialog.teacher?.status === 'active' ? 'inactivate' : 'activate'} ${confirmDialog.teacher?.name}?`}
                variant="warning"
            />

            {/* User Detail Panel */}
            {selectedTeacherForDetails && (
                <UserDetailPanel
                    user={selectedTeacherForDetails}
                    onClose={() => setSelectedTeacherForDetails(null)}
                    onUserDeleted={() => {
                        fetchTeachers();
                        setSelectedTeacherForDetails(null);
                    }}
                    onUserUpdated={() => {
                        fetchTeachers();
                        // Optionally refresh the selected teacher object too if needed,
                        // but re-fetching list + closing/reopening or updating state is mostly enough.
                        // For safer UX, let's keep it simple:
                        // fetchTeachers is enough if we rely on list.
                        // If we want liv updates in panel, we'd need to re-fetch the single user or update state.
                    }}
                />
            )}
        </div>
    );
}
