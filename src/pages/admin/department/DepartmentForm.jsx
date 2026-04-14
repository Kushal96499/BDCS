// ============================================
// BDCS - Department Form Component
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate, buildHierarchyPath } from '../../../utils/auditLogger';
import { validateRequired, sanitizeInput } from '../../../utils/validators';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';

export default function DepartmentForm({ department, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [colleges, setColleges] = useState([]);
    const [courses, setCourses] = useState([]);
    const [formData, setFormData] = useState({
        name: '', code: '', collegeId: '', courseIds: [], status: 'active'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchColleges();
        fetchCourses();
        if (department) {
            setFormData({
                name: department.name,
                code: department.code,
                collegeId: department.collegeId,
                courseIds: department.courseIds || [],
                status: department.status
            });
        }
    }, [department]);

    const fetchColleges = async () => {
        try {
            const q = query(collection(db, 'colleges'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setColleges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            const q = query(collection(db, 'courses'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'code' ? value.toUpperCase() : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleCourseToggle = (courseId) => {
        setFormData(prev => ({
            ...prev,
            courseIds: prev.courseIds.includes(courseId) ? prev.courseIds.filter(id => id !== courseId) : [...prev.courseIds, courseId]
        }));
    };

    const validate = () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['name', 'code', 'collegeId']);
        if (!requiredValidation.valid) Object.assign(newErrors, requiredValidation.errors);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        try {
            const selectedCollege = colleges.find(c => c.id === formData.collegeId);

            const sanitizedData = {
                name: sanitizeInput(formData.name),
                code: formData.code.toUpperCase(),
                collegeId: formData.collegeId,
                collegeName: selectedCollege.name,
                courseIds: formData.courseIds,
                status: formData.status
            };

            const metadata = {
                label: sanitizedData.name,
                path: buildHierarchyPath({
                    campusName: selectedCollege?.campusName,
                    collegeName: selectedCollege?.name,
                    departmentName: sanitizedData.name
                })
            };

            if (department) {
                // Update: Do NOT touch HOD fields. Admin cannot assign HODs.
                const deptRef = doc(db, 'departments', department.id);
                const updateData = { ...sanitizedData, updatedAt: serverTimestamp(), updatedBy: user.uid };
                await updateDoc(deptRef, updateData);
                await logUpdate('departments', department.id, department, { ...department, ...updateData }, user, metadata);
                toast.success('Department updated successfully');
            } else {
                // Create: Initialize HOD fields as null
                const newDept = {
                    ...sanitizedData,
                    hodId: null,
                    hodName: null,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                };
                const docRef = await addDoc(collection(db, 'departments'), newDept);
                await logCreate('departments', docRef.id, newDept, user, metadata);
                toast.success('Department created successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to save department');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal isOpen={true} onClose={onClose} onSubmit={handleSubmit} title={department ? 'Edit Department' : 'Add New Department'} submitText={department ? 'Update' : 'Create'} loading={loading} size="lg">
            <div className="space-y-4">
                <Input label="Department Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="e.g., Computer Science" required />
                <Input label="Department Code" name="code" value={formData.code} onChange={handleChange} error={errors.code} placeholder="e.g., CS" required />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">College <span className="text-red-600">*</span></label>
                    <select name="collegeId" value={formData.collegeId} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red ${errors.collegeId ? 'border-red-500' : 'border-gray-300'}`}>
                        <option value="">Select College</option>
                        {colleges.map(college => <option key={college.id} value={college.id}>{college.name} ({college.campusName})</option>)}
                    </select>
                    {errors.collegeId && <p className="text-sm text-red-600 mt-1">{errors.collegeId}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Courses (Optional)</label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {courses.length === 0 ? (
                            <p className="text-sm text-gray-500">No active courses available</p>
                        ) : (
                            courses.map(course => (
                                <label key={course.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input type="checkbox" checked={formData.courseIds.includes(course.id)} onChange={() => handleCourseToggle(course.id)} className="w-4 h-4 text-biyani-red focus:ring-biyani-red border-gray-300 rounded" />
                                    <span className="text-sm">{course.name} ({course.code})</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                {/* HOD Assignment Removed: Only Principals can assign HODs */}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
        </FormModal>
    );
}
