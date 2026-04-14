// ============================================
// BDCS - College Form Component
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate, buildHierarchyPath } from '../../../utils/auditLogger';
import { validateRequired, validateCodeFormat, isCodeUnique, sanitizeInput } from '../../../utils/validators';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';

export default function CollegeForm({ college, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        campusId: '',
        type: 'coed',
        status: 'active'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchCampuses();
        if (college) {
            setFormData({
                name: college.name,
                code: college.code,
                campusId: college.campusId,
                type: college.type,
                status: college.status
            });
        }
    }, [college]);

    const fetchCampuses = async () => {
        try {
            const q = query(collection(db, 'campuses'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCampuses(data);
        } catch (error) {
            console.error('Error fetching campuses:', error);
            toast.error('Failed to load campuses');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'code' ? value.toUpperCase() : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = async () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['name', 'code', 'campusId']);
        if (!requiredValidation.valid) Object.assign(newErrors, requiredValidation.errors);

        const codeValidation = validateCodeFormat(formData.code);
        if (!codeValidation.valid) newErrors.code = codeValidation.error;

        if (!newErrors.code) {
            const isUnique = await isCodeUnique('colleges', formData.code, college?.id);
            if (!isUnique) newErrors.code = 'College code already exists';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!(await validate())) return;
        setLoading(true);

        try {
            const selectedCampus = campuses.find(c => c.id === formData.campusId);
            const sanitizedData = {
                name: sanitizeInput(formData.name),
                code: formData.code.toUpperCase(),
                campusId: formData.campusId,
                campusName: selectedCampus.name,
                type: formData.type,
                status: formData.status
            };

            const metadata = {
                label: sanitizedData.name,
                path: buildHierarchyPath({
                    campusName: selectedCampus.name,
                    collegeName: sanitizedData.name
                })
            };

            if (college) {
                const collegeRef = doc(db, 'colleges', college.id);
                const updateData = { ...sanitizedData, updatedAt: serverTimestamp(), updatedBy: user.uid };
                await updateDoc(collegeRef, updateData);
                await logUpdate('colleges', college.id, college, { ...college, ...updateData }, user, metadata);
                toast.success('College updated successfully');
            } else {
                const newCollege = {
                    ...sanitizedData,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                };
                const docRef = await addDoc(collection(db, 'colleges'), newCollege);
                await logCreate('colleges', docRef.id, newCollege, user, metadata);
                toast.success('College created successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving college:', error);
            toast.error('Failed to save college');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            isOpen={true}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={college ? 'Edit College' : 'Add New College'}
            submitText={college ? 'Update' : 'Create'}
            loading={loading}
            size="md"
        >
            <div className="space-y-4">
                <Input label="College Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} placeholder="e.g., Biyani Girls College" required />
                <Input label="College Code" name="code" value={formData.code} onChange={handleChange} error={errors.code} placeholder="e.g., BGC" required helperText="2-10 uppercase letters/numbers" />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campus <span className="text-red-600">*</span></label>
                    <select name="campusId" value={formData.campusId} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent ${errors.campusId ? 'border-red-500' : 'border-gray-300'}`}>
                        <option value="">Select Campus</option>
                        {campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                    </select>
                    {errors.campusId && <p className="text-sm text-red-600 mt-1">{errors.campusId}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">College Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent">
                        <option value="girls">Girls</option>
                        <option value="coed">Co-ed</option>
                    </select>
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
