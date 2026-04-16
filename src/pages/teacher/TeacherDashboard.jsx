import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function TeacherDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        assignedClasses: 0,
        totalStudents: 0,
        pendingEvents: 0,
        todayAttendance: null // { batchName: 'BCA 1', status: 'Marked' } or null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // 1. My Classes Count
            const classesQ = query(collection(db, 'batches'), where('classTeacherId', '==', user.uid), where('status', '==', 'active'));
            const classesSnap = await getDocs(classesQ);
            const myClass = classesSnap.empty ? null : classesSnap.docs[0].data();

            // 2. Pending Events (Approvals)
            // Assuming events need approval if status is 'pending' and they belong to teacher's dept (simplified)
            const eventsQ = query(
                collection(db, 'events'),
                where('status', '==', 'pending'),
                where('departmentId', '==', user.departmentId || 'ignore'),
                limit(5)
            );
            const eventsSnap = await getDocs(eventsQ);

            // 3. Today's Attendance Check (for the class teacher's batch)
            let todayStatus = null;
            if (myClass) {
                const todayStr = new Date().toISOString().split('T')[0];
                const attQ = query(
                    collection(db, 'attendance_records'),
                    where('batchId', '==', classesSnap.docs[0].id),
                    where('date', '==', todayStr),
                    limit(1)
                );
                const attSnap = await getDocs(attQ);
                if (!attSnap.empty) {
                    todayStatus = {
                        batchName: myClass.name,
                        status: 'Marked',
                        count: attSnap.docs[0].data().presentCount
                    };
                }
            }

            setStats({
                assignedClasses: classesSnap.size, // For now only checking Class Teacher role
                totalStudents: 0, // Would require counting users in batch
                pendingEvents: eventsSnap.size,
                todayAttendance: todayStatus
            });

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
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
            className="space-y-4 sm:space-y-6"
        >
            {/* Greeting & Date */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                        Good Morning, {user?.name?.split(' ')[0]} ☀️
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Here's what's happening in your department today.</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Smart Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

                {/* 1. Department Card */}
                <motion.div variants={itemVariants} className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#C62828] to-[#B71C1C] text-white shadow-xl p-6 sm:p-8 flex flex-col justify-between min-h-[200px] sm:min-h-[220px]">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white opacity-5 blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 sm:p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 text-xs sm:text-base">🏛️</span>
                            <h3 className="text-sm sm:text-lg font-bold">Faculty Overview</h3>
                        </div>
                        <h2 className="text-xl sm:text-3xl font-black tracking-tight mb-1">{user?.departmentName || 'Department of Technology'}</h2>
                        <p className="text-red-100 text-xs sm:text-sm font-medium">{user?.collegeName || 'Biyani Group of Colleges'}</p>
                    </div>

                    <div className="relative z-10 flex gap-6 sm:gap-8 mt-4 sm:mt-6">
                        <div>
                            <p className="text-[9px] sm:text-xs font-bold text-red-200 uppercase tracking-widest mb-0.5 sm:mb-1">Role</p>
                            <p className="text-sm sm:text-lg font-bold">{user?.role === 'teacher' ? 'Faculty Member' : 'HOD'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] sm:text-xs font-bold text-red-200 uppercase tracking-widest mb-0.5 sm:mb-1">Batches</p>
                            <p className="text-sm sm:text-lg font-bold">{loading ? '...' : stats.assignedClasses} Active</p>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Today's Action Card */}
                <motion.div variants={itemVariants} className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[180px]">
                    <div>
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                            <h3 className="font-bold text-gray-900 text-base sm:text-lg tracking-tight">Today's Attendance</h3>
                            <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-widest ${stats.todayAttendance ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {stats.todayAttendance ? 'COMPLETED' : 'PENDING'}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                            {stats.todayAttendance
                                ? `You have successfully marked attendance for ${stats.todayAttendance.batchName} today.`
                                : "You haven't marked attendance for your assigned batch yet. Please update it."
                            }
                        </p>
                    </div>
                    {stats.todayAttendance ? (
                        <button disabled className="mt-4 w-full py-3 sm:py-3.5 bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-2xl cursor-not-allowed border border-gray-100">
                            Everything looks good 👍
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/teacher/attendance')}
                            className="mt-4 w-full py-3 sm:py-3.5 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95"
                        >
                            Mark Attendance Now →
                        </button>
                    )}
                </motion.div>
            </div>

            {/* Quick Actions & Pending Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pending Actions */}
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                            🔔 Pending Requests
                            {stats.pendingEvents > 0 && <span className="bg-red-500 text-white text-[9px] w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full font-black">{stats.pendingEvents}</span>}
                        </h3>
                        <button onClick={() => navigate('/teacher/events')} className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-biyani-red hover:underline">View All</button>
                    </div>

                    {stats.pendingEvents > 0 ? (
                        <div className="space-y-4">
                            {/* Mock Item if real data logic isn't fully creating docs yet in this demo env */}
                            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">🎉</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">New Event Proposal</h4>
                                        <p className="text-xs text-gray-500 font-medium">Submitted by Student Council</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/teacher/events')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:border-biyani-red hover:text-biyani-red transition-colors">
                                    Review
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="text-4xl opacity-20">✨</span>
                            <p className="text-gray-400 font-bold text-sm mt-2">No pending requests!</p>
                            <p className="text-gray-400 text-xs">You're all caught up.</p>
                        </div>
                    )}
                </motion.div>

                {/* Quick Navigation - Grid Style */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <div onClick={() => navigate('/teacher/marks')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm cursor-pointer group hover:border-blue-200 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <h4 className="font-bold text-gray-900">Marks Entry</h4>
                        <p className="text-xs text-gray-500 font-medium mt-1">Upload internals & result sheets</p>
                    </div>

                    <div onClick={() => navigate('/teacher/classes')} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm cursor-pointer group hover:border-purple-200 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <h4 className="font-bold text-gray-900">Manage Students</h4>
                        <p className="text-xs text-gray-500 font-medium mt-1">View batch list & details</p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
