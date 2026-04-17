// ============================================
// BDCS - Promote to HOD Confirmation Modal
// Confirms teacher promotion with department selection
// Portal-powered for consistent viewport coverage
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { promoteTeacherToHOD } from '../../services/promotionService';
import { toast } from '../admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';
import { useScrollLock } from '../../hooks/useScrollLock';

export default function PromoteToHODModal({ teacher, currentUser, onClose, onSuccess }) {
    useScrollLock(true);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadAvailableDepartments(); }, []);

    const loadAvailableDepartments = async () => {
        setLoading(true);
        try {
            const deptQuery = query(collection(db, 'departments'), where('collegeId', '==', currentUser.collegeId));
            const snapshot = await getDocs(deptQuery);
            setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { toast.error('Failed to load departments'); } finally { setLoading(false); }
    };

    const handlePromote = async (e) => {
        if (e) e.preventDefault();
        if (!selectedDepartmentId) { toast.error('Please select a department'); return; }
        const selectedDept = departments.find(d => d.id === selectedDepartmentId);
        if (selectedDept.currentHOD) { toast.error(`${selectedDept.name} already has an active HOD.`); return; }
        
        setSubmitting(true);
        try {
            await promoteTeacherToHOD(teacher.id, selectedDepartmentId, currentUser);
            toast.success(`${teacher.name} promoted to Domain Header!`);
            onSuccess && onSuccess(); onClose();
        } catch (error) { toast.error(error.message || 'Promotion failed'); } finally { setSubmitting(false); }
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
                    className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-[#E31E24] to-red-800 p-8 shrink-0">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                    Promote to Head
                                </h2>
                                <p className="text-[10px] font-bold text-red-100 uppercase tracking-widest mt-1 opacity-60">Candidate: {teacher.name}</p>
                            </div>
                            <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Meta Section */}
                    <div className="p-8 pb-0 shrink-0">
                        <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl shrink-0">⚡</div>
                            <div>
                                <h3 className="text-xs font-black text-blue-900 uppercase tracking-tight">Authority Elevation</h3>
                                <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tighter opacity-70 mt-0.5">Teacher will gain absolute domain control while maintaining existing class data.</p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <form onSubmit={handlePromote} className="p-8 pb-4 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Domain Jurisdiction</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                {loading ? [1,2,3].map(i=><div key={i} className="h-16 animate-pulse bg-gray-100 rounded-2xl" />) : 
                                    departments.map(dept => <DeptItem key={dept.id} dept={dept} isSelected={selectedDepartmentId === dept.id} onSelect={() => setSelectedDepartmentId(dept.id)} />)}
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="p-8 pt-0 flex gap-3 mt-auto">
                        <Button variant="secondary" onClick={onClose} className="flex-1 py-4 text-[10px]">Discard</Button>
                        <Button onClick={handlePromote} disabled={submitting || !selectedDepartmentId} className="flex-2 py-4 text-[10px]">
                            {submitting ? 'Elevating...' : 'Commit Promotion'}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}

const DeptItem = ({ dept, isSelected, onSelect }) => {
    const hasHOD = !!dept.currentHOD;
    return (
        <label className={`flex items-center gap-4 p-4 rounded-2xl transition-all border shrink-0 ${hasHOD ? 'bg-gray-50 opacity-40 cursor-not-allowed' : isSelected ? 'bg-red-50 border-[#E31E24] shadow-md cursor-pointer' : 'bg-white border-gray-100 hover:bg-gray-50 cursor-pointer'}`}>
            <input type="radio" value={dept.id} checked={isSelected} onChange={onSelect} disabled={hasHOD} className="hidden" />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isSelected ? 'bg-[#E31E24] text-white' : 'bg-gray-100 text-gray-400'}`}>{dept.name?.[0]}</div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-black truncate ${isSelected ? 'text-[#E31E24]' : 'text-gray-900'}`}>{dept.name}</p>
                <p className="text-[10px] font-bold text-gray-400 truncate uppercase mt-0.5">{dept.code || 'NO-CODE'}</p>
            </div>
            {hasHOD && <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">🔒 Occuppied</span>}
        </label>
    );
}
