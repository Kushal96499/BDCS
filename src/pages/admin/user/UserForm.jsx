// ============================================
// BDCS - User Form Component (Admin)
// Create/Edit users with role-based scope assignment
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate, buildHierarchyPath } from '../../../utils/auditLogger';
import { validateRequired, isValidEmail as validateEmailFormat, sanitizeInput } from '../../../utils/validators';
import { generateTempPassword, generateEmployeeId, generateEnrollmentNumber, validateEmail, validatePhone } from '../../../utils/passwordGenerator';
import { getRequiredScopeFields } from '../../../utils/scopeEnforcement';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';

export default function UserForm({ user: editUser, onClose, onSuccess }) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [tempPassword, setTempPassword] = useState('');

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
        if (editUser) {
            setFormData({
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
                currentSemester: editUser.currentSemester || 1,
                academicYear: editUser.academicYear || '',
                courseIds: editUser.courseIds || [],
                joiningDate: editUser.joiningDate?.toDate().toISOString().split('T')[0] || '',
                designation: editUser.designation || '',
                status: editUser.status || 'active'
            });
        } else {
            // Do not generate temp password - it will be generated from firstName + phone
        }
    }, [editUser]);

    useEffect(() => {
        // Fetch colleges when campus changes
        if (formData.campusId) {
            fetchColleges(formData.campusId);
        } else {
            setColleges([]);
            setFormData(prev => ({ ...prev, collegeId: '', departmentId: '' }));
        }
    }, [formData.campusId]);

    useEffect(() => {
        // Fetch departments when college changes
        if (formData.collegeId) {
            fetchDepartments(formData.collegeId);
        } else {
            setDepartments([]);
            setFormData(prev => ({ ...prev, departmentId: '' }));
        }
    }, [formData.collegeId]);

    const fetchDropdownData = async () => {
        try {
            // Fetch campuses
            const campusSnap = await getDocs(query(collection(db, 'campuses'), where('status', '==', 'active')));
            setCampuses(campusSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // Fetch courses
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
            setColleges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching colleges:', error);
        }
    };

    const fetchDepartments = async (collegeId) => {
        try {
            const q = query(collection(db, 'departments'), where('collegeId', '==', collegeId), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) : value
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleCourseToggle = (courseId) => {
        setFormData(prev => ({
            ...prev,
            courseIds: prev.courseIds.includes(courseId)
                ? prev.courseIds.filter(id => id !== courseId)
                : [...prev.courseIds, courseId]
        }));
    };

    const validate = async () => {
        const newErrors = {};

        // Required fields
        if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email?.trim()) newErrors.email = 'Email is required';
        if (!formData.role?.trim()) newErrors.role = 'Role is required';

        // Phone is required for password generation (new users)
        if (!editUser && (!formData.phone?.trim() || formData.phone.length < 10)) {
            newErrors.phone = 'Phone number is required (minimum 10 digits)';
        }

        // Email validation
        if (formData.email && !validateEmail(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        // Phone validation
        if (formData.phone && !validatePhone(formData.phone)) {
            newErrors.phone = 'Invalid phone number format';
        }

        // Scope validation
        const requiredScopes = getRequiredScopeFields(formData.role);
        requiredScopes.forEach(field => {
            if (!formData[field]) {
                newErrors[field] = `${field} is required for ${formData.role}`;
            }
        });

        // Role-specific validations


        // Remove old role-specific validations for student/teacher
        // if (formData.role === 'student') { ... } 
        // Admin created roles don't strictly enforce empId in this simplified form unless requested. 
        // User request: "Common Fields: Name, Email, Role". So I will relax other validations.

        // Unique Principal Check
        if (formData.role === 'principal' && formData.collegeId) {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('collegeId', '==', formData.collegeId),
                    where('roles', 'array-contains', 'principal'),
                    where('status', '==', 'active')
                );
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    // If editing, exclude current user
                    const conflictingUser = snapshot.docs.find(doc => editUser ? doc.id !== editUser.id : true);
                    if (conflictingUser) {
                        const collegeName = colleges.find(c => c.id === formData.collegeId)?.name || 'this college';
                        newErrors.role = `A Principal already exists for ${collegeName}`;
                        toast.error(`A Principal already exists for ${collegeName}`);
                    }
                }
            } catch (error) {
                console.error('Error checking principal uniqueness:', error);
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!(await validate())) return;
        setLoading(true);

        try {
            // Get denormalized names
            const selectedCampus = campuses.find(c => c.id === formData.campusId);
            const selectedCollege = colleges.find(c => c.id === formData.collegeId);
            const selectedDept = departments.find(d => d.id === formData.departmentId);

            // Combine first and last name
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
                campusName: selectedCampus?.name || null,
                collegeId: formData.collegeId || null,
                collegeName: selectedCollege?.name || null,
                departmentId: formData.departmentId || null,
                departmentName: selectedDept?.name || null,
                status: formData.status
            };

            // Add role-specific fields
            if (formData.role === 'student') {
                userData.enrollmentNumber = formData.enrollmentNumber;
                userData.currentSemester = formData.currentSemester;
                userData.academicYear = formData.academicYear;
                userData.courseIds = formData.courseIds;
            } else {
                userData.employeeId = formData.employeeId;
                userData.joiningDate = formData.joiningDate ? new Date(formData.joiningDate) : null;
                userData.designation = sanitizeInput(formData.designation) || null;
            }

            if (editUser) {
                // Update existing user
                const userRef = doc(db, 'users', editUser.id);
                const updateData = {
                    ...userData,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser.uid
                };

                // Prepare metadata for audit log
                const metadata = {
                    label: userData.name,
                    path: buildHierarchyPath(userData)
                };

                await updateDoc(userRef, updateData);
                await logUpdate('users', editUser.id, editUser, { ...editUser, ...updateData }, currentUser, metadata);
                toast.success('User updated successfully');
            } else {
                // Generate password: firstname (lowercase) + last 4 digits of phone
                const firstName = formData.firstName.trim().toLowerCase();
                const last4Digits = formData.phone.slice(-4);
                const generatedPassword = firstName + last4Digits;

                // Create new user in Firebase Auth without logging out admin
                // We initialize a secondary app instance for this operation
                const { initializeApp } = await import('firebase/app');
                const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
                const { firebaseConfig } = await import('../../../config/firebase');

                const secondaryApp = initializeApp(firebaseConfig, `secondary-admin-${Date.now()}`);
                const secondaryAuth = getAuth(secondaryApp);
                const { deleteApp } = await import('firebase/app');

                try {
                    const authResult = await createUserWithEmailAndPassword(secondaryAuth, formData.email, generatedPassword);

                    // Create user document using the MAIN db instance (which holds admin permissions)
                    const newUser = {
                        uid: authResult.user.uid,
                        ...userData,
                        mustResetPassword: true,
                        createdAt: serverTimestamp(),
                        createdBy: currentUser.uid,
                        updatedAt: serverTimestamp(),
                        updatedBy: currentUser.uid
                    };

                    const metadata = {
                        label: userData.name,
                        path: buildHierarchyPath(userData)
                    };

                    await setDoc(doc(db, 'users', authResult.user.uid), newUser);
                    await logCreate('users', authResult.user.uid, newUser, currentUser, metadata);
                    toast.success(`✅ User "${userData.name}" created! Password: firstname + last 4 of phone. Must reset on first login.`);
                } finally {
                    await signOut(secondaryAuth);
                    await deleteApp(secondaryApp);
                }
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving user:', error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error('Email already in use');
            } else {
                toast.error('Failed to save user');
            }
        } finally {
            setLoading(false);
        }
    };

    const roleOptions = [
        { value: 'director', label: 'Director' },
        { value: 'principal', label: 'Principal' },
        // HOD removed - admin cannot create HOD
        // { value: 'hod', label: 'HOD' },
        { value: 'hr', label: 'HR Manager' },
        { value: 'exam_cell', label: 'Exam Cell Head' },
        { value: 'placement', label: 'Placement Officer' },
        { value: 'sports', label: 'Sports Incharge' },
        { value: 'warden', label: 'Hostel Warden' },
        { value: 'transport', label: 'Transport Incharge' }
    ];

    // Campus is required for ALL these roles
    const requiresCampus = true; // All admin-created roles need campus

    // College required for:
    const requiresCollege = [
        'director', 'principal', 'hod', 'hr'
    ].includes(formData.role);

    // Department required for:
    const requiresDepartment = [
        'hod'
    ].includes(formData.role);

    // We are NOT creating students/teachers here anymore based on the strict list, but if we were, they'd be handled separately.
    // The user request list: Director, Principal, HOD, HR, Exam Cell, Placement, Sports, Warden, Transport.
    // So isStudent is false.
    const isStudent = false;

    return (
        <FormModal
            isOpen={true}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={editUser ? 'Edit User' : 'Create New User'}
            submitText={editUser ? 'Update' : 'Create'}
            loading={loading}
            size="xl"
        >
            <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        error={errors.firstName}
                        required
                    />
                    <Input
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        error={errors.lastName}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        required
                        disabled={!!editUser}
                    />
                    <Input
                        label="Phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        error={errors.phone}
                        placeholder="+91-9876543210"
                        required={!editUser}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-600">*</span></label>
                        <select name="role" value={formData.role} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red ${errors.role ? 'border-red-500' : 'border-gray-300'}`} disabled={!!editUser}>
                            {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role}</p>}
                    </div>

                    <Input
                        label="Address (Optional)"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                    />
                </div>

                {!editUser && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-xs text-yellow-800">
                                <p className="font-semibold">Password Generation</p>
                                <p>Password will be: <span className="font-mono">firstname</span> + last 4 digits of phone</p>
                                <p className="mt-1">User will be forced to change password on first login.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scope Assignment */}
                {requiresCampus && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campus <span className="text-red-600">*</span></label>
                        <select name="campusId" value={formData.campusId} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red ${errors.campusId ? 'border-red-500' : 'border-gray-300'}`}>
                            <option value="">Select Campus</option>
                            {campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                        </select>
                        {errors.campusId && <p className="text-sm text-red-600 mt-1">{errors.campusId}</p>}
                    </div>
                )}

                {requiresCollege && formData.campusId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">College <span className="text-red-600">*</span></label>
                        <select name="collegeId" value={formData.collegeId} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red ${errors.collegeId ? 'border-red-500' : 'border-gray-300'}`}>
                            <option value="">Select College</option>
                            {colleges.map(college => <option key={college.id} value={college.id}>{college.name}</option>)}
                        </select>
                        {errors.collegeId && <p className="text-sm text-red-600 mt-1">{errors.collegeId}</p>}
                    </div>
                )}

                {requiresDepartment && formData.collegeId && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-600">*</span></label>
                        <select name="departmentId" value={formData.departmentId} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red ${errors.departmentId ? 'border-red-500' : 'border-gray-300'}`}>
                            <option value="">Select Department</option>
                            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                        </select>
                        {errors.departmentId && <p className="text-sm text-red-600 mt-1">{errors.departmentId}</p>}
                    </div>
                )}

                {/* Staff/Student Specific Fields */}
                {(['teacher', 'hod', 'director', 'principal'].includes(formData.role)) && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="EMP-001" />
                        <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. Asst. Professor" />
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                            <input type="date" name="joiningDate" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red" />
                        </div>
                    </div>
                )}

                {formData.role === 'student' && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                        <h4 className="font-bold text-sm text-gray-700 uppercase tracking-wide border-b pb-2">Student Academic Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Enrollment Number" name="enrollmentNumber" value={formData.enrollmentNumber} onChange={handleChange} required placeholder="ENR-2024-001" />
                            <Input label="Current Semester" name="currentSemester" type="number" value={formData.currentSemester} onChange={handleChange} required min="1" max="8" />
                        </div>
                        <Input label="Academic Year" name="academicYear" value={formData.academicYear} onChange={handleChange} placeholder="2024-2025" />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enrolled Courses <span className="text-red-600">*</span></label>
                            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg bg-white p-2 grid grid-cols-1 gap-1">
                                {courses.length > 0 ? courses.map(course => (
                                    <label key={course.id} className="flex items-center gap-3 p-2 hover:bg-red-50 rounded cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.courseIds.includes(course.id)}
                                            onChange={() => handleCourseToggle(course.id)}
                                            className="w-4 h-4 text-biyani-red border-gray-300 rounded focus:ring-biyani-red"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{course.name}</span>
                                    </label>
                                )) : <p className="text-sm text-gray-400 p-2">No courses available. Create courses first.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Temporary Password Display */}
                {!editUser && tempPassword && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-yellow-800">Temporary Password</p>
                                <p className="text-sm text-yellow-700 mt-1 font-mono font-semibold">{tempPassword}</p>
                                <p className="text-xs text-yellow-600 mt-1">User will be forced to change password on first login.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </FormModal>
    );
}
