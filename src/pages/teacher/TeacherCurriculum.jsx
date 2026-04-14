import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

export default function TeacherCurriculum() {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchCurriculum();
    }, [user]);

    const fetchCurriculum = async () => {
        setLoading(true);
        try {
            // 1. Get Subjects for my Department
            // Ideally, we could filter by what I teach (Class Assignments) OR show all Dept subjects.
            // College ERPs usually show all Dept subjects to faculty.
            const q = query(
                collection(db, 'subjects'),
                where('departmentId', '==', user.departmentId)
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSubjects(list);
        } catch (error) {
            console.error('Error fetching curriculum:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Curriculum & Syllabus</h1>
                <p className="text-gray-500 font-medium">Departmental Coursework Overview</p>
            </div>

            {loading ? (
                <div className="py-20 text-center text-gray-400">Loading curriculum...</div>
            ) : subjects.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-200">
                    <p className="text-gray-500">No subjects found for your department.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map(subject => (
                        <motion.div
                            key={subject.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                    Sem {subject.semester}
                                </span>
                                <span className="text-gray-400 text-xs font-mono">{subject.code}</span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-2">{subject.name}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-3">{subject.description || 'No description provided.'}</p>

                            {subject.syllabusUrl ? (
                                <a
                                    href={subject.syllabusUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-2 bg-black text-white text-center rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors"
                                >
                                    Download Syllabus PDF 📄
                                </a>
                            ) : (
                                <div className="w-full py-2 bg-gray-50 text-gray-400 text-center rounded-lg font-medium text-sm border border-gray-100">
                                    Syllabus Pending
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
