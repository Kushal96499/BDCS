// ============================================
// BDCS - Exam Subject Config
// Map subjects to exams with max marks & dates
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { toast } from '../../../components/admin/Toast';
import DataTable from '../../../components/admin/DataTable';

export default function ExamSubjectConfig() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [examSubjects, setExamSubjects] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add/Edit State
    const [selectedSubject, setSelectedSubject] = useState('');
    const [maxMarks, setMaxMarks] = useState(100);
    const [passingMarks, setPassingMarks] = useState(40);
    const [examDate, setExamDate] = useState('');

    useEffect(() => {
        fetchData();
    }, [examId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Exam Details
            const examSnap = await getDoc(doc(db, 'exams', examId));
            if (!examSnap.exists()) {
                toast.error('Exam not found');
                navigate('/admin/exams');
                return;
            }
            const examData = examSnap.data();
            setExam({ id: examSnap.id, ...examData });

            // 2. Fetch Configured Subjects for this Exam
            const esQ = query(collection(db, 'exam_subjects'), where('examId', '==', examId));
            const esSnap = await getDocs(esQ);
            const configured = esSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setExamSubjects(configured);

            // 3. Fetch All Subjects for the Exam's Semester
            // (Only show subjects that match the exam semester)
            const subQ = query(
                collection(db, 'subjects'),
                where('semester', '==', examData.semester),
                where('status', '==', 'active')
            );
            const subSnap = await getDocs(subQ);

            // Filter out already configured subjects
            const configuredIds = configured.map(c => c.subjectId);
            setAvailableSubjects(subSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(s => !configuredIds.includes(s.id))
            );

        } catch (error) {
            console.error(error);
            toast.error('Error loading config');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubject = async () => {
        if (!selectedSubject || !examDate) {
            toast.error('Select subject and date');
            return;
        }

        const subject = availableSubjects.find(s => s.id === selectedSubject);
        if (!subject) return;

        try {
            await addDoc(collection(db, 'exam_subjects'), {
                examId,
                subjectId: subject.id,
                subjectName: subject.name,
                subjectCode: subject.code,
                maxMarks: parseInt(maxMarks),
                passingMarks: parseInt(passingMarks),
                examDate: new Date(examDate),
                createdAt: new Date()
            });
            toast.success('Subject added to exam');
            // Reset and Refresh
            setSelectedSubject('');
            setExamDate('');
            fetchData();
        } catch (error) {
            toast.error('Failed to add subject');
        }
    };

    const handleRemove = async (id) => {
        if (!window.confirm('Remove this subject from exam? Marks data might be lost.')) return;
        try {
            await deleteDoc(doc(db, 'exam_subjects', id));
            toast.success('Subject removed');
            fetchData();
        } catch (error) {
            toast.error('Failed to remove subject');
        }
    };

    const columns = [
        { key: 'subjectName', label: 'Subject' },
        { key: 'subjectCode', label: 'Code' },
        { key: 'maxMarks', label: 'Max Marks' },
        { key: 'passingMarks', label: 'Passing' },
        { key: 'examDate', label: 'Date', render: (row) => row.examDate ? new Date(row.examDate.toDate()).toLocaleDateString() : '-' },
        {
            key: 'actions', label: 'Actions', render: (row) => (
                <button
                    onClick={() => handleRemove(row.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                    Remove
                </button>
            )
        }
    ];

    if (!exam) return null;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{exam.name}: Subject Config</h2>
                    <p className="text-sm text-gray-600">
                        {exam.type.toUpperCase()} • Sem {exam.semester} • {exam.academicYear}
                    </p>
                </div>
                <button onClick={() => navigate('/admin/exams')} className="text-gray-600 hover:text-gray-900">
                    ← Back to Exams
                </button>
            </div>

            {/* Config Form */}
            <div className="bg-gray-50 border rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full border-gray-300 rounded"
                    >
                        <option value="">Select Subject</option>
                        {availableSubjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
                    <input
                        type="number"
                        value={maxMarks}
                        onChange={(e) => setMaxMarks(e.target.value)}
                        className="w-full border-gray-300 rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passing</label>
                    <input
                        type="number"
                        value={passingMarks}
                        onChange={(e) => setPassingMarks(e.target.value)}
                        className="w-full border-gray-300 rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                        type="date"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        className="w-full border-gray-300 rounded"
                    />
                </div>
                <div>
                    <button
                        onClick={handleAddSubject}
                        className="w-full bg-biyani-red text-white py-2 rounded hover:bg-red-700"
                    >
                        Add Subject
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DataTable
                    columns={columns}
                    data={examSubjects}
                    loading={loading}
                    emptyMessage="No subjects configured for this exam."
                />
            </div>
        </div>
    );
}
