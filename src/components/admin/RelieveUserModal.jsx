// ============================================
// BDCS - Relieve User Modal Component
// Handle authority relief workflow with successor assignment
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../admin/Toast';
import { logUserRelieve, logSuccessorAssignment } from '../../utils/auditLogger';
import { transferOwnership } from '../../utils/ownershipTransfer';
import FormModal from '../admin/FormModal';
import Input from '../Input';

export default function RelieveUserModal({ user: targetUser, onClose, onSuccess }) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [availableSuccessors, setAvailableSuccessors] = useState([]);
    const [formData, setFormData] = useState({
        lastWorkingDate: '',
        reason: 'resigned',
        successorId: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (targetUser && ['hod', 'principal'].includes(targetUser.role)) {
            fetchAvailableSuccessors();
        }
    }, [targetUser]);

    const fetchAvailableSuccessors = async () => {
        try {
            // Find users with compatible roles in the same department/college
            const q = query(
                collection(db, 'users'),
                where('role', '==', targetUser.role),
                where('status', '==', 'active')
            );
            const snapshot = await getDocs(q);
            const successors = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.id !== targetUser.id); // Exclude the user being relieved

            setAvailableSuccessors(successors);
        } catch (error) {
            console.error('Error fetching successors:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.lastWorkingDate) {
            newErrors.lastWorkingDate = 'Last working date is required';
        } else {
            const selectedDate = new Date(formData.lastWorkingDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.lastWorkingDate = 'Last working date cannot be in the past';
            }
        }

        if (!formData.reason) {
            newErrors.reason = 'Reason is required';
        }

        // Mandatory successor check for HOD/Principal
        if (['hod', 'principal', 'director'].includes(targetUser.role) && !formData.successorId) {
            newErrors.successorId = `Successor assignment is mandatory for ${targetUser.role.toUpperCase()}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        try {
            const userRef = doc(db, 'users', targetUser.id);

            // Prepare lifecycle metadata
            const lifecycleMetadata = {
                relievedDate: new Date(formData.lastWorkingDate),
                relievedBy: currentUser.uid,
                relievedReason: formData.reason,
                lastWorkingDate: new Date(formData.lastWorkingDate),
                successorId: formData.successorId || null,
                notes: formData.notes || null
            };

            // Update user status to relieved
            await updateDoc(userRef, {
                status: 'relieved',
                lifecycleMetadata,
                permissions: {
                    canRead: true,
                    canWrite: false
                },
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid
            });

            // Log the relief action with entity metadata
            await logUserRelieve(targetUser.id, {
                lastWorkingDate: formData.lastWorkingDate,
                reason: formData.reason,
                successorId: formData.successorId,
                successorName: formData.successorId ? availableSuccessors.find(s => s.id === formData.successorId)?.name : null
            }, targetUser, currentUser);

            // If successor assigned, handle ownership transfer
            if (formData.successorId) {
                const successorUser = availableSuccessors.find(s => s.id === formData.successorId);

                // Transfer ownership (HOD/Principal)
                const transferResult = await transferOwnership(currentUser, targetUser, successorUser);

                // Log successor assignment with entity metadata
                await logSuccessorAssignment(targetUser.id, {
                    successorId: formData.successorId,
                    successorName: successorUser?.name,
                    successorRole: successorUser?.role,
                    ownership: {
                        departmentId: targetUser.departmentId,
                        collegeId: targetUser.collegeId,
                        transferredEntities: transferResult.transferred
                    }
                }, targetUser, currentUser);
            }

            toast.success(`${targetUser.name} has been relieved successfully`);
            onSuccess();
        } catch (error) {
            console.error('Error relieving user:', error);
            toast.error('Failed to relieve user');
        } finally {
            setLoading(false);
        }
    };

    const reasonOptions = [
        { value: 'resigned', label: 'Resigned' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'retired', label: 'Retired' }
    ];

    return (
        <FormModal
            isOpen={true}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={`Relieve Authority - ${targetUser?.name}`}
            submitText="Relieve User"
            loading={loading}
            size="lg"
        >
            <div className="space-y-4">
                {/* Warning about data preservation */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-yellow-800">Important Notice</p>
                            <p className="text-sm text-yellow-700 mt-1">
                                This user will be marked as <strong>RELIEVED</strong> and their account will become <strong>READ-ONLY</strong>.
                                All historical data will be preserved for institutional records.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Last Working Date */}
                <Input
                    label="Last Working Date"
                    name="lastWorkingDate"
                    type="date"
                    value={formData.lastWorkingDate}
                    onChange={handleChange}
                    error={errors.lastWorkingDate}
                    required
                />

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason <span className="text-red-600">*</span>
                    </label>
                    <select
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red ${errors.reason ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        {reasonOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
                </div>

                {/* Successor Assignment (for HOD/Principal) */}
                {['hod', 'principal'].includes(targetUser?.role) && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign Successor <span className="text-red-600">*</span>
                        </label>
                        <select
                            name="successorId"
                            value={formData.successorId}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-biyani-red ${errors.successorId ? 'border-red-500' : 'border-gray-300'}`}
                        >
                            <option value="">Select Successor</option>
                            {availableSuccessors.map(successor => (
                                <option key={successor.id} value={successor.id}>
                                    {successor.name} - {successor.email}
                                </option>
                            ))}
                        </select>
                        {errors.successorId && (
                            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {errors.successorId}
                            </p>
                        )}
                        {formData.successorId && (
                            <p className="text-sm text-green-600 mt-1">
                                ✓ Department ownership will be transferred to the selected successor
                            </p>
                        )}
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes (Optional)
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Any additional information..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red"
                    />
                </div>
            </div>
        </FormModal>
    );
}
