// ============================================
// BDCS - Relieved Member Dashboard
// Main view for alumni/relieved staff
// ============================================

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

export default function RelievedDashboard() {
    const { user } = useAuth();

    // Default values if data missing
    // Schema update: consuming flat fields relievedAt/relievedBy instead of nested lifecycleMetadata
    const relievedDateRaw = user?.relievedAt || user?.lifecycleMetadata?.relievedDate;
    const relievedDate = relievedDateRaw
        ? (relievedDateRaw.toDate ? relievedDateRaw.toDate() : new Date(relievedDateRaw))
        : new Date();

    const joiningDate = user?.joiningDate
        ? (user.joiningDate.toDate ? user.joiningDate.toDate() : new Date(user.joiningDate))
        : null;

    // Calculate tenure roughly
    const tenureYears = joiningDate
        ? ((relievedDate - joiningDate) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
        : 'N/A';

    return (
        <div className="space-y-6">
            {/* Welcome / Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-8 text-white">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                            <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-4xl font-bold text-gray-500">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-bold">{user?.name}</h2>
                            <p className="text-gray-300 text-lg mt-1">{user?.designation || 'Former Staff Member'}</p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm backdrop-blur-sm">
                                    Last Role: {user?.previousRole?.toUpperCase() || user?.role?.toUpperCase()}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm backdrop-blur-sm">
                                    EMP ID: {user?.employeeId || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <div className="text-center p-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Joined Organization</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                            {joiningDate ? format(joiningDate, 'MMMM d, yyyy') : 'N/A'}
                        </p>
                    </div>
                    <div className="text-center p-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Relieved On</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                            {format(relievedDate, 'MMMM d, yyyy')}
                        </p>
                    </div>
                    <div className="text-center p-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Service</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{tenureYears} Years</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Documents & Certificates */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-biyani-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Exit Documents
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-red-50 transition-colors cursor-pointer border border-gray-100 hover:border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-100 p-2 rounded text-red-600">PDF</div>
                                <div>
                                    <p className="font-medium text-gray-900">Experience Certificate</p>
                                    <p className="text-xs text-gray-500">Official Letterhead</p>
                                </div>
                            </div>
                            <button className="text-gray-400 group-hover:text-red-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-red-50 transition-colors cursor-pointer border border-gray-100 hover:border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-100 p-2 rounded text-red-600">PDF</div>
                                <div>
                                    <p className="font-medium text-gray-900">Relieving Letter</p>
                                    <p className="text-xs text-gray-500">Service Confirmation</p>
                                </div>
                            </div>
                            <button className="text-gray-400 group-hover:text-red-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </div>
                        {/* More docs placeholder */}
                    </div>
                </div>

                {/* Account Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Account Status Details
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Relieved By</p>
                            {/* Use flat field or fallback to metadata */}
                            <p className="font-medium">{user?.relievedBy || user?.lifecycleMetadata?.relievedBy ? 'Administrative Action' : 'System'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Reason</p>
                            <p className="font-medium capitalize">{user?.relievedReason || user?.lifecycleMetadata?.relievedReason || 'End of Service'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Successor Assigned</p>
                            <p className="font-medium">
                                {user?.successorId || user?.lifecycleMetadata?.successorId ? 'Yes' : 'No / Not Applicable'}
                            </p>
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500 italic">
                                Note: As a relieved member, you retain access to your personal service history.
                                For any discrepancies, please contact the Administration or HR Department.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
