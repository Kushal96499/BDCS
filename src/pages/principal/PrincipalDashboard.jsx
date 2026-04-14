import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToCollegeStats, getCollegeAlerts } from '../../services/principalService';

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
            // Subscribe to real-time stats
            const unsubscribe = subscribeToCollegeStats(user.collegeId, (newStats) => {
                setStats(newStats);
                setLoading(false);
            });

            // Fetch alerts (can be kept as oneshot or made real-time later)
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



    // Executive color palette for cards
    const cardColors = {
        students: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-100' },
        faculty: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-100' },
        depts: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-100' },
        unlocks: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-100' }
    };

    const MetricCard = ({ title, value, type, icon }) => {
        const style = cardColors[type];
        return (
            <div className={`relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer`}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
                        <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight">{value}</h3>
                    </div>
                </div>
                {/* Icon in soft colored circle */}
                <div className={`absolute top-6 right-6 w-12 h-12 rounded-2xl ${style.iconBg} flex items-center justify-center ${style.icon} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {/* Bottom accent bar */}
                <div className={`absolute bottom-0 left-6 right-6 h-1 rounded-t-full ${style.bg.replace('bg-', 'bg-')}-400 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            </div>
        );
    };

    return (
        <div className="min-h-full p-8 space-y-8 animate-in fade-in duration-500">

            {/* 3. DASHBOARD HERO SECTION - "You are in charge" */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#C62828] to-[#EF6C00] p-8 text-white shadow-xl shadow-red-900/20 ring-1 ring-white/10">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full bg-black/20 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">
                                Executive Control
                            </span>
                            {/* Debug Warning Warning */}
                            {(!user?.collegeId) && (
                                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-200 text-xs font-bold border border-yellow-400/30">
                                    ⚠ Missing College ID
                                </span>
                            )}
                        </div>
                        <h1 className="text-4xl font-black tracking-tight leading-tight mb-2">
                            Welcome, Principal {user?.name?.split(' ')[0]}
                        </h1>
                        <p className="text-red-100 text-lg font-medium opacity-90 max-w-2xl">
                            {user?.collegeName || 'Biyani College of Science & Management'}
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-red-200 font-bold text-sm uppercase tracking-widest mb-1">Today</p>
                        <p className="text-2xl font-bold text-white">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Abstract Authority Shapes */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 right-20 w-60 h-60 rounded-full bg-black/10 blur-2xl"></div>
                <div className="absolute bottom-4 right-4 opacity-10 transform rotate-12">
                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" /></svg>
                </div>
            </div>

            {/* 4. METRIC CARDS GRID */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-2xl bg-white animate-pulse shadow-sm" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Students"
                        value={stats.students}
                        type="students"
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    />
                    <MetricCard
                        title="Faculty Members"
                        value={stats.teachers} // stats.teachers already includes HODs per principalService.js
                        type="faculty"
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                    />
                    <MetricCard
                        title="Departments"
                        value={stats.departments}
                        type="depts"
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    />
                    <MetricCard
                        title="Pending Unlocks"
                        value={alerts.length} // Simplified logic for demo
                        type="unlocks"
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* 5. RECENT UNLOCK REQUESTS - Expanded Card */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <span className="w-2 h-8 bg-biyani-red rounded-full"></span>
                            Recent Unlock Requests // System Alerts
                        </h2>
                        <button onClick={() => window.location.href = '/principal/unlock-requests'} className="text-sm font-bold text-biyani-red hover:underline">
                            View All Requests →
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
                        {alerts.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {alerts.map((alert, index) => (
                                    <div key={index} className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                        <div className={`p-3 rounded-xl flex-shrink-0 ${alert.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 text-base">{alert.message}</h4>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${alert.type === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    System Alert
                                                </span>
                                                <button className="text-xs font-bold text-gray-400 hover:text-gray-900">Dismiss</button>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-transform active:scale-95">
                                            Review
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-16">
                                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50/50 animate-pulse">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                                <p className="text-gray-500 max-w-sm text-center">There are no pending actions or system alerts requiring your attention right now.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. QUICK ACTIONS - Vertical Cards */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Quick Decisions</h2>
                    <div className="space-y-4">
                        <button
                            onClick={() => window.location.href = '/principal/hods'}
                            className="group w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-4 text-left hover:border-purple-100"
                        >
                            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Manage HODs</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Appoint or change Dept Heads</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:bg-purple-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>

                        <button
                            onClick={() => window.location.href = '/principal/departments'}
                            className="group w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-4 text-left hover:border-blue-100"
                        >
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Departments</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Oversee college structure</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>

                        <button
                            onClick={() => window.location.href = '/principal/audit-logs'}
                            className="group w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex items-center gap-4 text-left hover:border-gray-300"
                        >
                            <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 group-hover:text-gray-900 transition-colors">Audit Logs</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Security & tracking reports</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-full text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
