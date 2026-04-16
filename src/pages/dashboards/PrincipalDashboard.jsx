// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Principal Dashboard
// ============================================

import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { collection, query, where, getCountFromServer, getDocs, limit, orderBy } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import QuickStatCard from '../../components/common/QuickStatCard';

export default function PrincipalDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        hods: 0,
        departments: 0,
        pendingUnlocks: 0
    });
    const [recentRequests, setRecentRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.collegeId) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const collegeId = user.collegeId;

            // 1. Parallel Count Fetches
            const usersRef = collection(db, 'users');
            const [studentSn, teacherSn, hodSn, deptSn, unlockSn] = await Promise.all([
                getCountFromServer(query(usersRef, where('collegeId', '==', collegeId), where('role', '==', 'student'))),
                getCountFromServer(query(usersRef, where('collegeId', '==', collegeId), where('role', '==', 'teacher'))),
                getCountFromServer(query(usersRef, where('collegeId', '==', collegeId), where('role', '==', 'hod'))),
                getCountFromServer(query(collection(db, 'departments'), where('collegeId', '==', collegeId))),
                getCountFromServer(query(collection(db, 'attendance_unlock_requests'), where('collegeId', '==', collegeId), where('status', '==', 'PENDING')))
            ]);

            // 2. Fetch Recent Unlock Requests
            const requestsQ = query(
                collection(db, 'attendance_unlock_requests'),
                where('collegeId', '==', collegeId),
                where('status', '==', 'PENDING'),
                orderBy('createdAt', 'desc'),
                limit(5)
            );
            const requestsSnap = await getDocs(requestsQ);

            setStats({
                students: studentSn.data().count,
                teachers: teacherSn.data().count,
                hods: hodSn.data().count,
                departments: deptSn.data().count,
                pendingUnlocks: unlockSn.data().count
            });

            setRecentRequests(requestsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await signOut(auth);
            navigate('/login');
        }
    };


    return (
        <div className="space-y-6">
            {/* HERO SECTION */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#111827] p-6 sm:p-10 text-white shadow-2xl shadow-gray-900/20 ring-1 ring-white/10">
                {/* Visual Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#111827]" />
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#E31E24]/10 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-red-600/10 blur-3xl opacity-30" />
                
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className="px-3 py-1.5 rounded-xl bg-white/10 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-white/10 text-gray-300">
                            Global Control
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-green-500/20 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-green-500/20 text-green-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            Operational
                        </span>
                    </div>

                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] mb-3 max-w-2xl">
                            {user?.collegeName || 'Principal Dashboard'}
                        </h1>
                        <p className="text-gray-400 text-sm sm:text-lg font-medium max-w-xl leading-relaxed">
                            Welcome back, <span className="text-white">Principal {user?.name.split(' ')[0]}</span>. Overseeing {stats.departments} active departments.
                        </p>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { title: 'Total Students', count: stats.students, desc: 'Enrolled across college', path: '/principal/students', color: 'bg-blue-500', icon: <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                    { title: 'Faculty', count: stats.teachers, desc: 'Active Teachers', path: '/principal/teachers', color: 'bg-emerald-500', icon: <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                    { title: 'Departments', count: stats.departments, desc: 'Managed branches', path: '/principal/departments', color: 'bg-purple-500', icon: <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                    { title: 'Unlock Requests', count: stats.pendingUnlocks, desc: 'Attendance overrides', path: '/principal/unlock-requests', color: 'bg-amber-500', icon: <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> }
                ].map((item, index) => (
                    <button
                        key={index}
                        onClick={() => item.path && navigate(item.path)}
                        disabled={!item.path}
                        className={`group relative bg-white p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm border border-gray-100 transition-all duration-300 text-left overflow-hidden ${item.path ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : 'cursor-default opacity-90'}`}
                    >
                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${item.color.replace('bg-', 'bg-')}/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl`}></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <p className="text-gray-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total</p>
                                {loading ? (
                                    <div className="animate-pulse h-8 sm:h-10 w-12 sm:w-16 bg-gray-100 rounded-xl"></div>
                                ) : (
                                    <h3 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{item.count}</h3>
                                )}
                            </div>
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.2rem] ${item.color.replace('500', '50')} ${item.color.replace('bg-', 'text-').replace('500', '600')} flex items-center justify-center ${item.path ? 'group-hover:scale-110' : ''} transition-transform shrink-0`}>
                                {item.icon}
                            </div>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-0.5">{item.title}</h3>
                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recent Unlocks */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                            Recent Unlock Requests
                        </h2>
                        <button
                            onClick={() => navigate('/principal/unlock-requests')}
                            className="text-sm font-bold text-[#E31E24] hover:underline"
                        >
                            View All →
                        </button>
                    </div>

                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400 animate-pulse">Loading requests...</div>
                        ) : recentRequests.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {recentRequests.map(req => (
                                    <div key={req.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-[1rem] bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                                                {req.teacherName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{req.teacherName}</p>
                                                <p className="text-sm text-gray-500">{req.batchName} • {format(new Date(req.date), 'dd MMM')}</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                            Pending
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-gray-50">
                                <span className="text-4xl block mb-4">✅</span>
                                <h3 className="font-bold text-gray-900">All Caught Up!</h3>
                                <p className="text-sm text-gray-500 mt-1">No pending unlock requests from faculty.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-6">
                        <span className="w-2 h-6 bg-gray-900 rounded-full"></span>
                        Quick Actions
                    </h2>
                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 space-y-2">
                        <button
                            onClick={() => navigate('/principal/hods')}
                            className="w-full text-left p-4 hover:bg-gray-50 rounded-[1.2rem] transition-colors flex items-center gap-4 font-medium text-gray-700"
                        >
                            <span className="w-10 h-10 rounded-[1rem] bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">👔</span>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Manage HODs</h4>
                                <p className="text-xs text-gray-500">View department heads</p>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate('/principal/departments')}
                            className="w-full text-left p-4 hover:bg-gray-50 rounded-[1.2rem] transition-colors flex items-center gap-4 font-medium text-gray-700"
                        >
                            <span className="w-10 h-10 rounded-[1rem] bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">🏢</span>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Departments</h4>
                                <p className="text-xs text-gray-500">Configure branches</p>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate('/principal/audit-logs')}
                            className="w-full text-left p-4 hover:bg-gray-50 rounded-[1.2rem] transition-colors flex items-center gap-4 font-medium text-gray-700"
                        >
                            <span className="w-10 h-10 rounded-[1rem] bg-gray-50 text-gray-600 flex items-center justify-center text-xl shrink-0">📜</span>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Audit Logs</h4>
                                <p className="text-xs text-gray-500">Track system activity</p>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
