// ============================================
// BDCS - Student Management (Teacher)
// Teacher can create/manage students for their courses
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
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
import Input from '../../components/Input';

export default function StudentManagement() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, student: null });
    const [tempPassword, setTempPassword] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        fatherName: '',
        motherName: '',
        email: '',
        phone: '',
        address: '',
        rollNumber: '',
        enrollmentNumber: '',
        currentSemester: 1,
        academicYear: '',
        courseIds: [],
        status: 'active'
    });
    const [errors, setErrors] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchStudents();
            fetchCourses();
        }
    }, [user]);

    const fetchStudents = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const q = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('role', '==', 'student')
            );
            const snapshot = await getDocs(q);
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching students:', error);
            // toast.error('Failed to load students'); // Verify console first
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const coursesSnap = await getDocs(query(collection(db, 'courses'), where('status', '==', 'active')));
            setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const handleAdd = () => {
        setEditingStudent(null);
        setFormData({
            name: '',
            fatherName: '',
            motherName: '',
            email: '',
            phone: '',
            address: '',
            rollNumber: '',
            enrollmentNumber: '',
            currentSemester: 1,
            academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
            courseIds: [],
            status: 'active',
            nocStatus: 'pending'
        });
        setTempPassword('');
        setErrors({});
        setShowForm(true);
    };

    const handleEdit = (student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name || '',
            fatherName: student.fatherName || '',
            motherName: student.motherName || '',
            email: student.email || '',
            phone: student.phone || '',
            address: student.address || '',
            rollNumber: student.rollNumber || '',
            enrollmentNumber: student.enrollmentNumber || '',
            currentSemester: student.currentSemester || 1,
            academicYear: student.academicYear || '',
            courseIds: student.courseIds || [],
            status: student.status || 'active',
            nocStatus: student.nocStatus || 'pending'
        });
        setErrors({});
        setShowForm(true);
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

    const validate = () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['name', 'email', 'rollNumber', 'enrollmentNumber', 'academicYear']);
        if (!requiredValidation.valid) Object.assign(newErrors, requiredValidation.errors);

        if (formData.email && !validateEmail(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (formData.phone && !validatePhone(formData.phone)) {
            newErrors.phone = 'Invalid phone number';
        }
        if (!formData.courseIds || formData.courseIds.length === 0) {
            newErrors.courseIds = 'At least one course is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setFormLoading(true);

        try {
            const studentData = {
                name: sanitizeInput(formData.name),
                fatherName: sanitizeInput(formData.fatherName),
                motherName: sanitizeInput(formData.motherName),
                email: sanitizeInput(formData.email),
                role: 'student',
                phone: sanitizeInput(formData.phone) || null,
                address: sanitizeInput(formData.address) || null,
                rollNumber: formData.rollNumber || '',
                enrollmentNumber: formData.enrollmentNumber || '',
                currentSemester: formData.currentSemester || 1,
                academicYear: formData.academicYear || '',
                courseIds: formData.courseIds || [],

                // Inherit scope from Teacher
                campusId: user.campusId,
                campusName: user.campusName,
                collegeId: user.collegeId,
                collegeName: user.collegeName,
                departmentId: user.departmentId,
                departmentName: user.departmentName,

                status: formData.status,
                nocStatus: formData.nocStatus || 'pending'
            };

            if (editingStudent) {
                const studentRef = doc(db, 'users', editingStudent.id);
                const updateData = {
                    ...studentData,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                };
                await updateDoc(studentRef, updateData);
                await logUpdate('users', editingStudent.id, editingStudent, { ...editingStudent, ...updateData }, user);
                toast.success('Student updated successfully');
            } else {
                try {
                    // Create user with secondary auth to prevent logging out current user
                    // Use static imports defined at top
                    const secondaryApp = initializeApp(auth.app.options, `secondary-${Date.now()}`);
                    const secondaryAuth = getAuth(secondaryApp);

                    let passwordToUse = formData.enrollmentNumber ? formData.enrollmentNumber.toString().trim() : '123456';
                    if (passwordToUse.length < 6) {
                        passwordToUse = passwordToUse.padStart(6, '0');
                    }
                    console.log('Creating student auth account for:', formData.email);

                    const authResult = await createUserWithEmailAndPassword(secondaryAuth, formData.email, passwordToUse);
                    console.log('Auth account created, UID:', authResult.user.uid);

                    // Important: Create user document with UID as document ID
                    const userDocRef = doc(db, 'users', authResult.user.uid);
                    const newStudent = {
                        uid: authResult.user.uid,
                        ...studentData,
                        mustResetPassword: true,
                        createdAt: serverTimestamp(),
                        createdBy: user.uid,
                        updatedAt: serverTimestamp(),
                        updatedBy: user.uid
                    };

                    await setDoc(userDocRef, newStudent);
                    console.log('Firestore document created');

                    await signOut(secondaryAuth);
                    await deleteApp(secondaryApp);
                    console.log('Secondary auth cleaned up');

                    await logCreate('users', authResult.user.uid, newStudent, user);
                    toast.success(`✅ Student "${formData.name}" registered! Password: enrollment number (must be reset on first login)`, { duration: 6000 });

                } catch (authError) {
                    console.error('Error creating student auth:', authError);
                    throw authError; // Re-throw to be caught by outer try-catch
                }
            }

            setShowForm(false);
            fetchStudents();
        } catch (error) {
            console.error('Error saving student:', error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error('Email already in use');
            } else {
                toast.error('Failed to save student');
            }
            setFormLoading(false);
        }
    };


    const handleNocToggle = (student) => {
        setConfirmDialog({ isOpen: true, student, type: 'noc' });
    };

    const handleStatusToggle = (student) => {
        setConfirmDialog({ isOpen: true, student, type: 'status' });
    };

    const executeConfirmAction = async () => {
        if (confirmDialog.type === 'status') {
            await confirmStatusToggle();
        } else if (confirmDialog.type === 'noc') {
            await confirmNocToggle();
        }
    };

    const confirmStatusToggle = async () => {
        const student = confirmDialog.student;
        const newStatus = student.status === 'active' ? 'inactive' : 'active';
        try {
            const studentRef = doc(db, 'users', student.id);
            await updateDoc(studentRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            });
            await logStatusChange('users', student.id, student, { ...student, status: newStatus }, user);
            toast.success(`Student ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
            fetchStudents();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
        setConfirmDialog({ isOpen: false, student: null, type: null });
    };

    const confirmNocToggle = async () => {
        const student = confirmDialog.student;
        const newNocStatus = student.nocStatus === 'cleared' ? 'pending' : 'cleared';

        try {
            const studentRef = doc(db, 'users', student.id);
            await updateDoc(studentRef, {
                nocStatus: newNocStatus,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            });
            // Consider logging specifically for NOC if needed
            toast.success(`NOC ${newNocStatus === 'cleared' ? 'Issued' : 'Revoked'} successfully`);
            fetchStudents();
        } catch (error) {
            console.error('Error updating NOC:', error);
            toast.error('Failed to update NOC status');
        }
        setConfirmDialog({ isOpen: false, student: null, type: null });
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
            header: 'Roll No.',
            field: 'rollNumber',
            render: (row) => <span className="font-mono text-sm">{row.rollNumber || row.enrollmentNumber}</span>
        },
        {
            header: 'Enrollment No.',
            field: 'enrollmentNumber',
            render: (row) => <span className="font-mono text-sm text-gray-400">{row.enrollmentNumber}</span>
        },
        {
            header: 'Semester',
            field: 'currentSemester',
            render: (row) => <span className="text-sm">Semester {row.currentSemester}</span>
        },
        {
            header: 'NOC Status',
            field: 'nocStatus',
            render: (row) => (
                <button
                    onClick={() => handleNocToggle(row)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${row.nocStatus === 'cleared'
                        ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                        : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                        } transition-colors uppercase tracking-wider`}
                    title="Click to toggle NOC"
                >
                    {row.nocStatus === 'cleared' ? 'CLEARED' : 'PENDING'}
                </button>
            )
        },
        {
            header: 'Status',
            field: 'status',
            render: (row) => <StatusBadge status={row.status} />
        }
    ];

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
                    <p className="text-sm text-gray-600">Manage students and NOC in {user?.departmentName}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAdd}
                        className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Student
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={students}
                    loading={loading}
                    onEdit={handleEdit}
                    onStatusToggle={handleStatusToggle}
                    emptyMessage="No students found. Create your first student to get started."
                />
            </div>

            {/* Form Modal */}
            {showForm && (
                <FormModal
                    isOpen={true}
                    onClose={() => setShowForm(false)}
                    onSubmit={handleSubmit}
                    title={editingStudent ? 'Edit Student' : 'Create New Student'}
                    submitText={editingStudent ? 'Update' : 'Create'}
                    loading={formLoading}
                    size="lg"
                >
                    {/* Keep Existing Form Content, just verifying logic */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} required />
                            <Input label="Email" name="email" value={formData.email} onChange={handleChange} error={errors.email} required disabled={!!editingStudent} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Roll Number" name="rollNumber" value={formData.rollNumber} onChange={handleChange} error={errors.rollNumber} required placeholder="2024001" />
                            <Input label="Enrollment Number" name="enrollmentNumber" value={formData.enrollmentNumber} onChange={handleChange} error={errors.enrollmentNumber} required placeholder="2024BCA001" />
                        </div>
                        <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} placeholder="+91-9876543210" />

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Father Name" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Father's Name" />
                            <Input label="Mother Name" name="motherName" value={formData.motherName} onChange={handleChange} placeholder="Mother's Name" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Current Semester" name="currentSemester" type="number" value={formData.currentSemester} onChange={handleChange} min="1" max="8" required />
                            <Input label="Academic Year" name="academicYear" value={formData.academicYear} onChange={handleChange} error={errors.academicYear} required placeholder="2025-2026" />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <Input label="Address" name="address" value={formData.address} onChange={handleChange} />

                        {/* Course Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enrolled Courses <span className="text-red-600">*</span></label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                {courses.length === 0 ? (
                                    <p className="text-sm text-gray-500">No active courses available</p>
                                ) : (
                                    courses.map(course => (
                                        <label key={course.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                            <input
                                                type="checkbox"
                                                checked={formData.courseIds.includes(course.id)}
                                                onChange={() => handleCourseToggle(course.id)}
                                                className="w-4 h-4 text-biyani-red focus:ring-biyani-red border-gray-300 rounded"
                                            />
                                            <span className="text-sm">{course.name} ({course.code})</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            {errors.courseIds && <p className="text-sm text-red-600 mt-1">{errors.courseIds}</p>}
                        </div>

                        {/* Department Info */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Assigned Department</p>
                            <p className="text-gray-900 font-semibold">{user?.departmentName}</p>
                            <p className="text-sm text-gray-600">{user?.collegeName} • {user?.campusName}</p>
                        </div>
                    </div>
                </FormModal>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, student: null, type: null })}
                onConfirm={executeConfirmAction}
                title={confirmDialog.type === 'noc' ? 'Confirm NOC Change' : `${confirmDialog.student?.status === 'active' ? 'Deactivate' : 'Activate'} Student`}
                message={
                    confirmDialog.type === 'noc'
                        ? `Are you sure you want to ${confirmDialog.student?.nocStatus === 'cleared' ? 'REVOKE' : 'ISSUE'} NOC for ${confirmDialog.student?.name}?`
                        : `Are you sure you want to ${confirmDialog.student?.status === 'active' ? 'inactivate' : 'activate'} ${confirmDialog.student?.name}?`
                }
                variant={confirmDialog.type === 'noc' ? (confirmDialog.student?.nocStatus === 'cleared' ? 'danger' : 'success') : 'warning'}
            />
        </div>
    );
}
