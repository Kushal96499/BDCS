import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

                const history = s.progressionHistory || [];
                const lastFailure = [...history].reverse().find(h => h.action === 'BACKLOG' || h.action === 'REPEAT_YEAR');
                if (!lastFailure) continue;

                const originalSem = lastFailure.fromSemester;
                const expectedSem = getRollbackSemester(originalSem);
                const expectedYear = getRollbackYear(originalSem);

                if (parseInt(s.currentSemester) === expectedSem && s.originalBatchId && s.batchId !== s.originalBatchId) {
                    continue;
                }

                let courseId = s.courseId;
                if (!courseId) {
                    const cbSnap = await getDocs(query(collection(db, 'batches'), where('__name__', '==', s.batchId)));
                    if (!cbSnap.empty) {
                        courseId = cbSnap.docs[0].data().courseId;
                    }
                }

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
            }
        } catch (e) {
            console.error('Failed fixing legacy batches', e);
        }
    };

    const fetchStats = async () => {
        try {
            setLoading(true);
            const teachersQ = query(collection(db, 'users'), where('departmentId', '==', user.departmentId), where('role', '==', 'teacher'), where('status', '==', 'active'));
            const teachersSnap = await getDocs(teachersQ);
            const studentsQ = query(collection(db, 'users'), where('departmentId', '==', user.departmentId), where('role', '==', 'student'), where('status', '==', 'active'));
            const studentsSnap = await getDocs(studentsQ);
            const eventsQ = query(collection(db, 'events'), where('status', '==', 'pending_hod'), where('departmentId', '==', user.departmentId));
            const [eventsSnap] = await Promise.all([getDocs(eventsQ)]);
            const batchesQ = query(collection(db, 'batches'), where('departmentId', '==', user.departmentId), where('status', '==', 'active'));
            const batchesSnap = await getDocs(batchesQ);

            setStats({
                teachers: teachersSnap.size,
                activeStudents: studentsSnap.size,
                courses: 0,
                pendingApprovals: eventsSnap.size,
                eventRequests: eventsSnap.size,
                totalBatches: batchesSnap.size
            });
        } catch (error) {
            console.error('Error fetching HOD stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const MetricCard = ({ title, value, icon, colorClass, path }) => (
        <motion.button
            whileHover={{ y: -5, scale: 1.02 }}
            onClick={() => path && navigate(path)}
            className="relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between overflow-hidden group text-left w-full"
        >
            <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${colorClass.bg} flex items-center justify-center ${colorClass.icon} mb-6 transition-transform group-hover:rotate-6 shadow-sm`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight">{value}</h3>
                </div>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${colorClass.bg} opacity-5 group-hover:scale-150 transition-transform duration-700`} />
        </motion.button>
    );

    const cardStyles = {
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
        blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
        orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
        red: { bg: 'bg-red-50/50', icon: 'text-red-600' }
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#059669] to-emerald-800 p-10 md:p-14 text-white shadow-2xl shadow-emerald-200/50 border border-white/10">
                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg border border-red-50">
                                <img src="/assets/biyani-logo.png" alt="BDCS" className="w-full h-full object-contain" />
                            </div>
                            <span className="px-4 py-1.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-white/20">
                                Departmental Authority
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-loose mb-4">
                            Welcome, <br/>
                            <span className="text-emerald-100">{user?.name?.split(' ')[0]}</span>
                        </h1>
                        <p className="text-emerald-50/80 text-lg font-bold max-w-lg leading-relaxed flex items-center gap-3 italic">
                            <span className="w-4 h-1 bg-red-500 rounded-full" />
                            {user?.departmentName || 'Department Management'}
                        </p>
                    </div>
                    <div className="hidden md:flex flex-col items-end justify-center">
                        <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 text-right">
                            <p className="text-emerald-200 font-black text-[10px] uppercase tracking-widest mb-2">Department Overview</p>
                            <p className="text-3xl font-black text-white">{stats.activeStudents}</p>
                            <p className="text-emerald-100/60 font-bold text-[10px] mt-1 uppercase tracking-widest leading-none">Active Students in Department</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/5 blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-red-500/10 blur-[80px]" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {loading ? (
                    [1, 2, 3, 4].map(i => <div key={i} className="h-44 rounded-[2.5rem] bg-white animate-pulse border border-gray-50 shadow-sm" />)
                ) : (
                    <>
                        <MetricCard 
                            title="Total Teachers" value={stats.teachers} colorClass={cardStyles.emerald} path="/hod/teachers"
                            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 1 1-8 0 4 4 0 018 0" /></svg>}
                        />
                        <MetricCard 
                            title="Active Batches" value={stats.totalBatches} colorClass={cardStyles.blue} path="/hod/batches"
                            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2" /></svg>}
                        />
                        <MetricCard 
                            title="Pending Approvals" value={stats.pendingApprovals} colorClass={cardStyles.orange} path="/hod/approvals"
                            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 9l2 2 4-4" /></svg>}
                        />
                        <MetricCard 
                            title="Event Requests" value={stats.eventRequests} colorClass={cardStyles.red} path="/hod/approvals"
                            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        />
                    </>
                )}
            </div>

            {/* Action Modules */}
            <div className="space-y-8">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: 'Teachers', desc: 'Manage Staff', path: '/hod/teachers', color: 'emerald', icon: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857" /> },
                        { title: 'Batches', desc: 'Manage Sessions', path: '/hod/batches', color: 'blue', icon: <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> },
                        { title: 'Assignments', desc: 'Teacher-Subject Mapping', path: '/hod/assignments', color: 'orange', icon: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2" /> },
                        { title: 'Subjects', desc: 'Subject Catalog', path: '/hod/subjects', color: 'red', icon: <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /> }
                    ].map((item, i) => (
                        <motion.button
                            whileHover={{ y: -5, scale: 1.02 }}
                            key={i}
                            onClick={() => navigate(item.path)}
                            className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all duration-300 flex items-center gap-5 text-left group"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform shadow-sm`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>{item.icon}</svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-900 group-hover:text-emerald-600 transition-colors uppercase text-sm tracking-tight truncate">{item.title}</h3>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.desc}</p>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
