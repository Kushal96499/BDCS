import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
            const studentsQuery = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('role', '==', 'student'),
                where('status', '==', 'active')
            );
            const studentsSnap = await getDocs(studentsQuery);

            const classesQuery = query(
                collection(db, 'class_assignments'),
                where('teacherId', '==', user.uid)
            );
            const classesSnap = await getDocs(classesQuery);
            const assignments = classesSnap.docs.map(d => d.data());
            const uniqueBatches = new Set(assignments.map(a => a.batchId)).size;

            const eventsQuery = query(
                collection(db, 'events'),
                where('organizerId', '==', user.uid)
            );
            const eventsSnap = await getDocs(eventsQuery);

            setStats({
                students: studentsSnap.size,
                courses: classesSnap.size,
                classes: uniqueBatches,
                events: eventsSnap.size
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
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
        violet: { bg: 'bg-violet-50', icon: 'text-violet-600' },
        blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-600' }
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#7C3AED] to-violet-900 p-10 md:p-14 text-white shadow-2xl shadow-violet-200/50 border border-white/10">
                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg border border-red-50">
                                <img src="/assets/biyani-logo.png" alt="BDCS" className="w-full h-full object-contain" />
                            </div>
                            <span className="px-4 py-1.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-white/20">
                                Academic Desk
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-loose mb-4">
                            Hello, <br/>
                            <span className="text-violet-100">{user?.name?.split(' ')[0]}</span>
                        </h1>
                        <p className="text-violet-50/80 text-lg font-bold max-w-lg leading-relaxed flex items-center gap-3 italic">
                            <span className="w-4 h-1 bg-red-500 rounded-full" />
                            Inspiring the future at {user?.departmentName || 'Biyani Campus'}
                        </p>
                    </div>
                    <div className="hidden md:flex flex-col items-end justify-center">
                        <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 text-right">
                            <p className="text-violet-200 font-black text-[10px] uppercase tracking-widest mb-2">My Influence</p>
                            <p className="text-3xl font-black text-white">{stats.students}</p>
                            <p className="text-violet-100/60 font-bold text-[10px] mt-1 uppercase tracking-widest leading-none">Total Scholars Reached</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/5 blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-red-500/10 blur-[80px]" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-44 rounded-[2.5rem] bg-white animate-pulse border border-gray-50 shadow-sm" />)
                ) : (
                    <>
                        <MetricCard 
                            title="Active Classes" value={stats.classes} colorClass={cardStyles.blue} path="/teacher/classes"
                            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>}
                        />
                        <MetricCard 
                            title="My Events" value={stats.events} colorClass={cardStyles.amber} path="/teacher/events"
                            icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        />
                        <div className="bg-[#111827] p-8 rounded-[2.5rem] shadow-sm border border-gray-800 text-left overflow-hidden text-white flex flex-col justify-between relative group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full group-hover:scale-150 transition-transform"></div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 mb-6">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-black text-lg mb-1 truncate uppercase tracking-tight">{user?.name}</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{user?.employeeId || 'Faculty ID'}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-8">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-2 h-8 bg-violet-500 rounded-full" />
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Academic Tools</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: 'Attendance', desc: 'Secure Marking', path: '/teacher/attendance', color: 'emerald', icon: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                        { title: 'Assessments', desc: 'Manage Tests', path: '/teacher/tests', color: 'blue', icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293" /> },
                        { title: 'Event Hub', desc: 'Activity Ledger', path: '/teacher/events', color: 'amber', icon: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /> },
                        { title: 'Scholars', desc: 'Unified Roster', path: '/teacher/students', color: 'violet', icon: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0" /> }
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
                                <h3 className="font-black text-gray-900 group-hover:text-violet-600 transition-colors uppercase text-sm tracking-tight truncate">{item.title}</h3>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{item.desc}</p>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
