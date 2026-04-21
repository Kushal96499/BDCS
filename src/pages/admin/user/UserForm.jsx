// ============================================
// BDCS - Premium User Form Component (Admin)
// Create/Edit users with role-based scope assignment
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate, buildHierarchyPath } from '../../../utils/auditLogger';
import { validateRequired, sanitizeInput } from '../../../utils/validators';
import { validateEmail, validatePhone } from '../../../utils/passwordGenerator';
import { getRequiredScopeFields } from '../../../utils/scopeEnforcement';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';
import Select from '../../../components/admin/Select';
import { motion } from 'framer-motion';

export default function UserForm({ isOpen, user: editUser, onClose, onSuccess }) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'principal',
        address: '',
        campusId: '',
        collegeId: '',
        departmentId: '',
        employeeId: '',
        enrollmentNumber: '',
        rollNumber: '',
        currentSemester: 1,
        academicYear: '',
        courseIds: [],
        joiningDate: '',
        designation: '',
        status: 'active'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchDropdownData();
        if (editUser && isOpen) {
            const names = (editUser.name || '').split(' ');
            setFormData({
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                name: editUser.name || '',
                email: editUser.email || '',
                role: editUser.role || 'teacher',
                phone: editUser.phone || '',
                address: editUser.address || '',
                campusId: editUser.campusId || '',
                collegeId: editUser.collegeId || '',
                departmentId: editUser.departmentId || '',
                employeeId: editUser.employeeId || '',
                enrollmentNumber: editUser.enrollmentNumber || '',
                rollNumber: editUser.rollNumber || '',
                currentSemester: editUser.currentSemester || 1,
                academicYear: editUser.academicYear || '',
                courseIds: editUser.courseIds || [],
                joiningDate: editUser.joiningDate?.toDate().toISOString().split('T')[0] || '',
                designation: editUser.designation || '',
                status: editUser.status || 'active'
            });
        } else if (isOpen) {
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                role: 'principal',
                address: '',
                campusId: '',
                collegeId: '',
                departmentId: '',
                employeeId: '',
                enrollmentNumber: '',
                rollNumber: '',
                currentSemester: 1,
                academicYear: '',
                courseIds: [],
                joiningDate: '',
                designation: '',
                status: 'active'
            });
        }
        setErrors({});
    }, [editUser, isOpen]);

    useEffect(() => {
        if (formData.campusId) fetchColleges(formData.campusId);
        else {
            setColleges([]);
            setFormData(prev => ({ ...prev, collegeId: '', departmentId: '' }));
        }
    }, [formData.campusId]);

    useEffect(() => {
        if (formData.collegeId) fetchDepartments(formData.collegeId);
        else {
            setDepartments([]);
            setFormData(prev => ({ ...prev, departmentId: '' }));
        }
    }, [formData.collegeId]);

    const fetchDropdownData = async () => {
        try {
            const campusSnap = await getDocs(query(collection(db, 'campuses'), where('status', '==', 'active')));
            setCampuses(campusSnap.docs.map(doc => ({ value: doc.id, label: doc.data().name })));
            const courseSnap = await getDocs(query(collection(db, 'courses'), where('status', '==', 'active')));
            setCourses(courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    };

    const fetchColleges = async (campusId) => {
        try {
            const q = query(collection(db, 'colleges'), where('campusId', '==', campusId), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setColleges(snapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })));
        } catch (error) {
            console.error('Error fetching colleges:', error);
        }
    };

    const fetchDepartments = async (collegeId) => {
        try {
            const q = query(collection(db, 'departments'), where('collegeId', '==', collegeId), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setDepartments(snapshot.docs.map(doc => ({ value: doc.id, label: doc.data().name })));
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    // Roles that need each scope level
    const NEEDS_COLLEGE = ['principal', 'hod', 'teacher', 'student', 'exam_cell', 'placement'];
    const NEEDS_DEPT    = ['hod', 'teacher', 'student'];

    const handleChange = (e) => {
        const { name, value, type } = e.target;

        if (name === 'role') {
            // Clear scope fields that don't apply to the new role
            const newNeedsCollege = NEEDS_COLLEGE.includes(value);
            const newNeedsDept    = NEEDS_DEPT.includes(value);
            setFormData(prev => ({
                ...prev,
                role: value,
                collegeId:    newNeedsCollege ? prev.collegeId : '',
                departmentId: newNeedsDept    ? prev.departmentId : '',
            }));
            // Reset dependent dropdowns if no longer needed
            if (!newNeedsCollege) { setColleges([]); setDepartments([]); }
            if (!newNeedsDept)    { setDepartments([]); }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number' ? parseInt(value) : value
            }));
        }

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = async () => {
        const newErrors = {};
        if (!formData.firstName?.trim()) newErrors.firstName = 'Required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Required';
        if (!formData.email?.trim()) newErrors.email = 'Required';
        if (!formData.role?.trim()) newErrors.role = 'Required';

        if (!editUser && (!formData.phone?.trim() || formData.phone.length < 10)) {
            newErrors.phone = 'Phone required (min 10 digits)';
        }

        if (formData.email && !validateEmail(formData.email)) newErrors.email = 'Invalid format';
        if (formData.phone && !validatePhone(formData.phone)) newErrors.phone = 'Invalid format';

        const requiredScopes = getRequiredScopeFields(formData.role);
        requiredScopes.forEach(field => {
            if (!formData[field]) newErrors[field] = 'Required';
        });

        if (formData.role === 'principal' && formData.collegeId) {
            try {
                const q = query(collection(db, 'users'), where('collegeId', '==', formData.collegeId), where('roles', 'array-contains', 'principal'), where('status', '==', 'active'));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const conflictingUser = snapshot.docs.find(doc => editUser ? doc.id !== editUser.id : true);
                    if (conflictingUser) {
                        newErrors.role = `Principal already exists for this college`;
                        toast.error(newErrors.role);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!(await validate())) return;
        setLoading(true);

        try {
            const selectedCampus = campuses.find(c => c.value === formData.campusId);
            const selectedCollege = colleges.find(c => c.value === formData.collegeId);
            const selectedDept = departments.find(d => d.value === formData.departmentId);
            const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

            const userData = {
                name: sanitizeInput(fullName),
                firstName: sanitizeInput(formData.firstName),
                lastName: sanitizeInput(formData.lastName),
                email: sanitizeInput(formData.email),
                role: formData.role,
                primaryRole: formData.role,
                roles: [formData.role],
                currentActiveRole: formData.role,
                phone: sanitizeInput(formData.phone) || null,
                address: sanitizeInput(formData.address) || null,
                campusId: formData.campusId || null,
                campusName: selectedCampus?.label || null,
                collegeId: formData.collegeId || null,
                collegeName: selectedCollege?.label || null,
                departmentId: formData.departmentId || null,
                departmentName: selectedDept?.label || null,
                // Academic & Professional Identity
                rollNumber: formData.rollNumber || null,
                enrollmentNumber: formData.enrollmentNumber || null,
                employeeId: formData.employeeId || null,
                currentSemester: parseInt(formData.currentSemester) || 1,
                academicYear: formData.academicYear || '',
                designation: formData.designation || null,
                status: formData.status
            };

            if (editUser) {
                const userRef = doc(db, 'users', editUser.id);
                const updateData = { ...userData, updatedAt: serverTimestamp(), updatedBy: currentUser.uid };
                const metadata = { label: userData.name, path: buildHierarchyPath(userData) };
                await updateDoc(userRef, updateData);
                await logUpdate('users', editUser.id, editUser, { ...editUser, ...updateData }, currentUser, metadata);
                toast.success('User details updated');
            } else {
                const firstPart = formData.firstName.trim().toLowerCase();
                const last4Digits = formData.phone.slice(-4);
                const generatedPassword = firstPart + last4Digits;

                const { initializeApp, deleteApp } = await import('firebase/app');
                const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
                const { firebaseConfig } = await import('../../../config/firebase');

                const secondaryApp = initializeApp(firebaseConfig, `secondary-admin-${Date.now()}`);
                const secondaryAuth = getAuth(secondaryApp);

                try {
                    const authResult = await createUserWithEmailAndPassword(secondaryAuth, formData.email, generatedPassword);
                    const newUser = {
                        uid: authResult.user.uid,
                        ...userData,
                        mustResetPassword: true,
                        createdAt: serverTimestamp(),
                        createdBy: currentUser.uid,
                        updatedAt: serverTimestamp(),
                        updatedBy: currentUser.uid
                    };

                    const metadata = { label: userData.name, path: buildHierarchyPath(userData) };
                    await setDoc(doc(db, 'users', authResult.user.uid), newUser);
                    await logCreate('users', authResult.user.uid, newUser, currentUser, metadata);
                    toast.success('User added successfully');
                } finally {
                    await signOut(secondaryAuth);
                    await deleteApp(secondaryApp);
                }
            }
            onSuccess();
        } catch (error) {
            console.error('Save Error:', error);
            toast.error('Failed to save user');
        } finally {
            setLoading(false);
        }
    };

    const roleOptions = [
        { value: 'admin', label: 'Admin' },
        { value: 'director', label: 'Director' },
        { value: 'principal', label: 'Principal' },
        { value: 'hr', label: 'HR Manager' },
        { value: 'exam_cell', label: 'Exam Cell Head' },
        { value: 'placement', label: 'Placement Officer' },
        { value: 'sports', label: 'Sports Incharge' },
        { value: 'warden', label: 'Hostel Warden' },
        { value: 'transport', label: 'Transport Incharge' }
    ];

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={editUser ? 'Edit User Details' : 'Add New User'}
            submitText={editUser ? 'Save Changes' : 'Add User'}
            loading={loading}
            size="xl"
        >
            <div className="space-y-8 py-2">
                {/* Identity Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-[#E31E24] rounded-full" />
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                            label="First Name"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            error={errors.firstName}
                            placeholder="e.g. Rahul"
                            required
                            autoComplete="given-name"
                        />
                        <Input
                            label="Last Name"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            error={errors.lastName}
                            placeholder="e.g. Sharma"
                            required
                            autoComplete="family-name"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                            label="Email Address"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            placeholder="official@institution.com"
                            required
                            disabled={!!editUser}
                            autoComplete="email"
                        />
                        <Input
                            label="Phone Number"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            error={errors.phone}
                            placeholder="+91-XXXXX-XXXXX"
                            required={!editUser}
                            autoComplete="tel"
                        />
                    </div>
                </div>

                {/* System Access Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-blue-500 rounded-full" />
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role & Access</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Select
                            label="Role"
                            name="role"
                            value={formData.role}
                            options={roleOptions}
                            onChange={handleChange}
                            error={errors.role}
                            required
                            disabled={!!editUser}
                        />

                        <Input
                            label="Address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Primary address..."
                            autoComplete="street-address"
                        />
                    </div>

                    {!editUser && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100/50 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div>
                                <h5 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Default Password Info</h5>
                                <p className="text-[11px] font-semibold text-amber-600/80 leading-relaxed max-w-md">
                                    Initial password: <span className="text-amber-700 bg-white/50 px-1.5 py-0.5 rounded uppercase font-mono">{formData.firstName || 'FIRSTNAME'}</span> + last 4 digits of phone. 
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* JurisDictionary Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign To</h4>
                    </div>

                {/* Assign To section — shown only for roles that need a campus/college/dept */}
                {(() => {
                    const needsCollege = NEEDS_COLLEGE.includes(formData.role);
                    const needsDept    = NEEDS_DEPT.includes(formData.role);
                    const cols = needsDept ? 'lg:grid-cols-3' : needsCollege ? 'lg:grid-cols-2' : '';
                    return (
                        <div className={`grid grid-cols-1 md:grid-cols-2 ${cols} gap-5`}>
                            {/* Campus — shown for everyone except admin */}
                            {formData.role !== 'admin' && (
                                <Select
                                    label="Campus"
                                    name="campusId"
                                    value={formData.campusId}
                                    options={campuses}
                                    onChange={handleChange}
                                    error={errors.campusId}
                                    placeholder="Select Campus"
                                />
                            )}

                            {/* College — only for college-level roles and below */}
                            {needsCollege && (
                                <Select
                                    label="College"
                                    name="collegeId"
                                    value={formData.collegeId}
                                    options={colleges}
                                    onChange={handleChange}
                                    error={errors.collegeId}
                                    placeholder="Select College"
                                />
                            )}

                            {/* Department — only for HOD, Teacher, Student */}
                            {needsDept && departments.length > 0 && (
                                <Select
                                    label="Department"
                                    name="departmentId"
                                    value={formData.departmentId}
                                    options={departments}
                                    onChange={handleChange}
                                    error={errors.departmentId}
                                    placeholder="Select Department"
                                />
                            )}
                        </div>
                    );
                })()}
                </div>

                {/* Enrollment Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-violet-500 rounded-full" />
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Job Details</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Input
                            label="Employee ID"
                            name="employeeId"
                            value={formData.employeeId}
                            onChange={handleChange}
                            placeholder="EMP-XXXX"
                        />
                        
                        <div className="space-y-1.5 flex flex-col">
                           <label htmlFor="user-joining-date" className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">Joining Date</label>
                            <input 
                                id="user-joining-date"
                                type="date" 
                                name="joiningDate" 
                                value={formData.joiningDate} 
                                onChange={handleChange} 
                                className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-[#E31E24] focus:ring-4 focus:ring-red-500/5 transition-all" 
                            />
                        </div>

                        <Select
                            label="Status"
                            name="status"
                            value={formData.status}
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' }
                            ]}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>
        </FormModal>
    );
}
