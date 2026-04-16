// ============================================
// BDCS - Create Test Modal (Teacher)
// Modal for creating new tests — "Neo-Campus" Premium Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { createTest } from '../../services/testService';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from '../../components/common/PremiumSelect';
import Input from '../../components/Input';

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
            setLoading(true);
            const batchesSnap = await getDocs(query(collection(db, 'batches'), where('status', '==', 'active')));
            const batchesData = batchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBatches(batchesData);

            const subjectsSnap = await getDocs(query(collection(db, 'class_assignments'), where('teacherId', '==', teacherUser.uid)));
            const subjectsData = subjectsSnap.docs.map(doc => doc.data());

            const uniqueSubjects = [];
            const seen = new Set();
            subjectsData.forEach(assignment => {
                if (!seen.has(assignment.subjectId)) {
                    seen.add(assignment.subjectId);
                    uniqueSubjects.push({
                        id: assignment.subjectId,
                        label: `${assignment.subjectName} (${assignment.subjectCode})`,
                        value: assignment.subjectId,
                        name: assignment.subjectName,
                        code: assignment.subjectCode,
                        batchId: assignment.batchId,
                        batchName: assignment.batchName,
                        semester: assignment.semester,
                        courseId: assignment.courseId
                    });
                }
            });
            setSubjects(uniqueSubjects);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load academic dependencies');
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectChange = (e) => {
        const subjectId = e.target.value;
        const selectedSubject = subjects.find(s => s.id === subjectId);
        if (selectedSubject) {
            const matchingBatch = batches.find(b => b.id === selectedSubject.batchId);
            setFormData(prev => ({
                ...prev,
                subject: subjectId,
                subjectName: selectedSubject.name,
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
        if (e) e.preventDefault();
        if (!formData.subject || !formData.batch || !formData.topic || !formData.testDate || !formData.maxMarks) {
            toast.error('Required fields: Subject, Topic, Date, and Marks');
            return;
        }

        try {
            setLoading(true);
            await createTest({
                ...formData,
                subjectId: formData.subject,
                batchId: formData.batch,
                testDate: formData.testDate
            }, teacherUser);
            toast.success('Assessment Protocol Authorized');
            onSuccess();
        } catch (error) {
            toast.error(error.message || 'Deployment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 overflow-y-auto no-scrollbar pt-12 md:pt-24">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/60 backdrop-blur-xl" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.98, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-none overflow-hidden flex flex-col border border-gray-100"
            >
                {/* Header */}
                <div className="bg-gray-900 px-8 py-5 shrink-0 relative overflow-hidden ring-1 ring-white/10">
                    <div className="absolute top-0 right-0 p-12 bg-[#E31E24]/10 blur-[80px] rounded-full mr-[-4rem] mt-[-4rem]" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#E31E24] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}><path d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">Authorizing Assessment</h2>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1.5">Academic Year {new Date().getFullYear()} • Institutional Protocol</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all border border-white/5 active:scale-90">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-8 bg-gray-50/10 custom-scrollbar overscroll-contain">
                    <div className="space-y-6">
                        <PremiumSelect
                            label="Subject Assignment *"
                            placeholder="Select Assigned Subject"
                            value={formData.subject}
                            onChange={handleSubjectChange}
                            options={subjects}
                            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" /></svg>}
                        />

                        <Input
                            label="Topic / Curricular Phase *"
                            placeholder="e.g. Data Structures - Unit 1"
                            value={formData.topic}
                            onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                            required
                        />

                        <div className="p-6 bg-violet-50/50 rounded-[1.5rem] border border-violet-100 flex items-center gap-5">
                            <div className="w-12 h-12 bg-violet-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-violet-200">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-0.5">Target Identification (Cohort)</p>
                                <p className="text-xl font-black text-gray-900 tracking-tight">{formData.batchName ? `${formData.batchName} — Sem ${formData.semester}` : 'Select Subject to Resolve Cohort'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <Input
                                label="Execution Date *"
                                type="date"
                                value={formData.testDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, testDate: e.target.value }))}
                                required
                            />
                            <Input
                                label="Yield Target (Marks) *"
                                type="number"
                                value={formData.maxMarks}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxMarks: parseInt(e.target.value) }))}
                                required
                            />
                        </div>

                        <PremiumSelect
                            label="Assessment Domain"
                            value={formData.testType}
                            onChange={(e) => setFormData(prev => ({ ...prev, testType: e.target.value }))}
                            options={[
                                { label: 'Class Assessment (CT)', value: 'class_test' },
                                { label: 'Unit Evaluation (UT)', value: 'unit_test' },
                                { label: 'Practical Phase', value: 'practical' }
                            ]}
                        />

                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Protocol Objectives (Optional)</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Outline specific criteria or instructions..."
                                rows={2}
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-[1.2rem] text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-[#E31E24] transition-all resize-none shadow-inner leading-relaxed"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-white shrink-0 flex items-center justify-between gap-4">
                    <button onClick={onClose} className="px-6 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-all">Discard Request</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-[#E31E24] text-white px-10 py-3.5 rounded-2xl shadow-xl shadow-red-200/50 hover:bg-black font-black uppercase tracking-widest text-[10px] flex items-center gap-3 active:scale-95 transition-all border border-white/10 disabled:opacity-50"
                    >
                        {loading ? 'Processing Authorization...' : 'Authorize Deploy'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
