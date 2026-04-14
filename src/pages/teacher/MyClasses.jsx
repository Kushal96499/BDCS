import React, { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useMyBatches } from '../../hooks/useMyBatches';
import { useStudents } from '../../hooks/useStudents';
import {
    generateNextRollNumber,
    updateStudentRole,
    toggleStudentNOC,
    deleteStudent,
    updateStudent,
    createStudentAccount
} from '../../services/studentService';
import { toast } from '../../components/admin/Toast';
import FormModal from '../../components/admin/FormModal';
import Input from '../../components/Input';
import DataTable from '../../components/admin/DataTable';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

export default function MyClasses() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'details'
    const [selectedBatch, setSelectedBatch] = useState(null);

    // Use custom hooks for data fetching
    const { batches: myBatches, loading: batchesLoading, refetch: refetchBatches } = useMyBatches(
        viewMode === 'list' ? user?.uid : null
    );
    const { students, loading: studentsLoading, refetch: refetchStudents } = useStudents(
        viewMode === 'details' ? selectedBatch?.id : null
    );
    const loading = batchesLoading || studentsLoading;

    // Form States
    const [showSingleForm, setShowSingleForm] = useState(false);
    const [showBulkForm, setShowBulkForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [studentForm, setStudentForm] = useState({
        name: '', fatherName: '', motherName: '',
        rollNumber: '', // Auto-generated Class Roll No
        lastExamRollNo: '', // Manual Input (Password)
        email: '', phone: '', parentPhone: ''
    });

    // Dialog State
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, student: null, type: null });


    // Delegates to studentService.generateNextRollNumber
    const getNextRoll = () => generateNextRollNumber(selectedBatch?.name || '', students);

    const handleAddClick = () => {
        setEditingId(null);
        setStudentForm({
            name: '', fatherName: '', motherName: '',
            rollNumber: getNextRoll(),
            lastExamRollNo: '',
            email: '', phone: '', parentPhone: ''
        });
        setShowSingleForm(true);
    };


    const handleEditClick = (student) => {
        setEditingId(student.id);
        setStudentForm({
            name: student.name || '',
            fatherName: student.fatherName || '',
            motherName: student.motherName || '',
            rollNumber: student.rollNumber,
            lastExamRollNo: student.enrollmentNumber || '', // Load enrollment number here
            email: student.email,
            phone: student.phone || '',
            parentPhone: student.parentPhone || ''
        });
        setShowSingleForm(true);
    };

    const handleDeleteStudent = async (student) => {
        if (!window.confirm(`Are you sure you want to delete ${student.name}? This cannot be undone.`)) return;
        try {
            await deleteStudent(student.id);
            toast.success('Student deleted');
            refetchStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
            toast.error('Failed to delete student');
        }
    };


    const handleRoleUpdate = async (studentId, newRole) => {
        if (!selectedBatch || selectedBatch.role !== 'Class Teacher') {
            toast.error("Only Class Teachers can assign roles.");
            return;
        }
        try {
            await updateStudentRole(studentId, newRole, user.departmentId);
            toast.success(newRole === 'president' ? `👑 Assigned as Department President!` : `Role updated`);
            refetchStudents();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Update failed");
        }
    };


    // NOC Logic
    const handleNocToggle = (student) => {
        setConfirmDialog({ isOpen: true, student, type: 'noc' });
    };

    const executeNocToggle = async () => {
        const student = confirmDialog.student;
        try {
            const newStatus = await toggleStudentNOC(student.id, student.nocStatus, user.uid);
            toast.success(`NOC ${newStatus === 'cleared' ? 'Issued' : 'Revoked'} successfully`);
            refetchStudents();
        } catch (error) {
            console.error('Error updating NOC:', error);
            toast.error('Failed to update NOC status');
        }
        setConfirmDialog({ isOpen: false, student: null, type: null });
    };


    const handleSingleSubmit = async () => {
        setFormLoading(true);
        try {
            // Ensure Roll Number is preserved or updated
            const payload = {
                name: studentForm.name,
                fatherName: studentForm.fatherName,
                motherName: studentForm.motherName,
                rollNumber: studentForm.rollNumber,
                lastExamRollNo: studentForm.lastExamRollNo,
                enrollmentNumber: studentForm.lastExamRollNo, // kept for backward compat
                email: studentForm.email,
                phone: studentForm.phone,
                parentPhone: studentForm.parentPhone,
                role: 'student',
                batchId: selectedBatch.id,
                batchName: selectedBatch.name,
                departmentId: user.departmentId || '',
                departmentName: user.departmentName || '',
                collegeId: user.collegeId || '',
                collegeName: user.collegeName || '',   // inherit from teacher
                campusName: user.campusName || '',     // inherit from teacher
                courseId: selectedBatch.courseId || '',
                courseName: selectedBatch.courseName || selectedBatch.name?.split(' ')[0] || '',
                currentSemester: selectedBatch.currentSemester,
                status: 'active',
                nocStatus: 'pending'
            };

            if (editingId) {
                delete payload.nocStatus; // Don't reset NOC on edit
                await updateDoc(doc(db, 'users', editingId), payload);
                toast.success('Updated');
            } else {
                // Password = Last Exam Roll No (min 6 chars)
                let password = studentForm.lastExamRollNo.toString().trim();
                if (password.length < 6) password = password.padStart(6, '0');

                if (!studentForm.email) throw new Error('Email is required to create a student account');

                await createStudentAccount(
                    studentForm.email,
                    password,
                    {
                        ...payload,
                        lockedProfile: {
                            joiningDate: serverTimestamp(),
                            originalRole: 'student',
                            enrollmentNumber: studentForm.rollNumber
                        },
                        editableProfile: {}
                    },
                    user.uid
                );
                toast.success(`✅ Student "${studentForm.name}" registered!`);
            }
            setShowSingleForm(false);
            refetchStudents();

        } catch (error) {
            toast.error(error.message);
        } finally {
            setFormLoading(false);
        }
    };


    const columns = [
        { header: 'Roll No', field: 'rollNumber', render: r => <span className="font-mono font-bold text-gray-700">{r.rollNumber}</span> },
        { header: 'Name', field: 'name', render: r => <div className="font-bold text-gray-900">{r.name}</div> },
        { header: 'Email', field: 'email', render: r => <span className="text-sm text-gray-500">{r.email}</span> },
        {
            header: 'Role', field: 'councilRole', render: r => (
                selectedBatch?.role === 'Class Teacher' ? (
                    <select
                        value={r.councilRole || 'student'}
                        onChange={(e) => handleRoleUpdate(r.id, e.target.value)}
                        className={`text-xs border rounded p-1 font-bold ${r.councilRole === 'president' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                        <option value="student">Student</option>
                        <option value="president">President 👑</option>
                        <option value="member">Council Member</option>
                    </select>
                ) : (
                    <span className="text-xs font-bold text-gray-500 uppercase">{r.councilRole || 'Student'}</span>
                )
            )
        },
        {
            header: 'NOC Status',
            field: 'nocStatus',
            render: (row) => (
                <button
                    onClick={() => selectedBatch?.role === 'Class Teacher' && handleNocToggle(row)}
                    disabled={selectedBatch?.role !== 'Class Teacher'}
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${row.nocStatus === 'cleared'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-orange-50 text-orange-600 border-orange-200'
                        } transition-colors uppercase tracking-wider`}
                    title={selectedBatch?.role === 'Class Teacher' ? "Click to toggle NOC" : "View only"}
                >
                    {row.nocStatus === 'cleared' ? 'CLEARED' : 'PENDING'}
                </button>
            )
        },
        {
            header: 'Actions', field: 'actions', render: r => (
                selectedBatch?.role === 'Class Teacher' && (
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={() => handleEditClick(r)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handleDeleteStudent(r)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )
            )
        }
    ];

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {viewMode === 'list' && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <h1 className="text-3xl font-black text-gray-900">My Batches</h1>

                        {loading ? <div className="text-center py-10">Loading...</div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myBatches.map(batch => (
                                    <div key={batch.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 group hover:shadow-xl transition-all relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] ${batch.role === 'Class Teacher' ? 'bg-biyani-red' : 'bg-gray-800'} transition-all`}>
                                            <span className="absolute top-4 right-6 text-2xl text-white">
                                                {batch.role === 'Class Teacher' ? '👨‍🏫' : '📚'}
                                            </span>
                                        </div>

                                        <div className="mb-6 relative z-10">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${batch.role === 'Class Teacher' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {batch.role}
                                            </span>
                                            <h3 className="text-2xl font-black text-gray-900 mt-2">{batch.name}</h3>
                                            <p className="text-gray-500 font-bold text-sm">Sem {batch.currentSemester}</p>
                                        </div>

                                        <div className="border-t border-gray-100 pt-6">
                                            <button
                                                onClick={() => { setSelectedBatch(batch); setViewMode('details'); }}
                                                className="w-full py-3 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                                            >
                                                {batch.role === 'Class Teacher' ? 'Manage List' : 'View Students'} →
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {myBatches.length === 0 && (
                                    <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                                        <span className="text-4xl block mb-2">📭</span>
                                        <h3 className="text-lg font-bold text-gray-900">No Batches Assigned</h3>
                                        <p className="text-gray-500 text-sm">Contact your HOD to get assigned to a class.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {viewMode === 'details' && selectedBatch && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        {/* Header with Back Button */}
                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <button
                                onClick={() => { setViewMode('list'); setSelectedBatch(null); }}
                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                                ←
                            </button>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">{selectedBatch.name} Students</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{selectedBatch.role} View</p>
                            </div>

                            {selectedBatch.role === 'Class Teacher' && (
                                <div className="ml-auto flex gap-2">
                                    <button
                                        onClick={handleAddClick}
                                        className="bg-biyani-red text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                    >
                                        + Add Student
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden p-6">
                            <DataTable
                                columns={columns}
                                data={students}
                                loading={loading}
                                actions={false} // Custom actions in column
                                emptyMessage="No students found."
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reusing Modal Logic (Simplified for brevity in artifact) */}
            {showSingleForm && (
                <FormModal
                    isOpen={true}
                    onClose={() => setShowSingleForm(false)}
                    onSubmit={handleSingleSubmit}
                    title={editingId ? "Edit Student" : "New Student"}
                    submitText="Save"
                    loading={formLoading}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Class Roll No (Auto)"
                                value={studentForm.rollNumber}
                                disabled
                                className="bg-gray-100 font-mono font-bold text-gray-700"
                            />
                            <Input
                                label="Last Exam RollNo (Password)"
                                value={studentForm.lastExamRollNo}
                                onChange={e => setStudentForm({ ...studentForm, lastExamRollNo: e.target.value })}
                                placeholder="Used as password"
                            />
                        </div>
                        <Input
                            label="Full Name"
                            value={studentForm.name}
                            onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                            placeholder="Student Full Name"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Father Name" value={studentForm.fatherName} onChange={e => setStudentForm({ ...studentForm, fatherName: e.target.value })} />
                            <Input label="Mother Name" value={studentForm.motherName} onChange={e => setStudentForm({ ...studentForm, motherName: e.target.value })} />
                        </div>
                        <Input label="Email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                        <Input label="Phone" value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} />
                    </div>
                </FormModal>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, student: null, type: null })}
                onConfirm={executeNocToggle}
                title="Confirm NOC Change"
                message={`Are you sure you want to ${confirmDialog.student?.nocStatus === 'cleared' ? 'REVOKE' : 'ISSUE'} NOC for ${confirmDialog.student?.name}?`}
                variant={confirmDialog.student?.nocStatus === 'cleared' ? 'danger' : 'success'}
            />
        </div>
    );
}
