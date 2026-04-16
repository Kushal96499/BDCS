// ============================================
// BDCS Student Layout — "Neo-Campus Gen-Z"
// Clean, floating, app-like glassmorphism
// Mobile: Bottom Floating Dock | Desktop: Floating Left Pill
// ============================================

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';
import ToastContainer from '../components/admin/Toast';
import { isBacklogStudent } from '../services/batchPromotionService';

// ── NAVIGATION MAP ──
const NAV_ITEMS = [
    {
        name: 'Home', path: '/student', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )
    },
    {
        name: 'Attendance', path: '/student/attendance', showInMobileDock: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        )
    },
    {
        name: 'Results', path: '/student/test-history', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        )
    },
    {
        name: 'Projects', path: '/student/projects', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        )
    },
    {
        name: 'Events', path: '/student/events', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        name: 'Council', path: '/student/council', showInMobileDock: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )
    },
    {
        name: 'Directory', path: '/student/directory', showInMobileDock: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5z" />
                <circle cx="12" cy="9" r="2" />
                <path d="M8.5 17c0-2 1.567-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
            </svg>
        )
    },
    {
        name: 'Profile', path: '/student/profile', showInMobileDock: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )
    },
];

const RESTRICTED_ITEMS = ['Attendance', 'Projects', 'Results'];

