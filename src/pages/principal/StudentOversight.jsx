import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { getCollegeDepartments } from '../../services/principalService';

export default function StudentOversight() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [debugData, setDebugData] = useState([]); // Store sample users for debugging

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
            console.log("FETCHING STUDENTS FOR COLLEGE:", user.collegeId);

            // 1. Fetch Departments
            const depts = await getCollegeDepartments(user.collegeId);
            setDepartments(depts);

            // 2. Fetch All Students (Strict)
            const strictQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('role', '==', 'student')
            );
            const snapshot = await getDocs(strictQuery);
            const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log("FOUND STUDENTS:", studentData.length);
            setStudents(studentData);

            // 3. DEBUG: Fetch any 5 users to check schema if no students found
            if (studentData.length === 0) {
                console.log("NO STUDENTS FOUND. RUNNING DEBUG QUERY...");
                const debugQuery = query(collection(db, 'users'), limit(5));
                const debugSnap = await getDocs(debugQuery);
                const debugRes = debugSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log("DEBUG DATA:", debugRes);
                setDebugData(debugRes);
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesDept = filters.departmentId === 'all' || student.departmentId === filters.departmentId;
            const matchesSem = filters.semester === 'all' || String(student.currentSemester) === filters.semester;
            const matchesSearch = filters.search === '' ||
                student.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                student.email?.toLowerCase().includes(filters.search.toLowerCase());

            return matchesDept && matchesSem && matchesSearch;
        });
    }, [students, filters]);

    // Helper to get Dept Code
    const getDeptCode = (deptId, deptName) => {
        const dept = departments.find(d => d.id === deptId || d.name === deptName);
        if (dept?.code) return dept.code;

        // Fallback: Generate Initials
        if (deptName) {
            return deptName.split(' ')
                .map(w => w[0])
                .join('')
                .toUpperCase()
                .substring(0, 4);
        }
        return 'N/A';
    };

    // Analytics Logic
    const stats = useMemo(() => {
        const deptCounts = {};
        students.forEach(s => {
            // Use Code for grouping if possible, effectively grouping by department
            const code = getDeptCode(s.departmentId, s.departmentName);
            deptCounts[code] = (deptCounts[code] || 0) + 1;
        });
        return {
            total: students.length,
            deptDistribution: Object.entries(deptCounts).sort((a, b) => b[1] - a[1])
        };
    }, [students, departments]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Student Oversight</h1>
                <p className="text-gray-600">Manage students for {user?.collegeName}</p>
            </div>

            {/* DEBUG SECTION REMOVED (Clean UI) */}

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="text-gray-500 animate-pulse">Loading data...</span>
                </div>
            ) : (
                <>
                    {/* Analytics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-lg">
                            <p className="text-sm font-medium opacity-80 uppercase">Total Students</p>
                            <p className="text-4xl font-bold mt-1">{stats.total}</p>
                        </div>
                        <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-2">Department Breakdown</h3>
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {stats.deptDistribution.map(([code, count]) => (
                                    <div key={code} className="flex flex-col items-center">
                                        <div className="h-16 w-8 bg-blue-100 rounded-t-lg relative group">
                                            <div style={{ height: `${(count / stats.total) * 100}%` }} className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all"></div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 mt-1 truncate w-16 text-center">{code}</span>
                                        <span className="text-xs text-gray-400">{count}</span>
                                    </div>
                                ))}
                                {stats.deptDistribution.length === 0 && <span className="text-gray-400 text-sm">No data</span>}
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 items-center">
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="px-4 py-2 border rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-biyani-red focus:border-transparent outline-none"
                            value={filters.search}
                            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                        />
                        <select
                            className="px-4 py-2 border rounded-lg text-sm transition-colors cursor-pointer hover:border-gray-400 focus:ring-2 focus:ring-biyani-red focus:border-transparent outline-none"
                            value={filters.departmentId}
                            onChange={e => setFilters(p => ({ ...p, departmentId: e.target.value }))}
                        >
                            <option value="all">All Departments</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select
                            className="px-4 py-2 border rounded-lg text-sm transition-colors cursor-pointer hover:border-gray-400 focus:ring-2 focus:ring-biyani-red focus:border-transparent outline-none"
                            value={filters.semester}
                            onChange={e => setFilters(p => ({ ...p, semester: e.target.value }))}
                        >
                            <option value="all">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                    </div>

                    {/* Card Table Hybrid */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500">Loading...</div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-16 text-center">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <h3 className="text-gray-900 font-bold text-lg mb-1">No Students Found</h3>
                                <p className="text-gray-500">Try adjusting your filters or search query.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredStudents.map(student => (
                                    <div key={student.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row items-center gap-4 group">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                            {student.name?.charAt(0)}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 text-center sm:text-left min-w-0">
                                            <h4 className="font-bold text-gray-900 truncate">{student.name}</h4>
                                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">{student.email}</span>
                                                <span className="hidden sm:inline text-gray-300">•</span>
                                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    {getDeptCode(student.departmentId, student.departmentName)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Semester Badge */}
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Semester</span>
                                                <span className="text-lg font-bold text-gray-900">{student.currentSemester || 1}</span>
                                            </div>
                                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
