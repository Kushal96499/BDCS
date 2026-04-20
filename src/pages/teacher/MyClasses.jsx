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
    const [viewSubMode, setViewSubMode] = useState('hub'); // 'hub' | 'batches' | 'subjects' | 'details'
    const [selectedBatch, setSelectedBatch] = useState(null);
    
    // Filters & Sorting
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc' for students
    const [subjectsFilter, setSubjectsFilter] = useState({ semester: 'All', status: 'active' });
    const [searchQuery, setSearchQuery] = useState('');

    // Use custom hooks for data fetching
    const { batches: myBatches, loading: batchesLoading, refetch: refetchBatches } = useMyBatches(
        (viewSubMode === 'hub' || viewSubMode === 'batches' || viewSubMode === 'subjects') ? user?.uid : null
    );

    // Filter sessions into separate UI sectors
    const { guardianship, assignments } = React.useMemo(() => {
        let subjects = myBatches.filter(b => b.role === 'Subject Teacher');
        
        // 1. Prioritize Current Semester subjects
        subjects = subjects.sort((a, b) => {
            if (!a.isHistorical && b.isHistorical) return -1;
            if (a.isHistorical && !b.isHistorical) return 1;
            return parseInt(b.assignedSemester) - parseInt(a.assignedSemester);
        });

        // 2. Apply Subject Filters
        if (subjectsFilter.semester !== 'All') {
            subjects = subjects.filter(s => s.assignedSemester.toString() === subjectsFilter.semester);
        }
        if (subjectsFilter.status === 'active') {
            subjects = subjects.filter(s => !s.isHistorical);
        } else if (subjectsFilter.status === 'archived') {
            subjects = subjects.filter(s => s.isHistorical);
        }

        return {
            guardianship: myBatches.filter(b => b.role === 'Class Teacher'),
            assignments: subjects
        };
    }, [myBatches, subjectsFilter]);

    const { students: rawStudents, loading: studentsLoading, refetch: refetchStudents } = useStudents(
        viewSubMode === 'details' ? (selectedBatch?.batchId || selectedBatch?.id) : null
    );

    const students = React.useMemo(() => {
        let list = [...rawStudents];
        // Apply Sort
        list.sort((a, b) => {
            const nameA = a.name?.toLowerCase() || '';
            const nameB = b.name?.toLowerCase() || '';
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
        // Apply Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s => s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q));
        }
        return list;
    }, [rawStudents, sortOrder, searchQuery]);

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

    const renderBatchCard = (batch) => {
        const isHistorical = batch.isHistorical;
        const isSubjectTeacher = batch.role === 'Subject Teacher';

        return (
            <div key={batch.id} className={`bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 group hover:shadow-2xl transition-all relative overflow-hidden ${isHistorical ? 'opacity-80 grayscale-[0.2]' : ''}`}>
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] ${
                    isHistorical ? 'bg-slate-500' : (batch.role === 'Class Teacher' ? 'bg-biyani-red' : 'bg-indigo-600')
                } transition-all`}>
                    <span className="absolute top-4 right-6 text-2xl text-white">
                        {isHistorical ? '📜' : (batch.role === 'Class Teacher' ? '👨‍🏫' : '🧬')}
                    </span>
                </div>

                <div className="mb-6 relative z-10">
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            isHistorical ? 'bg-slate-100 text-slate-600' : (batch.role === 'Class Teacher' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600')
                        }`}>
                            {batch.role}
                        </span>
                        {isHistorical && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                Archived
                            </span>
                        )}
                        {!isHistorical && isSubjectTeacher && batch.assignedSemester?.toString() === batch.currentSemester?.toString() && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 animate-pulse">
                                Current
                            </span>
                        )}
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mt-2 leading-tight uppercase tracking-tighter w-4/5">
                        {isSubjectTeacher ? batch.subjectName : batch.name}
                    </h3>
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-tight mt-1">
                        {isSubjectTeacher ? `${batch.name} • ` : ''}
                        Sem {isSubjectTeacher ? batch.assignedSemester : batch.currentSemester} 
                    </p>
                </div>

                <div className="border-t border-gray-50 pt-6">
                    <button
                        onClick={() => { setSelectedBatch(batch); setViewSubMode('details'); }}
                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                            isHistorical ? 'bg-slate-50 text-slate-400 hover:bg-slate-100' : 'bg-gray-900 text-white hover:bg-black hover:-translate-y-0.5 shadow-lg'
                        }`}
                    >
                        {isHistorical ? 'Archive View' : (batch.role === 'Class Teacher' ? 'Manage List' : 'Inspect Class')} →
                    </button>
                </div>
            </div>
        );
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
    ].filter(col => {
        if (col.header === 'Actions' && selectedBatch?.role !== 'Class Teacher') return false;
        return true;
    });

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {viewSubMode === 'hub' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-12"
                    >
                        <header>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none uppercase tracking-tighter">Academic <span className="text-red-600">Hub</span></h1>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Manage your institutional responsibilities and assignments</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <button
                                onClick={() => setViewSubMode('batches')}
                                className="group relative bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all text-left overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-40 h-40 bg-red-50 rounded-bl-[6rem] group-hover:bg-red-100 transition-colors" />
                                <span className="absolute top-10 right-12 text-5xl group-hover:scale-110 transition-transform">👨‍🏫</span>
                                
                                <div className="relative z-10 space-y-4">
                                    <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-red-100">Class Teacher</span>
                                    <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none pt-2">My Batches</h3>
                                    <p className="text-gray-400 font-bold text-sm max-w-[280px] leading-relaxed">Manage your students, roles, and attendance for your assigned batches.</p>
                                    <div className="pt-6 flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-[0.3em] group-hover:translate-x-2 transition-transform">
                                        View Batches <span>→</span>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setViewSubMode('subjects')}
                                className="group relative bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all text-left overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-bl-[6rem] group-hover:bg-indigo-100 transition-colors" />
                                <span className="absolute top-10 right-12 text-5xl group-hover:scale-110 transition-transform">🧬</span>
                                
                                <div className="relative z-10 space-y-4">
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">Subject Teacher</span>
                                    <h3 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none pt-2">My Subjects</h3>
                                    <p className="text-gray-400 font-bold text-sm max-w-[280px] leading-relaxed">View and manage the subjects you teach across different batches and semesters.</p>
                                    <div className="pt-6 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.3em] group-hover:translate-x-2 transition-transform">
                                        Inspect Classes <span>→</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}

                {viewSubMode === 'batches' && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <header className="flex items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <button onClick={() => setViewSubMode('hub')} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm hover:bg-gray-100 transition-all font-black text-lg">←</button>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase tracking-tighter">Institutional Batches</h1>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary mentorship and administrative control</p>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            {guardianship.map(batch => renderBatchCard(batch))}
                            {guardianship.length === 0 && (
                                <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-[4rem] border-2 border-dashed border-gray-200">
                                    <div className="text-4xl mb-4 grayscale opacity-30">📋</div>
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-[0.25em]">No batches currently assigned to you</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {viewSubMode === 'subjects' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                    >
                        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-5">
                                <button onClick={() => setViewSubMode('hub')} className="w-14 h-14 bg-gray-50 rounded-[1.5rem] flex items-center justify-center border border-gray-100 shadow-sm hover:bg-gray-100 transition-all font-black text-lg">←</button>
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase tracking-tighter">Academic Assignments</h1>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">Manage subjects and class evaluations</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="relative">
                                    <select 
                                        value={subjectsFilter.semester} 
                                        onChange={e => setSubjectsFilter({...subjectsFilter, semester: e.target.value})}
                                        className="appearance-none bg-gray-50 border border-gray-100 pl-4 pr-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm outline-none focus:ring-4 focus:ring-indigo-50/50 transition-all cursor-pointer"
                                    >
                                        <option value="All">All Semesters</option>
                                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>Semester {s}</option>)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</div>
                                </div>
                                <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner">
                                    <button 
                                        onClick={() => setSubjectsFilter({...subjectsFilter, status: 'active'})}
                                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${subjectsFilter.status === 'active' ? 'bg-white text-[#E31E24] shadow-md border border-red-50' : 'text-gray-400'}`}
                                    >
                                        Active
                                    </button>
                                    <button 
                                        onClick={() => setSubjectsFilter({...subjectsFilter, status: 'all'})}
                                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${subjectsFilter.status === 'all' ? 'bg-white text-gray-900 shadow-md border border-gray-50' : 'text-gray-400'}`}
                                    >
                                        Full History
                                    </button>
                                    <button 
                                        onClick={() => setSubjectsFilter({...subjectsFilter, status: 'archived'})}
                                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${subjectsFilter.status === 'archived' ? 'bg-white text-amber-600 shadow-md border border-amber-50' : 'text-gray-400'}`}
                                    >
                                        Archived
                                    </button>
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {assignments.map(batch => renderBatchCard(batch))}
                            {assignments.length === 0 && (
                                <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-[4rem] border-2 border-dashed border-gray-200">
                                    <div className="text-4xl mb-4 grayscale opacity-30">🔍</div>
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-[0.25em]">No matches found for your subject filters</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {viewSubMode === 'details' && selectedBatch && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        {/* Enhanced Header with Search and Sort */}
                        <div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-sm border border-gray-100 space-y-8 relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-10 rounded-full -mr-32 -mt-32 ${selectedBatch.role === 'Class Teacher' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                            
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 relative z-10">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={() => { setViewSubMode(selectedBatch.role === 'Class Teacher' ? 'batches' : 'subjects'); setSelectedBatch(null); }}
                                        className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all border border-gray-100 shadow-sm text-lg font-black"
                                    >
                                        ←
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${selectedBatch.role === 'Class Teacher' ? 'bg-biyani-red' : 'bg-indigo-600'} animate-pulse`} />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-heading">{selectedBatch.role} Vision</p>
                                        </div>
                                        <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                                            {selectedBatch.role === 'Subject Teacher' ? selectedBatch.subjectName : selectedBatch.name}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-[9px] font-black bg-gray-50 text-gray-500 px-2 py-1 rounded border border-gray-100 uppercase tracking-widest">{selectedBatch.role === 'Subject Teacher' ? selectedBatch.name : 'Primary Cohort'}</span>
                                            <span className="text-[9px] font-black bg-gray-50 text-gray-500 px-2 py-1 rounded border border-gray-100 uppercase tracking-widest">Semester {selectedBatch.assignedSemester || selectedBatch.currentSemester}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="relative w-full md:w-auto">
                                        <input 
                                            type="text" 
                                            placeholder="Search name or roll number..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="bg-gray-50 border border-gray-100 pl-11 pr-5 py-4 rounded-2xl text-xs font-bold text-gray-900 focus:ring-4 focus:ring-gray-100 outline-none w-full md:w-80 transition-all placeholder:uppercase placeholder:tracking-widest placeholder:text-[9px]"
                                        />
                                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>

                                    <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <button 
                                            onClick={() => setSortOrder('asc')}
                                            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortOrder === 'asc' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400'}`}
                                        >
                                            A-Z
                                        </button>
                                        <button 
                                            onClick={() => setSortOrder('desc')}
                                            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortOrder === 'desc' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400'}`}
                                        >
                                            Z-A
                                        </button>
                                    </div>

                                    {selectedBatch.role === 'Class Teacher' && (
                                        <button
                                            onClick={handleAddClick}
                                            className="bg-[#E31E24] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-2xl shadow-red-100 active:scale-95 group"
                                        >
                                            <span className="mr-2 opacity-70 group-hover:opacity-100 transition-opacity">+</span> Register Student
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table Containers */}
                        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/40 border border-gray-100 overflow-hidden p-8 md:p-12">
                            <DataTable
                                columns={columns}
                                data={students}
                                loading={loading}
                                actions={false} 
                                emptyMessage="No students found in this class."
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reusing Modal Logic */}
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
                                onChange={e => setStudentForm({ ...studentForm, rollNumber: e.target.value.toUpperCase() })}
                                placeholder="e.g., BCA23001"
                                className="font-mono font-bold text-gray-700"
                            />
                            <Input
                                label="Last Exam RollNo (Passcode)"
                                value={studentForm.lastExamRollNo}
                                onChange={e => setStudentForm({ ...studentForm, lastExamRollNo: e.target.value })}
                                placeholder="Student UID / Password"
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
