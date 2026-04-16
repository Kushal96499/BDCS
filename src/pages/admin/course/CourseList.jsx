// ============================================
// BDCS - Course List Component
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logStatusChange, logDelete, logAudit } from '../../../utils/auditLogger';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import Button from '../../../components/Button';
import CourseForm from './CourseForm';
import { motion, AnimatePresence } from 'framer-motion';

export default function CourseList() {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [colleges, setColleges] = useState({});
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, course: null, action: null, message: '' });
    const [safeMode, setSafeMode] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Courses
            const coursesQ = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
            const coursesSnap = await getDocs(coursesQ);
            const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Fetch Colleges for mapping
            const collegesSnap = await getDocs(collection(db, 'colleges'));
            const collegesData = collegesSnap.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data().name;
                return acc;
            }, {});

            setColleges(collegesData);
            setCourses(coursesData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load course directory');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = fetchData; // For compatibility with existing callbacks

    const handleStatusToggle = (course) => {
        setConfirmDialog({ 
            isOpen: true, 
            course, 
            action: 'toggle', 
            message: `Are you sure you want to ${course.status === 'active' ? 'disable' : 'enable'} ${course.name}?` 
        });
    };

    const handleSafeDelete = async (course) => {
        if (safeMode) return;
        setLoading(true);
        try {
            // Check Dependencies (Subjects/Batches) - For now simplified
            setConfirmDialog({
                isOpen: true,
                course,
                action: 'delete',
                title: 'Permanent Delete',
                message: `Are you sure you want to PERMANENTLY DELETE ${course.name}? \n\nThis action cannot be undone.`
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to check dependencies");
        } finally {
            setLoading(false);
        }
    };

    const executeAction = async () => {
        const { course, action } = confirmDialog;
        if (!course || !action) return;

        try {
            if (action === 'toggle') {
                const newStatus = course.status === 'active' ? 'inactive' : 'active';
                const courseRef = doc(db, 'courses', course.id);
                const beforeData = { ...course };
                const afterData = { ...course, status: newStatus, updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(courseRef, { status: newStatus, updatedAt: new Date(), updatedBy: user.uid });
                await logStatusChange('courses', course.id, beforeData, afterData, user);
                toast.success(`Course ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
            }
            else if (action === 'delete') {
                await deleteDoc(doc(db, 'courses', course.id));
                await logDelete('courses', course.id, course, user, { label: course.name });
                toast.success(`Course permanently deleted`);
            }

            setConfirmDialog({ isOpen: false, course: null, action: null, message: '' });
            fetchData();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        { 
            header: 'Academic Identity', 
            mobileFullWidth: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-gray-900 font-bold tracking-tight">{row.name}</span>
                    <span className="text-[10px] font-mono font-bold text-[#E31E24] tracking-widest mt-1 uppercase">{row.code}</span>
                </div>
            ) 
        },
        { 
            header: 'Affiliation', 
            render: (row) => {
                const collegeNames = (row.collegeIds || []).map(id => colleges[id]).filter(Boolean);
                
                if (collegeNames.length === 0) return <span className="text-gray-400 font-medium italic">Unassigned</span>;
                if (collegeNames.length === 1) return <span className="text-gray-900 font-semibold">{collegeNames[0]}</span>;
                
                return (
                    <div className="flex flex-col">
                        <span className="text-gray-900 font-semibold">{collegeNames[0]}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">+{collegeNames.length - 1} More Colleges</span>
                    </div>
                );
            }
        },
        { header: 'Duration', field: 'duration', render: (row) => <span className="font-semibold">{row.duration} Semesters</span> },
        { header: 'Status', field: 'status', render: (row) => <StatusBadge status={row.status} /> },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Courses</h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">Manage degree programs and curricula</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Safe Mode</span>
                        <button
                            onClick={() => setSafeMode(!safeMode)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 ${safeMode ? 'bg-emerald-500' : 'bg-red-500'}`}
                        >
                            <motion.span animate={{ x: safeMode ? 20 : 4 }} className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm" />
                        </button>
                    </div>

                    <Button variant="primary" onClick={() => { setEditingCourse(null); setShowForm(true); }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
                        <span>Add Course</span>
                    </Button>
                </div>
            </div>

            {/* Warning Banner */}
            {!safeMode && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-xs font-bold text-red-600">Delete Mode Active: Course removals are final.</p>
                </motion.div>
            )}

            <div className="animate-premium-slide">
                <DataTable
                    columns={columns}
                    data={courses}
                    loading={loading}
                    onEdit={(course) => { setEditingCourse(course); setShowForm(true); }}
                    onStatusToggle={handleStatusToggle}
                    onDelete={!safeMode ? handleSafeDelete : null}
                    emptyMessage="No courses found."
                />
            </div>

            <AnimatePresence>
                {showForm && (
                    <CourseForm
                        course={editingCourse}
                        onClose={() => { setShowForm(false); setEditingCourse(null); }}
                        onSuccess={() => { setShowForm(false); setEditingCourse(null); fetchCourses(); }}
                    />
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, course: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Confirm Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </motion.div>
    );
}
