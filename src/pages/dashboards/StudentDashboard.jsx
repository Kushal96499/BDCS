// ============================================
// BDCS - Student Dashboard
// Personal dashboard for active students
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchTimeline();
    }, [user]);

    const fetchTimeline = async () => {
        try {
            const q = query(
                collection(db, 'student_timelines'),
                where('studentId', '==', user.uid),
                orderBy('date', 'desc')
            );
            const snap = await getDocs(q);
            setTimeline(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                {/* EMERGENCY RESTORE BUTTON FOR PINKY */}
                {user?.uid === 'J6nqs4tOpmSm1nOnwPnuak4M7Ov1' && (
                    <div className="bg-red-50 border-2 border-red-500 p-4 rounded-xl mb-6 animate-pulse">
                        <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
                            ⚠️ EMERGENCY RECOVERY
                        </h3>
                        <p className="text-red-900 mb-2 font-medium">
                            Your account was incorrectly set to 'Student'. Click below to restore Principal access.
                        </p>
                        <button
                            onClick={async () => {
                                if (!window.confirm('Restore Principal Role?')) return;
                                try {
                                    const { doc, updateDoc } = await import('firebase/firestore');
                                    // db is already imported as db
                                    await updateDoc(doc(db, 'users', user.uid), {
                                        role: 'principal',
                                        roles: ['principal', 'hod', 'teacher'],
                                        status: 'active',
                                        lifecycleState: 'active'
                                    });
                                    alert('Role Restored! Please Logout and Login again to see changes.');
                                    window.location.reload();
                                } catch (e) {
                                    console.error(e);
                                    alert('Recovery Failed: ' + e.message + '\n\nPlease contact support or check console permissions.');
                                }
                            }}
                            className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-all w-full md:w-auto"
                        >
                            RESTORE PRINCIPAL ROLE
                        </button>
                    </div>
                )}

                <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}</h1>
                <p className="text-gray-600 mt-1">
                    {user?.courseName} • Sem {user?.currentSemester} • {user?.enrollmentNumber}
                </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => navigate('/student/attendance')}
                    className="p-4 bg-white border rounded-xl hover:shadow-md transition text-center space-y-2"
                >
                    <div className="w-10 h-10 bg-biyani-red text-white sorted rounded-full flex items-center justify-center mx-auto text-xl">📊</div>
                    <p className="font-bold text-gray-800">Attendance</p>
                </button>

                <button
                    onClick={() => navigate('/student/events')}
                    className="p-4 bg-white border rounded-xl hover:shadow-md transition text-center space-y-2"
                >
                    <div className="w-10 h-10 bg-blue-600 text-white sorted rounded-full flex items-center justify-center mx-auto text-xl">🎉</div>
                    <p className="font-bold text-gray-800">Events</p>
                </button>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Journey</h2>

                {loading ? <p>Loading timeline...</p> : (
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                        {timeline.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">No achievements recorded yet. Join events!</div>
                        ) : (
                            timeline.map((item) => (
                                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-green-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                        <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="12" height="10">
                                            <path fillRule="nonzero" d="M10.422 1.257 4.655 7.025 2.553 4.923A.916.916 0 0 0 1.257 6.22l2.75 2.75a.916.916 0 0 0 1.296 0l6.415-6.416a.916.916 0 0 0-1.296-1.296Z" />
                                        </svg>
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-slate-200 shadow">
                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                            <div className="font-bold text-slate-900">{item.title}</div>
                                            <time className="font-caveat font-medium text-indigo-500">
                                                {new Date(item.date.toDate()).toLocaleDateString()}
                                            </time>
                                        </div>
                                        <div className="text-slate-500 text-sm">
                                            {item.description}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            Verified by: {item.verifiedBy}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
