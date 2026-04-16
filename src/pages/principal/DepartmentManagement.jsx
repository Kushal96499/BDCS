// ============================================
// BDCS - Department Management (Principal)
// View departments and assign HODs
// Modernized "Neo-Campus" Edition
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
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between overflow-hidden relative group hover:shadow-xl hover:border-blue-100 transition-all duration-500">
                <div className={`w-14 h-14 rounded-2xl ${style.bg} flex items-center justify-center ${style.icon} mb-6 transition-transform group-hover:rotate-6 shadow-sm`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight">{value}</h3>
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
        <div className="space-y-10 pb-12 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                <div className="space-y-2">
                    <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>Principal</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={3}/></svg>
                        <span className="text-blue-500">Departments</span>
                    </nav>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                        Department Management
                    </h1>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        Principal Panel • {user?.collegeName}
                    </p>
                </div>
                
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    data-tooltip="Refresh department list"
                    className="p-4 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 hover:bg-gray-900 hover:text-white transition-all active:scale-90 group relative"
                >
                    <svg className={`w-6 h-6 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={2.5}/></svg>
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    label="Total Departments" 
                    value={stats.total} 
                    icon={<svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M4 6h16M4 12h16M4 18h16"/></svg>} 
                    color="blue" 
                />
                <MetricCard 
                    label="Assigned HODs" 
                    value={stats.withHOD} 
                    icon={<svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
                    color="emerald" 
                />
                <MetricCard 
                    label="No HOD assigned" 
                    value={stats.withoutHOD} 
                    icon={<svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} 
                    color="amber" 
                />
                <MetricCard 
                    label="Total Teachers" 
                    value={stats.totalTeachers} 
                    icon={<svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 11-8 0 4 4 0 018 0z"/></svg>} 
                    color="violet" 
                />
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Departments</h2>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-80 rounded-[3rem] bg-white animate-pulse border border-gray-50" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {departments.map((dept) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={dept.id}
                                className="bg-white rounded-[3rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden relative group"
                            >
                                <div className="p-10 pb-8 flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm">
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </div>
                                        <span className="px-4 py-1.5 rounded-full bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border border-gray-100">
                                            {dept.code || 'MGMT'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-8 leading-tight group-hover:text-blue-600 transition-colors">
                                        {dept.name}
                                    </h3>

                                    <div className={`p-6 rounded-[2rem] border transition-all mb-8 ${dept.currentHOD ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-2 h-2 rounded-full ${dept.currentHOD ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Management</p>
                                        </div>
                                        {dept.currentHOD ? (
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs shadow-sm">
                                                    {dept.currentHODName?.charAt(0)}
                                                </div>
                                                <p className="font-black text-gray-900 text-sm tracking-tight truncate">{dept.currentHODName}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs font-bold text-amber-600 italic">No HOD assigned</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50/50 border-t border-gray-100 p-8 flex items-center justify-between">
                                    <div className="flex gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Teachers</span>
                                            <span className="font-black text-gray-900 text-sm">{dept.stats?.teachers || 0}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Students</span>
                                            <span className="font-black text-gray-900 text-sm">{dept.stats?.students || 0}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setSelectedDepartment(dept); setShowAssignmentModal(true); }}
                                        className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900 hover:bg-gray-900 hover:text-white hover:border-black transition-all shadow-sm active:scale-95"
                                    >
                                        {dept.currentHOD ? 'Re-assign' : 'Delegate'}
                                    </button>
                                </div>
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-blue-500/5 blur-[50px]" />
                            </motion.div>
                        ))}
                    </div>
                )}
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
