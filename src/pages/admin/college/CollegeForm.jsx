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
import Select from '../../../components/admin/Select';

export default function CollegeForm({ college, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [campuses, setCampuses] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        campusId: '',
        affiliation: 'University of Rajasthan', // Default as per most BDCS use-cases
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
                affiliation: college.affiliation || 'University of Rajasthan',
                type: college.type,
                status: college.status
            });
        }
    }, [college]);

    const fetchCampuses = async () => {
        try {
            const q = query(collection(db, 'campuses'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                label: doc.data().name, 
                value: doc.id 
            }));
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
        const requiredValidation = validateRequired(formData, ['name', 'code', 'campusId', 'affiliation']);
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
            const selectedCampus = campuses.find(c => c.value === formData.campusId);
            const sanitizedData = {
                name: sanitizeInput(formData.name),
                code: formData.code.toUpperCase(),
                campusId: formData.campusId,
                campusName: selectedCampus.label,
                affiliation: sanitizeInput(formData.affiliation),
                type: formData.type,
                status: formData.status
            };

            const metadata = {
                label: sanitizedData.name,
                path: buildHierarchyPath({
                    campusName: selectedCampus.label,
                    collegeName: sanitizedData.name
                })
            };

            if (college) {
                const collegeRef = doc(db, 'colleges', college.id);
                const updateData = { ...sanitizedData, updatedAt: serverTimestamp(), updatedBy: user.uid };
                await updateDoc(collegeRef, updateData);
                await logUpdate('colleges', college.id, college, { ...college, ...updateData }, user, metadata);
                toast.success('College details updated');
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
                toast.success('College added successfully');
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
            title={college ? 'Edit College Details' : 'Add New College'}
            submitText={college ? 'Save Changes' : 'Add College'}
            loading={loading}
            size="md"
        >
            <div className="space-y-6 py-2">
                <Input 
                    label="College Name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    error={errors.name} 
                    placeholder="e.g., Biyani Girls College" 
                    required 
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="College Code" 
                        name="code" 
                        value={formData.code} 
                        onChange={handleChange} 
                        error={errors.code} 
                        placeholder="e.g., BGC" 
                        required 
                    />

                    <Select
                        label="Campus"
                        name="campusId"
                        value={formData.campusId}
                        options={campuses}
                        onChange={handleChange}
                        error={errors.campusId}
                        placeholder="Select Campus"
                        required
                    />
                </div>

                <Input 
                    label="Affiliated University" 
                    name="affiliation" 
                    value={formData.affiliation} 
                    onChange={handleChange} 
                    error={errors.affiliation} 
                    placeholder="e.g., University of Rajasthan" 
                    required 
                    helperText="University this college is affiliated with"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="College Type"
                        name="type"
                        value={formData.type}
                        options={[
                            { value: 'girls', label: 'Girls Only' },
                            { value: 'coed', label: 'Co-Educational' }
                        ]}
                        onChange={handleChange}
                    />

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
        </FormModal>
    );
}
