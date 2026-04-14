// ============================================
// BDCS - Event Form (Faculty)
// Create and submit events for approval
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import FormModal from '../../components/admin/FormModal';
import Input from '../../components/Input';
import { toast } from '../../components/admin/Toast';
import { logCreate, logUpdate } from '../../utils/auditLogger';

export default function EventForm({ isOpen, onClose, onSuccess, initialData }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Default form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'academic', // academic, sports, cultural, workshop, seminar
        type: 'internal', // internal, inter-college
        startDate: '',
        endDate: '',
        venue: '',
        registrationLink: '', // Optional external link
        status: 'draft' // draft or pending
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                startDate: initialData.startDate ? new Date(initialData.startDate.toDate()).toISOString().slice(0, 16) : '',
                endDate: initialData.endDate ? new Date(initialData.endDate.toDate()).toISOString().slice(0, 16) : '',
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        if (!formData.title) return "Title is required";
        if (!formData.startDate) return "Start date is required";
        if (!formData.venue) return "Venue is required";
        return null;
    };

    const handleSubmit = async (targetStatus = 'draft') => {
        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        setLoading(true);
        try {
            const eventPayload = {
                ...formData,
                status: targetStatus, // 'draft' or 'pending'
                startDate: new Date(formData.startDate),
                endDate: formData.endDate ? new Date(formData.endDate) : null,
                organizerId: user.uid,
                organizerName: user.name,
                departmentId: user.departmentId,
                departmentName: user.departmentName, // Denormalized for display
                campusId: user.campusId, // Denormalized scope
                updatedAt: serverTimestamp()
            };

            if (initialData) {
                // Update
                await updateDoc(doc(db, 'events', initialData.id), eventPayload);
                await logUpdate(user, 'events', initialData.id, eventPayload);
                toast.success(`Event ${targetStatus === 'pending' ? 'submitted for approval' : 'saved as draft'}`);
            } else {
                // Create
                eventPayload.createdAt = serverTimestamp();
                const ref = await addDoc(collection(db, 'events'), eventPayload);
                await logCreate(user, 'events', ref.id, eventPayload);
                toast.success(`Event created successfully`);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error('Failed to save event');
        } finally {
            setLoading(false);
        }
    };

    const isReadOnly = initialData && (initialData.status === 'approved' || initialData.status === 'completed');

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? (isReadOnly ? "View Event" : "Edit Event") : "Create New Event"}
            loading={loading}
            // Custom footer to support "Save Draft" vs "Submit"
            footer={!isReadOnly && (
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleSubmit('draft')}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={loading}
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSubmit('pending')}
                        className="px-4 py-2 text-white bg-biyani-red rounded-lg hover:bg-red-700"
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                </div>
            )}
        >
            <div className="space-y-4">
                <Input
                    label="Event Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                    placeholder="e.g. Annual Tech Symposium"
                />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-biyani-red focus:ring-biyani-red"
                        >
                            <option value="academic">Academic</option>
                            <option value="sports">Sports</option>
                            <option value="cultural">Cultural</option>
                            <option value="workshop">Workshop</option>
                            <option value="seminar">Seminar</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            disabled={isReadOnly}
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-biyani-red focus:ring-biyani-red"
                        >
                            <option value="internal">Internal (Campus Only)</option>
                            <option value="inter-college">Inter-College</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Start Date & Time"
                        name="startDate"
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        disabled={isReadOnly}
                    />
                    <Input
                        label="End Date & Time"
                        name="endDate"
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={handleChange}
                        disabled={isReadOnly}
                    />
                </div>

                <Input
                    label="Venue"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                    placeholder="e.g. Auditorium, Lab 3"
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        name="description"
                        rows="4"
                        value={formData.description}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-biyani-red focus:ring-biyani-red"
                        placeholder="Details about the event, rules, eligibility..."
                    />
                </div>
            </div>
        </FormModal>
    );
}
