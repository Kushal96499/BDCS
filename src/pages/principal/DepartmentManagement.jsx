// ============================================
// BDCS - Department Management (Principal)
// View departments and assign HODs
// Modernized "Neo-Campus" Redesign - Tabular Format
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getCollegeDepartments, getDepartmentStats } from '../../services/principalService';
import HODAssignmentModal from '../../components/principal/HODAssignmentModal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../components/admin/Toast';

export default function DepartmentManagement() {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (user?.collegeId) loadDepartments();
    }, [user?.collegeId]);

    const loadDepartments = async () => {
        setLoading(true);
        try {
            const depts = await getCollegeDepartments(user.collegeId);
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

    const handleSync = async () => {
        setSyncing(true);
        toast.info("Updating departments...");
        await loadDepartments();
        setSyncing(false);
    };

    const MetricCard = ({ label, value, icon, color }) => {
        const colors = {
            blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
            emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
            amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
            violet: { bg: 'bg-violet-50', icon: 'text-violet-600' }
        };
        const style = colors[color] || { bg: 'bg-gray-50', icon: 'text-gray-400' };
        return (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center ${style.icon} mb-4 shadow-sm`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
                </div>
            </div>
        );
    };

    const stats = {
        total: departments.length,
        withHOD: departments.filter(d => d.currentHOD).length,
        withoutHOD: departments.filter(d => !d.currentHOD).length,
        totalTeachers: departments.reduce((sum, d) => sum + (d.stats?.teachers || 0), 0)
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Departments</h1>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        Department List • {user?.collegeName}
                    </p>
                </div>
                
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-900 hover:text-white transition-all active:scale-95 group font-bold text-xs"
                >
                    <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={3}/></svg>
                    Refresh List
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard 
                    label="Departments" 
                    value={stats.total} 
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M4 6h16M4 12h16M4 18h16"/></svg>} 
                    color="blue" 
                />
                <MetricCard 
                    label="HOD Assigned" 
                    value={stats.withHOD} 
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
                    color="emerald" 
                />
                <MetricCard 
                    label="HOD Pending" 
                    value={stats.withoutHOD} 
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
                    color="amber" 
                />
                <MetricCard 
                    label="Teachers" 
                    value={stats.totalTeachers} 
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 11-8 0 4 4 0 018 0z"/></svg>} 
                    color="violet" 
                />
            </div>

            {/* Main Table Content */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">HOD Assigned</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Teachers</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Students</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-48" /></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-12 mx-auto" /></td>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-12 mx-auto" /></td>
                                        <td className="px-8 py-6 text-right"><div className="h-8 bg-gray-100 rounded w-24 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : departments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No departments found</p>
                                    </td>
                                </tr>
                            ) : (
                                departments.map((dept) => (
                                    <tr key={dept.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-[10px]">
                                                    {dept.code || 'DEPT'}
                                                </div>
                                                <span className="font-black text-gray-900 tracking-tight">{dept.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {dept.currentHOD ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black text-[10px]">
                                                        {dept.currentHODName?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700">{dept.currentHODName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-amber-500 italic">No HOD assigned</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center font-black text-gray-600">{dept.stats?.teachers || 0}</td>
                                        <td className="px-8 py-6 text-center font-black text-gray-600">{dept.stats?.students || 0}</td>
                                        <td className="px-8 py-6 text-right">
                                            {!dept.currentHOD ? (
                                                <button
                                                    onClick={() => { setSelectedDepartment(dept); setShowAssignmentModal(true); }}
                                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
                                                >
                                                    Assign HOD
                                                </button>
                                            ) : (
                                                <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                    Assigned
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* HOD Assignment Modal */}
            <AnimatePresence>
                {showAssignmentModal && selectedDepartment && (
                    <HODAssignmentModal
                        department={selectedDepartment}
                        currentUser={user}
                        onClose={() => {
                            setShowAssignmentModal(false);
                            setSelectedDepartment(null);
                        }}
                        onSuccess={loadDepartments}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
