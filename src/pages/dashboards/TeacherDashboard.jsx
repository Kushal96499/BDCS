import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        students: 0,
        courses: 0,
        classes: 0,
        events: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            // Count students in this teacher's courses
            // Note: This query might be expensive or require index. Simplified for now.
            const studentsQuery = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('role', '==', 'student'),
                where('status', '==', 'active')
            );
            const studentsSnap = await getDocs(studentsQuery);

            // Get teacher's assigned classes
            const classesQuery = query(
                collection(db, 'class_assignments'),
                where('teacherId', '==', user.uid)
            );
            const classesSnap = await getDocs(classesQuery);

            // Calculate UNIQUE Batches
            const assignments = classesSnap.docs.map(d => d.data());
            const uniqueBatches = new Set(assignments.map(a => a.batchId)).size;

            // Get Pending/Approved events
            const eventsQuery = query(
                collection(db, 'events'),
                where('organizerId', '==', user.uid)
            );
            const eventsSnap = await getDocs(eventsQuery);

            setStats({
                students: studentsSnap.size, // Department students
                courses: classesSnap.size, // Total Assignments (Subject-wise)
                classes: uniqueBatches, // Unique Batches
                events: eventsSnap.size
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 p-8"
        >
            {/* Header & Overview */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                <motion.div variants={itemVariants} className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Faculty Dashboard
                    </h1>
                    <p className="text-gray-500 font-medium text-lg">
                        Welcome back, <span className="text-gray-900 font-bold">{user?.name}</span>.
                    </p>
                </motion.div>

                {/* Status Pills */}
                <motion.div variants={itemVariants} className="flex gap-3">
                    <div className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-black uppercase tracking-widest border border-green-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Active Session
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div variants={itemVariants} className="group relative overflow-hidden bg-gradient-to-br from-[#E0F2FE] to-[#F0F9FF] p-6 rounded-[2rem] border border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg text-blue-400">Classes</span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-1">{stats.classes}</h3>
                        <p className="text-sm font-bold text-blue-400">Assigned Batches</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="group relative overflow-hidden bg-gradient-to-br from-[#DCFCE7] to-[#F0FDF4] p-6 rounded-[2rem] border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    onClick={() => navigate('/teacher/students')}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10 cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg text-green-600">Students</span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-1">{stats.students}</h3>
                        <p className="text-sm font-bold text-green-600">Department Total</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="group relative overflow-hidden bg-gradient-to-br from-[#FFEDD5] to-[#FFF7ED] p-6 rounded-[2rem] border border-orange-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg text-orange-400">Events</span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-1">{stats.events}</h3>
                        <p className="text-sm font-bold text-orange-400">My Activities</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="group relative overflow-hidden bg-gradient-to-br from-biyani-red to-red-700 p-6 rounded-[2rem] border border-red-500 text-white shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 blur-[40px] rounded-full"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884-.5 2-2 2h4c-1.5 0-2-1.116-2-2z" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg text-red-50">Profile</span>
                        </div>
                        <h3 className="text-xl font-bold mb-1 truncate">{user?.name}</h3>
                        <p className="text-xs font-medium text-red-100">{user?.employeeId || 'ID: ---'}</p>
                    </div>
                </motion.div>


            </div>

            {/* Quick Actions Grid */}
            <motion.div variants={itemVariants}>
                <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                    <button onClick={() => navigate('/teacher/attendance')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Attendance</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">Mark Daily Attendance</p>
                    </button>

                    <button onClick={() => navigate('/teacher/tests')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Tests</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">Manage Assessments</p>
                    </button>

                    <button onClick={() => navigate('/teacher/events')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Events</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">Manage & Approve</p>
                    </button>

                    <button onClick={() => navigate('/teacher/reports')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Reports</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">View & Export</p>
                    </button>

                </div>
            </motion.div>
        </motion.div>
    );
}
