// ============================================
// BDCS - Promote to HOD Confirmation Modal
// Confirms teacher promotion with department selection
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { promoteTeacherToHOD } from '../../services/promotionService';
import { toast } from '../admin/Toast';

export default function PromoteToHODModal({ teacher, currentUser, onClose, onSuccess }) {
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadAvailableDepartments();
    }, []);

    const loadAvailableDepartments = async () => {
        setLoading(true);
        try {
            const deptQuery = query(
                collection(db, 'departments'),
                where('collegeId', '==', currentUser.collegeId)
            );
            const snapshot = await getDocs(deptQuery);
            const depts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setDepartments(depts);
        } catch (error) {
            console.error('Error loading departments:', error);
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (e) => {
        e.preventDefault();

        if (!selectedDepartmentId) {
            toast.error('Please select a department');
            return;
        }

        const selectedDept = departments.find(d => d.id === selectedDepartmentId);

        if (selectedDept.currentHOD) {
            toast.error(`${selectedDept.name} already has an HOD. Please demote or transfer first.`);
            return;
        }

        setSubmitting(true);
        try {
            await promoteTeacherToHOD(teacher.id, selectedDepartmentId, currentUser);

            toast.success(
                <div>
                    <p className="font-semibold">{teacher.name} promoted to HOD!</p>
                    <p className="text-xs mt-1">Department: {selectedDept.name}</p>
                </div>
            );

            onSuccess && onSuccess();
            onClose();
        } catch (error) {
            console.error('Error promoting teacher:', error);
            toast.error(error.message || 'Failed to promote teacher');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-biyani-red to-biyani-red-dark px-6 py-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Promote to HOD
                        </h2>
                        <p className="text-sm text-red-100 mt-1">{teacher.name}</p>
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

                {/* Info Banner */}
                <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-semibold text-blue-900">Promotion Impact</p>
                            <ul className="text-xs text-blue-800 mt-1 space-y-1">
                                <li>✓ Gains HOD role and responsibilities</li>
                                <li>✓ Keeps all existing teaching assignments</li>
                                <li>✓ Can switch between HOD and Teacher panels</li>
                                <li>✓ No data loss - all history preserved</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handlePromote} className="p-6">
                    <div className="space-y-4">
                        {/* Department Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Select Department to Assign as HOD *
                            </label>

                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-14"></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                    {departments.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">No departments available</p>
                                    ) : (
                                        departments.map(dept => {
                                            const hasHOD = !!dept.currentHOD;

                                            return (
                                                <label
                                                    key={dept.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${hasHOD
                                                        ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                                        : selectedDepartmentId === dept.id
                                                            ? 'bg-biyani-red text-white shadow-md'
                                                            : 'bg-gray-50 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="department"
                                                        value={dept.id}
                                                        checked={selectedDepartmentId === dept.id}
                                                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                                                        disabled={hasHOD}
                                                        className="w-4 h-4"
                                                    />
                                                    <div className="flex-1">
                                                        <p className={`font-medium ${selectedDepartmentId === dept.id ? 'text-white' : 'text-gray-900'}`}>
                                                            {dept.name}
                                                        </p>
                                                        {dept.code && (
                                                            <p className={`text-xs ${selectedDepartmentId === dept.id ? 'text-white/80' : 'text-gray-600'}`}>
                                                                {dept.code}
                                                            </p>
                                                        )}
                                                        {hasHOD && (
                                                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                                </svg>
                                                                Already has HOD: {dept.currentHODName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            )}
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
                            disabled={submitting || !selectedDepartmentId}
                            className="flex-1 px-4 py-2.5 bg-biyani-red text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Promoting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    Promote to HOD
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
