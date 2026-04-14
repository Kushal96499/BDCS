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
import CourseForm from './CourseForm';

export default function CourseList() {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, course: null, action: null, message: '' });
    const [safeMode, setSafeMode] = useState(true);

    useEffect(() => { fetchCourses(); }, []);

    const fetchCourses = async () => {
        try {
            const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = (course) => setConfirmDialog({ isOpen: true, course, action: 'toggle', message: `Are you sure you want to ${course.status === 'active' ? 'disable' : 'enable'} ${course.name}?` });

    const handleSafeDelete = async (course) => {
        if (safeMode) return;

        setLoading(true);
        try {
            // Check Dependencies (Batches)
            const batchesQ = query(collection(db, 'batches'), where('courseId', '==', course.id));
            const batchesSnap = await getDocs(batchesQ);
            const batchCount = batchesSnap.size;

            if (batchCount > 0) {
                // Has dependencies -> Suggest Archive
                setConfirmDialog({
                    isOpen: true,
                    course,
                    action: 'archive',
                    title: 'Cannot Hard Delete',
                    message: `This course has ${batchCount} batches linked to it. \n\nHard deletion is prevented. \n\nDo you want to ARCHIVE it instead?`
                });
            } else {
                // No dependencies -> Allow Hard Delete
                setConfirmDialog({
                    isOpen: true,
                    course,
                    action: 'delete',
                    title: 'Permanent Delete',
                    message: `Are you sure you want to PERMANENTLY DELETE ${course.name}? \n\nThis action cannot be undone.`
                });
            }
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
            else if (action === 'archive') {
                const courseRef = doc(db, 'courses', course.id);
                const beforeData = { ...course };
                const afterData = { ...course, status: 'archived', updatedAt: new Date(), updatedBy: user.uid };

                await updateDoc(courseRef, { status: 'archived', updatedAt: new Date(), updatedBy: user.uid });
                await logAudit('courses', course.id, 'archive', beforeData, afterData, user, { label: course.name });
                toast.success(`Course archived`);
            }
            else if (action === 'delete') {
                await deleteDoc(doc(db, 'courses', course.id));
                await logDelete('courses', course.id, course, user, { label: course.name });
                toast.success(`Course permanently deleted`);
            }

            setConfirmDialog({ isOpen: false, course: null, action: null, message: '' });
            fetchCourses();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Action failed');
        }
    };

    const degreeTypeLabels = { ug: 'UG', pg: 'PG', diploma: 'Diploma', certificate: 'Certificate' };

    const columns = [
        { header: 'Code', field: 'code', render: (row) => <span className="font-mono font-semibold">{row.code}</span> },
        { header: 'Name', field: 'name' },
        { header: 'Degree', field: 'degreeType', render: (row) => degreeTypeLabels[row.degreeType] || row.degreeType },
        { header: 'Duration', field: 'duration', render: (row) => `${row.duration} years` },
        { header: 'System', field: 'systemType', render: (row) => <span className="capitalize">{row.systemType}</span> },
        { header: 'Status', field: 'status', render: (row) => <StatusBadge status={row.status} /> }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
                    <p className="text-sm text-gray-600">Manage academic courses and programs</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Safe Mode Toggle */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <span className="text-xs font-medium text-gray-600">Safe Mode</span>
                        <button
                            onClick={() => setSafeMode(!safeMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${safeMode ? 'bg-green-500' : 'bg-red-500'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${safeMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-xs font-bold ${safeMode ? 'text-green-600' : 'text-red-600'}`}>
                            {safeMode ? 'ON' : 'OFF'}
                        </span>
                    </div>

                    <button onClick={() => { setEditingCourse(null); setShowForm(true); }} className="bg-biyani-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Course
                    </button>
                </div>
            </div>

            {/* Warning Banner when Safe Mode is OFF */}
            {!safeMode && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-sm text-red-700"><strong>Delete Mode Active:</strong> You can now permanently delete courses.</p>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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

            {showForm && <CourseForm course={editingCourse} onClose={() => { setShowForm(false); setEditingCourse(null); }} onSuccess={() => { setShowForm(false); setEditingCourse(null); fetchCourses(); }} />}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, course: null, action: null })}
                onConfirm={executeAction}
                title={confirmDialog.title || "Confirm Action"}
                message={confirmDialog.message}
                variant={confirmDialog.action === 'delete' ? 'danger' : 'warning'}
            />
        </div>
    );
}
