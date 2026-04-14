// ============================================
// BDCS - Relieved Member Portal Layout
// Simplified layout for alumni/relieved staff (Read-Only)
// ============================================

import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function RelievedLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Minimal Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Logo & Branding */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-biyani-red to-red-800 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                BDCS
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 tracking-tight">Biyani Digital Campus</h1>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-biyani-red tracking-wide uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                        Alumni / Relieved Portal
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* User Actions */}
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                <p className="text-xs text-gray-500">Former {user?.role?.toUpperCase()}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center text-gray-600 font-bold overflow-hidden">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Logout"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Status Banner */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <span className="font-bold">Read-Only Access:</span> Your account is in relieved status. You can view your service history and download documents, but cannot make changes to the system.
                            </p>
                        </div>
                    </div>
                </div>

                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">© 2024 Biyani Digital Campus System. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-sm text-gray-500 hover:text-biyani-red">Contact Admin</a>
                        <a href="#" className="text-sm text-gray-500 hover:text-biyani-red">Alumni Association</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