export default function StudentLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isBacklog = isBacklogStudent(user);

    const [scrolled, setScrolled] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileDrawerOpen(false);
    }, [location.pathname]);

    const handleNavigate = (path, restricted = false) => {
        if (restricted) return;
        setMobileDrawerOpen(false);
        navigate(path);
    };

    const isActive = (path) => {
        if (path === '/student') return location.pathname === '/student';
        return location.pathname.startsWith(path);
    };

    const currentPage = NAV_ITEMS.find(item => isActive(item.path))?.name || 'Dashboard';
    const mobileMenuItems = NAV_ITEMS.filter(i => i.showInMobileDock).slice(0, 4);

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col md:flex-row font-sans text-gray-900 selection:bg-red-100 selection:text-red-500 overflow-x-hidden w-full">
            {/* Subtle textured noise background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            {/* ── DESKTOP SIDE DOCK ───────────────────────────────── */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-28 flex-col items-center py-8 z-50 pointer-events-none">
                <div className="bg-white/70 backdrop-blur-3xl border border-white shadow-[0_8px_32px_rgba(227,30,36,0.06)] rounded-[2.5rem] flex flex-col items-center py-6 px-3 h-full max-h-[90vh] my-auto pointer-events-auto transition-all">

                    {/* Logo Plate */}
                    <button onClick={() => navigate('/student')} className="mb-8 relative group">
                        <div className="absolute inset-0 bg-[#E31E24]/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="w-12 h-12 bg-white rounded-[1.2rem] shadow-sm flex items-center justify-center p-1.5 border border-red-50 group-hover:scale-105 active:scale-95 transition-transform">
                            <img src="/assets/biyani-logo.png" alt="BDCS" className="w-full h-full object-contain" />
                        </div>
                    </button>

                    {/* Nav Items */}
                    <nav className="flex-1 flex flex-col items-center gap-3 w-full">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item.path);
                            const restricted = isBacklog && RESTRICTED_ITEMS.includes(item.name);

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path, restricted)}
                                    className={`relative w-14 h-14 rounded-[1.3rem] flex items-center justify-center transition-all duration-300 group
                                        ${restricted ? 'text-gray-200 cursor-not-allowed opacity-40' :
                                        active ? 'bg-gradient-to-br from-[#E31E24] to-red-600 text-white shadow-lg shadow-red-200/50 scale-105' :
                                            'text-gray-400 hover:bg-red-50/50 hover:text-[#E31E24]'}`}
                                >
                                    {/* Tooltip */}
                                    <span className="absolute left-16 bg-gray-900 text-white text-[11px] font-black px-3.5 py-2 rounded-xl opacity-0 -translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl tracking-widest uppercase z-50 whitespace-nowrap">
                                        {restricted ? `${item.name} 🔒` : item.name}
                                    </span>
                                    {active && (
                                        <motion.div layoutId="active-dot" className="absolute -left-2 w-1.5 h-6 bg-[#E31E24] rounded-r-full shadow-[2px_0_8px_rgba(227,30,36,0.4)]" />
                                    )}
                                    <div className={`w-[22px] h-[22px] transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:rotate-6 group-hover:scale-110'}`}>
                                        {item.icon}
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Bottom Logout */}
                    <button
                        onClick={() => auth.signOut().then(() => navigate('/login'))}
                        className="mt-auto pt-4 w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 group shrink-0"
                    >
                        <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* ── MOBILE TOP BAR ──────────────────────────────────── */}
            <header className={`md:hidden fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-2xl border-b border-gray-100 shadow-sm py-2' : 'bg-transparent py-3'}`}>
                <div className="px-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-gray-100">
                            <img src="/assets/biyani-logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">{currentPage}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => navigate('/student/profile')}
                            className="w-9 h-9 rounded-xl overflow-hidden border border-white shadow-md bg-gray-100 flex items-center justify-center text-[#E31E24] font-black text-xs shrink-0 ring-1 ring-gray-100 active:scale-90 transition-transform"
                        >
                            {user?.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user?.name?.[0] || 'S'}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ─────────────────────────────────────── */}
            <main className="flex-1 min-w-0 w-full md:ml-32 min-h-screen relative md:pr-4 flex flex-col">

                {/* Desktop Top Header */}
                <div className="hidden md:flex sticky top-0 z-30 w-full pt-6 pb-2 px-8 pointer-events-none items-center justify-between">
                    <div className="bg-[#E31E24]/5 px-4 py-2 rounded-[1rem] border border-[#E31E24]/10 backdrop-blur-md pointer-events-auto">
                        <h2 className="text-[11px] font-black text-[#E31E24] tracking-[0.25em] uppercase">{currentPage}</h2>
                    </div>
                </div>

                {/* Content Container */}
                <div className={`w-full ${scrolled ? 'md:pt-4' : 'md:pt-0'} pt-24 pb-36 md:pb-10`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>

            </main>

            {/* ── MOBILE BOTTOM NAV (FLOATING DOCK) ──────────────────────────────── */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[400px]">
                <div className="bg-white/90 backdrop-blur-3xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-2xl px-2 py-2.5 flex items-center justify-around pointer-events-auto">
                    {mobileMenuItems.map((item) => {
                        const active = isActive(item.path);
                        const restricted = isBacklog && RESTRICTED_ITEMS.includes(item.name);

                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavigate(item.path, restricted)}
                                className="relative flex flex-col items-center justify-center min-w-[50px] transition-all py-1"
                            >
                                <div className={`relative z-10 transition-all duration-300
                                    ${active ? 'text-[#E31E24] scale-110' : 
                                      restricted ? 'text-gray-200 opacity-40' : 'text-gray-400 hover:text-gray-600'}
                                `}>
                                    <div className="w-[20px] h-[20px] mx-auto active:scale-90">{item.icon}</div>
                                    <span className={`text-[7px] font-black uppercase tracking-widest mt-1 transition-all absolute left-1/2 -translate-x-1/2 whitespace-nowrap ${active ? 'opacity-100' : 'opacity-0'}`}>{item.name.split(' ')[0]}</span>
                                </div>

                                {active && (
                                    <motion.div layoutId="active-bar-student" className="absolute -bottom-1 w-1 h-1 bg-[#E31E24] rounded-full" />
                                )}
                            </button>
                        );
                    })}

                    {/* Menu trigger */}
                    <button
                        onClick={() => setMobileDrawerOpen(true)}
                        className="relative flex flex-col items-center justify-center min-w-[50px] text-gray-400 hover:text-gray-600 active:scale-95 transition-transform"
                    >
                        <div className="w-[20px] h-[20px] mx-auto">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                            </svg>
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-widest mt-1">More</span>
                    </button>
                </div>
            </div>

            {/* ── MOBILE MENU DRAWER (Lifted outside backdrop-blur to fix fixed positioning) ── */}
            <AnimatePresence>
                {mobileDrawerOpen && (
                    <div className="md:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                            onClick={() => setMobileDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.05}
                            onDragEnd={(e, { offset, velocity }) => {
                                if (offset.y > 100 || velocity.y > 500) {
                                    setMobileDrawerOpen(false);
                                }
                            }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-[110] p-6 pb-12 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] pointer-events-auto"
                        >
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">More Options</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {NAV_ITEMS.filter(i => !i.showInMobileDock).map(item => {
                                    const restricted = isBacklog && RESTRICTED_ITEMS.includes(item.name);
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => handleNavigate(item.path, restricted)}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border ${restricted ? 'border-gray-100 bg-gray-50/50 opacity-50' : 'border-gray-100 bg-white active:bg-gray-50'} transition-colors`}
                                        >
                                            <div className="text-[#E31E24] w-5 h-5">{item.icon}</div>
                                            <span className="font-bold text-sm tracking-tight">{item.name}</span>
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => auth.signOut().then(() => navigate('/login'))}
                                    className="flex items-center gap-3 p-4 rounded-2xl border border-red-100 bg-red-50/50 active:bg-red-100 col-span-2 text-red-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="font-bold text-sm tracking-tight">Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ToastContainer />
        </div>
    );
}

// ── COMPONENT: MOBILE MENU DRAWER ──
function MobileMenuDrawer() {
    return null; // Deprecated, state lifted to parent
}

