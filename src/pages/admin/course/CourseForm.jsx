// ============================================
// BDCS - Course Form Component
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logCreate, logUpdate, buildHierarchyPath } from '../../../utils/auditLogger';
import { validateRequired, validateCodeFormat, validateDuration, isCodeUnique, sanitizeInput } from '../../../utils/validators';
import FormModal from '../../../components/admin/FormModal';
import Input from '../../../components/Input';
import Select from '../../../components/admin/Select';

export default function CourseForm({ course, onClose, onSuccess }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [colleges, setColleges] = useState([]);
    const [formData, setFormData] = useState({
        name: '', code: '', degreeType: 'ug', duration: 3, systemType: 'semester', collegeIds: [], status: 'active'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchColleges();
        if (course) {
            setFormData({ 
                name: course.name, 
                code: course.code, 
                degreeType: course.degreeType, 
                duration: course.duration, 
                systemType: course.systemType, 
                collegeIds: course.collegeIds || [], 
                status: course.status 
            });
        }
    }, [course]);

    const fetchColleges = async () => {
        try {
            const q = query(collection(db, 'colleges'), where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            setColleges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load colleges');
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'number' ? parseInt(value) : (name === 'code' ? value.toUpperCase() : value) 
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleCollegeToggle = (collegeId) => {
        setFormData(prev => ({
            ...prev,
            collegeIds: prev.collegeIds.includes(collegeId) ? prev.collegeIds.filter(id => id !== collegeId) : [...prev.collegeIds, collegeId]
        }));
    };

    const validate = async () => {
        const newErrors = {};
        const requiredValidation = validateRequired(formData, ['name', 'code']);
        if (!requiredValidation.valid) Object.assign(newErrors, requiredValidation.errors);

        const codeValidation = validateCodeFormat(formData.code);
        if (!codeValidation.valid) newErrors.code = codeValidation.error;

        const durationValidation = validateDuration(formData.duration);
        if (!durationValidation.valid) newErrors.duration = durationValidation.error;

        if (!newErrors.code) {
            const isUnique = await isCodeUnique('courses', formData.code, course?.id);
            if (!isUnique) newErrors.code = 'Course code already exists';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!(await validate())) return;
        setLoading(true);

        try {
            const sanitizedData = {
                name: sanitizeInput(formData.name),
                code: formData.code.toUpperCase(),
                degreeType: formData.degreeType,
                duration: formData.duration,
                systemType: formData.systemType,
                collegeIds: formData.collegeIds,
                status: formData.status
            };

            const metadata = { label: sanitizedData.name };

            if (course) {
                const courseRef = doc(db, 'courses', course.id);
                const updateData = { ...sanitizedData, updatedAt: serverTimestamp(), updatedBy: user.uid };
                await updateDoc(courseRef, updateData);
                await logUpdate('courses', course.id, course, { ...course, ...updateData }, user, metadata);
                toast.success('Course updated successfully');
            } else {
                const newCourse = { ...sanitizedData, createdAt: serverTimestamp(), createdBy: user.uid, updatedAt: serverTimestamp(), updatedBy: user.uid };
                const docRef = await addDoc(collection(db, 'courses'), newCourse);
                await logCreate('courses', docRef.id, newCourse, user, metadata);
                toast.success('Course created successfully');
            }

            onSuccess();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to save course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormModal 
            isOpen={true} 
            onClose={onClose} 
            onSubmit={handleSubmit} 
            title={course ? 'Modify Degree Program' : 'Register Academic Course'} 
            submitText={course ? 'Update Curriculum' : 'Initialize Course'} 
            loading={loading} 
            size="lg"
        >
            <div className="space-y-6 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input 
                        label="Course Title" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        error={errors.name} 
                        placeholder="e.g., Bachelor of Computer Applications" 
                        required 
                    />
                    <Input 
                        label="Course Code" 
                        name="code" 
                        value={formData.code} 
                        onChange={handleChange} 
                        error={errors.code} 
                        placeholder="e.g., BCA" 
                        required 
                        helperText="2-10 uppercase identifier" 
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <Select
                        label="Degree Level"
                        name="degreeType"
                        value={formData.degreeType}
                        options={[
                            { value: 'ug', label: 'Undergraduate' },
                            { value: 'pg', label: 'Postgraduate' },
                            { value: 'diploma', label: 'Diploma' },
                            { value: 'certificate', label: 'Certificate' }
                        ]}
                        onChange={handleChange}
                    />

                    <Input 
                        label="Duration (Years)" 
                        name="duration" 
                        type="number" 
                        value={formData.duration} 
                        onChange={handleChange} 
                        error={errors.duration} 
                        min="1" 
                        max="10" 
                        required 
                    />

                    <Select
                        label="Evaluation System"
                        name="systemType"
                        value={formData.systemType}
                        options={[
                            { value: 'semester', label: 'Semester Mode' },
                            { value: 'year', label: 'Annual Mode' }
                        ]}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Institutional Affiliation (Optional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto no-scrollbar p-1">
                        {colleges.length === 0 ? (
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest col-span-2 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-100 italic">No colleges found</p>
                        ) : (
                            colleges.map(college => (
                                <button
                                    key={college.id}
                                    type="button"
                                    onClick={() => handleCollegeToggle(college.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                                        formData.collegeIds.includes(college.id)
                                        ? 'bg-red-50 border-red-100 text-[#E31E24]'
                                        : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                        formData.collegeIds.includes(college.id)
                                        ? 'bg-[#E31E24] border-[#E31E24]'
                                        : 'bg-white border-gray-200'
                                    }`}>
                                        {formData.collegeIds.includes(college.id) && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                <path d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold leading-none">{college.name}</p>
                                        <p className="text-[9px] font-black opacity-60 uppercase tracking-widest mt-0.5">{college.campusName}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <Select
                    label="Program Status"
                    name="status"
                    value={formData.status}
                    options={[
                        { value: 'active', label: 'Active Program' },
                        { value: 'inactive', label: 'Discontinued' }
                    ]}
                    onChange={handleChange}
                />
            </div>
        </FormModal>
    );
}
