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
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
                        <p className="text-sm text-gray-500 font-medium">Welcome back, {user?.name}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-bold text-sm"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <QuickStatCard title="Total Students" value={stats.students} icon="🎓" color="bg-blue-500" onClick={() => navigate('/principal/students')} loading={loading} />
                    <QuickStatCard title="Faculty" value={stats.teachers} icon="👨‍🏫" color="bg-emerald-500" onClick={() => navigate('/principal/teachers')} loading={loading} />
                    <QuickStatCard title="Departments" value={stats.departments} icon="🏢" color="bg-purple-500" onClick={() => navigate('/principal/departments')} loading={loading} />
                    <QuickStatCard title="Pending Unlocks" value={stats.pendingUnlocks} icon="🔓" color="bg-amber-500" onClick={() => navigate('/principal/unlock-requests')} loading={loading} />
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Recent Unlocks */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Recent Unlock Requests</h2>
                            <button
                                onClick={() => navigate('/principal/unlock-requests')}
                                className="text-sm font-bold text-biyani-red hover:underline"
                            >
                                View All →
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400 animate-pulse">Loading requests...</div>
                            ) : recentRequests.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {recentRequests.map(req => (
                                        <div key={req.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                                    {req.teacherName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{req.teacherName}</p>
                                                    <p className="text-xs text-gray-500">{req.batchName} • {format(new Date(req.date), 'dd MMM')}</p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                                Pending
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <span className="text-4xl block mb-2">✅</span>
                                    <h3 className="font-bold text-gray-900">All Caught Up!</h3>
                                    <p className="text-sm text-gray-500">No pending unlock requests.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-2">
                            <button
                                onClick={() => navigate('/principal/hods')}
                                className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3 font-medium text-gray-700"
                            >
                                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">👔</span>
                                Manage HODs
                            </button>
                            <button
                                onClick={() => navigate('/principal/departments')}
                                className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3 font-medium text-gray-700"
                            >
                                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">🏢</span>
                                Departments
                            </button>
                            <button
                                onClick={() => navigate('/principal/audit-logs')}
                                className="w-full text-left p-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3 font-medium text-gray-700"
                            >
                                <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">📜</span>
                                View Audit Logs
                            </button>
                        </div>

                        {/* College Info Card */}
                        <div className="bg-gradient-to-br from-[#C62828] to-[#8E0000] rounded-2xl p-6 text-white shadow-lg">
                            <p className="text-red-200 text-xs font-bold uppercase tracking-widest mb-1">Your Campus</p>
                            <h3 className="text-xl font-black leading-tight mb-4">{user?.collegeName || 'Not Assigned'}</h3>
                            <div className="flex items-center gap-2 text-sm text-red-100">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                System Operational
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
