// ============================================
// BDCS - HOD Assignment Modal Component
// Assign or change HOD with self-assignment support
// Portal-powered for reliable screen coverage
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { assignHOD, changeHOD } from '../../services/principalService';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';
import { useScrollLock } from '../../hooks/useScrollLock';

export default function HODAssignmentModal({ department, currentUser, onClose, onSuccess }) {
    useScrollLock(true);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadEligibleUsers(); }, [department]);

    const loadEligibleUsers = async () => {
        setLoading(true);
        try {
            const usersQuery = query(collection(db, 'users'), where('collegeId', '==', department.collegeId), where('status', '==', 'active'));
            const snapshot = await getDocs(usersQuery);
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(allUsers.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('hod')) || (u.roles && u.roles.includes('principal')) || u.id === currentUser.uid));
        } catch (error) { toast.error('Failed to load users'); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!selectedUserId) { toast.error('Please select a user'); return; }
        setSubmitting(true);
        try {
            if (department.currentHOD) await changeHOD(department.id, selectedUserId, department.currentHOD, new Date(effectiveDate), currentUser);
            else await assignHOD(department.id, selectedUserId, new Date(effectiveDate), currentUser);
            toast.success('HOD assignment successful!');
            onSuccess();
            onClose();
        } catch (error) { toast.error(error.message || 'Failed to assign HOD'); } finally { setSubmitting(false); }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-[#E31E24] to-red-800 p-8 shrink-0 relative overflow-hidden">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="text-white">
                                <h2 className="text-2xl font-black tracking-tight leading-tight">{department.currentHOD ? 'Change Domain Head' : 'Appoint New Head'}</h2>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1 bg-black/10 inline-block px-3 py-1 rounded-lg border border-white/5">Dept: {department.name}</p>
                            </div>
                            <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-gray-50/30 space-y-8 overscroll-contain custom-scrollbar">
                        {/* Current Status Alert */}
                        {department.currentHOD && (
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 flex items-start gap-4 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">⚠️</div>
                                <div>
                                    <p className="text-sm font-black text-amber-900 leading-tight">Current Header Active: {department.currentHODName}</p>
                                    <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase tracking-tight">Appointing a new head will automatically decommission the previous holder's authority.</p>
                                </div>
                            </div>
                        )}

                        {/* Eligible Candidates */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Eligible Candidates</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto border-y border-gray-100 py-4 custom-scrollbar">
                                {loading ? [1,2,3].map(i=><div key={i} className="h-16 animate-pulse bg-gray-100 rounded-2xl" />) : 
                                    users.map(u => <CandidateItem key={u.id} user={u} isSelected={selectedUserId === u.id} onSelect={() => setSelectedUserId(u.id)} isSelf={u.id === currentUser.uid} />)}
                            </div>
                        </div>

                        {/* Config */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Configuration</h3>
                            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Effective Tenure Start</label>
                                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#E31E24] transition-all" required />
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="p-8 border-t border-gray-50 bg-white shrink-0 flex items-center justify-between gap-4">
                         {department.currentHOD && (
                            <button type="button" onClick={async () => {
                                if (!confirm('Decommission current head?')) return;
                                setSubmitting(true);
                                try {
                                    await updateDoc(doc(db, 'departments', department.id), { currentHOD: null, currentHODName: null, currentHODEmail: null, updatedAt: serverTimestamp() });
                                    toast.success('HOD unassigned');
                                    onSuccess(); onClose();
                                } finally { setSubmitting(false); }
                            }} className="px-6 py-3 text-[10px] font-black text-red-600 border border-red-50 hover:bg-red-50 rounded-xl uppercase tracking-widest transition-all">Decommission Header</button>
                         )}
                         <div className="flex gap-3 ml-auto">
                            <Button variant="secondary" onClick={onClose} className="px-8 py-3 text-[10px]">Discard</Button>
                            <Button onClick={handleSubmit} disabled={submitting || !selectedUserId} className="px-8 py-3 text-[10px]">{submitting ? 'Processing...' : 'Commit Assignment'}</Button>
                         </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

const CandidateItem = ({ user, isSelected, onSelect, isSelf }) => (
    <div onClick={onSelect} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-red-50 border-[#E31E24] shadow-md' : 'bg-white border-transparent hover:bg-gray-50'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isSelected ? 'bg-[#E31E24] text-white' : 'bg-gray-100 text-gray-400'}`}>{user.name?.[0]}</div>
        <div className="flex-1 min-w-0">
            <p className={`text-sm font-black truncate ${isSelected ? 'text-[#E31E24]' : 'text-gray-900'}`}>{user.name} {isSelf && '(YOU)'}</p>
            <p className="text-[10px] font-bold text-gray-400 truncate uppercase mt-0.5">{user.email}</p>
        </div>
        {user.roles?.includes('hod') && <span className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded font-black uppercase">Active HOD</span>}
    </div>
);
