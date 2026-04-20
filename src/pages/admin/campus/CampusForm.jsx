// ============================================
// BDCS - Campus Form Component
// Create/Edit campus modal form
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate } from '../../../utils/auditLogger';
import { validateRequired, validateCodeFormat, isCodeUnique, sanitizeInput } from '../../../utils/validators';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';
import Select from '../../../components/admin/Select';

export default function CampusForm({ isOpen, campus, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        status: 'active'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (campus) {
            setFormData({
                name: campus.name,
                code: campus.code,
                status: campus.status
            });
        } else {
            setFormData({
                name: '',
                code: '',
                status: 'active'
            });
        }
        setErrors({});
    }, [campus, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'code' ? value.toUpperCase() : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = async () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['name', 'code']);
        if (!requiredValidation.valid) {
            Object.assign(newErrors, requiredValidation.errors);
        }

        const codeValidation = validateCodeFormat(formData.code);
        if (!codeValidation.valid) {
            newErrors.code = codeValidation.error;
        }

        if (!newErrors.code) {
            try {
                const isUnique = await isCodeUnique('campuses', formData.code, campus?.id);
                if (!isUnique) {
                    newErrors.code = 'Campus code already exists';
                }
            } catch (error) {
                newErrors.code = 'Failed to validate code';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        const isValid = await validate();
        if (!isValid) return;

        setLoading(true);

        try {
            const sanitizedData = {
                name: sanitizeInput(formData.name),
                code: formData.code.toUpperCase(),
                status: formData.status
            };

            if (campus) {
                const campusRef = doc(db, 'campuses', campus.id);
                const updateData = {
                    ...sanitizedData,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                };

                const metadata = { label: sanitizedData.name };
                await updateDoc(campusRef, updateData);
                await logUpdate('campuses', campus.id, campus, { ...campus, ...updateData }, user, metadata);
                toast.success('Campus updated successfully');
            } else {
                const newCampus = {
                    ...sanitizedData,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                };

                const metadata = { label: sanitizedData.name };
                const docRef = await addDoc(collection(db, 'campuses'), newCampus);
                await logCreate('campuses', docRef.id, newCampus, user, metadata);
                toast.success('Campus created successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving campus:', error);
            toast.error('Failed to save campus');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={campus ? 'Edit Campus' : 'Add New Campus'}
            submitText={campus ? 'Save Changes' : 'Add Campus'}
            loading={loading}
            size="md"
        >
            <div className="space-y-6 py-2">
                <Input
                    label="Campus Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="e.g. Vidhyadhar Nagar Campus"
                    required
                    autoComplete="organization"
                />

                <Input
                    label="Campus Code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    error={errors.code}
                    placeholder="e.g. VDN"
                    required
                    helperText="Unique uppercase identifier (2-10 chars)"
                    autoComplete="off"
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
                    required
                />
            </div>
        </FormModal>
    );
}
