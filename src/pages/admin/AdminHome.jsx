// ============================================
// BDCS - Premium Admin Home Dashboard
// Integrated, Responsive & Animated
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getCountFromServer, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Button from '../../components/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminHome() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        campuses: 0,
        colleges: 0,
        courses: 0,
        departments: 0
    });
    const [alerts, setAlerts] = useState({
        departmentsWithoutHOD: [],
        campusesWithoutColleges: [],
        relievedWithoutSuccessor: []
    });
    const [loading, setLoading] = useState(true);
    const [alertsLoading, setAlertsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        fetchGovernanceAlerts();
    }, []);

    const fetchStats = async () => {
        try {
            const counts = await Promise.all([
                getCountFromServer(query(collection(db, 'campuses'), where('status', '==', 'active'))),
                getCountFromServer(query(collection(db, 'colleges'), where('status', '==', 'active'))),
                getCountFromServer(query(collection(db, 'courses'), where('status', '==', 'active'))),
                getCountFromServer(query(collection(db, 'departments'), where('status', '==', 'active')))
            ]);

            setStats({
                campuses: counts[0].data().count,
                colleges: counts[1].data().count,
                courses: counts[2].data().count,
                departments: counts[3].data().count
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGovernanceAlerts = async () => {
        try {
            setAlertsLoading(true);

            // 1. Departments without HOD
            const deptsSnapshot = await getDocs(
                query(collection(db, 'departments'), where('status', '==', 'active'))
            );
            const depsWithoutHOD = deptsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(dept => !dept.hodId || dept.hodId === '');

            // 2. Campuses without colleges
            const campusesSnapshot = await getDocs(
                query(collection(db, 'campuses'), where('status', '==', 'active'))
            );
            const campusesData = campusesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const campusesWithoutColleges = [];
            for (const campus of campusesData) {
                const collegeCount = await getCountFromServer(
                    query(
                        collection(db, 'colleges'),
                        where('campusId', '==', campus.id),
                        where('status', '==', 'active')
                    )
                );
                if (collegeCount.data().count === 0) {
                    campusesWithoutColleges.push(campus);
                }
            }

            // 3. Relieved users without successor
            const relievedUsers = await getDocs(
                query(
                    collection(db, 'users'),
                    where('status', '==', 'relieved')
                )
            );
            const withoutSuccessor = relievedUsers.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(user => !user.lifecycleMetadata?.successorId);

            setAlerts({
                departmentsWithoutHOD: depsWithoutHOD,
                campusesWithoutColleges: campusesWithoutColleges,
                relievedWithoutSuccessor: withoutSuccessor
            });
        } catch (error) {
            console.error('Error fetching governance alerts:', error);
        } finally {
            setAlertsLoading(false);
        }
    };

    const modules = [
        {
            title: 'Campuses',
            description: 'Locations & Facilities',
            count: stats.campuses,
            path: '/admin/campuses',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Colleges',
            description: 'Managed Colleges',
            count: stats.colleges,
            path: '/admin/colleges',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Courses',
            description: 'Courses Offered',
            count: stats.courses,
            path: '/admin/courses',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
            color: 'text-violet-600',
            bg: 'bg-violet-50'
        },
        {
            title: 'Departments',
            description: 'Subject Groups',
            count: stats.departments,
            path: '/admin/departments',
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-10"
        >
            {/* ── HERO BANNER ────────────────────────────────────── */}
            <motion.div 
                variants={itemVariants}
                className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 p-8 sm:p-12 text-white shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[100px] -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[80px] -ml-20 -mb-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest border border-white/5 mb-6">
                            Admin Dashboard
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
                            Welcome, Admin
                        </h1>
                        <p className="text-gray-400 text-sm sm:text-lg font-medium leading-relaxed mb-8">
                            Manage the Biyani Digital Campus System with real-time data and system insights.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="primary" onClick={() => navigate('/admin/users')}>
                                Add New Staff
                            </Button>
                            <Button variant="secondary" onClick={() => navigate('/admin/audit-logs')} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                View Logs
                            </Button>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center justify-center pr-10">
                         <div className="w-32 h-32 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center animate-pulse">
                            <img src="/assets/biyani-logo.png" alt="BDCS" className="w-20 h-20 object-contain opacity-50 contrast-125" />
                         </div>
                    </div>
                </div>
            </motion.div>

            {/* ── STATISTICS CARS ────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {modules.map((module, index) => (
                    <motion.button
                        variants={itemVariants}
                        key={index}
                        onClick={() => navigate(module.path)}
                        className="group bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 ${module.bg} opacity-0 group-hover:opacity-100 transition-opacity blur-2xl -mr-8 -mt-8`} />
                        <div className={`w-12 h-12 ${module.bg} ${module.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                            <div className="w-6 h-6">{module.icon}</div>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{module.title}</p>
                        {loading ? (
                            <div className="h-8 w-16 bg-gray-50 rounded-xl animate-pulse" />
                        ) : (
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{module.count}</h3>
                        )}
                        <p className="text-[11px] font-bold text-gray-400 mt-2">{module.description}</p>
                    </motion.button>
                ))}
            </div>

            {/* ── SYSTEM ALERTS ────────────────────────────────── */}
            <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-2 h-6 bg-[#E31E24] rounded-full" />
                        System Alerts
                    </h2>
                    <Button variant="ghost" onClick={fetchGovernanceAlerts} disabled={alertsLoading} className="text-xs">
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {alertsLoading ? (
                         Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-48 bg-gray-50 rounded-[2rem] animate-pulse" />
                         ))
                    ) : (
                        <>
                            {/* HOD Missing Alert */}
                            <AlertCard 
                                count={alerts.departmentsWithoutHOD.length}
                                title="Missing HODs"
                                label="Action Required"
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 11-8 0 4 4 0 018 0" /></svg>}
                                color="red"
                                items={alerts.departmentsWithoutHOD}
                                onClick={() => navigate('/admin/departments')}
                            />
                            
                            {/* Empty Campus Alert */}
                            <AlertCard 
                                count={alerts.campusesWithoutColleges.length}
                                title="Empty Campuses"
                                label="No Colleges"
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" /></svg>}
                                color="orange"
                                items={alerts.campusesWithoutColleges}
                                onClick={() => navigate('/admin/colleges')}
                            />

                            {/* Successors Alert */}
                            <AlertCard 
                                count={alerts.relievedWithoutSuccessor.length}
                                title="Empty Roles"
                                label="Replacement Needed"
                                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                                color="yellow"
                                items={alerts.relievedWithoutSuccessor}
                                onClick={() => navigate('/admin/users?status=relieved')}
                            />
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

function AlertCard({ count, title, label, icon, color, items, onClick }) {
    const isError = count > 0;
    const colorMap = {
        red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
        yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
        green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' }
    };
    const c = isError ? colorMap[color] : colorMap.green;

    return (
        <div className={`p-8 rounded-[2.5rem] bg-white border ${c.border} shadow-sm transition-all duration-300`}>
            <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 ${c.bg} ${c.text} rounded-2xl flex items-center justify-center`}>
                    <div className="w-7 h-7">{isError ? icon : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 13l4 4L19 7" /></svg>}</div>
                </div>
                {isError && (
                    <span className={`px-3 py-1 rounded-full ${c.bg} ${c.text} text-[10px] font-black uppercase tracking-widest`}>
                        {count} Issues
                    </span>
                )}
            </div>

            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1">{isError ? title : 'All Secure'}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{isError ? label : 'No Action Required'}</p>

            {isError ? (
                <div className="space-y-6">
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 no-scrollbar">
                        {items.slice(0, 3).map((item, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 truncate">{item.collegeName || item.role || 'Unassigned'}</p>
                            </div>
                        ))}
                    </div>
                    <Button variant="primary" onClick={onClick} className="w-full py-2.5 text-xs">
                        Resolve Now
                    </Button>
                </div>
            ) : (
                <div className="py-10 text-center">
                    <p className="text-sm font-bold text-gray-400">Everything looks great!</p>
                </div>
            )}
        </div>
    );
}
