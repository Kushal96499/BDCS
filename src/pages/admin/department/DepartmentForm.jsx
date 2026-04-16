// ============================================
// BDCS - Department Form Component
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate, buildHierarchyPath } from '../../../utils/auditLogger';
import { validateRequired, sanitizeInput } from '../../../utils/validators';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';
import Select from '../../../components/admin/Select';

export default function DepartmentForm({ department, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [colleges, setColleges] = useState([]);
    const [courses, setCourses] = useState([]);
    const [formData, setFormData] = useState({
        name: '', code: '', collegeId: '', courseIds: [], status: 'active'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchColleges();
        fetchCourses();
        if (department) {
            setFormData({
                name: department.name,
                code: department.code,
                collegeId: department.collegeId,
                courseIds: department.courseIds || [],
                status: department.status
            });
        }
    }, [department]);

    const fetchColleges = async () => {
        try {
            const q = query(collection(db, 'colleges'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setColleges(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                label: `${doc.data().name} (${doc.data().campusName || 'Main Campus'})`, 
                value: doc.id,
                collegeName: doc.data().name,
                campusName: doc.data().campusName,
                affiliation: doc.data().affiliation
            })));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            const q = query(collection(db, 'courses'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'code' ? value.toUpperCase() : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleCourseToggle = (courseId) => {
        setFormData(prev => ({
            ...prev,
            courseIds: prev.courseIds.includes(courseId) ? prev.courseIds.filter(id => id !== courseId) : [...prev.courseIds, courseId]
        }));
    };

    const validate = () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['name', 'code', 'collegeId']);
        if (!requiredValidation.valid) Object.assign(newErrors, requiredValidation.errors);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);

        try {
            const selectedCollege = colleges.find(c => c.value === formData.collegeId);

            const sanitizedData = {
                name: sanitizeInput(formData.name),
                code: formData.code.toUpperCase(),
                collegeId: formData.collegeId,
                collegeName: selectedCollege.collegeName,
                campusName: selectedCollege.campusName || null,
                collegeAffiliation: selectedCollege.affiliation || null,
                courseIds: formData.courseIds,
                status: formData.status
            };

            const metadata = {
                label: sanitizedData.name,
                path: buildHierarchyPath({
                    collegeName: sanitizedData.collegeName,
                    departmentName: sanitizedData.name
                })
            };

            if (department) {
                const deptRef = doc(db, 'departments', department.id);
                const updateData = { ...sanitizedData, updatedAt: serverTimestamp(), updatedBy: user.uid };
                await updateDoc(deptRef, updateData);
                await logUpdate('departments', department.id, department, { ...department, ...updateData }, user, metadata);
                toast.success('Department metadata synchronized');
            } else {
                const newDept = {
                    ...sanitizedData,
                    hodId: null,
                    hodName: null,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                    updatedAt: serverTimestamp(),
                    updatedBy: user.uid
                };
                const docRef = await addDoc(collection(db, 'departments'), newDept);
                await logCreate('departments', docRef.id, newDept, user, metadata);
                toast.success('Department establishment records saved');
            }

            onSuccess();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to save department');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal 
            isOpen={true} 
            onClose={onClose} 
            onSubmit={handleSubmit} 
            title={department ? 'Modify Department Records' : 'Establish Academic Department'} 
            submitText={department ? 'Update Structure' : 'Initialize Dept'} 
            loading={loading} 
            size="lg"
        >
            <div className="space-y-6 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input 
                        label="Department Designation" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        error={errors.name} 
                        placeholder="e.g., Computer Science & IT" 
                        required 
                    />
                    <Input 
                        label="Indexing Code" 
                        name="code" 
                        value={formData.code} 
                        onChange={handleChange} 
                        error={errors.code} 
                        placeholder="e.g., CSIT" 
                        required 
                    />
                </div>

                <Select
                    label="Parent Institutional Authority"
                    name="collegeId"
                    value={formData.collegeId}
                    options={colleges}
                    onChange={handleChange}
                    error={errors.collegeId}
                    placeholder="Select College Profile"
                    required
                />

                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Curricular Scope (Optional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto no-scrollbar p-1">
                        {courses.length === 0 ? (
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest col-span-2 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-100 italic">No academic courses found</p>
                        ) : (
                            courses.map(course => (
                                <button
                                    key={course.id}
                                    type="button"
                                    onClick={() => handleCourseToggle(course.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                                        formData.courseIds.includes(course.id)
                                        ? 'bg-red-50 border-red-100 text-[#E31E24]'
                                        : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                        formData.courseIds.includes(course.id)
                                        ? 'bg-[#E31E24] border-[#E31E24]'
                                        : 'bg-white border-gray-200'
                                    }`}>
                                        {formData.courseIds.includes(course.id) && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                <path d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold leading-none">{course.name}</p>
                                        <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mt-0.5">{course.code}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <Select
                    label="Operational Mandate"
                    name="status"
                    value={formData.status}
                    options={[
                        { value: 'active', label: 'In Service' },
                        { value: 'inactive', label: 'Suspended' }
                    ]}
                    onChange={handleChange}
                />
            </div>
        </FormModal>
    );
}
