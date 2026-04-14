// ============================================
// BDCS - Admin Layout Component
// Main layout with sidebar navigation for admin
// ============================================

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import ToastContainer from '../components/admin/Toast';
import InlineRoleSwitcher from '../components/common/InlineRoleSwitcher';
import RoleSwitcher from '../components/RoleSwitcher';
import UserProfileModal from '../components/UserProfileModal';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Close mobile menu when route changes
    React.useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navItems = [
        {
            name: 'Dashboard',
            path: '/admin',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            name: 'Campuses',
            path: '/admin/campuses',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            )
        },
        {
            name: 'Colleges',
            path: '/admin/colleges',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            name: 'Courses',
            path: '/admin/courses',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            name: 'Departments',
            path: '/admin/departments',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },

        {
            name: 'Users',
            path: '/admin/users',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
        {
            name: 'Audit Logs',
            path: '/admin/audit-logs',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )
        }
    ];

    const isActive = (path) => {
        if (path === '/admin') {
            return location.pathname === '/admin';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="h-screen w-full bg-gray-50/50 flex overflow-hidden font-sans">
            {/* 1. MOBILE BACKDROP (Overlay when menu is open) */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* 2. SIDEBAR (Desktop & Mobile Slide-out) */}
            <aside
                className={`fixed md:static inset-y-0 left-0 flex flex-col h-full bg-white border-r border-gray-100 shadow-[2px_0_20px_rgba(0,0,0,0.02)] transition-all duration-300 z-50 transform 
                ${mobileMenuOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'} 
                ${sidebarOpen ? 'md:w-[260px]' : 'md:w-20'}`}
            >
                {/* Logo Area */}
                <div className="h-[72px] flex items-center px-6 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <img src="/assets/biyani-logo.png" alt="BDCS" className="w-9 h-9 object-contain" />
                        {(sidebarOpen || mobileMenuOpen) && (
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-gray-900 leading-none tracking-tight">BDCS</span>
                                <span className="text-[10px] font-bold text-biyani-red uppercase tracking-widest mt-1">Admin Panel</span>
                            </div>
                        )}
                        {/* Mobile close button inside header */}
                        <button
                            className="md:hidden ml-auto p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-xl"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                    <div className="mb-6">
                        <InlineRoleSwitcher sidebarOpen={sidebarOpen} />
                    </div>

                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
                                    ? 'bg-gradient-to-r from-biyani-red to-orange-600 text-white shadow-lg shadow-red-500/20'
                                    : 'text-gray-500 hover:bg-orange-50 hover:text-biyani-red'
                                    }`}
                            >
                                <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {item.icon}
                                </div>
                                {(sidebarOpen || mobileMenuOpen) && (
                                    <span className={`text-sm font-semibold tracking-wide ${active ? 'text-white' : 'text-gray-600 group-hover:text-biyani-red'}`}>
                                        {item.name}
                                    </span>
                                )}
                                {active && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Profile Section */}
                <div className="p-4 border-t border-gray-50 relative">
                    <div className={`rounded-2xl p-4 transition-all ${(sidebarOpen || mobileMenuOpen) ? 'bg-gray-50 border border-gray-100' : 'bg-transparent'}`}>
                        {(sidebarOpen || mobileMenuOpen) ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white overflow-hidden text-lg">
                                        {user?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate hover:text-gray-600 transition-colors">{user?.name || 'Admin'}</p>
                                        <p className="text-xs text-gray-500 truncate font-medium">{user?.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-gray-800 hover:bg-black rounded-lg transition-all shadow-sm transform active:scale-95"
                                >
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsProfileModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black flex items-center justify-center transition-colors mx-auto"
                                title="My Profile"
                            >
                                <span className="font-bold text-xs">{user?.name?.charAt(0) || '?'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* 3. TOP HEADER */}
                <header className="h-[72px] bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm">
                    {/* Left: Hamburger & Breadcrumbs */}
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <div className="flex flex-col justify-center">
                            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>Admin</span>
                                <span className="text-gray-300">/</span>
                                <span className="text-gray-600">Control Panel</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                {navItems.find(item => isActive(item.path))?.name || 'Dashboard'}
                            </h2>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4">
                        <RoleSwitcher />
                        <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-100 cursor-pointer hover:border-gray-500 transition-colors relative overflow-hidden shadow-sm flex items-center justify-center text-white font-bold text-lg"
                            onClick={() => setIsProfileModalOpen(true)}
                        >
                            {user?.name?.charAt(0) || '?'}
                        </div>
                    </div>
                </header>

                {/* 4. SCROLLABLE CONTENT */}
                <main className="flex-1 overflow-y-auto bg-gray-50/50 p-0 sm:p-4 md:p-6 pb-20 md:pb-6">
                    <Outlet />
                </main>
            </div>

            {/* Toast Notifications */}
            <ToastContainer />

            {/* Profile Modal */}
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}
