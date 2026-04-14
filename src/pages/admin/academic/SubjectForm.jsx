// ============================================
// BDCS - Subject Form
// Create/Edit Subjects
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate } from '../../../utils/auditLogger';
import { sanitizeInput } from '../../../utils/validators';

export default function SubjectForm({ isOpen, onClose, onSuccess, initialData }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'theory',
        credits: 4,
        semester: 1,
        departmentId: user.departmentId || '',
        departmentName: user.departmentName || '',
        courseId: '',
        status: 'active'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                type: initialData.type || 'theory'
            });
        } else if (user.role === 'hod') {
            // HOD defaults
            setFormData(prev => ({
                ...prev,
                departmentId: user.departmentId,
                departmentName: user.departmentName
            }));
        }

        fetchMetadata();
    }, [initialData, user]);

    const fetchMetadata = async () => {
        try {
            // If admin, fetch all departments
            if (user.role === 'admin') {
                const deptSnap = await getDocs(query(collection(db, 'departments'), where('status', '==', 'active')));
                setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }

            // Fetch courses for the selected department
            let courseQuery;
            const deptIdToCheck = user.role === 'hod' ? user.departmentId : formData.departmentId;

            if (deptIdToCheck) {
                // In real app, courses might be linked to department. 
                // For now, we fetch all active courses and we could filter if needed
                courseQuery = query(collection(db, 'courses'), where('status', '==', 'active'));
                const courseSnap = await getDocs(courseQuery);
                setCourses(courseSnap.docs.map(c => ({ id: c.id, ...c.data() })));
            }
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    };

    // Re-fetch courses when department changes (if admin)
    useEffect(() => {
        if (user.role === 'admin' && formData.departmentId) {
            // Logic to filter courses by department would go here if schema supported it directly
            // currently courses are collection-level
        }
    }, [formData.departmentId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDepartmentChange = (e) => {
        const deptId = e.target.value;
        const dept = departments.find(d => d.id === deptId);
        setFormData(prev => ({
            ...prev,
            departmentId: deptId,
            departmentName: dept?.name || ''
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.code || !formData.courseId) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const subjectData = {
                name: sanitizeInput(formData.name),
                code: sanitizeInput(formData.code).toUpperCase(),
                type: formData.type,
                credits: parseInt(formData.credits),
                semester: parseInt(formData.semester),
                departmentId: formData.departmentId,
                departmentName: formData.departmentName,
                courseId: formData.courseId,
                status: formData.status
            };

            if (initialData) {
                await updateDoc(doc(db, 'subjects', initialData.id), {
                    ...subjectData,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                });
                await logUpdate('subjects', initialData.id, initialData, subjectData, user);
                toast.success('Subject updated');
            } else {
                const docRef = await addDoc(collection(db, 'subjects'), {
                    ...subjectData,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid
                });
                await logCreate('subjects', docRef.id, subjectData, user);
                toast.success('Subject created');
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving subject:', error);
            toast.error('Failed to save subject');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={initialData ? 'Edit Subject' : 'Add Subject'}
            loading={loading}
        >
            <div className="space-y-4">
                {user.role === 'admin' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                            value={formData.departmentId}
                            onChange={handleDepartmentChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Select Department</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Subject Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Data Structures" required />
                    <Input label="Subject Code" name="code" value={formData.code} onChange={handleChange} placeholder="e.g. BCA-201" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                        <select
                            name="courseId"
                            value={formData.courseId}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">Select Course</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                        <select
                            name="semester"
                            value={formData.semester}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="theory">Theory</option>
                            <option value="lab">Lab/Practical</option>
                        </select>
                    </div>
                    <Input label="Credits" name="credits" type="number" value={formData.credits} onChange={handleChange} min="1" max="10" />
                </div>
            </div>
        </FormModal>
    );
}
