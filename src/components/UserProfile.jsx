// ============================================
// BDCS - User Profile Component
// Shared profile component for all roles
// ============================================

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import StatusBadge from './admin/StatusBadge';

export default function UserProfile() {
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="p-6">
                <p className="text-gray-500">Loading profile...</p>
            </div>
        );
    }

    const roleLabels = {
        admin: 'Administrator',
        director: 'Director',
        principal: 'Principal',
        hod: 'Head of Department',
        teacher: 'Teacher',
        student: 'Student',
        exam_cell: 'Exam Cell',
        placement: 'Placement Officer',
        hr: 'HR Manager'
    };

    const isStudent = user.role === 'student';
    const isStaff = !isStudent && user.role !== 'admin';

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-600 mt-1">View and manage your personal information</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Header Section with Gradient */}
                <div className="bg-gradient-to-r from-biyani-red to-red-700 px-6 py-8 text-white">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{user.name}</h2>
                            <p className="text-red-100 mt-1">{roleLabels[user.role] || user.role}</p>
                        </div>
                    </div>
                </div>

                {/* Profile Information */}
                <div className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Full Name</label>
                                <p className="text-gray-900 mt-1">{user.name || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Email</label>
                                <p className="text-gray-900 mt-1">{user.email || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Phone</label>
                                <p className="text-gray-900 mt-1">{user.phone || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Status</label>
                                <div className="mt-1">
                                    <StatusBadge status={user.status} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ID Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Identification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isStudent ? (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Enrollment Number</label>
                                        <p className="text-gray-900 mt-1 font-mono">{user.enrollmentNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Current Semester</label>
                                        <p className="text-gray-900 mt-1">Semester {user.currentSemester || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Academic Year</label>
                                        <p className="text-gray-900 mt-1">{user.academicYear || 'N/A'}</p>
                                    </div>
                                </>
                            ) : isStaff ? (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Employee ID</label>
                                        <p className="text-gray-900 mt-1 font-mono">{user.employeeId || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Designation</label>
                                        <p className="text-gray-900 mt-1">{user.designation || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Joining Date</label>
                                        <p className="text-gray-900 mt-1">
                                            {user.joiningDate?.toDate ? user.joiningDate.toDate().toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* Scope Information */}
                    {user.role !== 'admin' && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {user.campusName && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Campus</label>
                                        <p className="text-gray-900 mt-1">{user.campusName}</p>
                                    </div>
                                )}
                                {user.collegeName && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">College</label>
                                        <p className="text-gray-900 mt-1">{user.collegeName}</p>
                                    </div>
                                )}
                                {user.departmentName && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Department</label>
                                        <p className="text-gray-900 mt-1">{user.departmentName}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Address */}
                    {user.address && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
                            <p className="text-gray-900">{user.address}</p>
                        </div>
                    )}

                    {/* Account Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Account Created</label>
                                <p className="text-gray-900 mt-1">
                                    {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Last Login</label>
                                <p className="text-gray-900 mt-1">
                                    {user.lastLogin?.toDate ? user.lastLogin.toDate().toLocaleString() : 'Never'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-blue-800">Profile Updates</p>
                        <p className="text-sm text-blue-700 mt-1">
                            To update your profile information, please contact your system administrator.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
