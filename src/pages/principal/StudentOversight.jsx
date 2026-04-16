import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { getCollegeDepartments } from '../../services/principalService';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from '../../components/common/PremiumSelect';

export default function StudentOversight() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLiveSearch, setIsLiveSearch] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        departmentId: 'all',
        semester: 'all',
        search: ''
    });

    useEffect(() => {
        if (user?.collegeId) {
            fetchData();
        }
    }, [user?.collegeId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const depts = await getCollegeDepartments(user.collegeId);
            setDepartments(depts);

            const sampleQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('role', '==', 'student'),
                limit(30)
            );
            const snapshot = await getDocs(sampleQuery);
            const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const shuffled = [...studentData].sort(() => 0.5 - Math.random());
            setStudents(shuffled);
            setIsLiveSearch(false);

        } catch (error) {
            console.error('Error loading academic data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!filters.search && filters.departmentId === 'all' && filters.semester === 'all') {
            fetchData();
            return;
        }

        setLoading(true);
        setIsLiveSearch(true);
        try {
            let q = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('role', '==', 'student')
            );

            const snapshot = await getDocs(q);
            const allMatch = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const filtered = allMatch.filter(s => {
                const matchesDept = filters.departmentId === 'all' || s.departmentId === filters.departmentId;
                const matchesSem = filters.semester === 'all' || String(s.currentSemester) === filters.semester;
                const matchesSearch = !filters.search || 
                    s.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                    s.email?.toLowerCase().includes(filters.search.toLowerCase());
                return matchesDept && matchesSem && matchesSearch;
            });

            setStudents(filtered);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (filters.search || filters.departmentId !== 'all' || filters.semester !== 'all') {
                handleSearch();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.departmentId, filters.semester, filters.search]);

    const stats = useMemo(() => {
        return {
            total: students.length,
            isLimited: !isLiveSearch
        };
    }, [students, isLiveSearch]);

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section - Modern Glassmorphism */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-10 md:p-14 border border-white/50 relative overflow-hidden shadow-2xl shadow-blue-500/5"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 blur-[100px] -mr-48 -mt-48 rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[80px] -ml-32 -mb-32 rounded-full" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100/50">
                            <span className="w-2 h-2 rounded-full bg-[#E31E24] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E31E24]">Academic Oversight</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-none">
                            Student <span className="text-[#E31E24]">Directory</span>
                        </h2>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">{user?.collegeName}</p>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-white/80 border border-gray-100 px-8 py-5 rounded-[2rem] shadow-sm backdrop-blur-md flex flex-col items-center min-w-[140px]">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Records</p>
                            <p className="text-3xl font-black tracking-tighter text-gray-900">{stats.total}{stats.isLimited ? '+' : ''}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Filter Deck - Modern & Simple */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="md:col-span-2 relative group">
                    <input
                        type="text"
                        placeholder="Search by student name or email..."
                        className="w-full pl-14 pr-6 py-5 bg-white/70 backdrop-blur-md border border-gray-100 focus:border-[#E31E24] focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-sm shadow-sm placeholder:text-gray-400 placeholder:font-medium"
                        value={filters.search}
                        onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                    />
                    <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#E31E24] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <PremiumSelect
                    placeholder="All Departments"
                    value={filters.departmentId}
                    onChange={e => setFilters(p => ({ ...p, departmentId: e.target.value }))}
                    options={[{ label: 'All Departments', value: 'all' }, ...departments.map(d => ({ label: d.name, value: d.id }))]}
                />

                <PremiumSelect
                    placeholder="All Semesters"
                    value={filters.semester}
                    onChange={e => setFilters(p => ({ ...p, semester: e.target.value }))}
                    options={[{ label: 'All Semesters', value: 'all' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ label: `Semester ${s}`, value: String(s) }))]}
                />
            </div>

            {/* Content Deck */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 rounded-[2.5rem] bg-white animate-pulse border border-gray-50" />
                    ))}
                </div>
            ) : students.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white/40 backdrop-blur-md rounded-[3rem] p-24 text-center border-4 border-dashed border-gray-100 flex flex-col items-center justify-center"
                >
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 text-gray-300">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5} /></svg>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">No students found</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Try adjusting your search filters.</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {students.map((student, idx) => (
                            <StudentCard key={student.id} student={student} idx={idx} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function StudentCard({ student, idx }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ delay: idx * 0.03, type: 'spring', stiffness: 200, damping: 20 }}
            className="group bg-white rounded-[2.8rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] hover:border-red-100 transition-all duration-500 relative overflow-hidden"
        >
            <div className="relative z-10 flex flex-col h-full gap-8">
                {/* Upper Section */}
                <div className="flex justify-between items-start">
                    <div className="w-16 h-16 rounded-[1.8rem] bg-gray-900 text-white flex items-center justify-center text-xl font-black shadow-xl shadow-gray-200 group-hover:bg-[#E31E24] group-hover:shadow-red-200 group-hover:rotate-6 transition-all duration-500">
                        {student.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="px-4 py-1.5 rounded-full bg-red-50 text-[#E31E24] text-[8px] font-black uppercase tracking-[0.2em] border border-red-100 shadow-sm mb-2">
                            {student.departmentName || 'General'}
                        </div>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{student.batchName || '2023-26'}</span>
                    </div>
                </div>

                {/* Info Section */}
                <div className="space-y-1.5 flex-grow">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter leading-none group-hover:text-[#E31E24] transition-colors duration-300">{student.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 line-clamp-1 uppercase tracking-widest">{student.email}</p>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
                    <div className="space-y-1">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Semester</p>
                        <p className="text-sm font-black text-gray-900">SEM 0{student.currentSemester || '1'}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Roll Number</p>
                        <p className="text-sm font-black text-gray-900">{student.rollNumber || student.enrollmentNumber || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-red-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute top-0 right-0 w-2 h-full bg-[#E31E24] opacity-0 group-hover:opacity-10 transition-opacity" />
        </motion.div>
    );
}
