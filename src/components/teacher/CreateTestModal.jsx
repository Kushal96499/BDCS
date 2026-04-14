// ============================================
// BDCS - Create Test Modal (Teacher)
// Modal for creating new tests
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { createTest } from '../../services/testService';
import { toast } from '../../components/admin/Toast';

export default function CreateTestModal({ onClose, onSuccess, teacherUser }) {
    const [loading, setLoading] = useState(false);
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [formData, setFormData] = useState({
        subject: '',
        subjectName: '',
        topic: '',
        batch: '',
        batchName: '',
        semester: '',
        academicYear: '',
        course: '',
        courseName: '',
        testDate: '',
        maxMarks: 50,
        testType: 'class_test',
        description: ''
    });

    useEffect(() => {
        loadBatchesAndSubjects();
    }, [teacherUser]);

    const loadBatchesAndSubjects = async () => {
        try {
            console.log('Loading batches and subjects for teacher:', teacherUser.uid);

            // Load batches where teacher is assigned
            const batchesQuery = query(
                collection(db, 'batches'),
                where('status', '==', 'active')
            );
            const batchesSnap = await getDocs(batchesQuery);
            const batchesData = batchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('Loaded batches:', batchesData.length);
            setBatches(batchesData);

            // Load subjects assigned to teacher from CLASS_ASSIGNMENTS (not subject_assignments!)
            const subjectsQuery = query(
                collection(db, 'class_assignments'),
                where('teacherId', '==', teacherUser.uid)
            );
            const subjectsSnap = await getDocs(subjectsQuery);
            console.log('Subject assignments found:', subjectsSnap.docs.length);

            const subjectsData = subjectsSnap.docs.map(doc => {
                const data = doc.data();
                console.log('Subject assignment:', data);
                return data;
            });

            // Store unique subjects WITH their assignment data (batch info)
            const uniqueSubjects = [];
            const seen = new Set();
            subjectsData.forEach(assignment => {
                if (!seen.has(assignment.subjectId)) {
                    seen.add(assignment.subjectId);
                    uniqueSubjects.push({
                        id: assignment.subjectId,
                        name: assignment.subjectName,
                        code: assignment.subjectCode,
                        // Store batch info for auto-fill
                        batchId: assignment.batchId,
                        batchName: assignment.batchName,
                        semester: assignment.semester,
                        courseId: assignment.courseId
                    });
                }
            });

            console.log('Unique subjects loaded:', uniqueSubjects);
            setSubjects(uniqueSubjects);

            if (uniqueSubjects.length === 0) {
                toast.error('No subjects assigned to you. Please contact HOD.');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load batches and subjects');
        }
    };

    const handleBatchChange = (e) => {
        const batchId = e.target.value;
        const selectedBatch = batches.find(b => b.id === batchId);

        if (selectedBatch) {
            setFormData(prev => ({
                ...prev,
                batch: batchId,
                batchName: selectedBatch.name,
                semester: selectedBatch.semester || '',
                academicYear: selectedBatch.academicYear || '',
                course: selectedBatch.courseId || '',
                courseName: selectedBatch.courseName || ''
            }));
        }
    };

    const handleSubjectChange = (e) => {
        const subjectId = e.target.value;
        const selectedSubject = subjects.find(s => s.id === subjectId);

        if (selectedSubject) {
            // Auto-fill batch data when subject is selected
            const matchingBatch = batches.find(b => b.id === selectedSubject.batchId);

            console.log('Selected subject:', selectedSubject);
            console.log('Matching batch:', matchingBatch);
            console.log('Semester from assignment:', selectedSubject.semester);
            console.log('Semester from batch:', matchingBatch?.currentSemester);

            setFormData(prev => ({
                ...prev,
                subject: subjectId,
                subjectName: selectedSubject.name,
                // Auto-fill batch details
                batch: selectedSubject.batchId,
                batchName: selectedSubject.batchName,
                semester: selectedSubject.semester || matchingBatch?.currentSemester || '',
                academicYear: matchingBatch?.academicYear || '',
                course: selectedSubject.courseId || matchingBatch?.courseId || '',
                courseName: matchingBatch?.courseName || ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.subject || !formData.batch || !formData.topic || !formData.testDate || !formData.maxMarks) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.maxMarks <= 0) {
            toast.error('Max marks must be greater than 0');
            return;
        }

        const testDate = new Date(formData.testDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (testDate < today) {
            toast.error('Test date cannot be in the past');
            return;
        }

        try {
            setLoading(true);
            await createTest({
                subjectId: formData.subject,
                subjectName: formData.subjectName,
                topic: formData.topic,
                batchId: formData.batch,
                batchName: formData.batchName,
                semester: formData.semester,
                academicYear: formData.academicYear,
                courseId: formData.course,
                courseName: formData.courseName,
                testDate: formData.testDate,
                maxMarks: formData.maxMarks,
                testType: formData.testType,
                description: formData.description
            }, teacherUser);

            toast.success('Test created successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error creating test:', error);
            toast.error(error.message || 'Failed to create test');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#D1D5DB #F3F4F6'
                }}
            >
                <style>{`
                    .modal-scrollbar::-webkit-scrollbar {
                        width: 8px;
                    }
                    .modal-scrollbar::-webkit-scrollbar-track {
                        background: #F3F4F6;
                        border-radius: 10px;
                    }
                    .modal-scrollbar::-webkit-scrollbar-thumb {
                        background: #D1D5DB;
                        border-radius: 10px;
                    }
                    .modal-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #9CA3AF;
                    }
                `}</style>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
                    <h2 className="text-2xl font-bold text-gray-900">Create New Test</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Subject <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.subject}
                            onChange={handleSubjectChange}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            required
                        >
                            <option value="">Select Subject</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Topic */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Topic / Chapter <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.topic}
                            onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                            placeholder="e.g., Trees and Graphs, Unit 3"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Batch - Auto-filled, Read-only */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Batch <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.batchName ? `${formData.batchName} - Semester ${formData.semester}` : 'Select subject first'}
                            readOnly
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                            placeholder="Auto-filled when subject is selected"
                        />
                        <p className="text-xs text-blue-600 mt-1">✓ Auto-filled from subject assignment</p>
                    </div>

                    {/* Test Date and Max Marks */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Test Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.testDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, testDate: e.target.value }))}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Max Marks <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.maxMarks}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxMarks: parseInt(e.target.value) }))}
                                min="1"
                                max="100"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {/* Test Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Test Type
                        </label>
                        <select
                            value={formData.testType}
                            onChange={(e) => setFormData(prev => ({ ...prev, testType: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                        >
                            <option value="class_test">Class Test</option>
                            <option value="unit_test">Unit Test</option>
                            <option value="practical">Practical</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Additional details about the test..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-biyani-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating...
                                </span>
                            ) : 'Create Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
