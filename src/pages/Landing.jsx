// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Landing Page - Ultra-Premium Industrial Design
// ============================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import { motion } from 'framer-motion';

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } },
    viewport: { once: true }
};

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
        <div className="min-h-screen relative overflow-hidden mesh-gradient font-sans selection:bg-biyani-red selection:text-white">
            {/* Background Architecture */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

                {/* Floating Vibrancy Orbs */}
                <div className="absolute left-[-10%] top-[-5%] h-[800px] w-[800px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#ee1b241a,transparent)] opacity-60 blur-[130px] animate-pulse"></div>
                <div className="absolute right-[-5%] top-[15%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_300px_at_50%_50%,#3b82f60d,transparent)] opacity-40 blur-[110px] animate-pulse delay-1000"></div>

                {/* Abstract Glass Shards */}
                <div className="absolute top-[20%] right-[15%] w-64 h-64 bg-white/5 border border-white/10 rounded-[3rem] rotate-12 backdrop-blur-3xl animate-float"></div>
                <div className="absolute bottom-[20%] left-[10%] w-48 h-48 bg-white/5 border border-white/10 rounded-[2rem] -rotate-12 backdrop-blur-2xl animate-float delay-700"></div>
            </div>

            {/* Navigation Header */}
            <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/60 border-b border-gray-200/50 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
                            <div className="relative flex items-center justify-center h-12 w-12 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden group-hover:scale-105 transition-all">
                                <img src="/assets/biyani-logo.png" alt="Biyani Logo" className="h-10 w-auto object-contain" />
                            </div>
                            <div className="hidden md:block">
                                <h1 className="text-xl font-heading font-black text-gray-900 leading-none tracking-tighter">BIYANI GROUP OF COLLEGES</h1>
                                <p className="text-[10px] text-biyani-red font-black tracking-[0.2em] mt-1.5 uppercase opacity-80">Digital Campus System</p>
                            </div>
                        </div>

                        {/* Login Button */}
                        <Button
                            variant="primary"
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-biyani-red/20 hover:shadow-2xl hover:shadow-biyani-red/30 hover:-translate-y-0.5 transition-all bg-biyani-red border-none text-white flex items-center gap-2"
                        >
                            <span>Access Portal</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="relative z-10 flex flex-col items-center w-full">

                {/* Hero Section */}
                <motion.section 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 md:pt-32 md:pb-40 text-center flex flex-col items-center"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/80 border border-red-100/50 text-biyani-red text-[10px] font-black tracking-[0.2em] uppercase mb-10 shadow-xl backdrop-blur-md"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-biyani-red"></span>
                        </span>
                        Official Institutional Backbone
                    </motion.div>

                    <h1 className="text-5xl md:text-8xl font-heading font-black text-gray-900 leading-[0.95] tracking-tighter mb-8 max-w-5xl">
                        Empowering <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-biyani-red via-red-600 to-rose-700 drop-shadow-sm">Academic Potential</span>
                    </h1>

                    <p className="text-lg md:text-2xl text-gray-500 max-w-3xl mx-auto mb-14 font-medium leading-relaxed opacity-90">
                        A unified digital framework designed for absolute transparency, institutional governance, and technical excellence across all Biyani Group of Colleges campuses.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 w-full sm:w-auto">
                        <Button
                            variant="primary"
                            onClick={() => navigate('/login')}
                            className="px-10 py-5 text-sm rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-biyani-red/30 hover:shadow-biyani-red/50 hover:-translate-y-1.5 transition-all duration-300 bg-biyani-red text-white border-0 flex items-center justify-center gap-3 active:scale-95"
                        >
                            Enter Dashboard
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </Button>
                        <a href="#features" className="px-10 py-5 text-sm rounded-2xl font-black uppercase tracking-widest text-gray-600 bg-white/60 backdrop-blur-md border border-white/40 hover:bg-white hover:shadow-xl hover:text-gray-900 transition-all flex items-center justify-center active:scale-95">
                            Core Modules
                        </a>
                    </div>
                </motion.section>

                {/* Institutional Statistics Section */}
                <motion.section 
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="whileInView"
                    viewport={{ once: true }}
                    className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-30"
                >
                    <div className="glass-card-premium rounded-[3.5rem] p-10 md:p-16 border border-white/50 shadow-2xl flex flex-wrap justify-center md:justify-between items-center gap-12 text-center overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        {[
                            { label: 'Active Learners', value: '15,000+', icon: '🎓' },
                            { label: 'Academic Leaders', value: '500+', icon: '👔' },
                            { label: 'Legacy of Quality', value: '30+', icon: '🏛️' },
                            { label: 'Placement Edge', value: '100%', icon: '🚀' },
                        ].map((stat, i) => (
                            <motion.div 
                                key={i} 
                                variants={fadeInUp}
                                className="flex flex-col items-center gap-3 min-w-[180px] relative z-10 transition-transform duration-500 group-hover:translate-y-[-5px]"
                            >
                                <span className="text-4xl mb-2 drop-shadow-md">{stat.icon}</span>
                                <div className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</div>
                                <div className="text-[10px] font-black text-biyani-red uppercase tracking-[0.2em] opacity-80">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Bento Grid Features Section */}
                <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative">
                    <div className="text-center md:text-left mb-20">
                        <div className="inline-block px-4 py-1.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-lg mb-8 shadow-2xl">Modular Infrastructure</div>
                        <h2 className="text-4xl md:text-6xl font-heading font-black text-gray-900 tracking-tighter mb-6 leading-tight">System Core Capabilities</h2>
                        <p className="text-gray-500 text-xl max-w-2xl font-medium leading-relaxed opacity-80">Built with modern tech architectural standards for maximum operational security and institutional transparency.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-[minmax(320px,auto)]">
                        {/* Large Bento Item */}
                        <div className="md:col-span-2 md:row-span-2 group relative overflow-hidden bg-white rounded-[3rem] p-12 border border-blue-50/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] transition-all duration-500">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-50 to-rose-100/50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60 transition-opacity"></div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-16 h-16 bg-red-600 text-white rounded-[1.25rem] flex items-center justify-center mb-10 shadow-xl shadow-red-200 group-hover:rotate-12 transition-transform">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <h3 className="text-4xl font-heading font-black text-gray-900 mb-6 tracking-tight">Academic Lifecycle Management</h3>
                                <p className="text-gray-500 text-xl leading-relaxed max-w-md font-medium opacity-80">
                                    Integrated framework for student record management, batch promotions, and degree tracking through automated verification layers.
                                </p>
                                <div className="mt-auto pt-16">
                                    <div className="w-full flex gap-3 h-2 bg-gray-50 rounded-full overflow-hidden">
                                        <div className="w-1/3 h-full bg-red-500 rounded-full"></div>
                                        <div className="w-1/4 h-full bg-red-300 rounded-full"></div>
                                        <div className="w-1/6 h-full bg-red-200 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Faculty Card */}
                        <div className="group bg-white rounded-[3rem] p-10 border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-500">
                            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-10 shadow-xl shadow-blue-200 transition-transform group-hover:scale-110">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h3 className="text-2xl font-heading font-black text-gray-900 mb-4 tracking-tight">Digital Classrooms</h3>
                            <p className="text-gray-500 leading-relaxed font-medium opacity-80">
                                Real-time attendance, lesson planning, and assessment management suite for modern educators.
                            </p>
                        </div>

                        {/* Admin Card */}
                        <div className="group bg-gray-900 rounded-[3rem] p-10 shadow-2xl transition-all duration-500 hover:translate-y-[-10px]">
                            <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-10 backdrop-blur-md border border-white/10">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <h3 className="text-2xl font-heading font-black text-white mb-4 tracking-tight">Governance & Audit</h3>
                            <p className="text-gray-400 leading-relaxed font-medium opacity-80">
                                Granular jurisdiction controls and immutable audit logs for total system transparency.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Campus Section */}
                <section className="w-full bg-white/40 backdrop-blur-3xl py-32 border-t border-white/50 relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center md:text-left mb-20">
                            <h2 className="text-4xl md:text-6xl font-heading font-black text-gray-900 tracking-tighter mb-4">Our Institutional Network</h2>
                            <p className="text-gray-500 text-xl font-medium opacity-80">Professional academic hubs connected through a unified digital nervous system.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-10">
                            {[
                                { name: 'Vidhyadhar Nagar', type: 'Main Campus', accent: 'from-red-600 to-rose-700', icon: '🏛️', image: '/assets/VDN_Campus.jpg' },
                                { name: 'Champapura', type: 'Pharmacy & Ayurveda', accent: 'from-emerald-600 to-teal-800', icon: '🏥', image: '/assets/Champapura_Campus.jpg' },
                                { name: 'Kalwar', type: 'Science & Technology', accent: 'from-amber-500 to-orange-700', icon: '🔬', image: '/assets/Kalwar_Campus.jpg' },
                            ].map((campus, idx) => (
                                <motion.div 
                                    key={idx} 
                                    variants={fadeInUp}
                                    initial="initial"
                                    whileInView="whileInView"
                                    whileTap={{ scale: 0.98 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    className="group relative pt-12 cursor-pointer"
                                    onClick={() => navigate('/login')}
                                >
                                    <div className="relative overflow-hidden rounded-[3.5rem] h-[450px] bg-white border border-gray-100 transition-all duration-700 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:-translate-y-4">
                                        {/* Background Image with Optimization & texture */}
                                        <div className="absolute inset-0 z-0 transition-transform duration-[1.5s] cubic-bezier(0.2, 0.8, 0.2, 1) group-hover:scale-[1.015] premium-image-container">
                                            <img src={campus.image} alt={campus.name} className="w-full h-full object-cover" loading="lazy" />
                                            <div className="absolute inset-0 noise-overlay opacity-30"></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 group-hover:via-black/60 transition-all duration-700"></div>
                                        </div>

                                        <div className="relative z-10 p-12 h-full flex flex-col items-start">
                                            <motion.div 
                                                whileHover={{ y: -8, scale: 1.05 }}
                                                className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${campus.accent} flex items-center justify-center text-4xl mb-auto shadow-2xl transition-all duration-300`}
                                            >
                                                <span className="drop-shadow-lg">{campus.icon}</span>
                                            </motion.div>

                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-white/60 tracking-[0.4em] uppercase">{campus.type}</p>
                                                <h3 className="text-4xl font-heading font-black text-white leading-tight tracking-tighter">{campus.name}</h3>

                                                <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                    <div className={`h-full w-0 group-hover:w-full bg-gradient-to-r ${campus.accent} transition-all duration-1000 ease-out`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final Professional Minimalist Footer */}
                <footer className="w-full bg-[#0A0A0A] text-white pt-20 pb-10 overflow-hidden relative border-t border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 items-start">
                            {/* Column 1: Institution */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl p-2 shadow-xl">
                                        <img src="/assets/biyani-logo.png" alt="Biyani Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <h3 className="text-sm font-black tracking-tight uppercase">Biyani Group of Colleges</h3>
                                </div>
                                <p className="text-gray-500 text-xs font-medium leading-relaxed max-w-xs">
                                    A robust digital infrastructure designed for academic transparency and institutional excellence across all campuses.
                                </p>
                            </div>

                            {/* Column 2: Portal Access */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">Portal Access</h4>
                                <nav className="flex flex-col gap-4">
                                    <a href="/login" className="premium-hover-link text-xs font-bold uppercase tracking-widest">Faculty Portal</a>
                                    <a href="/login" className="premium-hover-link text-xs font-bold uppercase tracking-widest">Student Login</a>
                                    <a href="/login" className="premium-hover-link text-xs font-bold uppercase tracking-widest">Staff Entrance</a>
                                </nav>
                            </div>

                            {/* Column 3: Legal & Governance */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Governance</h4>
                                <nav className="flex flex-col gap-4">
                                    <a href="/privacy" className="premium-hover-link text-[10px] font-black uppercase tracking-widest">Privacy Policy</a>
                                    <a href="/terms" className="premium-hover-link text-[10px] font-black uppercase tracking-widest">Terms of Service</a>
                                    <div className="pt-2 flex items-center gap-2">
                                        <div className="w-6 h-6 bg-green-500/10 rounded-md flex items-center justify-center">
                                            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">GDPR Compliant</span>
                                    </div>
                                </nav>
                            </div>

                            {/* Column 4: Contact & Support */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Stay Connected</h4>
                                <div className="flex gap-4">
                                    {[
                                        { id: 'fb', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg> },
                                        { id: 'li', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z" /></svg> },
                                        { id: 'tw', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg> },
                                        { id: 'ig', icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 4a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4zm5.5-.5a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" /></svg> }
                                    ].map(social => (
                                        <motion.a 
                                            key={social.id} 
                                            href="#" 
                                            whileHover={{ y: -5, scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-red-500 hover:bg-white/10 transition-all shadow-lg"
                                        >
                                            {social.icon}
                                        </motion.a>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Support</h4>
                                    <a href="mailto:support@biyani.com" className="premium-hover-link text-[10px] font-black uppercase tracking-widest block">Technical Hub</a>
                                </div>
                            </div>
                        </div>

                        {/* Minimalist Bottom Bar */}
                        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <p className="text-[9px] font-bold text-gray-700 uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} Biyani Group of Colleges.</p>
                            <div className="flex items-center gap-2 grayscale brightness-75 hover:grayscale-0 transition-all duration-500 group cursor-pointer">
                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Managed by</span>
                                <span className="text-[10px] font-black text-white group-hover:text-red-500 uppercase tracking-[0.2em] border-l border-white/20 pl-2 transition-colors">Kushal Kumawat</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
