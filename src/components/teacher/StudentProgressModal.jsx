// ============================================
// BDCS - Student Progress Modal (Teacher)
// Modal for promoting/failing/marking students as passout
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { promoteStudent, markStudentBack, getStudentAcademicHistory } from '../../services/batchPromotionService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

export default function StudentProgressModal({ student, currentBatch, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [nextBatches, setNextBatches] = useState([]);
    const [selectedAction, setSelectedAction] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [reason, setReason] = useState('');
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadData();
    }, [student]);

    const loadData = async () => {
        try {
            // Load student history
            const historyData = await getStudentAcademicHistory(student.student);
            setHistory(historyData);

            // Load available next batches
            const batchesQuery = query(
                collection(db, 'batches'),
                where('status', '==', 'active')
            );
            const batchesSnap = await getDocs(batchesQuery);
            const batches = batchesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNextBatches(batches);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handlePromote = async () => {
        if (!selectedBatch) {
            toast.error('Please select target batch');
            return;
        }

        try {
            setLoading(true);
            await promoteStudent(student.student, currentBatch, selectedBatch, user);
            toast.success('Student promoted successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error promoting student:', error);
            toast.error(error.message || 'Failed to promote student');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkBack = async () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason');
            return;
        }

        try {
            setLoading(true);
            await markStudentBack(student.student, currentBatch, reason, user);
            toast.success('Student marked as back');
            onSuccess();
        } catch (error) {
            console.error('Error marking student as back:', error);
            toast.error(error.message || 'Failed to mark student as back');
        } finally {
            setLoading(false);
        }
    };

    const handlePassout = async () => {
        // For passout, we can reuse markStudentBack but with "PASSOUT" status
        try {
            setLoading(true);
            await markStudentBack(student.student, currentBatch, 'Course Completed - Passout', user);
            toast.success('Student marked as passout!');
            onSuccess();
        } catch (error) {
            console.error('Error marking student as passout:', error);
            toast.error(error.message || 'Failed to mark student as passout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Manage Student Progress</h2>
                            <p className="text-gray-600 mt-1">{student.studentName}</p>
                            <p className="text-sm text-gray-500">Enrollment: {student.enrollmentNumber}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Current Performance */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Current Test Performance</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Marks Obtained</p>
                                <p className="text-lg font-semibold text-gray-900">{student.marksObtained} / {student.maxMarks}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Percentage</p>
                                <p className="text-lg font-semibold text-gray-900">{student.percentage}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">Select Action</label>
                        <div className="space-y-2">
                            <button
                                onClick={() => setSelectedAction('promote')}
                                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${selectedAction === 'promote'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Promote to Next Batch</p>
                                        <p className="text-sm text-gray-600">Move student to next semester/batch</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setSelectedAction('back')}
                                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${selectedAction === 'back'
                                        ? 'border-yellow-500 bg-yellow-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Mark as Failed</p>
                                        <p className="text-sm text-gray-600">Student will remain in current batch</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setSelectedAction('passout')}
                                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${selectedAction === 'passout'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Mark as Passout</p>
                                        <p className="text-sm text-gray-600">Final semester completed</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Action-specific inputs */}
                    {selectedAction === 'promote' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Select Target Batch</label>
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            >
                                <option value="">-- Select Batch --</option>
                                {nextBatches.map(batch => (
                                    <option key={batch.id} value={batch.id}>
                                        {batch.name} (Semester {batch.semester})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedAction === 'back' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Reason</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                placeholder="Enter reason for marking as back..."
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={
                            selectedAction === 'promote' ? handlePromote :
                                selectedAction === 'back' ? handleMarkBack :
                                    selectedAction === 'passout' ? handlePassout :
                                        null
                        }
                        disabled={loading || !selectedAction}
                        className="px-6 py-2 bg-biyani-red text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
