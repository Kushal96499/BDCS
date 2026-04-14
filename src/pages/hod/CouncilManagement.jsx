import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CouncilManagement() {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    const [councilMembers, setCouncilMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(true);

    useEffect(() => {
        if (user?.departmentId) {
            fetchBatches();
            fetchCouncilMembers();
        }
    }, [user]);

    const fetchCouncilMembers = async () => {
        try {
            const q = query(
                collection(db, 'users'),
                where('departmentId', '==', user.departmentId),
                where('councilRole', 'in', ['president', 'member'])
            );
            const snap = await getDocs(q);
            setCouncilMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error fetching council:', error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const fetchBatches = async () => {
        try {
            const q = query(
                collection(db, 'batches'),
                where('departmentId', '==', user.departmentId),
                where('status', '==', 'active')
            );
            const snap = await getDocs(q);
            setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStudents = async (batchId) => {
        if (!batchId) return;
        setSearching(true);
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'student'),
                where('batchId', '==', batchId)
            );
            const snap = await getDocs(q);
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error(error);
            toast.error("Failed to load students");
        } finally {
            setSearching(false);
        }
    };

    const handleBatchChange = (e) => {
        const id = e.target.value;
        setSelectedBatchId(id);
        fetchStudents(id);
    };

    const toggleRole = async (studentId, currentRole, targetRole) => {
        const newRole = currentRole === targetRole ? null : targetRole;
        try {
            // Strict Department-Wide Check for President
            if (newRole === 'president') {
                const q = query(
                    collection(db, 'users'),
                    where('departmentId', '==', user.departmentId),
                    where('councilRole', '==', 'president')
                );
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const existingPres = snap.docs[0].data();
                    if (existingPres.id !== studentId) {
                        alert(`Action Blocked: ${existingPres.name} is already the President for this Department.\n\nPlease remove them first to appoint a new President.`);
                        return;
                    }
                }
            }

            const { updateDoc, doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'users', studentId), { councilRole: newRole });

            toast.success(`Role updated to ${newRole || 'None'}`);
            fetchStudents(selectedBatchId);
            fetchCouncilMembers(); // Refresh global list
        } catch (error) {
            console.error(error);
            toast.error("Update failed");
        }
    };

    return (
        <div className="space-y-8 pb-20 p-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Council Management</h1>
                    <p className="text-gray-500 font-medium mt-1">Appoint Batch Presidents and Council Members</p>
                </div>
            </header>

            {/* Existing Council Members Summary */}
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
                    Current Council ({councilMembers.length})
                </h3>

                {loadingMembers ? (
                    <div className="flex gap-2">
                        <div className="h-12 w-12 bg-gray-100 rounded-full animate-pulse"></div>
                        <div className="h-12 w-12 bg-gray-100 rounded-full animate-pulse"></div>
                        <div className="h-12 w-12 bg-gray-100 rounded-full animate-pulse"></div>
                    </div>
                ) : councilMembers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {councilMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-md
                                    ${member.councilRole === 'president' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                                    {member.name?.[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md
                                        ${member.councilRole === 'president' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {member.councilRole}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 italic">No council members appointed yet.</p>
                )}
            </div>

            {/* Batch Selection & Management */}
            <div className="space-y-4">
                <div className="w-full md:w-64">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Select Batch to Appoint</label>
                    <select
                        value={selectedBatchId}
                        onChange={handleBatchChange}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                    >
                        <option value="">-- Choose Batch --</option>
                        {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {!selectedBatchId ? (
                    <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-gray-100 italic text-gray-400">
                        Select a batch above to manage its student council.
                    </div>
                ) : searching ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Student List ({students.length})</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white">
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                        <th className="px-8 py-4">Student</th>
                                        <th className="px-8 py-4">Current Role</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => (
                                        <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black">
                                                        {student.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{student.enrollmentNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                {student.councilRole ? (
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm
                                                        ${student.councilRole === 'president' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {student.councilRole}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">General Student</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => toggleRole(student.id, student.councilRole, 'president')}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                                            ${student.councilRole === 'president' ? 'bg-black text-white' : 'bg-yellow-400 text-yellow-900 hover:shadow-lg'}`}
                                                    >
                                                        {student.councilRole === 'president' ? 'Revoke Pres' : 'Set President'}
                                                    </button>
                                                    <button
                                                        onClick={() => toggleRole(student.id, student.councilRole, 'member')}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                                            ${student.councilRole === 'member' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                    >
                                                        {student.councilRole === 'member' ? 'Remove Mem' : 'Add Member'}
                                                    </button>
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

            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4 items-start">
                <span className="text-2xl">ℹ️</span>
                <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-1">How it works</h4>
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                        Appointing a **President** allows that student to propose events from their panel. Proposals are sent to you for first-level approval. Council Members help organize and represent the batch.
                    </p>
                </div>
            </div>
        </div>
    );
}
