// ============================================
// BDCS - Student Progress Timeline
// Visual timeline of student's academic journey
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getStudentAcademicHistory } from '../../services/batchPromotionService';
import { exportStudentHistoryToExcel } from '../../services/assessmentExportService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function StudentProgressTimeline() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (user) {
            loadHistory();
        }
    }, [user]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const historyData = await getStudentAcademicHistory(user.uid);
            setHistory(historyData);
        } catch (error) {
            console.error('Error loading history:', error);
            toast.error('Failed to load academic history');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const filename = await exportStudentHistoryToExcel(user.uid, user.name);
            toast.success(`Exported to ${filename}`);
        } catch (error) {
            console.error('Error exporting:', error);
            toast.error('Failed to export history');
        } finally {
            setExporting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'PROMOTED':
                return 'bg-green-100 text-green-700 border-green-300';
            case 'ACTIVE':
                return 'bg-blue-100 text-blue-700 border-blue-300';
            case 'BACK':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'PASSOUT':
                return 'bg-purple-100 text-purple-700 border-purple-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toUpperCase()) {
            case 'PROMOTED':
                return (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'ACTIVE':
                return (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                );
            case 'BACK':
                return (
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'PASSOUT':
                return (
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <button
                        onClick={() => navigate('/student/assessment')}
                        className="text-biyani-red hover:underline mb-2 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Assessment
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Academic Progress Timeline</h1>
                    <p className="text-gray-600 mt-1">Your complete academic journey</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={exporting || history.length === 0}
                    className="px-6 py-3 bg-biyani-red text-white rounded-xl font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg flex items-center gap-2"
                >
                    {exporting ? 'Exporting...' : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export History
                        </>
                    )}
                </button>
            </div>

            {/* Timeline */}
            {loading ? (
                <div className="space-y-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                            <div className="h-32 bg-gray-200 rounded-xl"></div>
                        </div>
                    ))}
                </div>
            ) : history.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Available</h3>
                    <p className="text-gray-600">Your academic history will appear here</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                    {/* Timeline Items */}
                    <div className="space-y-8">
                        {history.map((record, index) => (
                            <motion.div
                                key={record.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative pl-20"
                            >
                                {/* Timeline Dot */}
                                <div className={`absolute left-5 w-6 h-6 rounded-full border-4 border-white ${getStatusColor(record.status).split(' ')[0]
                                    } shadow-lg flex items-center justify-center`}>
                                    {record.status === 'active' && (
                                        <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
                                    )}
                                </div>

                                {/* Content Card */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-900">{record.batchName}</h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Semester {record.semester} • {record.academicYear}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(record.status)}`}>
                                            {record.status}
                                        </span>
                                    </div>

                                    {/* Timeline Dates */}
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                            </svg>
                                            Joined: {format(record.joinedAt, 'MMM dd, yyyy')}
                                        </div>
                                        {record.leftAt && (
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Left: {format(record.leftAt, 'MMM dd, yyyy')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Performance Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 rounded-lg p-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Tests</p>
                                            <p className="text-lg font-semibold text-gray-900">{record.testsCompleted || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Average %</p>
                                            <p className="text-lg font-semibold text-gray-900">{record.averagePercentage?.toFixed(2) || 'N/A'}%</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Passed</p>
                                            <p className="text-lg font-semibold text-green-600">{record.passCount || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Failed</p>
                                            <p className="text-lg font-semibold text-red-600">{record.failCount || 0}</p>
                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    {record.remarks && (
                                        <div className="pt-4 border-t border-gray-200">
                                            <p className="text-sm text-gray-700">
                                                <span className="font-semibold text-gray-900">Remarks:</span> {record.remarks}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
