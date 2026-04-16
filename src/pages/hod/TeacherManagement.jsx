// ============================================
// BDCS - Teacher Management (HOD)
// HOD can create/manage teachers in their department only
// Modernized "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { logCreate, logUpdate, logStatusChange } from '../../utils/auditLogger';
import { validateRequired, sanitizeInput } from '../../utils/validators';
import { validateEmail, validatePhone } from '../../utils/passwordGenerator';
import DataTable from '../../components/admin/DataTable';
import StatusPill from '../../components/common/StatusPill';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import FormModal from '../../components/admin/FormModal';
import UserDetailPanel from '../../components/admin/UserDetailPanel';
import Input from '../../components/Input';
import PremiumSelect from '../../components/common/PremiumSelect';
import { motion, AnimatePresence } from 'framer-motion';

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
        if (!user?.departmentId) return;
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
            toast.error('Failed to load faculty roster');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.departmentId) fetchTeachers();
    }, [user]);

    useEffect(() => {
        if (!editingTeacher && showForm) {
            const fName = formData.firstName ? formData.firstName.trim().toLowerCase() : '';
            const phoneStr = formData.phone ? formData.phone.slice(-4) : '';
            if (fName && phoneStr.length === 4) {
                setTempPassword(`${fName}${phoneStr}`);
            } else {
                setTempPassword('Pending Manifest Data');
            }
        }
    }, [formData.firstName, formData.phone, showForm, editingTeacher]);

    const handleAdd = () => {
        setEditingTeacher(null);
        setFormData({ firstName: '', lastName: '', email: '', phone: '', address: '', employeeId: '', joiningDate: '', designation: '', status: 'active' });
        setTempPassword('');
        setErrors({});
        setShowForm(true);
    };

    const handleEdit = (teacher) => {
        setEditingTeacher(teacher);
        const nameParts = (teacher.name || '').split(' ');
        setFormData({
            firstName: teacher.firstName || nameParts[0] || '',
            lastName: teacher.lastName || nameParts.slice(1).join(' ') || '',
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
        if (formData.email && !validateEmail(formData.email)) newErrors.email = 'Invalid Auth Email';
        if (formData.phone && !validatePhone(formData.phone)) newErrors.phone = 'Invalid Contact Number';
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
                name: fullName,
                email: sanitizeInput(formData.email),
                role: 'teacher',
                phone: sanitizeInput(formData.phone) || null,
                address: sanitizeInput(formData.address) || null,
                employeeId: formData.employeeId,
                joiningDate: formData.joiningDate ? new Date(formData.joiningDate) : null,
                designation: sanitizeInput(formData.designation) || null,
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
                const updateData = { ...teacherData, updatedAt: serverTimestamp(), updatedBy: user.uid };
                await updateDoc(teacherRef, updateData);
                await logUpdate('users', editingTeacher.id, editingTeacher, { ...editingTeacher, ...updateData }, user);
                toast.success('Faculty Credentials Synchronized');
            } else {
                const finalTempPassword = `${formData.firstName.toLowerCase().trim()}${formData.phone.slice(-4)}`;
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

                const secondaryAppName = 'secondaryApp-' + Date.now();
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
                    await signOutSecondary(secondaryAuth);
                    toast.success(`Faculty Account Created: ${fullName}`);
                } finally {
                    await deleteApp(secondaryApp);
                }
            }
            setShowForm(false);
            fetchTeachers();
        } catch (error) {
            console.error('Error saving teacher:', error);
            toast.error(error.code === 'auth/email-already-in-use' ? 'Identity already exists' : 'Faculty authorization failed');
        } finally {
            setFormLoading(false);
        }
    };

    const confirmStatusToggle = async () => {
        const teacher = confirmDialog.teacher;
        const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
        try {
            await updateDoc(doc(db, 'users', teacher.id), { status: newStatus, updatedAt: serverTimestamp(), updatedBy: user.uid });
            await logStatusChange('users', teacher.id, teacher, { ...teacher, status: newStatus }, user);
            toast.success(`Faculty status modified to ${newStatus}`);
            fetchTeachers();
            setConfirmDialog({ isOpen: false, teacher: null });
        } catch (error) {
            toast.error('Status modification failed');
        }
    };

    const columns = [
        {
            header: 'Faculty Identity',
            field: 'name',
            render: (row) => (
                <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-black text-xs shadow-sm shadow-violet-100/50">
                        {row.name.split(' ')[0][0]}{row.name.split(' ').pop()[0]}
                    </div>
                    <div>
                        <div className="font-black text-gray-900 tracking-tight">{row.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 tracking-tighter">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Employee ID',
            field: 'employeeId',
            render: (row) => <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{row.employeeId}</span>
        },
        {
            header: 'Designation',
            field: 'designation',
            render: (row) => <span className="text-sm font-bold text-gray-600 italic tracking-tight">{row.designation || 'Academic Staff'}</span>
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusPill status={row.status} />
        },
        {
            header: 'Operations',
            field: 'actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedTeacherForDetails(row)}
                        data-tooltip="View Full Profile"
                        className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white transition-all border border-gray-100"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button
                        onClick={() => handleEdit(row)}
                        data-tooltip="Edit Credentials"
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15" /></svg>
                    </button>
                    <button
                        onClick={() => setConfirmDialog({ isOpen: true, teacher: row })}
                        data-tooltip={row.status === 'active' ? "Deactivate Acccount" : "Restore Account"}
                        className={`p-2.5 rounded-xl border transition-all ${row.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-black hover:text-white'}`}
                    >
                        {row.status === 'active' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Teachers</h2>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        HOD Panel • {user?.departmentName}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-[#E31E24] text-white px-8 py-3.5 rounded-2xl shadow-xl shadow-red-200/50 hover:bg-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all w-full md:w-auto border border-white/20"
                >
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Teacher
                </button>
            </div>

            <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={teachers}
                    loading={loading}
                    emptyMessage="Halls of wisdom are empty. Deploy departmental faculty."
                    actions={false}
                />
            </div>

            <FormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSubmit={handleSubmit}
                title={editingTeacher ? 'Modify Faculty Credentials' : 'Enroll New Academician'}
                submitText={editingTeacher ? 'Sync Identity' : 'Authorize Faculty'}
                loading={formLoading}
                size="lg"
            >
                <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Given Name" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} required />
                        <Input label="Family Name" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Institutional Email" name="email" value={formData.email} onChange={handleChange} error={errors.email} required disabled={!!editingTeacher} />
                        <Input label="Primary Contact" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} placeholder="+91" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Faculty ID (EMP)" name="employeeId" value={formData.employeeId} onChange={handleChange} error={errors.employeeId} required placeholder="ERP-ID" />
                        <Input label="Academic Designation" name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. Senior Professor" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Onboarding Date" name="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} error={errors.joiningDate} required />
                        <PremiumSelect
                            label="Auth Status"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            options={[{ label: 'Active Service', value: 'active' }, { label: 'Inactive / On Leave', value: 'inactive' }]}
                        />
                    </div>

                    <div className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Institutional Scope</p>
                        <p className="text-sm font-black text-gray-900 tracking-tight">{user?.departmentName}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">{user?.collegeName} • {user?.campusName}</p>
                    </div>

                    {!editingTeacher && (
                        <div className="p-6 bg-red-50/50 rounded-[2rem] border border-red-100 flex items-center gap-5">
                            <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Temporary Authentication Vault</p>
                                <p className="text-xl font-black text-gray-900 tracking-tight">{tempPassword}</p>
                                <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter mt-1 italic">Generated from Given Name + Primary Contact suffix.</p>
                            </div>
                        </div>
                    )}
                </div>
            </FormModal>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, teacher: null })}
                onConfirm={confirmStatusToggle}
                title="Authorization Shift"
                message={`Are you sure you want to change the active status for ${confirmDialog.teacher?.name}?`}
                variant="warning"
            />

            {selectedTeacherForDetails && (
                <UserDetailPanel
                    user={selectedTeacherForDetails}
                    onClose={() => setSelectedTeacherForDetails(null)}
                    onUserDeleted={fetchTeachers}
                    onUserUpdated={fetchTeachers}
                />
            )}
        </div>
    );
}
