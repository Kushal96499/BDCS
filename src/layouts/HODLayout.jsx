// ============================================
// BDCS HOD Layout — "Neo-Campus Gen-Z"
// Clean, floating, app-like glassmorphism
// Role: HOD (Emerald Theme with Biyani Red)
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';
import ToastContainer from '../components/admin/Toast';
import UserProfileModal from '../components/UserProfileModal';
import RoleSwitcher from '../components/RoleSwitcher';

const ROLE_THEME = {
    primary: '#059669', // Emerald
    accent: '#E31E24',  // Biyani Red
    bg: '#F8FAF9'
};

const NAV_ITEMS = [
    { name: 'Dashboard', path: '/hod', showInMobileDock: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    )},
    { name: 'Faculty', path: '/hod/teachers', showInMobileDock: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0" />
        </svg>
    )},
    { name: 'Batches', path: '/hod/batches', showInMobileDock: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
    )},
    { name: 'Curriculum', path: '/hod/subjects', showInMobileDock: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
        </svg>
    )},
    { name: 'Event Approvals', path: '/hod/event-approvals', showInMobileDock: false, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    )},
    { name: 'Audit Logs', path: '/hod/audit-logs', showInMobileDock: false, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )}
];

export default function HODLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [scrolled, setScrolled] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavigate = (path) => {
        setMobileDrawerOpen(false);
        navigate(path);
    };

    const isActive = (path) => {
        if (path === '/hod') return location.pathname === '/hod';
        return location.pathname.startsWith(path);
    };

    const currentPageName = NAV_ITEMS.find(item => isActive(item.path))?.name || 'Overview';

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col md:flex-row font-sans text-gray-900 selection:bg-emerald-100 selection:text-emerald-600 overflow-x-hidden w-full">
            <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col z-50 transition-all duration-300">
                <div className="h-full bg-white/80 backdrop-blur-2xl border-r border-gray-100 flex flex-col py-8 shadow-[10px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="px-8 mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center p-1.5 border border-red-50">
                                <img src="/assets/biyani-logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black tracking-tighter text-gray-900 leading-tight">BDCS</h1>
                                <p className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">Dept. Head</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 group relative
                                        ${active ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                                >
                                    {active && (
                                        <motion.div layoutId="nav-active-h" className="absolute left-0 w-1 h-6 bg-red-500 rounded-r-full" />
                                    )}
                                    <div className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 opacity-70'}`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-sm font-bold tracking-tight ${active ? 'font-black text-emerald-700' : ''}`}>
                                        {item.name}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="px-4 mt-auto pt-6 border-t border-gray-50 space-y-4">
                        {/* Session Security Notice */}
                        <div className="px-5 py-3.5 bg-gradient-to-br from-red-500/10 to-transparent rounded-[1.5rem] border border-red-200/20 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-12 h-12 bg-red-400/10 blur-xl rounded-full -mr-6 -mt-6" />
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.15em] leading-none">
                                    Shield Active
                                </p>
                            </div>
                            <p className="text-[9px] font-bold text-red-600/70 leading-relaxed uppercase tracking-tight">
                                Auto-logout after 2 hrs of inactivity
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                if (user?.role === 'student') {
                                    setIsProfileModalOpen(true);
                                }
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all group ${user?.role === 'student' ? 'hover:bg-gray-50' : 'cursor-default'}`}
                        >
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white shadow-sm bg-gray-50 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0 ring-2 ring-transparent group-hover:ring-emerald-50 transition-all uppercase">
                                {user?.name?.[0] || 'H'}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-xs font-black text-gray-900 truncate">{user?.name || 'HOD'}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{user?.departmentName || 'Department Head'}</p>
                            </div>
                        </button>

                        <button
                            onClick={() => auth.signOut().then(() => navigate('/login'))}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all group"
                        >
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-sm font-bold">Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            <header className={`md:hidden fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-2xl border-b border-gray-100 py-3' : 'bg-transparent py-4'}`}>
                <div className="px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-gray-100">
                            <img src="/assets/biyani-logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-none mt-1">{currentPageName}</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <RoleSwitcher />
                        <button onClick={() => setMobileDrawerOpen(true)} className="p-2 text-gray-900 hover:bg-gray-100 rounded-xl transition-colors active:scale-90">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-w-0 w-full md:ml-64 min-h-screen relative flex flex-col">
                <div className="hidden md:flex sticky top-0 z-30 w-full pt-6 pb-2 px-10 pointer-events-none items-center justify-between">
                    <div className="bg-white/60 backdrop-blur-xl px-6 py-2.5 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] pointer-events-auto">
                        <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <span>HOD</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-emerald-600">{currentPageName}</span>
                        </nav>
                    </div>
                    <div className="pointer-events-auto flex items-center gap-4">
                        <RoleSwitcher />
                    </div>
                </div>

                <div className={`w-full ${scrolled ? 'md:pt-4' : 'md:pt-0'} pt-24 pb-12 px-6 md:px-10`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.99, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.99, y: -5 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="max-w-7xl mx-auto"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {mobileDrawerOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-gray-900/80 backdrop-blur-xl z-[2000]"
                                onClick={() => setMobileDrawerOpen(false)}
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 right-0 w-80 bg-white z-[2100] shadow-2xl flex flex-col overflow-hidden"
                            >
                                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Navigation Hub</h3>
                                    <button onClick={() => setMobileDrawerOpen(false)} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400">
                                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>

                                <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
                                    {NAV_ITEMS.map((item) => {
                                        const active = isActive(item.path);
                                        return (
                                            <button
                                                key={item.path}
                                                onClick={() => handleNavigate(item.path)}
                                                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200
                                                    ${active ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <div className={`w-6 h-6 ${active ? 'scale-110' : ''}`}>{item.icon}</div>
                                                <span className={`font-black text-sm tracking-tight ${active ? '' : 'font-bold'}`}>{item.name}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <ToastContainer />
            {isProfileModalOpen && <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
        </div>
    );
}
