// ============================================
// BDCS - Account Settings Page
// Read-only institutional identity for staff roles
// (Teacher, HOD, Principal, Admin, etc.)
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from '../components/admin/Toast';

export default function AccountSettings() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [changingPassword, setChangingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Redirect student to their profile page
    useEffect(() => {
        if (!loading && user) {
            const activeRole = user.currentActiveRole || user.role;
            if (activeRole === 'student') {
                navigate('/student/profile', { replace: true });
            }
        }
    }, [user, loading, navigate]);

    // Fetch assigned subjects for teachers/HODs
    useEffect(() => {
        if (user?.uid && (user.role === 'teacher' || user.role === 'hod')) {
            fetchAssignedSubjects();
        }
    }, [user?.uid, user?.role]);

    const fetchAssignedSubjects = async () => {
        setLoadingSubjects(true);
        try {
            const q = query(
                collection(db, 'subjects'),
                where('teacherId', '==', user.uid)
            );
            const snap = await getDocs(q);
            setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Error fetching subjects:', err);
        } finally {
            setLoadingSubjects(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await updatePassword(auth.currentUser, passwordData.newPassword);
            toast.success('Password changed successfully');
            setShowPasswordForm(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (err) {
            console.error('Password change error:', err);
            if (err.code === 'auth/requires-recent-login') {
                toast.error('Please log out and log back in before changing your password');
            } else {
                toast.error('Failed to change password');
            }
        } finally {
            setChangingPassword(false);
        }
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Administrator',
            director: 'Director',
            principal: 'Principal',
            hod: 'Head of Department',
            teacher: 'Teacher',
            exam_cell: 'Exam Cell',
            placement: 'Placement Officer',
            hr: 'Human Resources'
        };
        return labels[role] || role;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-[#E31E24] rounded-full animate-spin" />
            </div>
        );
    }

    const activeRole = user?.currentActiveRole || user?.role;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24" style={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Institutional identity & account management</p>
            </div>

            {/* ── IDENTITY CARD ── */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 overflow-hidden">
                <div className="h-1.5 bg-[#E31E24]" />
                <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt={user.name} className="w-full h-full rounded-lg object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-gray-400">{user?.name?.charAt(0) || '?'}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900">{user?.name || '—'}</h2>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                            <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#E31E24]/10 text-[#E31E24]">
                                {getRoleLabel(activeRole)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── INSTITUTIONAL INFORMATION ── */}
            <SectionCard title="Institutional Information" icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            }>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    <ReadOnlyField label="Full Name" value={user?.name} />
                    <ReadOnlyField label="Employee ID" value={user?.employeeId || user?.collegeId || user?.uid?.slice(0, 8)} mono />
                    <ReadOnlyField label="Designation" value={getRoleLabel(activeRole)} />
                    <ReadOnlyField label="Department" value={user?.departmentName || user?.departmentId || '—'} />
                    <ReadOnlyField label="Campus" value={user?.collegeName || 'Biyani Group of Colleges'} />
                    <ReadOnlyField label="Email" value={user?.email} />
                </div>
            </SectionCard>

            {/* ── ASSIGNED SUBJECTS (Teachers / HODs) ── */}
            {(activeRole === 'teacher' || activeRole === 'hod') && (
                <SectionCard title="Assigned Subjects" icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                }>
                    {loadingSubjects ? (
                        <div className="py-6 flex justify-center">
                            <div className="w-5 h-5 border-2 border-gray-300 border-t-[#E31E24] rounded-full animate-spin" />
                        </div>
                    ) : subjects.length > 0 ? (
                        <div className="space-y-2">
                            {subjects.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{sub.name || sub.subjectName || '—'}</p>
                                        <p className="text-xs text-gray-400">{sub.code || ''} {sub.batchName ? `• ${sub.batchName}` : ''}</p>
                                    </div>
                                    {sub.credits && (
                                        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{sub.credits} Cr</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No subjects currently assigned." />
                    )}
                </SectionCard>
            )}

            {/* ── CHANGE PASSWORD ── */}
            <SectionCard title="Security" icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            }>
                {!showPasswordForm ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Password</p>
                            <p className="text-xs text-gray-400">Change your login password</p>
                        </div>
                        <button
                            onClick={() => setShowPasswordForm(true)}
                            className="px-4 py-2 text-xs font-bold text-[#E31E24] bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                            Change Password
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E31E24]/20 focus:border-[#E31E24]"
                                    placeholder="Minimum 8 characters"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E31E24]/20 focus:border-[#E31E24]"
                                placeholder="Re-enter password"
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={changingPassword}
                                className="px-5 py-2 text-xs font-bold text-white bg-[#E31E24] hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {changingPassword ? 'Saving...' : 'Save Password'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowPasswordForm(false); setPasswordData({ newPassword: '', confirmPassword: '' }); }}
                                className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </SectionCard>

            {/* ── RESTRICTIONS NOTICE ── */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Identity fields are read-only</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Name, designation, department, campus, and role can only be modified by an administrator or HOD.
                            Contact your institution's admin for any corrections.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}


// ─── SUB-COMPONENTS ──────────────────────────────────────────────

function SectionCard({ title, icon, children }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 overflow-hidden">
            <div className="px-5 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
            </div>
            <div className="p-5 sm:p-6">
                {children}
            </div>
        </div>
    );
}

function ReadOnlyField({ label, value, mono }) {
    return (
        <div className="flex flex-col py-2 border-b border-gray-50 last:border-0">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</span>
            <span className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>
                {value || '—'}
            </span>
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="text-center py-6 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
            <p className="text-sm text-gray-400 font-medium">{message}</p>
        </div>
    );
}
