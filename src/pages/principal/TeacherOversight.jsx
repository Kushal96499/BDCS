import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { createTeacherUser, getCollegeDepartments } from '../../services/principalService';
import { toast } from '../../components/admin/Toast';
import PromoteToHODModal from '../../components/principal/PromoteToHODModal';
import FormModal from '../../components/admin/FormModal';
import Input from '../../components/Input';
import PremiumSelect from '../../components/common/PremiumSelect';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeacherOversight() {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState('create'); // 'create' or 'assign_self'
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        employeeId: '',
        departmentId: '',
        designation: '',
        joiningDate: new Date().toISOString().split('T')[0]
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (user?.collegeId) {
            loadTeachers();
            loadDepartments();
        }
    }, [user?.collegeId]);

    const loadDepartments = async () => {
        try {
            const depts = await getCollegeDepartments(user.collegeId);
            setDepartments(depts);
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    };

    const loadTeachers = async () => {
        setLoading(true);
        try {
            // Query 1: Users with role='teacher' (single role format) - ALL teachers in college
            const singleRoleQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('role', '==', 'teacher'),
                where('status', '==', 'active')
            );

            // Query 2: Users with 'teacher' in roles array (multi-role format) - ALL teachers in college
            const multiRoleTeacherQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('roles', 'array-contains', 'teacher'),
                where('status', '==', 'active')
            );

            // Fetch all queries in parallel
            const [singleRoleSnapshot, multiRoleSnapshot] = await Promise.all([
                getDocs(singleRoleQuery),
                getDocs(multiRoleTeacherQuery)
            ]);

            console.log('TeacherOversight - CollegeId:', user.collegeId);
            console.log('Single Role Teachers:', singleRoleSnapshot.size);
            console.log('Multi Role Teachers:', multiRoleSnapshot.size);

            const singleRoleTeachers = singleRoleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const multiRoleTeachers = multiRoleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Combine and deduplicate
            const allTeachers = [...singleRoleTeachers, ...multiRoleTeachers];
            const uniqueTeachers = Array.from(new Map(allTeachers.map(t => [t.id, t])).values());

            setTeachers(uniqueTeachers);
        } catch (error) {
            console.error('Error loading teachers:', error);
        } finally {
            setLoading(false);
        }
    };




    return (
        <div className="space-y-8 pb-12">
            {/* Executive Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Teacher Management</h2>
                    <p className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#E31E24] rounded-full animate-pulse" />
                        Staff List • {user?.collegeName}
                    </p>
                </div>
                <div className="flex gap-4">
                    {/* Teacher creation is restricted to Admin level */}
                </div>
            </div>

            {/* Tabular Faculty Ledger */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-blue-500/5 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#E31E24] rounded-full animate-spin" />
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Teacher Data...</p>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center px-10">
                        <div className="w-24 h-24 bg-gray-50 text-gray-300 rounded-[2rem] flex items-center justify-center mb-6 ring-8 ring-gray-50/50">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">No teachers found</h3>
                        <p className="text-gray-400 text-sm font-bold max-w-xs uppercase tracking-tight leading-relaxed">No active teacher profiles found in your college.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                        <table className="min-w-full divide-y divide-gray-100 table-auto min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50/30">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Teacher Details</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Department Details</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Position</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Status</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white/30">
                                {teachers.map((teacher, index) => (
                                    <tr key={teacher.id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                                        {/* Faculty Persona */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-sm font-black shadow-lg group-hover:bg-[#E31E24] group-hover:rotate-6 transition-all duration-500 shrink-0">
                                                    {teacher.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col min-w-[220px]">
                                                    <span className="text-sm font-black text-gray-900 group-hover:text-[#E31E24] transition-colors">{teacher.name}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 lowercase tracking-tight truncate">{teacher.email}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Authority Scope */}
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1 min-w-[150px]">
                                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-[0.2em] border border-emerald-100/50 rounded-full w-fit">
                                                    {teacher.departmentName || 'General Faculty'}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2">
                                                    {teacher.collegeName || 'Faculty Member'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Service Hierarchy */}
                                        <td className="px-8 py-6 text-center">
                                            {teacher.roles && teacher.roles.includes('hod') ? (
                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 text-[9px] font-black uppercase tracking-widest">
                                                    👑 HOD
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Teacher</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">Verified Active</span>
                                            </div>
                                        </td>

                                        {/* Executive Actions */}
                                        <td className="px-8 py-6 text-right">
                                            {!teacher.roles?.includes('hod') ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedTeacher(teacher);
                                                        setShowPromoteModal(true);
                                                    }}
                                                    className="px-5 py-2.5 bg-gray-900 border border-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#E31E24] hover:border-[#E31E24] hover:shadow-xl hover:shadow-red-500/20 transition-all active:scale-95"
                                                >
                                                    Promote to HOD
                                                </button>
                                            ) : (
                                                <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic pr-4">
                                                    Leadership Assigned
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Promote to HOD Modal */}
            {showPromoteModal && selectedTeacher && (
                <PromoteToHODModal
                    teacher={selectedTeacher}
                    currentUser={user}
                    onClose={() => {
                        setShowPromoteModal(false);
                        setSelectedTeacher(null);
                    }}
                    onSuccess={() => {
                        loadTeachers();
                        setShowPromoteModal(false);
                        setSelectedTeacher(null);
                    }}
                />
            )}

        </div>
    );
}
