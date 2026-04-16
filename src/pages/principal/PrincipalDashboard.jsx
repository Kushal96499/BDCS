import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToCollegeStats, getCollegeAlerts } from '../../services/principalService';
import { motion, AnimatePresence } from 'framer-motion';

export default function PrincipalDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        departments: 0,
        hods: 0,
        teachers: 0,
        students: 0
    });
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.collegeId) {
            const unsubscribe = subscribeToCollegeStats(user.collegeId, (newStats) => {
                setStats(newStats);
                setLoading(false);
            });
            fetchAlerts();
            return () => unsubscribe();
        }
    }, [user?.collegeId]);

    const fetchAlerts = async () => {
        try {
            const collegeAlerts = await getCollegeAlerts(user.collegeId);
            setAlerts(collegeAlerts);
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    };

    const MetricCard = ({ title, value, type, icon, colorClass }) => {
        return (
            <motion.div 
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between overflow-hidden group"
            >
                <div className="relative z-10">
                    <div className={`w-14 h-14 rounded-2xl ${colorClass.bg} flex items-center justify-center ${colorClass.icon} mb-6 transition-transform group-hover:rotate-6`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                        <h3 className="text-4xl font-black text-gray-900 tracking-tight">{value}</h3>
                    </div>
                </div>
                {/* Decorative background element */}
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${colorClass.bg} opacity-5 group-hover:scale-150 transition-transform duration-700`} />
            </motion.div>
        );
    };

    const cardStyles = {
        students: { bg: 'bg-blue-50', icon: 'text-blue-600' },
        faculty: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
        depts: { bg: 'bg-purple-50', icon: 'text-purple-600' },
        unlocks: { bg: 'bg-red-50', icon: 'text-red-600' }
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Header / Hero Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#2563EB] to-blue-800 p-10 md:p-14 text-white shadow-2xl shadow-blue-200/50 border border-white/10">
                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg">
                                <img src="/assets/biyani-logo.png" alt="BDCS" className="w-full h-full object-contain" />
                            </div>
                            <span className="px-4 py-1.5 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-white/20">
                                Principal Desk
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-loose mb-4">
                            Welcome Back, <br/>
                            <span className="text-blue-100">{user?.name?.split(' ')[0]}</span>
                        </h1>
                        <p className="text-blue-50/80 text-lg font-bold max-w-lg leading-relaxed flex items-center gap-3 italic">
                            <span className="w-4 h-1 bg-red-500 rounded-full" />
                            {user?.collegeName || 'Biyani College Administration'}
                        </p>
                    </div>
                    <div className="hidden md:flex flex-col items-end justify-center">
                        <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 text-right">
                            <p className="text-blue-200 font-black text-[10px] uppercase tracking-widest mb-2">Live Session</p>
                            <p className="text-3xl font-black text-white">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                            </p>
                            <p className="text-blue-100/60 font-bold text-sm mt-1 uppercase tracking-tighter">
                                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Aesthetic shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/5 blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-red-500/10 blur-[80px]" />
            </div>

            {/* Metrics */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-44 rounded-[2.5rem] bg-white animate-pulse border border-gray-50 shadow-sm" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <MetricCard 
                        title="Total Students" 
                        value={stats.students} 
                        type="students" 
                        colorClass={cardStyles.students}
                        icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0" /></svg>}
                    />
                    <MetricCard 
                        title="Faculty Census" 
                        value={stats.teachers} 
                        type="faculty" 
                        colorClass={cardStyles.faculty}
                        icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745" /><path d="M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10" /></svg>}
                    />
                    <MetricCard 
                        title="Departments" 
                        value={stats.departments} 
                        type="depts" 
                        colorClass={cardStyles.depts}
                        icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    />
                    <MetricCard 
                        title="Pending Alerts" 
                        value={alerts.length} 
                        type="unlocks" 
                        colorClass={cardStyles.unlocks}
                        icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* System Alerts */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-red-500 rounded-full" />
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">System Alerts</h2>
                        </div>
                        <button onClick={() => navigate('/principal/unlock-requests')} className="text-[10px] font-black text-blue-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2 group">
                            Full Registry <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                        {alerts.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {alerts.map((alert, index) => (
                                    <div key={index} className="p-8 flex items-center gap-6 hover:bg-gray-50/50 transition-all group">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${alert.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0" /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-gray-900 text-base leading-tight group-hover:text-blue-600 transition-colors truncate">{alert.message}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{alert.type} Request • Action Required</p>
                                        </div>
                                        <button className="px-6 py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all active:scale-95 shadow-lg shadow-gray-200">
                                            Execute
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-6 ring-8 ring-emerald-50/50 animate-pulse">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Registry Neutralized</h3>
                                <p className="text-gray-400 text-sm font-bold max-w-xs uppercase tracking-tight leading-relaxed">System status optimal. No high-priority alerts isolated at this hour.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Council Actions */}
                <div className="space-y-8">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight px-2 flex items-center gap-3">
                        <div className="w-2 h-8 bg-blue-500 rounded-full" />
                        Quick Council
                    </h2>
                    <div className="space-y-4">
                        {[
                            { name: 'Appoint HOD', desc: 'Departmental Leadership', path: '/principal/hods', color: 'purple', icon: <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745" /> },
                            { name: 'Structural Review', desc: 'Manage Departments', path: '/principal/departments', color: 'blue', icon: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /> },
                            { name: 'Security Audit', desc: 'View Transaction Logs', path: '/principal/audit-logs', color: 'gray', icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293" /> }
                        ].map((action, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(action.path)}
                                className="group w-full bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex items-center gap-5 text-left"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-${action.color}-50 text-${action.color}-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>{action.icon}</svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{action.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{action.desc}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
