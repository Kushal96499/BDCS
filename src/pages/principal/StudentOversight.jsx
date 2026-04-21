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
                where('role', '==', 'student')
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
                className="bg-white/40 backdrop-blur-xl rounded-[2rem] p-6 md:p-10 border border-white/50 relative overflow-hidden shadow-2xl shadow-blue-500/5"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 blur-[100px] -mr-48 -mt-48 rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[80px] -ml-32 -mb-32 rounded-full" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-3 md:space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100/50">
                            <span className="w-2 h-2 rounded-full bg-[#E31E24] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E31E24]">Academic Oversight</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none">
                            Student <span className="text-[#E31E24]">Register</span>
                        </h2>
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">{user?.collegeName}</p>
                    </div>

                    <div className="flex justify-center md:justify-end">
                        <div className="bg-white/80 border border-gray-100 px-5 py-3 md:px-6 md:py-4 rounded-[1.5rem] shadow-sm backdrop-blur-md flex flex-col items-center min-w-[100px] md:min-w-[120px]">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Records</p>
                            <p className="text-xl md:text-2xl font-black tracking-tighter text-gray-900">{stats.total}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Filter Deck - Modern & Simple */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="md:col-span-2 relative group">
                    <label htmlFor="student-search" className="sr-only">Search students</label>
                    <input
                        id="student-search"
                        name="student-search"
                        type="text"
                        placeholder="Search by student name or email..."
                        className="w-full pl-14 pr-6 py-4 bg-white/70 backdrop-blur-md border border-gray-100 focus:border-[#E31E24] focus:bg-white rounded-[1.25rem] outline-none transition-all font-bold text-sm shadow-sm placeholder:text-gray-400 placeholder:font-medium"
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

            {/* Tabular Student Ledger */}
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
                <div className="bg-white/50 backdrop-blur-xl rounded-[2rem] border border-gray-100 overflow-hidden shadow-2xl shadow-blue-500/5">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                        <table className="min-w-full divide-y divide-gray-100 table-auto">
                            <thead>
                                <tr className="bg-gray-50/30">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">ID</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Student Details</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Dept & Sem</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">ID / Roll No</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">NOC Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white/30">
                                {students.map((student, index) => (
                                    <tr key={student.id} className="group hover:bg-red-50/30 transition-all duration-300">
                                        {/* S.No */}
                                        <td className="px-6 py-4 text-[10px] font-black text-gray-300 font-mono w-10">
                                            {String(index + 1).padStart(2, '0')}
                                        </td>

                                        {/* Persona */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xs font-black shadow-lg group-hover:bg-[#E31E24] group-hover:rotate-6 transition-all duration-500 shrink-0">
                                                    {student.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col min-w-[200px]">
                                                    <span className="text-sm font-black text-gray-900 group-hover:text-[#E31E24] transition-colors">{student.name}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 lowercase tracking-tight truncate">{student.email}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Academic Scope */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 min-w-[150px]">
                                                <div className="px-3 py-1 bg-red-50 text-[#E31E24] text-[8px] font-black uppercase tracking-[0.2em] border border-red-100/50 rounded-full w-fit">
                                                    {student.departmentName || 'General'}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-2 font-mono">
                                                    Semester 0{student.currentSemester || 1}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Identification */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-gray-900 tracking-tight">#{student.rollNumber || 'NOT SET'}</span>
                                            </div>
                                        </td>

                                        {/* NOC Status */}
                                        <td className="px-6 py-4 text-right">
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-sm transition-all shadow-sm ${
                                                student.nocStatus === 'cleared'
                                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                    : 'bg-amber-50 border-amber-100 text-amber-600'
                                            }`}>
                                                <span className={`w-2 h-2 rounded-full ${student.nocStatus === 'cleared' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                                <span className="text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap">
                                                    {student.nocStatus === 'cleared' ? 'NOC CLEAR' : 'NOC PENDING'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
