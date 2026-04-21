import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumSelect from '../../components/common/PremiumSelect';

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } };
const grid = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function StudentDirectory() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Filters
    const [campusFilter, setCampusFilter] = useState('All');
    const [collegeFilter, setCollegeFilter] = useState('All');
    const [deptFilter, setDeptFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');

    // DB Filter Lists
    const [dbCampuses, setDbCampuses] = useState(['All']);
    const [dbColleges, setDbColleges] = useState(['All']);
    const [dbDepartments, setDbDepartments] = useState(['All']);
    const [dbCourses, setDbCourses] = useState(['All']);

    useEffect(() => {
        if (!user) return;

        // Set up real-time listeners for filter dropdowns so admin additions appear instantly
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
            }),
            onSnapshot(collection(db, 'courses'), snap => {
                const list = []; snap.forEach(d => list.push(d.data().name));
                setDbCourses(['All', ...list.filter(Boolean).sort()]);
            })
        ];

        fetchDirectory();

        return () => unsubs.forEach(u => u());
    }, [user]);

    const fetchDirectory = async () => {
        try {
            setLoading(true);

            // 1. Fetch reference collections for mapping raw IDs to Names
            const [campSnap, colSnap, deptSnap, courseSnap] = await Promise.all([
                getDocs(collection(db, 'campuses')),
                getDocs(collection(db, 'colleges')),
                getDocs(collection(db, 'departments')),
                getDocs(collection(db, 'courses'))
            ]);

            const campMap = {};
            campSnap.forEach(d => { campMap[d.id] = d.data().name; });

            const colMap = {};
            colSnap.forEach(d => { colMap[d.id] = d.data().name; });

            const deptMap = {};
            deptSnap.forEach(d => { deptMap[d.id] = d.data().name; });

            const courseMap = {};
            courseSnap.forEach(d => { courseMap[d.id] = d.data().name; });

            // 2. Fetch students globally
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'student'),
                limit(1000)
            );
            const snap = await getDocs(q);

            // 3. Deduplicate by DB ID just in case
            const uniqueStudents = new Map();

            snap.docs.forEach(d => {
                const s = { id: d.id, ...d.data() };

                if (s.id !== user?.uid && s.profile_visibility !== 'private') {
                    // Strip sensitive fields
                    const { email, phone, attendance, marks, ...safe } = s;

                    // Apply mappings if names are missing
                    safe._resolvedCampus = safe.campusName || campMap[safe.campusId] || '';
                    safe._resolvedCollege = safe.collegeName || colMap[safe.collegeId] || '';
                    safe._resolvedDept = safe.departmentName || deptMap[safe.departmentId] || '';
                    safe._resolvedCourse = safe.courseName || courseMap[safe.courseId] || '';

                    // Aggressively skip the currently logged in user
                    // Checking id, studentId, email, or exact name match
                    if (
                        s.id === user?.uid ||
                        s.studentId === user?.uid ||
                        (s.email && s.email === user?.email) ||
                        (s.phone && s.phone === user?.phone) ||
                        (s.name === user?.name && s.batchName === user?.batchName)
                    ) {
                        return; // skip pushing to uniqueStudents
                    }

                    // Force aggressive deduplication. Use email, then phone, then name + course
                    // To handle "Khush" vs "Kushal" ghost accounts, we grab the first 4 letters of the name if no email/phone
                    const normalizedName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 4);
                    const dedupKey = (s.email || s.phone || `${normalizedName}-${safe._resolvedCourse}`).toLowerCase().trim();
                    if (!uniqueStudents.has(dedupKey) && dedupKey !== '') {
                        uniqueStudents.set(dedupKey, safe);
                    }
                }
            });

            setStudents(Array.from(uniqueStudents.values()));
        } catch (e) {
            console.error('Directory fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let list = students;
        if (campusFilter !== 'All') list = list.filter(s => s._resolvedCampus === campusFilter);
        if (collegeFilter !== 'All') list = list.filter(s => s._resolvedCollege === collegeFilter);
        if (deptFilter !== 'All') list = list.filter(s => s._resolvedDept === deptFilter);
        if (courseFilter !== 'All') list = list.filter(s => s._resolvedCourse === courseFilter);

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.name?.toLowerCase().includes(q) ||
                s.batchName?.toLowerCase().includes(q) ||
                s._resolvedCourse?.toLowerCase().includes(q) ||
                s._resolvedDept?.toLowerCase().includes(q) ||
                s._resolvedCollege?.toLowerCase().includes(q) ||
                s._resolvedCampus?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [students, search, campusFilter, collegeFilter, deptFilter, courseFilter]);

    const clearAllFilters = () => {
        setSearch('');
        setCampusFilter('All');
        setCollegeFilter('All');
        setDeptFilter('All');
        setCourseFilter('All');
    };

    return (
        <div className="min-h-screen bg-transparent pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto px-4 pt-6 md:px-8 space-y-6">

                {/* ── HEADER ── */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E31E24] via-[#E31E24] to-red-400" />

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#E31E24] bg-red-50 px-2.5 py-1 rounded">
                                BDCS Network
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                            Student Directory
                        </h1>
                        <p className="text-gray-400 text-sm mt-2 font-semibold max-w-lg">
                            Connect with verified students across the Biyani College Network. Public profiles only.
                        </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-2 md:mt-0">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl shrink-0">
                            🎓
                        </div>
                        <div>
                            <p className="text-2xl font-black text-gray-900 leading-none">{filtered.length}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Students</p>
                        </div>
                    </div>
                </motion.div>

                {/* ── FILTERS ── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.05 } }} className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search students by name, course, batch..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-5 py-3.5 text-sm font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#E31E24]/10 focus:border-[#E31E24] transition-all shadow-sm"
                        />
                    </div>

                    {/* Dropdown Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <FilterSelect label="Campus" value={campusFilter} onChange={setCampusFilter} options={dbCampuses} icon="🏫" />
                        <FilterSelect label="College" value={collegeFilter} onChange={setCollegeFilter} options={dbColleges} icon="🏢" />
                        <FilterSelect label="Department" value={deptFilter} onChange={setDeptFilter} options={dbDepartments} icon="🏛️" />
                        <FilterSelect label="Course" value={courseFilter} onChange={setCourseFilter} options={dbCourses} icon="📚" />
                    </div>
                </motion.div>

                {/* ── GRID ── */}
                {loading ? (
                    <DirectorySkeleton />
                ) : filtered.length === 0 ? (
                    <EmptyState hasFilters={search || campusFilter !== 'All' || collegeFilter !== 'All' || deptFilter !== 'All' || courseFilter !== 'All'} onClear={clearAllFilters} />
                ) : (
                    <motion.div variants={grid} initial="hidden" animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        <AnimatePresence>
                            {filtered.map((student) => (
                                <StudentCard
                                    key={student.id}
                                    student={student}
                                    onView={() => navigate(`/student/view/${student.id}`)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function FilterSelect({ label, value, onChange, options, icon, disabled }) {
    const mappedOptions = options.map(opt => ({
        value: opt,
        label: opt === 'All' ? `All ${label === 'Campus' ? 'Campuses' : label + 's'}` : opt
    }));

    return (
        <PremiumSelect
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            options={mappedOptions}
            icon={<span className="text-lg opacity-70">{icon}</span>}
            className="w-full"
        />
    );
}

function StudentCard({ student, onView }) {
    const initials = student.name?.charAt(0) || '?';
    const displayBatch = student.batchName || student.batchId?.slice(0, 8) || null;

    return (
        <motion.div
            layout
            variants={fade}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.9 }}
            className="group bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#E31E24]/10 hover:border-[#E31E24]/30 transition-all duration-300 cursor-pointer flex flex-col"
            onClick={onView}
        >
            <div className="p-6 flex-1 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-4">
                    <div className={`w-20 h-20 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-300 font-black text-3xl shadow-sm overflow-hidden group-hover:border-[#E31E24] group-hover:scale-105 transition-all duration-300`}>
                        {student.photoURL
                            ? <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                            : initials
                        }
                    </div>
                    {/* Small dot indicating active public profile */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    </div>
                </div>

                <h3 className="font-black text-gray-900 text-lg leading-tight truncate w-full group-hover:text-[#E31E24] transition-colors">{student.name}</h3>
                <p className="text-[#E31E24] text-xs font-bold mt-1.5 truncate w-full">
                    {student._resolvedCourse || 'Student'}
                </p>
                <p className="text-gray-400 text-[10px] font-bold mt-1 truncate w-full uppercase tracking-wider">
                    {student._resolvedCollege || student._resolvedCampus || 'Not Assigned'}
                </p>

                {/* Metadata tags */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                    {student.currentSemester && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#E31E24]/10 text-[#E31E24] uppercase">
                            Sem {student.currentSemester}
                        </span>
                    )}
                    {displayBatch && (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                            {displayBatch}
                        </span>
                    )}
                </div>
            </div>

            {/* View Profile Bar */}
            <div className="border-t border-gray-50 bg-gray-50 flex items-center justify-center gap-2 p-3.5 group-hover:bg-[#E31E24] transition-colors duration-300">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">
                    View Profile
                </span>
                <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
        </motion.div>
    );
}

function DirectorySkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-3xl overflow-hidden animate-pulse flex flex-col items-center p-6 pb-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full mb-4" />
                    <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-3" />
                    <div className="h-3 bg-gray-100 rounded-lg w-1/2 mb-4" />
                    <div className="flex gap-2 w-full justify-center">
                        <div className="h-5 bg-gray-100 rounded w-12" />
                        <div className="h-5 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="w-full h-10 bg-gray-50 mt-6 rounded-xl" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ hasFilters, onClear }) {
    return (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed shadow-sm">
            <div className="text-5xl mb-4 opacity-50">🔍</div>
            <p className="font-black text-gray-700 text-xl tracking-tight">
                {hasFilters ? 'No matches found' : 'No public profiles found'}
            </p>
            <p className="text-sm text-gray-400 mt-2 font-semibold">
                {hasFilters ? 'Try adjusting your search or filters.' : 'Students with public visibility will appear here.'}
            </p>
            {hasFilters && (
                <button
                    onClick={onClear}
                    className="mt-6 px-6 py-2.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors text-sm shadow-sm"
                >
                    Clear All Filters
                </button>
            )}
        </div>
    );
}
