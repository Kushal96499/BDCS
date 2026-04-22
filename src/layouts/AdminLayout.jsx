// ============================================
// BDCS Admin Layout — "Neo-Campus Gen-Z"
// Clean, floating, app-like glassmorphism
// Mobile: Bottom Floating Dock | Desktop: Floating Left Pill
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';
import ToastContainer from '../components/admin/Toast';

// ── NAVIGATION MAP ──
const NAV_ITEMS = [
    {
        name: 'Dashboard', path: '/admin', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6" />
            </svg>
        )
    },
    {
        name: 'Campuses', path: '/admin/campuses', showInMobileDock: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
            </svg>
        )
    },
    {
        name: 'Colleges', path: '/admin/colleges', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        )
    },
    {
        name: 'Courses', path: '/admin/courses', showInMobileDock: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1.707.293l5.414 5.414a1 1 0 0 1.293.707V19a2 2 0 0 1-2 2z" />
            </svg>
        )
    },
    {
        name: 'Departments', path: '/admin/departments', showInMobileDock: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
            </svg>
        )
    },
    {
        name: 'Users', path: '/admin/users', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
            </svg>
        )
    },
    {
        name: 'Audit Logs', path: '/admin/audit-logs', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        )
    }
];

export default function AdminLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [scrolled, setScrolled] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ── AGGRESSIVE BODY SCROLL LOCK ─────────────────────────────────
    useEffect(() => {
        if (mobileDrawerOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflowY = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
            document.body.style.touchAction = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
    }, [mobileDrawerOpen]);

    useEffect(() => {
        setMobileDrawerOpen(false);
    }, [location.pathname]);

    const handleNavigate = (path) => {
        setMobileDrawerOpen(false);
        navigate(path);
    };

    const toggleMobileDrawer = (open) => {
        setMobileDrawerOpen(open);
    };

    const isActive = (path) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname.startsWith(path);
    };

    const currentPage = NAV_ITEMS.find(item => isActive(item.path))?.name || 'Dashboard';

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col md:flex-row font-sans text-gray-900 selection:bg-red-100 selection:text-red-500 overflow-x-hidden w-full">
            <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            {/* ── DESKTOP/TABLET SIDEBAR ────────────────────────────── */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 xl:w-64 md:w-20 lg:w-20 flex-col z-50 transition-all duration-300">
                <div className="h-full bg-white/80 backdrop-blur-2xl border-r border-gray-100 flex flex-col py-8 shadow-[10px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="px-5 xl:px-8 mb-10 flex items-center justify-center xl:justify-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center p-1.5 border border-red-50 shrink-0">
                                <img src="/assets/biyani-logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="hidden xl:block">
                                <h1 className="text-sm font-black tracking-tighter text-gray-900 leading-tight">BDCS</h1>
                                <p className="text-[10px] font-bold text-[#E31E24] tracking-widest uppercase">Admin</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-3 xl:px-4 space-y-1.5 overflow-y-auto no-scrollbar items-center xl:items-start flex flex-col">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 group relative
                                        ${active ? 'bg-red-50 text-[#E31E24]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                                >
                                    {active && (
                                        <motion.div layoutId="nav-active" className="absolute left-0 w-1 h-6 bg-[#E31E24] rounded-r-full" />
                                    )}
                                    <div className={`w-5 h-5 shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 opacity-70'}`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-sm font-bold tracking-tight hidden xl:block ${active ? 'font-black' : ''}`}>
                                        {item.name}
                                    </span>

                                    {/* Tooltip for Rail Mode */}
                                    <div className="absolute left-16 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 -translate-x-4 group-hover:translate-x-0 lg:group-hover:opacity-100 xl:group-hover:hidden transition-all pointer-events-none whitespace-nowrap uppercase tracking-widest z-[100]">
                                        {item.name}
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="px-3 xl:px-4 mt-auto pt-6 border-t border-gray-50 space-y-4 flex flex-col items-center xl:items-start">
                        <div
                            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl justify-center xl:justify-start"
                        >
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white shadow-sm bg-gray-50 flex items-center justify-center text-[#E31E24] font-black text-xs shrink-0 transition-all uppercase">
                                {user?.name?.[0] || 'A'}
                            </div>
                            <div className="hidden xl:block flex-1 text-left min-w-0">
                                <p className="text-xs font-black text-gray-900 truncate">{user?.name || 'Admin'}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{user?.role === 'admin' ? 'Root Admin' : 'Admin'}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => auth.signOut().then(() => navigate('/login'))}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all group justify-center xl:justify-start"
                        >
                            <svg className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-sm font-bold hidden xl:block">Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MOBILE NAVBAR ─────────────────────────────────────── */}
            <header className={`md:hidden fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-2xl border-b border-gray-100 py-3' : 'bg-[#FDFCFB]/80 backdrop-blur-md py-4'}`}>
                <div className="px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-gray-100">
                            <img src="/assets/biyani-logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] leading-none mb-1">{currentPage}</h2>
                            <p className="text-[7px] font-bold text-red-600 uppercase tracking-widest opacity-60">System Admin</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-black text-[10px] border border-red-100">
                            {user?.name?.[0]}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ────────────────────────────────────────── */}
            <main className="flex-1 min-w-0 w-full md:ml-20 lg:ml-20 xl:ml-64 min-h-screen relative flex flex-col transition-all duration-300">
                <div className="hidden md:flex sticky top-0 z-30 w-full pt-6 pb-2 px-10 pointer-events-none items-center justify-between">
                        <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-auto bg-white/60 backdrop-blur-xl px-6 py-2.5 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <span>Admin</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-[#E31E24]">{currentPage}</span>
                        </nav>
                </div>

                <div className={`w-full ${scrolled ? 'md:pt-4' : 'md:pt-0'} pt-24 pb-32 md:pb-12 px-4 sm:px-6 md:px-10 overflow-x-hidden`}>
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

            {/* ── MOBILE NAV DOCK (Native App Feel) ─────────────────── */}
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
                <nav className="w-full bg-white/90 backdrop-blur-2xl border border-gray-100 px-6 py-4 rounded-3xl flex items-center justify-between shadow-[0_15px_50px_rgba(0,0,0,0.1)]">
                    {NAV_ITEMS.filter(i => i.showInMobileDock).map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavigate(item.path)}
                                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-red-600' : 'text-gray-400'}`}
                            >
                                <div className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'active:scale-90'}`}>
                                    {item.icon}
                                </div>
                                <span className={`text-[8px] font-bold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{item.name}</span>
                            </button>
                        )
                    })}
                    <button 
                        onClick={() => toggleMobileDrawer(true)}
                        className="flex flex-col items-center gap-1.5 text-gray-400"
                    >
                        <div className="w-5 h-5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Menu</span>
                    </button>
                </nav>
            </div>

            {/* ── MOBILE DRAWER ─────────────────────────────────────── */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {mobileDrawerOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-gray-900/80 backdrop-blur-xl z-[2000] touch-none"
                                onClick={() => toggleMobileDrawer(false)}
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 right-0 w-[85%] bg-white z-[2100] shadow-2xl flex flex-col overflow-hidden rounded-l-[2.5rem]"
                            >
                                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center p-1 border border-red-100">
                                            <img src="/assets/biyani-logo.png" className="w-full h-full object-contain" alt="" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Admin Hub</h3>
                                    </div>
                                    <button onClick={() => toggleMobileDrawer(false)} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 active:scale-90 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>

                                <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar overscroll-contain">
                                    {NAV_ITEMS.map((item) => {
                                        const active = isActive(item.path);
                                        return (
                                            <button
                                                key={item.path}
                                                onClick={() => handleNavigate(item.path)}
                                                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200
                                                    ${active ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <div className={`w-6 h-6 ${active ? 'scale-110' : ''}`}>{item.icon}</div>
                                                <span className={`font-black text-sm tracking-tight ${active ? '' : 'font-bold'}`}>{item.name}</span>
                                            </button>
                                        );
                                    })}
                                </nav>

                                <div className="p-8 border-t border-gray-50 bg-gray-50/30 space-y-4">
                                     <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-black uppercase text-sm border border-red-100">
                                            {user?.name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-gray-900 tracking-tight">{user?.name}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">System Administrator</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => auth.signOut().then(() => navigate('/login'))}
                                        className="w-full flex items-center justify-center gap-4 py-5 rounded-2xl bg-white border-2 border-red-50 text-red-600 transition-all font-black text-sm shadow-sm active:scale-95 group"
                                    >
                                        <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>Logout Securely</span>
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <ToastContainer />
        </div>
    );
}

