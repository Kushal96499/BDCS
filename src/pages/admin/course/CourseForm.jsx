// ============================================
// BDCS - Course Form Component
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate, buildHierarchyPath } from '../../../utils/auditLogger';
import { validateRequired, validateCodeFormat, validateDuration, isCodeUnique, sanitizeInput } from '../../../utils/validators';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';

export default function CourseForm({ course, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [colleges, setColleges] = useState([]);
    const [formData, setFormData] = useState({
        name: '', code: '', degreeType: 'ug', duration: 3, systemType: 'semester', collegeIds: [], status: 'active'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchColleges();
        if (course) {
            setFormData({ name: course.name, code: course.code, degreeType: course.degreeType, duration: course.duration, systemType: course.systemType, collegeIds: course.collegeIds || [], status: course.status });
        }
    }, [course]);

    const fetchColleges = async () => {
        try {
            const q = query(collection(db, 'colleges'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setColleges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load colleges');
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) : (name === 'code' ? value.toUpperCase() : value) }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleCollegeToggle = (collegeId) => {
        setFormData(prev => ({
            ...prev,
            collegeIds: prev.collegeIds.includes(collegeId) ? prev.collegeIds.filter(id => id !== collegeId) : [...prev.collegeIds, collegeId]
        }));
    };

    const validate = async () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['name', 'code']);
        if (!requiredValidation.valid) Object.assign(newErrors, requiredValidation.errors);

        const codeValidation = validateCodeFormat(formData.code);
        if (!codeValidation.valid) newErrors.code = codeValidation.error;

        const durationValidation = validateDuration(formData.duration);
        if (!durationValidation.valid) newErrors.duration = durationValidation.error;

        if (!newErrors.code) {
            const isUnique = await isCodeUnique('courses', formData.code, course?.id);
            if (!isUnique) newErrors.code = 'Course code already exists';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!(await validate())) return;
        setLoading(true);

        try {
            const sanitizedData = {
                name: sanitizeInput(formData.name),
                code: formData.code.toUpperCase(),
                degreeType: formData.degreeType,
                duration: formData.duration,
                systemType: formData.systemType,
                collegeIds: formData.collegeIds,
                status: formData.status
            };

            const metadata = { label: sanitizedData.name };

            if (course) {
                const courseRef = doc(db, 'courses', course.id);
                const updateData = { ...sanitizedData, updatedAt: serverTimestamp(), updatedBy: user.uid };
                await updateDoc(courseRef, updateData);
                await logUpdate('courses', course.id, course, { ...course, ...updateData }, user, metadata);
                toast.success('Course updated successfully');
            } else {
                const newCourse = { ...sanitizedData, createdAt: serverTimestamp(), createdBy: user.uid, updatedAt: serverTimestamp(), updatedBy: user.uid };
                const docRef = await addDoc(collection(db, 'courses'), newCourse);
                await logCreate('courses', docRef.id, newCourse, user, metadata);
                toast.success('Course created successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to save course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal isOpen={true} onClose={onClose} onSubmit={handleSubmit} title={course ? 'Edit Course' : 'Add New Course'} submitText={course ? 'Update' : 'Create'} loading={loading} size="lg">
            <div className="space-y-4">
                <Input label="Course Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="e.g., Bachelor of Computer Applications" required />
                <Input label="Course Code" name="code" value={formData.code} onChange={handleChange} error={errors.code} placeholder="e.g., BCA" required helperText="2-10 uppercase letters/numbers" />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Degree Type</label>
                        <select name="degreeType" value={formData.degreeType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent">
                            <option value="ug">Undergraduate (UG)</option>
                            <option value="pg">Postgraduate (PG)</option>
                            <option value="diploma">Diploma</option>
                            <option value="certificate">Certificate</option>
                        </select>
                    </div>
                    <Input label="Duration (years)" name="duration" type="number" value={formData.duration} onChange={handleChange} error={errors.duration} min="1" max="10" required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Type</label>
                    <select name="systemType" value={formData.systemType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent">
                        <option value="semester">Semester</option>
                        <option value="year">Year</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Colleges (Optional)</label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {colleges.length === 0 ? (
                            <p className="text-sm text-gray-500">No active colleges available</p>
                        ) : (
                            colleges.map(college => (
                                <label key={college.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input type="checkbox" checked={formData.collegeIds.includes(college.id)} onChange={() => handleCollegeToggle(college.id)} className="w-4 h-4 text-biyani-red focus:ring-biyani-red border-gray-300 rounded" />
                                    <span className="text-sm">{college.name} ({college.campusName})</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
        </FormModal>
    );
}
