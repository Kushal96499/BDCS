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
import Select from '../../../components/admin/Select';
import { toast } from '../../../components/admin/Toast';
import { logStatusChange, logCreate, logUpdate } from '../../../utils/auditLogger';
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
            if (user.role === 'admin') {
                const deptSnap = await getDocs(query(collection(db, 'departments'), where('status', '==', 'active')));
                setDepartments(deptSnap.docs.map(d => ({ 
                    value: d.id, 
                    label: d.data().name 
                })));
            }

            const courseQuery = query(collection(db, 'courses'), where('status', '==', 'active'));
            const courseSnap = await getDocs(courseQuery);
            setCourses(courseSnap.docs.map(c => ({ 
                value: c.id, 
                label: `${c.data().name} (${c.data().code})` 
            })));
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDepartmentChange = (e) => {
        const deptId = e.target.value;
        const dept = departments.find(d => d.value === deptId);
        setFormData(prev => ({
            ...prev,
            departmentId: deptId,
            departmentName: dept?.label || ''
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.code || !formData.courseId) {
            toast.error('All required fields must be completed');
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
                toast.success('Subject updated successfully');
            } else {
                const docRef = await addDoc(collection(db, 'subjects'), {
                    ...subjectData,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid
                });
                await logCreate('subjects', docRef.id, subjectData, user);
                toast.success('Curriculum entry created');
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving subject:', error);
            toast.error('Failed to save subject details');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            title={initialData ? 'Edit Subject Details' : 'Initialize New Subject'}
            submitText={initialData ? 'Update Record' : 'Create Entry'}
            loading={loading}
            size="lg"
        >
            <div className="space-y-6 py-2">
                {user.role === 'admin' && (
                    <Select
                        label="Academic Department"
                        name="departmentId"
                        value={formData.departmentId}
                        options={departments}
                        onChange={handleDepartmentChange}
                        placeholder="Select Department"
                        required
                    />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input 
                        label="Subject Title" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="e.g. Data Structures & Algorithms" 
                        required 
                        autoComplete="off"
                    />
                    <Input 
                        label="Subject Code" 
                        name="code" 
                        value={formData.code} 
                        onChange={handleChange} 
                        placeholder="e.g. BCA-201" 
                        required 
                        autoComplete="off"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Select
                        label="Associated Degree Course"
                        name="courseId"
                        value={formData.courseId}
                        options={courses}
                        onChange={handleChange}
                        placeholder="Select Degree Course"
                        required
                    />
                    <Select
                        label="Academic Semester"
                        name="semester"
                        value={formData.semester}
                        options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: s, label: `Semester ${s}` }))}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Select
                        label="Curriculum Type"
                        name="type"
                        value={formData.type}
                        options={[
                            { value: 'theory', label: 'Theory / Lecture' },
                            { value: 'lab', label: 'Laboratory / Practical' }
                        ]}
                        onChange={handleChange}
                        required
                    />
                    <Input 
                        label="Credit Value" 
                        name="credits" 
                        type="number" 
                        value={formData.credits} 
                        onChange={handleChange} 
                        min="1" 
                        max="10" 
                        required
                    />
                </div>
            </div>
        </FormModal>
    );
}
