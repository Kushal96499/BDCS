import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';
import ToastContainer from '../components/admin/Toast';
import RoleSwitcher from '../components/RoleSwitcher';
import InlineRoleSwitcher from '../components/common/InlineRoleSwitcher';
import UserProfileModal from '../components/UserProfileModal';

export default function TeacherLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Close mobile menu when route changes
    React.useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navItems = [
        {
            name: 'Dashboard',
            path: '/teacher',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },

        {
            name: 'My Batches',
            path: '/teacher/classes',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            name: 'Tests',
            path: '/teacher/tests',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            name: 'Attendance',
            path: '/teacher/attendance',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            )
        },
        {
            name: 'Event Approvals',
            path: '/teacher/events',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            name: 'Bulk Upload',
            path: '/teacher/bulk-upload',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            )
        },
        {
            name: 'Reports',
            path: '/teacher/reports',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            name: 'Audit Logs',
            path: '/teacher/audit-logs',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        }
    ];

    const isActive = (path) => {
        if (location.pathname === '/teacher' && path === '/teacher') return true;
        if (path !== '/teacher' && location.pathname.startsWith(path)) return true;
        return false;
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
                {/* Logo */}
                <div className="h-[72px] flex items-center px-6 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <img src="/assets/biyani-logo.png" alt="BDCS" className="w-9 h-9 object-contain" />
                        {(sidebarOpen || mobileMenuOpen) && (
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-gray-900 leading-none tracking-tight">BDCS</span>
                                <span className="text-[10px] font-bold text-biyani-red uppercase tracking-widest mt-1">Faculty</span>
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

                {/* Nav */}
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
                                    ? 'bg-gradient-to-r from-biyani-red to-red-600 text-white shadow-lg shadow-red-500/20'
                                    : 'text-gray-500 hover:bg-red-50 hover:text-biyani-red'
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

                {/* Bottom Profile */}
                <div className="p-4 border-t border-gray-50 relative">
                    <div className={`rounded-2xl p-4 transition-all ${sidebarOpen ? 'bg-gray-50 border border-gray-100' : 'bg-transparent'}`}>
                        {sidebarOpen ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-biyani-red to-red-700 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white overflow-hidden text-lg">
                                        {user?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate hover:text-biyani-red transition-colors">{user?.name}</p>
                                        <p className="text-xs text-gray-500 truncate font-medium max-w-[120px]">{user?.email}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-biyani-red hover:bg-red-700 rounded-lg transition-all shadow-sm transform active:scale-95"
                                >
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsProfileModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-biyani-red flex items-center justify-center transition-colors mx-auto"
                                title="My Profile"
                            >
                                <span className="font-bold text-xs">{user?.name?.charAt(0)}</span>
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
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
                                <span>Faculty</span>
                                <span className="text-gray-300">/</span>
                                <span className="text-biyani-red">{user?.departmentName || 'Portal'}</span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                {navItems.find(item => isActive(item.path))?.name || 'Dashboard'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <RoleSwitcher />
                        <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-biyani-red to-red-700 border-2 border-gray-100 cursor-pointer hover:border-biyani-red transition-colors relative overflow-hidden shadow-sm flex items-center justify-center text-white font-bold text-lg"
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

            <ToastContainer />
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}
