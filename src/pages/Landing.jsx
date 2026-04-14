// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Landing Page - Gen Z Aesthetic, Glassmorphism & Bento Grid
// ============================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';

export default function Landing() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Redirect logic
    useEffect(() => {
        if (user && !user.mustResetPassword) {
            const rolePaths = {
                admin: '/admin', director: '/director', principal: '/principal',
                hod: '/hod', teacher: '/teacher', student: '/student',
                exam_cell: '/exam', placement: '/placement', hr: '/hr'
            };
            navigate(rolePaths[user.currentActiveRole || user.role] || '/');
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#FAFAFA] font-sans selection:bg-biyani-red selection:text-white">
            {/* Background Texture Layers */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                <div className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fca5a533,transparent)] opacity-50 blur-[100px] mx-auto"></div>
            </div>

            {/* Navigation Header */}
            <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm supports-[backdrop-filter]:bg-white/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
                            <div className="relative flex items-center justify-center h-12 w-12 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden group-hover:shadow-md transition-all">
                                <img src="/assets/biyani-logo.png" alt="Biyani Logo" className="h-10 w-auto object-contain" />
                            </div>
                            <div className="hidden md:block">
                                <h1 className="text-xl font-heading font-bold text-gray-900 leading-none tracking-tight">BIYANI GROUP OF COLLEGES</h1>
                                <p className="text-[10px] text-biyani-red font-bold tracking-[0.2em] mt-1.5 uppercase">Digital Campus System</p>
                            </div>
                        </div>

                        {/* Login Button */}
                        <Button
                            variant="primary"
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-biyani-red/20 hover:shadow-lg hover:shadow-biyani-red/30 hover:-translate-y-0.5 transition-all bg-biyani-red hover:bg-biyani-red-dark border-none text-white flex items-center gap-2"
                        >
                            <span>Login Portal</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 flex flex-col items-center w-full">

                {/* Hero Section */}
                <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 md:pt-32 md:pb-28 text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-biyani-red text-xs font-semibold tracking-wide uppercase mb-8 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-biyani-red"></span>
                        </span>
                        Official Institutional Portal
                    </div>

                    <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6 max-w-4xl">
                        The Next Generation of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-biyani-red via-red-600 to-rose-600">Digital Campus</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
                        A centralized, high-performance backbone for Administration, Faculty, and Student Success at Biyani Group of Colleges.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
                        <Button
                            variant="primary"
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 text-base rounded-xl font-semibold shadow-xl shadow-biyani-red/20 hover:shadow-2xl hover:shadow-biyani-red/30 hover:-translate-y-1 transition-all bg-biyani-red hover:bg-biyani-red-dark text-white border-0 flex items-center justify-center gap-2"
                        >
                            Access Dashboard
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </Button>
                        <a href="#features" className="px-8 py-4 text-base rounded-xl font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all flex items-center justify-center shadow-sm">
                            Explore Features
                        </a>
                    </div>
                </section>

                {/* Bento Grid Features Section */}
                <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="text-left mb-12">
                        <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 tracking-tight">Enterprise Infrastructure</h2>
                        <p className="text-gray-500 mt-2 text-lg">Designed for scale, security, and seamless academic operations.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]">
                        {/* Large Bento Item */}
                        <div className="md:col-span-2 md:row-span-2 group relative overflow-hidden bg-white rounded-3xl p-10 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-50 to-rose-100 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 group-hover:opacity-80 transition-opacity"></div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-14 h-14 bg-biyani-red-100/50 text-biyani-red rounded-2xl flex items-center justify-center mb-8 border border-red-100">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <h3 className="text-3xl font-heading font-bold text-gray-900 mb-4 tracking-tight">Centralized Hub</h3>
                                <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                                    One unified platform managing attendance, examinations, placements, and departmental operations seamlessly across all campuses. Experience the power of integrated data.
                                </p>

                                {/* Abstract UI Representation */}
                                <div className="mt-auto pt-10">
                                    <div className="w-full h-32 bg-gray-50 rounded-xl border border-gray-100 flex items-end px-6 gap-3 pb-0 overflow-hidden relative shadow-inner">
                                        <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent z-10"></div>
                                        <div className="w-1/4 h-[40%] bg-blue-100 rounded-t-lg border border-blue-200 border-b-0"></div>
                                        <div className="w-1/4 h-[70%] bg-red-100 rounded-t-lg relative border border-red-200 border-b-0"><div className="absolute top-0 inset-x-0 h-1 bg-biyani-red rounded-t-lg"></div></div>
                                        <div className="w-1/4 h-[50%] bg-amber-100 rounded-t-lg border border-amber-200 border-b-0"></div>
                                        <div className="w-1/4 h-[85%] bg-emerald-100 rounded-t-lg border border-emerald-200 border-b-0"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Standard Bento Item 1 */}
                        <div className="group bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 border border-blue-100">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <h3 className="text-xl font-heading font-bold text-gray-900 mb-3 tracking-tight">Bank-Grade Security</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Enterprise-grade encryption ensuring academic records and personal data remain strictly confidential and protected from unauthorized access.
                            </p>
                        </div>

                        {/* Standard Bento Item 2 */}
                        <div className="group bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-sm hover:shadow-lg hover:shadow-slate-900/20 transition-shadow relative overflow-hidden">
                            <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-biyani-red/20 rounded-full blur-2xl"></div>
                            <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-heading font-bold text-white mb-3 tracking-tight">Role-Based Access</h3>
                            <p className="text-slate-400 leading-relaxed text-sm">
                                Tailored modular interfaces for Admins, Directors, Faculty, and Students providing bespoke tools for every user journey.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Campus List - Architectural Cards */}
                <section className="w-full bg-white border-t border-gray-200 py-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 tracking-tight mb-3">Our Campuses</h2>
                                <p className="text-gray-500 text-lg">Connecting diverse academic centers through one digital system.</p>
                            </div>
                            <Button
                                variant="outline"
                                className="hidden md:flex border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-6"
                            >
                                View All Locations
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { name: 'Vidhyadhar Nagar', type: 'Main Campus', accent: 'bg-biyani-red' },
                                { name: 'Champapura', type: 'Management & Law', accent: 'bg-blue-600' },
                                { name: 'Kalwar', type: 'Science & Technology', accent: 'bg-indigo-600' },
                            ].map((campus, idx) => (
                                <div key={idx} className="group relative overflow-hidden rounded-3xl bg-gray-50 border border-gray-200 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1">
                                    <div className="p-8 pb-12 relative z-10">
                                        <div className={`w-12 h-1.5 ${campus.accent} mb-8 rounded-full transition-all duration-300 group-hover:w-20`}></div>
                                        <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">{campus.type}</p>
                                        <h3 className="text-2xl font-heading font-bold text-gray-900 leading-tight">{campus.name}</h3>
                                    </div>

                                    {/* Abstract Decoration */}
                                    <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-white rounded-full opacity-60 border-[20px] border-gray-100/50 group-hover:scale-110 group-hover:-translate-x-4 group-hover:-translate-y-4 transition-all duration-500"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="w-full bg-white border-t border-gray-200 py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-3">
                                <img src="/assets/biyani-logo.png" alt="Biyani Logo" className="h-8 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all" />
                                <div className="text-left">
                                    <h2 className="text-sm font-heading font-bold text-gray-900">Biyani Group of Colleges</h2>
                                    <p className="text-xs text-gray-500">Digital Campus System</p>
                                </div>
                            </div>

                            <div className="flex gap-6 text-sm font-medium text-gray-500">
                                <a href="#" className="hover:text-biyani-red transition-colors">Support</a>
                                <a href="#" className="hover:text-biyani-red transition-colors">Privacy</a>
                                <a href="#" className="hover:text-biyani-red transition-colors">Terms</a>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-xs text-gray-400">
                                &copy; {new Date().getFullYear()} Biyani Group of Colleges. All rights reserved.
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                Designed with <svg className="w-3 h-3 text-biyani-red" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg> for Excellence
                            </div>
                        </div>
                    </div>
                </footer>

            </main>
        </div>
    );
}
