// ============================================
// BDCS - Demote HOD to Teacher Confirmation Modal
// Confirms HOD demotion with reason and ownership transfer
// ============================================

import React, { useState } from 'react';
import { demoteHODToTeacher } from '../../services/promotionService';
import { toast } from '../admin/Toast';

export default function DemoteHODModal({ hod, department, currentUser, onClose, onSuccess }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleDemote = async (e) => {
        e.preventDefault();

        setSubmitting(true);
        try {
            const result = await demoteHODToTeacher(
                hod.id,
                department.id,
                reason,
                currentUser
            );

            toast.success(
                <div>
                    <p className="font-semibold">{hod.name} demoted from HOD</p>
                    <p className="text-xs mt-1">{department.name} now requires a new HOD</p>
                </div>
            );

            onSuccess && onSuccess(result);
            onClose();
        } catch (error) {
            console.error('Error demoting HOD:', error);
            toast.error(error.message || 'Failed to demote HOD');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                            Demote HOD to Teacher
                        </h2>
                        <p className="text-sm text-orange-100 mt-1">{hod.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Warning Banner */}
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-semibold text-amber-900">Demotion Impact</p>
                            <ul className="text-xs text-amber-800 mt-1 space-y-1">
                                <li>• Removes HOD role and department ownership</li>
                                <li>• Teacher role and assignments remain intact</li>
                                <li>• {department.name} will need a new HOD</li>
                                <li>• Action is logged for audit trail</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleDemote} className="p-6">
                    <div className="space-y-4">
                        {/* Current Department Info */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">Current HOD of:</p>
                            <p className="font-semibold text-gray-900">{department.name}</p>
                            {department.code && (
                                <p className="text-sm text-gray-600">{department.code}</p>
                            )}
                        </div>

                        {/* Reason Input */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Reason for Demotion (Optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g., Retiring, Transferring, Personal request..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                            />
                        </div>

                        {/* Confirmation Statement */}
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-xs text-blue-900">
                                <strong>Note:</strong> After demotion, you will need to assign a new HOD for {department.name} to ensure department management continuity.
                            </p>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Demoting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                    </svg>
                                    Confirm Demotion
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
