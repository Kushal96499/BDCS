// ============================================
// BDCS - Demote HOD to Teacher Confirmation Modal
// Confirms HOD demotion with reason and ownership transfer
// Portal-powered for reliable screen coverage
// ============================================

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { demoteHODToTeacher } from '../../services/promotionService';
import { toast } from '../admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';

export default function DemoteHODModal({ hod, department, currentUser, onClose, onSuccess }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleDemote = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            const result = await demoteHODToTeacher(hod.id, department.id, reason, currentUser);
            toast.success(`${hod.name} demoted from Header role.`);
            onSuccess && onSuccess(result);
            onClose();
        } catch (error) { toast.error(error.message || 'Failure in demotion'); } finally { setSubmitting(false); }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-orange-600 to-red-800 p-8 shrink-0 relative overflow-hidden">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="text-white">
                                <h2 className="text-2xl font-black tracking-tight leading-tight flex items-center gap-3">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                                    Revoke Headship
                                </h2>
                                <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mt-1 opacity-60">Subject: {hod.name}</p>
                            </div>
                            <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Meta Banner */}
                    <div className="p-8 pb-0 shrink-0">
                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">📉</div>
                            <div>
                                <h3 className="text-xs font-black text-amber-900 uppercase tracking-tight leading-tight">Privilege Reduction</h3>
                                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tighter opacity-70 mt-0.5">Role will be reverted to standard Teacher rank. Jurisdiction over {department.name} will be terminated.</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleDemote} className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">De-elevation Memo</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Formal reason for domain revocation..."
                                rows={3}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#E31E24] transition-all resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" onClick={onClose} className="flex-1 py-4 text-[10px]">Discard</Button>
                            <Button onClick={handleDemote} disabled={submitting} className="flex-2 py-4 text-[10px]">
                                {submitting ? 'Processing...' : 'Commit Demotion'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
