import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function MyCouncil() {
    const { user } = useAuth();
    const [allCouncilMembers, setAllCouncilMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [campusFilter, setCampusFilter] = useState('All');
    const [collegeFilter, setCollegeFilter] = useState('All');
    const [deptFilter, setDeptFilter] = useState(user?.departmentName || 'All');

    // DB Filter Lists
    const [dbCampuses, setDbCampuses] = useState(['All']);
    const [dbColleges, setDbColleges] = useState(['All']);
    const [dbDepartments, setDbDepartments] = useState(['All']);

    useEffect(() => {
        // Set up real-time listeners for filter dropdowns
        const unsubs = [
            onSnapshot(collection(db, 'campuses'), snap => {
                const list = []; snap.forEach(d => list.push(d.data().name));
                setDbCampuses(['All', ...list.filter(Boolean).sort()]);
            }),
            onSnapshot(collection(db, 'colleges'), snap => {
                const list = []; snap.forEach(d => list.push(d.data().name));
                setDbColleges(['All', ...list.filter(Boolean).sort()]);
            }),
            onSnapshot(collection(db, 'departments'), snap => {
                const list = []; snap.forEach(d => list.push(d.data().name));
                setDbDepartments(['All', ...list.filter(Boolean).sort()]);
            })
        ];

        fetchCouncil();
        return () => unsubs.forEach(u => u());
    }, []);

    const fetchCouncil = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'users'),
                where('councilRole', 'in', ['president', 'member'])
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllCouncilMembers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCouncil = useMemo(() => {
        let list = allCouncilMembers;
        if (campusFilter !== 'All') list = list.filter(m => m.campusName === campusFilter);
        if (collegeFilter !== 'All') list = list.filter(m => m.collegeName === collegeFilter);
        if (deptFilter !== 'All') list = list.filter(m => m.departmentName === deptFilter);

        return {
            president: list.find(m => m.councilRole === 'president'),
            members: list.filter(m => m.councilRole === 'member')
        };
    }, [allCouncilMembers, campusFilter, collegeFilter, deptFilter]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-biyani-red border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Synchronizing Council Data...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto pb-32 space-y-8 px-4">
            
            {/* ── HEADER & FILTERS ──────────────────────────────────── */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">👑</span>
                            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">
                                Institutional Leadership
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-heading font-black text-gray-900 tracking-tight leading-none">
                            Student <span className="text-amber-500">Council</span>
                        </h1>
                        <p className="text-gray-400 font-bold text-sm max-w-lg leading-relaxed">
                            Explore the leadership representing the {deptFilter === 'All' ? 'Biyani Campus Network' : `${deptFilter} Department`}.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {user?.councilRole?.toLowerCase() === 'president' && (
                            <Link
                                to="/student/council/propose-event"
                                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-black hover:-translate-y-1 transition-all text-xs uppercase tracking-[0.2em]"
                            >
                                ✍️ Propose Event
                            </Link>
                        )}
                    </div>
                </div>

                {/* Explorer Filters */}
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-gray-100">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Location Segment</p>
                        <div className="relative">
                            <select 
                                value={campusFilter} 
                                onChange={e => setCampusFilter(e.target.value)}
                                className="appearance-none w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-amber-200 transition-all outline-none cursor-pointer"
                            >
                                {dbCampuses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Campuses' : c}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Institutional Body</p>
                        <div className="relative">
                            <select 
                                value={collegeFilter} 
                                onChange={e => setCollegeFilter(e.target.value)}
                                className="appearance-none w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-amber-200 transition-all outline-none cursor-pointer"
                            >
                                {dbColleges.map(c => <option key={c} value={c}>{c === 'All' ? 'All Colleges' : c}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Department Sector</p>
                        <div className="relative">
                            <select 
                                value={deptFilter} 
                                onChange={e => setDeptFilter(e.target.value)}
                                className="appearance-none w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-amber-200 transition-all outline-none cursor-pointer"
                            >
                                {dbDepartments.map(c => <option key={c} value={c}>{c === 'All' ? 'All Departments' : c}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                        </div>
                    </div>
                </div>
            </motion.header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. PRESIDENT CARD */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="lg:col-span-1"
                >
                    <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-xl relative overflow-hidden h-full flex flex-col items-center text-center group">
                        {/* Status Label */}
                        <div className="absolute top-8 left-8">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Active Member</span>
                            </div>
                        </div>

                        {/* Visual Decoration */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-50 blur-[60px] rounded-full -mr-20 -mt-20 opacity-60" />

                        <div className="relative w-40 h-40 mb-8 mt-4">
                            <div className="w-full h-full rounded-full border-4 border-amber-400 p-1.5 shadow-2xl shadow-amber-100 transition-transform duration-500 group-hover:scale-105">
                                <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center overflow-hidden">
                                    {filteredCouncil.president?.photoURL ? (
                                        <img src={filteredCouncil.president.photoURL} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl font-black text-amber-600">{filteredCouncil.president?.name?.[0] || '?'}</span>
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-3 inset-x-0 mx-auto w-fit bg-amber-400 text-white px-5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border-2 border-white">
                                President
                            </div>
                        </div>

                        <h2 className="text-3xl font-heading font-black text-gray-900 mb-2 leading-tight">
                            {filteredCouncil.president?.name || 'Position Vacant'}
                        </h2>
                        <p className="text-amber-600 font-black text-[10px] uppercase tracking-[0.3em] mb-8">
                            {filteredCouncil.president?.departmentName || 'Biyani Digital Campus'} Representative
                        </p>

                        <div className="mt-auto w-full bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50">
                            <div className="flex justify-center gap-1 mb-3">
                                <span className="text-amber-400">★</span><span className="text-amber-400">★</span><span className="text-amber-400">★</span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-wider italic">
                                "{filteredCouncil.president ? 'Dedicated to institutional coordination and student advocacy.' : 'Awaiting council appointment for the selected sector.'}"
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* 2. MEMBERS GRID */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-xl font-heading font-black text-gray-900">Elected Council Members</h3>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{filteredCouncil.members.length} Representatives</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredCouncil.members.length > 0 ? filteredCouncil.members.map((member, i) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                    layout
                                    className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-xl hover:shadow-gray-100 transition-all group"
                                >
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-xl font-black text-gray-300 overflow-hidden border border-gray-100 group-hover:border-amber-200 transition-colors">
                                        {member.photoURL ? (
                                            <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                            member.name?.[0] || '?'
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-heading font-black text-gray-900 text-lg truncate">{member.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                                                Council Member
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight truncate border-l border-gray-200 pl-2">
                                                {member.batchName || member.departmentName || 'Institutional'}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-2 py-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/30"
                                >
                                    <div className="text-4xl mb-4 grayscale opacity-30">👥</div>
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-[0.25em]">No representatives found for this category</p>
                                    <p className="text-[10px] font-bold text-gray-300 mt-2 uppercase tracking-widest">Appointments pending for {deptFilter}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
