// ============================================
// BDCS - Teacher Oversight (Principal)
// View all teachers in college
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import PromoteToHODModal from '../../components/principal/PromoteToHODModal';

export default function TeacherOversight() {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    useEffect(() => {
        if (user?.collegeId) {
            loadTeachers();
        }
    }, [user?.collegeId]);

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
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Oversight</h1>
                <p className="text-gray-600">View all teachers in {user?.collegeName}</p>
            </div>

            {/* Card Table Hybrid */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-biyani-red mx-auto"></div>
                        <p className="text-gray-500 mt-4 text-sm font-medium">Loading faculty data...</p>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No Teachers Found</h3>
                        <p className="text-gray-500 text-sm">No teachers have been assigned to {user?.collegeName} yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="group bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-biyani-red/30 transition-all duration-200 flex flex-col md:flex-row items-center gap-4">
                                {/* Avatar */}
                                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold border-2 border-white shadow-sm">
                                    {teacher.name?.charAt(0) || 'T'}
                                </div>

                                {/* Body */}
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                                        <h4 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                            {teacher.name}
                                        </h4>
                                        {teacher.roles && teacher.roles.includes('hod') && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                                                HOD
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-1 text-xs text-gray-500 font-medium">
                                        <div className="flex items-center gap-1 justify-center md:justify-start">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            {teacher.email}
                                        </div>
                                        <div className="hidden md:block w-1 h-1 bg-gray-300 rounded-full"></div>
                                        <div className="flex items-center gap-1 justify-center md:justify-start text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            {teacher.departmentName || 'Unassigned'}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end border-t md:border-none border-gray-100 pt-3 md:pt-0 mt-2 md:mt-0">
                                    <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full border border-green-100">
                                        Active
                                    </div>

                                    {!teacher.roles?.includes('hod') && (
                                        <button
                                            onClick={() => {
                                                setSelectedTeacher(teacher);
                                                setShowPromoteModal(true);
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-gray-900 rounded-lg hover:bg-biyani-red transition-colors opacity-80 group-hover:opacity-100 shadow-sm"
                                        >
                                            Promote
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
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
