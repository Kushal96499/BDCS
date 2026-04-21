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
    const currentPage = NAV_ITEMS.find(item => isActive(item.path))?.name || 'Dashboard';

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] selection:bg-[#E31E24]/10 font-sans">
            {/* ── DESKTOP RAIL NAVIGATION ────────────────────────────── */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 z-50 nav-rail flex-col items-center py-8">
                {/* Branding */}
                <button onClick={() => navigate('/student')} className="mb-12 group transition-transform active:scale-95 duration-500">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm border border-[#0F172A]/5 group-hover:shadow-md transition-all duration-300">
                        <img src="/assets/biyani-logo.png" alt="BDCS" className="w-full h-full object-contain" />
                    </div>
                </button>

                {/* Nav Stack */}
                <nav className="flex-1 flex flex-col gap-8">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.path);
                        const restricted = isBacklog && RESTRICTED_ITEMS.includes(item.name);

                        return (
                            <button
                                key={item.path}
                                onClick={() => !restricted && navigate(item.path)}
                                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group
                                    ${restricted ? 'text-gray-300 cursor-not-allowed' :
                                    active ? 'text-[#E31E24]' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                            >
                                <div className="w-5 h-5 transition-transform duration-300 group-hover:scale-110">
                                    {item.icon}
                                </div>
                                
                                {active && (
                                    <motion.div 
                                        layoutId="active-nav-bead" 
                                        className="absolute -right-[1.1rem] w-1.5 h-6 bg-[#E31E24] rounded-full shadow-[0_0_12px_rgba(227,30,36,0.3)]" 
                                    />
                                )}

                                {/* Label Tooltip */}
                                <div className="absolute left-16 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 -translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap uppercase tracking-widest z-[100]">
                                    {item.name}
                                </div>
                            </button>
                        );
                    })}
                </nav>

            </aside>


            {/* ── TOP UTILITY HEADER (PRISTINE) ────────────────────────── */}
            <header className={`fixed top-0 left-0 md:left-20 right-0 z-40 transition-all duration-300 px-6 md:px-12 ${scrolled ? 'h-14 bg-[#F8F9FA]/90 backdrop-blur-xl border-b border-[#0F172A]/5 py-2 shadow-sm' : 'h-16 bg-transparent py-2'}`}>
                <div className="h-full flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="hidden lg:block">
                                <h2 className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#E31E24] mb-0.5">Student Area</h2>
                                <h1 className="text-lg font-heading tracking-tight uppercase text-slate-900 leading-none">{currentPage}</h1>
                            </div>
                            {/* Mobile Logo */}
                            <div className="lg:hidden flex items-center gap-3">
                                <img src="/assets/biyani-logo.png" className="w-7 h-7 rounded-lg" alt="" />
                                <h1 className="text-xs font-heading tracking-widest uppercase text-slate-900">{currentPage}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 md:gap-8">
                            {/* High-Density Status Pill */}
                            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-white border border-[#0F172A]/5 rounded-full shadow-sm">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">System Status: Online</span>
                            </div>

                        {/* Profile Utility */}
                        <button 
                            onClick={() => navigate('/student/profile')}
                            className="flex items-center gap-2.5 group px-0.5 py-0.5 pr-3 rounded-full hover:bg-white transition-all duration-300"
                        >
                            <div className="w-9 h-9 rounded-full border-2 border-[#E31E24] overflow-hidden transition-all duration-300 group-hover:scale-110 shadow-md flex items-center justify-center bg-white p-[1px]">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[#E31E24] bg-white capitalize">
                                        {user?.name?.[0]}
                                    </div>
                                )}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-[10px] font-bold text-slate-900 leading-none capitalize">{user?.name?.split(' ')[0]}</p>
                                <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">Profile</p>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT AREA ────────────────────────────────── */}
            <main className="relative w-full min-h-screen pt-16 md:pl-20">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 pb-32">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* ── MOBILE NAV DOCK ───────────────────────────────────── */}
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
                <nav className="w-full bg-white/90 backdrop-blur-2xl border border-[#0F172A]/5 px-6 py-4 rounded-3xl flex items-center justify-between shadow-[0_15px_50px_rgba(0,0,0,0.1)]">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-[#E31E24]' : 'text-slate-400'}`}
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


