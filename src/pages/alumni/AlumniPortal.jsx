// ============================================
// BDCS - Alumni Portal
// Read-only portal for graduated students and relieved employees
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion } from 'framer-motion';
import SkillsSection from '../../components/profile/SkillsSection';
import ExperienceSection from '../../components/profile/ExperienceSection';
import CertificationsSection from '../../components/profile/CertificationsSection';
import { generateServiceCertificate, generateAlumniCard } from '../../utils/ServiceCertificateGenerator';
import { format } from 'date-fns';

export default function AlumniPortal() {
    const { user } = useAuth();
    const [alumniAccess, setAlumniAccess] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlumniAccess();
    }, [user]);

    const fetchAlumniAccess = async () => {
        if (!user?.uid) return;

        try {
            const accessDoc = await getDoc(doc(db, 'alumniAccess', user.uid));
            if (accessDoc.exists()) {
                setAlumniAccess(accessDoc.data());
            }
        } catch (error) {
            console.error('Error fetching alumni access:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-biyani-red border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-semibold">Loading Alumni Portal...</p>
                </div>
            </div>
        );
    }

    // Check if user has alumni access
    if (user?.lifecycleState !== 'relieved' || !alumniAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-6">
                        This portal is only accessible to alumni and relieved members.
                    </p>
                    <a
                        href="/dashboard"
                        className="inline-block px-6 py-3 bg-biyani-red text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            {/* Header Banner */}
            <div className="relative bg-gradient-to-r from-biyani-red via-red-600 to-red-700 rounded-2xl p-8 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-5xl">🎓</span>
                        <div>
                            <h1 className="text-3xl font-black">Alumni Portal</h1>
                            <p className="text-red-100 font-medium">Welcome back, {user?.name}!</p>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-6 border border-white/20">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs font-bold text-red-100 uppercase tracking-widest mb-1">Enrollment No.</p>
                                <p className="text-lg font-black">{alumniAccess.enrollmentNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-red-100 uppercase tracking-widest mb-1">Course</p>
                                <p className="text-lg font-black">{alumniAccess.courseName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-red-100 uppercase tracking-widest mb-1">Year</p>
                                <p className="text-lg font-black">{alumniAccess.graduationYear || new Date().getFullYear()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Read-Only Notice */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6"
            >
                <div className="flex gap-4">
                    <div className="text-3xl">ℹ️</div>
                    <div className="flex-1">
                        <h3 className="font-black text-blue-900 mb-2">Read-Only Access</h3>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            As an alumni member, you have read-only access to view your profile, projects, and certificates.
                            You cannot edit or create new content. To update your information, please contact the administration.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {alumniAccess.allowedActions?.map((action, i) => (
                                <span key={i} className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                    ✓ {action.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Profile Information */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 space-y-6"
                >
                    {/* Profile Info Card */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-center sticky top-24">
                        <div className="w-20 h-20 bg-gradient-to-br from-biyani-red to-red-600 rounded-full flex items-center justify-center text-white font-black text-3xl mx-auto mb-4 shadow-lg">
                            {user?.name?.[0]}
                        </div>
                        <h3 className="text-xl font-black text-gray-900">{user?.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{user?.email}</p>

                        <div className="inline-block px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-full text-xs font-black uppercase tracking-wide mb-6">
                            🎓 Alumni Member
                        </div>

                        <div className="space-y-3 text-left border-t border-gray-100 pt-4">
                            {/* Former Roles */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Former Role(s)</p>
                                <div className="flex flex-wrap gap-2">
                                    {user?.lifecycleMetadata?.roles ? (
                                        user.lifecycleMetadata.roles.map((role, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md uppercase">
                                                {role}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-md uppercase">
                                            {user?.role || 'N/A'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Years of Service */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Years of Service</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {(() => {
                                        const joiningDate = user?.joiningDate?.toDate?.() || user?.createdAt?.toDate?.() || new Date();
                                        const relievingDate = user?.relievingDate?.toDate?.() || new Date();
                                        const yearsDiff = relievingDate.getFullYear() - joiningDate.getFullYear();
                                        const monthsDiff = relievingDate.getMonth() - joiningDate.getMonth();
                                        const totalMonths = yearsDiff * 12 + monthsDiff;
                                        const years = Math.floor(totalMonths / 12);
                                        const months = totalMonths % 12;

                                        const parts = [];
                                        if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
                                        if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
                                        return parts.length > 0 ? parts.join(', ') : 'Less than a month';
                                    })()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {user?.joiningDate?.toDate && format(user.joiningDate.toDate(), 'MMM yyyy')} - {user?.relievingDate?.toDate && format(user.relievingDate.toDate(), 'MMM yyyy')}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                <p className="text-sm font-bold text-gray-900">Relieved - Alumni</p>
                            </div>
                            {user?.relievedAt && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Since</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {new Date(user.relievedAt.seconds * 1000).toLocaleDateString('en-US', {
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Department</p>
                                <p className="text-sm font-bold text-gray-900">{user?.departmentName || alumniAccess.departmentId || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Certificate Download Section */}
                        <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                            <button
                                onClick={() => generateServiceCertificate(user)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-biyani-red to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download Service Certificate
                            </button>
                            <button
                                onClick={() => generateAlumniCard(user)}
                                className="w-full px-4 py-2 bg-white text-gray-700 rounded-lg font-semibold border-2 border-gray-200 hover:border-biyani-red hover:text-biyani-red transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                                Download Alumni Card
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Professional Profile Sections (Read-Only) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Skills Section (Read-Only) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <SkillsSection user={user} editable={false} />
                    </motion.div>

                    {/* Experience Section (Read-Only) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <ExperienceSection user={user} editable={false} />
                    </motion.div>

                    {/* Certifications Section (Read-Only) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <CertificationsSection user={user} editable={false} />
                    </motion.div>

                    {/* Projects Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4">📂 Projects</h3>
                        <div className="text-center py-8">
                            <div className="text-5xl mb-3">🚀</div>
                            <p className="text-gray-500 text-sm">No projects to display</p>
                            <p className="text-xs text-gray-400 mt-2">Projects from your showcase will appear here</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Alumni Network Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100"
            >
                <div className="flex items-start gap-4">
                    <div className="text-4xl">🤝</div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-gray-900 mb-2">Stay Connected</h3>
                        <p className="text-gray-600 mb-4">
                            Join our alumni network to connect with fellow graduates, share opportunities, and stay updated with campus events.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button className="px-6 py-3 bg-white text-gray-700 rounded-lg font-bold border-2 border-gray-200 hover:border-biyani-red hover:text-biyani-red transition-all">
                                📧 Contact Alumni Relations
                            </button>
                            <button className="px-6 py-3 bg-gradient-to-r from-biyani-red to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all">
                                🌐 Visit Alumni Network
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
