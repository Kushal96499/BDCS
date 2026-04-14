import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getRollbackSemester, getRollbackYear } from '../../services/batchPromotionService';

export default function HODDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        teachers: 0,
        courses: 0,
        activeStudents: 0,
        pendingApprovals: 0,
        eventRequests: 0,
        totalBatches: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStats();
            fixLegacyBacklogBatches();
        }
    }, [user]);

    const fixLegacyBacklogBatches = async () => {
        try {
            const studentsQ = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('role', '==', 'student')
            );
            const studentsSnap = await getDocs(studentsQ);

            for (const docSnap of studentsSnap.docs) {
                const s = docSnap.data();
                if (s.academicStatus !== 'BACKLOG' && s.academicStatus !== 'REPEAT_YEAR') continue;

                // If they don't have originalBatchId, they haven't been processed by the new rollback system properly
                // Or if they were processed before we added the batch shifting logic.

                const history = s.progressionHistory || [];
                const lastFailure = [...history].reverse().find(h => h.action === 'BACKLOG' || h.action === 'REPEAT_YEAR');
                if (!lastFailure) continue;

                const originalSem = lastFailure.fromSemester;
                const expectedSem = getRollbackSemester(originalSem);
                const expectedYear = getRollbackYear(originalSem);

                if (parseInt(s.currentSemester) === expectedSem && s.originalBatchId && s.batchId !== s.originalBatchId) {
                    // Already fixed
                    continue;
                }

                let courseId = s.courseId;
                if (!courseId) {
                    const cbSnap = await getDocs(query(collection(db, 'batches'), where('__name__', '==', s.batchId)));
                    if (!cbSnap.empty) {
                        courseId = cbSnap.docs[0].data().courseId;
                    }
                }

                // Need to find junior batch
                let targetBatchId = s.batchId;
                let targetBatchName = s.batchName;

                if (courseId) {
                    const targetBatchQuery = query(
                        collection(db, 'batches'),
                        where('courseId', '==', courseId),
                        where('currentSemester', '==', expectedSem)
                    );
                    const targetBatchSnap = await getDocs(targetBatchQuery);

                    if (!targetBatchSnap.empty) {
                        const tBatch = targetBatchSnap.docs[0];
                        targetBatchId = tBatch.id;
                        targetBatchName = tBatch.data().name;
                    }
                }

                await updateDoc(doc(db, 'users', docSnap.id), {
                    currentSemester: expectedSem,
                    currentYear: expectedYear,
                    batchId: targetBatchId,
                    batchName: targetBatchName,
                    originalBatchId: s.originalBatchId || s.batchId,
                    originalBatchName: s.originalBatchName || s.batchName
                });
                console.log(`Auto-fixed backlogged student ${s.name} -> Batch ${targetBatchName}`);
            }
        } catch (e) {
            console.error('Failed fixing legacy batches', e);
        }
    };

    const fetchStats = async () => {
        try {
            setLoading(true);

            // 1. Teachers Count
            const teachersQ = query(collection(db, 'users'), where('departmentId', '==', user.departmentId), where('role', '==', 'teacher'), where('status', '==', 'active'));
            const teachersSnap = await getDocs(teachersQ);

            // 2. Active Students
            const studentsQ = query(collection(db, 'users'), where('departmentId', '==', user.departmentId), where('role', '==', 'student'), where('status', '==', 'active'));
            const studentsSnap = await getDocs(studentsQ);

            // 3. Pending Approvals (Leaves + Attendance Unlocks)
            const leavesQ = query(collection(db, 'leave_requests'), where('departmentId', '==', user.departmentId), where('status', '==', 'pending'));
            const unlocksQ = query(collection(db, 'attendance_edit_requests'), where('departmentId', '==', user.departmentId), where('status', '==', 'PENDING'));

            const [leavesSnap, unlocksSnap] = await Promise.all([getDocs(leavesQ), getDocs(unlocksQ)]);
            const pendingTotal = leavesSnap.size + unlocksSnap.size;

            // 4. Event Proposals (Status: pending_hod)
            const eventsQ = query(
                collection(db, 'events'),
                where('status', '==', 'pending_hod'),
                where('departmentId', '==', user.departmentId)
            );
            const eventsSnap = await getDocs(eventsQ);

            // 5. Batches
            const batchesQ = query(collection(db, 'batches'), where('departmentId', '==', user.departmentId), where('status', '==', 'active'));
            const batchesSnap = await getDocs(batchesQ);


            setStats({
                teachers: teachersSnap.size,
                activeStudents: studentsSnap.size,
                courses: 0,
                pendingApprovals: pendingTotal,
                eventRequests: eventsSnap.size,
                totalBatches: batchesSnap.size
            });

        } catch (error) {
            console.error('Error fetching HOD stats:', error);
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
            {/* Header & Department Card */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                <motion.div variants={itemVariants} className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Department Overview
                    </h1>
                    <p className="text-gray-500 font-medium text-lg">
                        Welcome, <span className="text-gray-900 font-bold">{user?.name}</span>. managing {stats.activeStudents} active students.
                    </p>
                </motion.div>

                {/* Status Pills */}
                <motion.div variants={itemVariants} className="flex gap-3">
                    <div className="px-4 py-2 bg-red-50 text-red-700 rounded-full text-xs font-black uppercase tracking-widest border border-red-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        {stats.pendingApprovals > 0 ? `${stats.pendingApprovals} Actions Pending` : 'All Clear'}
                    </div>
                </motion.div>
            </div>

            {/* Modern Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div variants={itemVariants} className="group relative overflow-hidden bg-gradient-to-br from-[#FFE5E5] to-[#FFF0F0] p-6 rounded-[2rem] border border-red-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg text-red-400">Faculty</span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-1">{stats.teachers}</h3>
                        <p className="text-sm font-bold text-red-400">Active Teachers</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="group relative overflow-hidden bg-gradient-to-br from-[#E0F2FE] to-[#F0F9FF] p-6 rounded-[2rem] border border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg text-blue-400">Batches</span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-1">{stats.totalBatches}</h3>
                        <p className="text-sm font-bold text-blue-400">Active Sessions</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="group relative overflow-hidden bg-gradient-to-br from-[#DCFCE7] to-[#F0FDF4] p-6 rounded-[2rem] border border-green-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg text-green-600">Students</span>
                        </div>
                        <h3 className="text-4xl font-black text-gray-900 mb-1">{stats.activeStudents}</h3>
                        <p className="text-sm font-bold text-green-600">Enrolled Students</p>
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
                        <h3 className="text-4xl font-black text-gray-900 mb-1">{stats.eventRequests}</h3>
                        <p className="text-sm font-bold text-orange-400">Pending Request</p>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions Grid */}
            <motion.div variants={itemVariants}>
                <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                    Management Modules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

                    <button onClick={() => navigate('/hod/teachers')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Faculty</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">Manage Teachers</p>
                    </button>

                    <button onClick={() => navigate('/hod/batches')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Batches</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">Sessions & Classes</p>
                    </button>

                    <button onClick={() => navigate('/hod/assignments')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Assignments</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">Allocate Subjects</p>
                    </button>

                    <button onClick={() => navigate('/hod/subjects')} className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-bl-[80px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <h4 className="font-bold text-xl text-gray-900">Curriculum</h4>
                        <p className="text-sm text-gray-400 font-medium mt-1">Manage Subjects</p>
                    </button>

                </div>
            </motion.div>

        </motion.div>
    );
}
