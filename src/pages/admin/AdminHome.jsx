// ============================================
// BDCS - Admin Home Dashboard
// Main admin dashboard with statistics and quick actions
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getCountFromServer, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

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

            // Check each campus for colleges
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
            title: 'Campus Management',
            description: 'Manage campus locations and facilities',
            count: stats.campuses,
            path: '/admin/campuses',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            color: 'bg-blue-500'
        },
        {
            title: 'College Management',
            description: 'Manage colleges under campuses',
            count: stats.colleges,
            path: '/admin/colleges',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
            color: 'bg-green-500'
        },
        {
            title: 'Course Management',
            description: 'Manage academic courses and programs',
            count: stats.courses,
            path: '/admin/courses',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            color: 'bg-purple-500'
        },
        {
            title: 'Department Management',
            description: 'Manage departments and HOD assignments',
            count: stats.departments,
            path: '/admin/departments',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'bg-orange-500'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to BDCS Admin Panel</h1>
                <p className="text-gray-600">
                    Manage the institutional structure of Biyani Digital Campus System
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {modules.map((module, index) => (
                    <button
                        key={index}
                        onClick={() => navigate(module.path)}
                        className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow text-left"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`${module.color} text-white p-3 rounded-lg`}>
                                {module.icon}
                            </div>
                            {loading ? (
                                <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                            ) : (
                                <div className="text-right">
                                    <p className="text-3xl font-bold text-gray-900">{module.count}</p>
                                    <p className="text-xs text-gray-500">Active</p>
                                </div>
                            )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{module.title}</h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                    </button>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                    >
                        <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Add User</p>
                            <p className="text-xs text-gray-500">Create new staff or student</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/courses')}
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                    >
                        <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Add Course</p>
                            <p className="text-xs text-gray-500">Create new academic program</p>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/departments')}
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                    >
                        <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Add Department</p>
                            <p className="text-xs text-gray-500">Create new department</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Governance Alerts Section */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Governance Alerts</h2>
                <p className="text-sm text-gray-600 mb-4">Critical issues requiring immediate attention</p>

                {alertsLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-biyani-red"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Alert 1: Departments without HOD */}
                        <div className={`rounded-lg border ${alerts.departmentsWithoutHOD.length > 0
                                ? 'border-red-300 bg-red-50'
                                : 'border-green-300 bg-green-50'
                            } p-4`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${alerts.departmentsWithoutHOD.length > 0
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-green-100 text-green-600'
                                    }`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-gray-900">Departments without HOD</h3>
                                        {alerts.departmentsWithoutHOD.length > 0 && (
                                            <span className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded-full">
                                                {alerts.departmentsWithoutHOD.length}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {alerts.departmentsWithoutHOD.length === 0
                                            ? 'All departments have assigned HODs'
                                            : 'Some departments need HOD assignment'
                                        }
                                    </p>
                                    {alerts.departmentsWithoutHOD.length > 0 && (
                                        <>
                                            <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                                                {alerts.departmentsWithoutHOD.slice(0, 3).map(dept => (
                                                    <div key={dept.id} className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200">
                                                        <span className="font-medium">{dept.name}</span>
                                                        <span className="text-gray-500"> • {dept.collegeName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => navigate('/admin/departments')}
                                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                                            >
                                                Assign HODs →
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Alert 2: Campuses without Colleges */}
                        <div className={`rounded-lg border ${alerts.campusesWithoutColleges.length > 0
                                ? 'border-orange-300 bg-orange-50'
                                : 'border-green-300 bg-green-50'
                            } p-4`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${alerts.campusesWithoutColleges.length > 0
                                        ? 'bg-orange-100 text-orange-600'
                                        : 'bg-green-100 text-green-600'
                                    }`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-gray-900">Campuses without Colleges</h3>
                                        {alerts.campusesWithoutColleges.length > 0 && (
                                            <span className="px-2 py-1 text-xs font-bold bg-orange-600 text-white rounded-full">
                                                {alerts.campusesWithoutColleges.length}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {alerts.campusesWithoutColleges.length === 0
                                            ? 'All campuses have colleges'
                                            : 'Some campuses need colleges'
                                        }
                                    </p>
                                    {alerts.campusesWithoutColleges.length > 0 && (
                                        <>
                                            <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                                                {alerts.campusesWithoutColleges.slice(0, 3).map(campus => (
                                                    <div key={campus.id} className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200">
                                                        <span className="font-medium">{campus.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => navigate('/admin/colleges')}
                                                className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                                            >
                                                Add Colleges →
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Alert 3: Relieved Users Pending Successor */}
                        <div className={`rounded-lg border ${alerts.relievedWithoutSuccessor.length > 0
                                ? 'border-yellow-300 bg-yellow-50'
                                : 'border-green-300 bg-green-50'
                            } p-4`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${alerts.relievedWithoutSuccessor.length > 0
                                        ? 'bg-yellow-100 text-yellow-600'
                                        : 'bg-green-100 text-green-600'
                                    }`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-gray-900">Pending Successors</h3>
                                        {alerts.relievedWithoutSuccessor.length > 0 && (
                                            <span className="px-2 py-1 text-xs font-bold bg-yellow-600 text-white rounded-full">
                                                {alerts.relievedWithoutSuccessor.length}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {alerts.relievedWithoutSuccessor.length === 0
                                            ? 'All transitions handled'
                                            : 'Relieved users need successors'
                                        }
                                    </p>
                                    {alerts.relievedWithoutSuccessor.length > 0 && (
                                        <>
                                            <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                                                {alerts.relievedWithoutSuccessor.slice(0, 3).map(user => (
                                                    <div key={user.id} className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200">
                                                        <span className="font-medium">{user.name}</span>
                                                        <span className="text-gray-500"> • {user.role}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => navigate('/admin/users?status=relieved')}
                                                className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                                            >
                                                Assign Successors →
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}
