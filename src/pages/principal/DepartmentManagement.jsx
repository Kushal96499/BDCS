// ============================================
// BDCS - Department Management (Principal)
// View departments and assign HODs
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getCollegeDepartments, getDepartmentStats } from '../../services/principalService';
import HODAssignmentModal from '../../components/principal/HODAssignmentModal';

export default function DepartmentManagement() {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);

    useEffect(() => {
        if (user?.collegeId) {
            loadDepartments();
        }
    }, [user?.collegeId]);

    const loadDepartments = async () => {
        setLoading(true);
        try {
            const depts = await getCollegeDepartments(user.collegeId);

            // Get stats for each department
            const deptsWithStats = await Promise.all(
                depts.map(async (dept) => {
                    const stats = await getDepartmentStats(dept.id);
                    return { ...dept, stats };
                })
            );

            setDepartments(deptsWithStats);
        } catch (error) {
            console.error('Error loading departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignHOD = (dept) => {
        setSelectedDepartment(dept);
        setShowAssignmentModal(true);
    };

    const handleAssignmentSuccess = () => {
        loadDepartments(); // Reload departments after assignment
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Department Management</h1>
                <p className="text-gray-600">Manage departments and assign HODs for {user?.collegeName}</p>
            </div>

            {/* Stats Overview - PASTEL THEME */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Departments</p>
                                <p className="text-3xl font-black text-gray-900">{departments.length}</p>
                            </div>
                            <div className="p-2 bg-blue-100/50 rounded-xl text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">With HOD</p>
                                <p className="text-3xl font-black text-gray-900">{departments.filter(d => d.currentHOD).length}</p>
                            </div>
                            <div className="p-2 bg-emerald-100/50 rounded-xl text-emerald-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">HOD Pending</p>
                                <p className="text-3xl font-black text-gray-900">{departments.filter(d => !d.currentHOD).length}</p>
                            </div>
                            <div className="p-2 bg-amber-100/50 rounded-xl text-amber-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Total Faculty</p>
                                <p className="text-3xl font-black text-gray-900">{departments.reduce((sum, d) => sum + (d.stats?.teachers || 0), 0)}</p>
                            </div>
                            <div className="p-2 bg-purple-100/50 rounded-xl text-purple-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Department Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-50 rounded-2xl animate-pulse border border-gray-200"></div>
                    ))}
                </div>
            ) : departments.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">No departments found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map((dept) => (
                        <div key={dept.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group">
                            {/* Card Header */}
                            <div className="p-6 pb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-red-50 text-biyani-red rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 text-xs font-bold tracking-wide">
                                        {dept.code || 'DEPT'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-biyani-red transition-colors">
                                    {dept.name}
                                </h3>
                            </div>

                            {/* HOD Section (Highlighted) */}
                            <div className="px-6 pb-4">
                                <div className={`p-4 rounded-xl border ${dept.currentHOD ? 'bg-green-50/50 border-green-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${dept.currentHOD ? 'text-green-600' : 'text-amber-600'}`}>
                                        {dept.currentHOD ? 'Head of Department' : 'Position Vacant'}
                                    </p>
                                    {dept.currentHOD ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold">
                                                {dept.currentHODName?.charAt(0)}
                                            </div>
                                            <p className="font-bold text-gray-900 text-sm truncate">{dept.currentHODName}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 font-medium italic">Assign an HOD to manage</p>
                                    )}
                                </div>
                            </div>

                            {/* Stats & Actions Footer */}
                            <div className="mt-auto border-t border-gray-50 bg-gray-50/30 p-4 flex items-center justify-between gap-4">
                                <div className="flex gap-4 text-xs font-medium text-gray-500">
                                    <span className="flex items-center gap-1.5" title="Faculty Members">
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        {dept.stats?.teachers || 0}
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Students">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" /></svg>
                                        {dept.stats?.students || 0}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleAssignHOD(dept)}
                                    className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-900 hover:text-white hover:border-black transition-all shadow-sm"
                                >
                                    {dept.currentHOD ? 'Change' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* HOD Assignment Modal */}
            {showAssignmentModal && selectedDepartment && (
                <HODAssignmentModal
                    department={selectedDepartment}
                    currentUser={user}
                    onClose={() => {
                        setShowAssignmentModal(false);
                        setSelectedDepartment(null);
                    }}
                    onSuccess={handleAssignmentSuccess}
                />
            )}
        </div>
    );
}
