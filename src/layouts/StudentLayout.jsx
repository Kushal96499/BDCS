// ============================================
// BDCS Student Layout
// Institutional Premium
// ============================================

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';
import ToastContainer from '../components/admin/Toast';
import { isBacklogStudent } from '../services/batchPromotionService';

const NAV_ITEMS = [
    {
        name: 'Home', path: '/student',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" />
            </svg>
        )
    },
    {
        name: 'Attendance', path: '/student/attendance',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
            </svg>
        )
    },
    {
        name: 'Results', path: '/student/test-history',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M12 18v-6" /><path d="M8 15v-3" /><path d="M16 18v-2" />
            </svg>
        )
    },
    {
        name: 'Projects', path: '/student/projects',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-0.5-5" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M12 8V2" />
            </svg>
        )
    },
    {
        name: 'Explore', path: '/student/events',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 14.14 14.14" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M20 12h2" /><path d="M2 12h2" />
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

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path) => path === '/student' ? location.pathname === '/student' : location.pathname.startsWith(path);
    
    const handleNavigate = (path) => {
        const restricted = isBacklog && RESTRICTED_ITEMS.includes(NAV_ITEMS.find(i => i.path === path)?.name);
        if (!restricted) {
            navigate(path);
        }
    };

    const currentPage = NAV_ITEMS.find(item => isActive(item.path))?.name || 'Dashboard';

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col md:flex-row font-sans text-gray-900 selection:bg-red-50 selection:text-[#E31E24] overflow-x-hidden w-full">
            <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            {/* ── DESKTOP/TABLET SIDEBAR ────────────────────────────── */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 xl:w-64 md:w-20 lg:w-20 flex-col z-50 transition-all duration-300">
                <div className="h-full bg-white/80 backdrop-blur-2xl border-r border-[#0F172A]/5 flex flex-col py-8 shadow-[10px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="px-5 xl:px-8 mb-10 flex items-center justify-center xl:justify-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center p-1.5 border border-[#E31E24]/10 shrink-0">
                                <img src="/assets/biyani-logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="hidden xl:block">
                                <h1 className="text-sm font-black tracking-tighter text-gray-900 leading-tight">BDCS</h1>
                                <p className="text-[10px] font-bold text-[#E31E24] tracking-widest uppercase">Student</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 px-3 xl:px-4 space-y-2 overflow-y-auto no-scrollbar items-center xl:items-start flex flex-col">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item.path);
                            const restricted = isBacklog && RESTRICTED_ITEMS.includes(item.name);
                            
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group relative
                                        ${restricted ? 'opacity-40 cursor-not-allowed' :
                                        active ? 'bg-red-50 text-[#E31E24]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    {active && (
                                        <motion.div layoutId="active-nav-bead" className="absolute left-0 w-1 h-6 bg-[#E31E24] rounded-r-full" />
                                    )}
                                    <div className={`w-5 h-5 shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-sm font-bold tracking-tight hidden xl:block ${active ? 'font-black' : ''}`}>
                                        {item.name}
                                    </span>

                                    {/* Tooltip for Rail Mode */}
                                    <div className="absolute left-16 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-lg opacity-0 -translate-x-4 group-hover:translate-x-0 lg:group-hover:opacity-100 xl:group-hover:hidden transition-all pointer-events-none whitespace-nowrap uppercase tracking-widest z-[100]">
                                        {item.name} {restricted && '(Restricted)'}
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="px-3 xl:px-4 mt-auto pt-6 border-t border-slate-50 flex flex-col items-center xl:items-start space-y-4">
                        <button
                            onClick={() => navigate('/student/profile')}
                            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl transition-all group hover:bg-slate-50 justify-center xl:justify-start"
                        >
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white shadow-sm bg-slate-50 flex items-center justify-center text-[#E31E24] font-black text-xs shrink-0 transition-all">
                                {user?.name?.[0]}
                            </div>
                            <div className="hidden xl:block flex-1 text-left min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{user?.name?.split(' ')[0]}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">My Account</p>
                            </div>
                        </button>

                        <button
                            onClick={() => auth.signOut().then(() => navigate('/login'))}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all group justify-center xl:justify-start"
                        >
                            <svg className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-sm font-bold hidden xl:block">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MOBILE NAVBAR ─────────────────────────────────────── */}
            <header className={`md:hidden fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-2xl border-b border-[#0F172A]/5 py-3' : 'bg-[#FDFCFB]/80 backdrop-blur-md py-4'}`}>
                <div className="px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center p-1.5 border border-slate-100">
                            <img src="/assets/biyani-logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">{currentPage}</h2>
                            <p className="text-[7px] font-bold text-[#E31E24] uppercase tracking-widest opacity-60">Student Hub</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/student/profile')} className="w-8 h-8 rounded-lg bg-red-50 text-[#E31E24] flex items-center justify-center font-black text-[10px] border border-red-100 active:scale-90 transition-transform">
                            {user?.name?.[0]}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ────────────────────────────────────────── */}
            <main className="flex-1 min-w-0 w-full md:ml-20 lg:ml-20 xl:ml-64 min-h-screen relative flex flex-col transition-all duration-500">
                <header className="hidden md:flex sticky top-0 z-30 w-full pt-6 pb-2 px-10 pointer-events-none items-center justify-between">
                        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-auto bg-white/60 backdrop-blur-xl px-6 py-2.5 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <span>Campus</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[#E31E24]">{currentPage}</span>
                        </nav>
                </header>

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
                <nav className="w-full bg-white/90 backdrop-blur-2xl border border-[#0F172A]/5 px-6 py-4 rounded-3xl flex items-center justify-between shadow-[0_15px_50px_rgba(0,0,0,0.1)]">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.path);
                        const restricted = isBacklog && RESTRICTED_ITEMS.includes(item.name);
                        
                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavigate(item.path)}
                                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${restricted ? 'opacity-30' : active ? 'text-[#E31E24]' : 'text-slate-400'}`}
                            >
                                <div className={`w-5 h-5 transition-transform duration-300 ${active ? 'scale-110' : 'active:scale-90'}`}>
                                    {item.icon}
                                </div>
                                <span className={`text-[8px] font-bold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{item.name}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <ToastContainer />
        </div>
    );
}
