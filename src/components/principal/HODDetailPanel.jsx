// ============================================
// BDCS - HOD Detail Panel (Principal)
// Comprehensive HOD management with full admin features
// Portaled to ensure full-screen coverage
// ============================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../admin/Toast';
import { format } from 'date-fns';
import { demoteHODToTeacher } from '../../services/promotionService';
import { motion, AnimatePresence } from 'framer-motion';

export default function HODDetailPanel({ hod, onClose, onUpdate }) {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: hod.name || '',
        email: hod.email || '',
        phone: hod.phone || '',
        departmentId: hod.departmentId || '',
        departmentName: hod.departmentName || ''
    });

    useEffect(() => { loadDepartments(); }, []);
    useEffect(() => { if (activeTab === 'audit') fetchAuditLogs(); }, [activeTab]);

    const loadDepartments = async () => {
        try {
            const deptsQuery = query(collection(db, 'departments'), where('collegeId', '==', hod.collegeId));
            const snapshot = await getDocs(deptsQuery);
            setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        } catch (error) {}
    };

    const fetchAuditLogs = async () => {
        setLogsLoading(true);
        try {
            const subjectQuery = query(collection(db, 'auditLogs'), where('documentId', '==', hod.id), orderBy('timestamp', 'desc'), limit(20));
            const snapshot = await getDocs(subjectQuery);
            setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } finally { setLogsLoading(false); }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', hod.id), {
                ...formData,
                departmentName: departments.find(d => d.id === formData.departmentId)?.name || null
            });
            toast.success('HOD updated');
            setIsEditing(false);
            onUpdate();
        } finally { setLoading(false); }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {hod && (
                <div className="fixed inset-0 z-[900] overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="absolute right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#E31E24] to-red-800 text-white p-6 sm:p-8 shrink-0 relative overflow-hidden">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black border border-white/20">
                                        {hod.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight">{hod.name}</h2>
                                        <p className="text-xs text-red-100/60 font-bold uppercase tracking-widest">{hod.email}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-gray-50 flex px-4">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id ? 'border-[#E31E24] text-[#E31E24]' : 'border-transparent text-gray-400'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 space-y-6 no-scrollbar">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                        <h3 className="text-lg font-black text-gray-900 mb-6">Staff Profile</h3>
                                        <div className="grid grid-cols-2 gap-8">
                                            <DetailItem label="Full Name" value={hod.name} />
                                            <DetailItem label="Official Email" value={hod.email} />
                                            <DetailItem label="Department" value={hod.departmentName} />
                                            <DetailItem label="Status" value={hod.status} isStatus />
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4">
                                        <button onClick={handleRelieve} className="flex-1 p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 text-xs font-black uppercase tracking-widest hover:bg-orange-100 transition-all">Relieve HOD</button>
                                        <button onClick={handleRevokeHOD} className="flex-1 p-4 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100 text-xs font-black uppercase tracking-widest hover:bg-yellow-100 transition-all">Revoke HOD Role</button>
                                        <button onClick={handleForceDelete} className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all">Initial Purge</button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <div className="space-y-4">
                                    {auditLogs.map(log => (
                                        <div key={log.id} className="bg-white border border-gray-100 rounded-[1.5rem] p-6">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#E31E24]">{log.action}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{format(log.timestamp?.toDate ? log.timestamp.toDate() : new Date(), 'PP')}</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-700">{log.details || log.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

const DetailItem = ({ label, value, isStatus }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {isStatus ? (
            <div><span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${value === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{value}</span></div>
        ) : (
            <p className="text-sm font-bold text-gray-900">{value || 'N/A'}</p>
        )}
    </div>
);
const tabs = [{ id: 'profile', label: 'Identity' }, { id: 'audit', label: 'Audit' }];
