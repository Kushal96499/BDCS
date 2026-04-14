// ============================================
// BDCS - Exam Form (Admin)
// Create/Edit Exam Definitions
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate } from '../../../utils/auditLogger';

export default function ExamForm({ isOpen, onClose, onSuccess, initialData }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Default form state
    const [formData, setFormData] = useState({
        name: '',
        type: 'internal',
        academicYear: '2024-2025',
        semester: '1',
        startDate: '',
        endDate: '',
        status: 'draft'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                startDate: initialData.startDate ? new Date(initialData.startDate.toDate()).toISOString().slice(0, 10) : '',
                endDate: initialData.endDate ? new Date(initialData.endDate.toDate()).toISOString().slice(0, 10) : '',
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.startDate) {
            toast.error('Name and Start Date are required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                semester: parseInt(formData.semester),
                startDate: new Date(formData.startDate),
                endDate: formData.endDate ? new Date(formData.endDate) : null,
                updatedAt: serverTimestamp()
            };

            if (initialData) {
                // Update
                await updateDoc(doc(db, 'exams', initialData.id), payload);
                await logUpdate(user, 'exams', initialData.id, payload);
                toast.success('Exam updated');
            } else {
                // Create
                payload.createdAt = serverTimestamp();
                const ref = await addDoc(collection(db, 'exams'), payload);
                await logCreate(user, 'exams', ref.id, payload);
                toast.success('Exam created');
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving exam:', error);
            toast.error('Failed to save exam');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Exam" : "Create New Exam"}
            loading={loading}
            footer={
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 text-white bg-biyani-red rounded-lg hover:bg-red-700">Save Exam</button>
                </div>
            }
        >
            <div className="space-y-4">
                <Input
                    label="Exam Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Mid-Term Sem 1 2024"
                />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-biyani-red focus:ring-biyani-red"
                        >
                            <option value="internal">Internal</option>
                            <option value="external">External (University)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-biyani-red focus:ring-biyani-red"
                        >
                            <option value="draft">Draft (Config)</option>
                            <option value="open">Open (Marks Entry)</option>
                            <option value="closed">Closed (Locked)</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                        <select
                            name="academicYear"
                            value={formData.academicYear}
                            onChange={handleChange}
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-biyani-red focus:ring-biyani-red"
                        >
                            <option value="2024-2025">2024-2025</option>
                            <option value="2025-2026">2025-2026</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                        <select
                            name="semester"
                            value={formData.semester}
                            onChange={handleChange}
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-biyani-red focus:ring-biyani-red"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Start Date"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="End Date"
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleChange}
                    />
                </div>
            </div>
        </FormModal>
    );
}
