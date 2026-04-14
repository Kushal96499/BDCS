
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function PrincipalCouncil() {
    const [departments, setDepartments] = useState([]);
    const [councilData, setCouncilData] = useState({}); // { deptId: { president: {}, members: [] } }
    const [loading, setLoading] = useState(true);
    const [selectedDeptId, setSelectedDeptId] = useState(null);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        try {
            // 1. Fetch Departments
            const deptSnap = await getDocs(query(collection(db, 'departments'), orderBy('name')));
            const deptList = deptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDepartments(deptList);

            // 2. Fetch ALL Council Members
            // (In a large app, we might paginate, but council is small < 100 students total mostly)
            const q = query(
                collection(db, 'users'),
                where('councilRole', '!=', null)
                // Index might be needed: councilRole ASC or similar. 
                // Ideally: where('councilRole', 'in', ['president', 'member'])
                // But != null works if we only store 'president'/'member'.
            );

            // To be safe with indexes, let's just fetch all councilRole != null if possible, 
            // or fetch by department loops if index is missing.
            // Let's try the simple query.
            const userSnap = await getDocs(q);

            const mapping = {};
            deptList.forEach(d => mapping[d.id] = { president: null, members: [] });

            userSnap.docs.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                if (mapping[user.departmentId]) {
                    if (user.councilRole === 'president') {
                        mapping[user.departmentId].president = user;
                    } else {
                        mapping[user.departmentId].members.push(user);
                    }
                }
            });

            setCouncilData(mapping);

        } catch (error) {
            console.error("Error loading council data:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 pb-20">
            <header>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Student Council Overview</h1>
                <p className="text-gray-500 font-medium mt-1">Manage and view valid council bodies across all departments.</p>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map(dept => {
                        const data = councilData[dept.id] || { president: null, members: [] };
                        const hasPresident = !!data.president;

                        return (
                            <motion.div
                                key={dept.id}
                                layoutId={dept.id}
                                onClick={() => setSelectedDeptId(dept.id)}
                                className={`relative group cursor-pointer overflow-hidden rounded-[2rem] border transition-all duration-300
                                    ${hasPresident ? 'bg-white border-gray-200 hover:shadow-xl hover:border-red-200' : 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-100'}
                                `}
                            >
                                {/* Header Color Strip */}
                                <div className={`h-2 w-full ${hasPresident ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gray-200'}`}></div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{dept.name}</h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Department</p>
                                        </div>
                                        {hasPresident ? (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                No Council
                                            </span>
                                        )}
                                    </div>

                                    {/* President Display */}
                                    <div className="mb-6">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">President</p>
                                        {data.president ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center font-bold shadow-sm">
                                                    {data.president.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{data.president.name}</p>
                                                    <p className="text-xs text-gray-500">{data.president.rollNumber}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 opacity-50">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-dashed border-gray-300"></div>
                                                <p className="text-xs font-bold text-gray-400 italic">Position Vacant</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Members Count */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <div className="flex -space-x-2">
                                            {data.members.slice(0, 3).map((m, i) => (
                                                <div key={m.id} className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                    {m.name[0]}
                                                </div>
                                            ))}
                                            {data.members.length > 3 && (
                                                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                    +{data.members.length - 3}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 group-hover:text-red-500 transition-colors">
                                            {data.members.length} Members &rarr;
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Detailed View Modal (Simple overlay for now) */}
            <AnimatePresence>
                {selectedDeptId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedDeptId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">
                                        {departments.find(d => d.id === selectedDeptId)?.name}
                                    </h2>
                                    <p className="text-gray-500 font-bold text-sm">Council Roster</p>
                                </div>
                                <button onClick={() => setSelectedDeptId(null)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto max-h-[60vh]">
                                {councilData[selectedDeptId]?.president && (
                                    <div className="mb-8 p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center text-xl font-black shadow-lg">
                                            {councilData[selectedDeptId].president.name[0]}
                                        </div>
                                        <div>
                                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide">President</span>
                                            <h3 className="text-lg font-bold text-gray-900 mt-1">{councilData[selectedDeptId].president.name}</h3>
                                            <p className="text-sm text-gray-500">{councilData[selectedDeptId].president.email}</p>
                                        </div>
                                    </div>
                                )}

                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                                    Council Members
                                </h4>
                                <div className="space-y-2">
                                    {councilData[selectedDeptId]?.members.length > 0 ? (
                                        councilData[selectedDeptId].members.map(m => (
                                            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {m.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                                                        <p className="text-xs text-gray-400">{m.rollNumber}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400">{m.batchName || 'Unknown Batch'}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-400 italic py-4">No other members appointed.</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
