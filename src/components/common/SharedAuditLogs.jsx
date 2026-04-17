// ============================================
// BDCS - Shared Audit Logs Component
// Standardized logger view for all administrative roles
// Modernized with Server-Side Firestore Pagination
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, limit, getDocs, where, startAfter, endBefore, limitToLast } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Select from './Select';
import Button from '../Button';
import { useScrollLock } from '../../hooks/useScrollLock';

const toPastTense = (verb) => {
    if (!verb) return '';
    const word = verb.toLowerCase();
    if (word.endsWith('e')) return word + 'd';
    if (word.endsWith('sh')) return word + 'ed';
    return word + 'ed';
};

const getActionColor = (action) => {
    if (!action) return 'bg-gray-100 text-gray-800';
    const a = action.toLowerCase();
    if (a.includes('create') || a === 'enable') return 'bg-emerald-100/10 text-emerald-600';
    if (a.includes('delete') || a.includes('remove') || a === 'disable') return 'bg-red-100/10 text-red-600';
    if (a.includes('update') || a.includes('change')) return 'bg-blue-100/10 text-blue-600';
    if (a.includes('assign')) return 'bg-purple-100/10 text-purple-600';
    return 'bg-gray-100 text-gray-600';
};

export default function SharedAuditLogs({ title, subtitle }) {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    useScrollLock(isModalOpen);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [lastVisible, setLastVisible] = useState(null);
    const [firstVisible, setFirstVisible] = useState(null);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);

    const rowsPerPageOptions = [
        { value: 10, label: '10 Logs' },
        { value: 25, label: '25 Logs' },
        { value: 50, label: '50 Logs' },
        { value: 100, label: '100 Logs' }
    ];

    const fetchLogs = useCallback(async (direction = 'initial') => {
        if (!user?.uid) return;
        
        try {
            setLoading(true);
            let q;
            const baseRef = collection(db, 'auditLogs');
            let constraints = [orderBy('timestamp', 'desc')];

            // Role-based constraints
            if (user.role === 'hod') {
                constraints.push(where('performerDept', '==', user.departmentName));
            } else if (user.role === 'teacher') {
                constraints.push(where('performedBy', '==', user.uid));
            }

            // Pagination logic
            if (direction === 'next' && lastVisible) {
                constraints.push(startAfter(lastVisible));
                constraints.push(limit(rowsPerPage));
            } else if (direction === 'prev' && firstVisible) {
                constraints.push(endBefore(firstVisible));
                constraints.push(limitToLast(rowsPerPage));
            } else {
                constraints.push(limit(rowsPerPage));
            }

            q = query(baseRef, ...constraints);
            const snap = await getDocs(q);
            
            if (snap.empty) {
                if (direction === 'initial') setLogs([]);
                setHasNext(false);
                setLoading(false);
                return;
            }

            const pageLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // For Principal role, we do a client-side filter due to complex permission logic
            // but we fetch a larger chunk to ensure we have enough after filtering
            if (user.role === 'principal') {
                const collegeName = user?.collegeName || '';
                let filtered = pageLogs.filter(log => {
                    const role = log.performedByRole || '';
                    if (['admin', 'director'].includes(role)) return false;
                    const isInCollege = (log.performerCollege && log.performerCollege === collegeName) || 
                                      log.entityPath?.includes(collegeName) || 
                                      log.metadata?.collegeName === collegeName;
                    const isSubordinate = ['hod', 'teacher', 'clerk', 'exam_cell', 'placement', 'hr', 'sports', 'transport'].includes(role);
                    return isInCollege && (isSubordinate || log.performedBy === user.uid);
                });
                setLogs(filtered);
            } else {
                setLogs(pageLogs);
            }

            setFirstVisible(snap.docs[0]);
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setHasPrev(direction !== 'initial' && currentPage > 1);
            
            // Check for next page
            const nextQ = query(baseRef, ...constraints, startAfter(snap.docs[snap.docs.length - 1]), limit(1));
            const nextSnap = await getDocs(nextQ);
            setHasNext(!nextSnap.empty);

        } catch (error) {
            console.error("Audit pagination error:", error);
        } finally {
            setLoading(false);
        }
    }, [user, rowsPerPage, lastVisible, firstVisible, currentPage]);

    useEffect(() => {
        fetchLogs('initial');
    }, [user?.role, rowsPerPage]);

    const handleNext = () => {
        setCurrentPage(p => p + 1);
        fetchLogs('next');
    };

    const handlePrev = () => {
        setCurrentPage(p => Math.max(1, p - 1));
        fetchLogs('prev');
    };

    // Client-side filtering for search/action type (on top of current page)
    const displayLogs = logs.filter(log => {
        const matchesAction = filterAction === 'all' || log.action === filterAction;
        const s = searchQuery.toLowerCase();
        const matchesSearch = s === '' || 
                            log.entityLabel?.toLowerCase().includes(s) || 
                            log.action?.toLowerCase().includes(s) || 
                            log.performedByName?.toLowerCase().includes(s);
        return matchesAction && matchesSearch;
    });

    const uniqueActions = ['all', ...new Set(logs.map(log => log.action))];
    const actionOptions = uniqueActions.map(a => ({ 
        value: a, 
        label: a === 'all' ? 'Specific Filter' : a.replace('_', ' ').toUpperCase() 
    }));

    return (
        <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-red-50 flex items-center justify-center p-2.5">
                        <img src="/assets/biyani-logo.png" alt="Biyani" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{title || 'Audit Registry'}</h1>
                        <p className="text-[10px] font-bold text-[#E31E24] uppercase tracking-widest mt-2 flex items-center gap-2">
                             <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                             {subtitle || 'Institutional Transaction Log'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <button onClick={() => { setCurrentPage(1); fetchLogs('initial'); }} className="p-3 bg-white border border-gray-100 shadow-sm rounded-2xl hover:bg-gray-50 transition-all active:scale-95" title="Refresh Feed">
                        <svg className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </div>

            {/* Filter Suite */}
            <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                        <Select 
                            label="Rows In Page"
                            name="rowsPerPage"
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            options={rowsPerPageOptions}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <div className="relative group">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Transaction Search</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={3}/></svg>
                                </span>
                                <input 
                                    type="text" 
                                    placeholder="Entity name, actor or action ID..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:border-[#E31E24] focus:ring-4 focus:ring-red-500/5 outline-none text-sm font-bold text-gray-900 transition-all placeholder:text-gray-300" 
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <Select 
                            label="Action Filter"
                            name="filterAction"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            options={actionOptions}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden flex flex-col min-h-[500px] shadow-2xl shadow-gray-200/50">
                <div className="flex-1 p-8 sm:p-12 overflow-x-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <div className="w-12 h-12 border-4 border-gray-50 border-t-[#E31E24] rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Synchronizing Registry...</p>
                        </div>
                    ) : displayLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-40">
                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2}/></svg>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">No matching transactions isolated in this sector.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-100 ml-3 space-y-12 pb-6">
                            {displayLogs.map((log) => {
                                const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                                return (
                                    <div key={log.id} className="relative pl-12 group">
                                        <div className="absolute -left-[11px] top-2 z-10 transition-transform group-hover:scale-110">
                                            <div className={`w-5 h-5 rounded-full border-[5px] border-white shadow-md ${log.action?.includes('delete') ? 'bg-red-500' : 'bg-gray-300 group-hover:bg-[#E31E24]'} transition-colors`}></div>
                                        </div>

                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-8 rounded-[2.5rem] hover:bg-gray-50/50 transition-all border border-transparent hover:border-gray-100 group/item relative">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center flex-wrap gap-4 mb-4">
                                                    <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-[0.1em] rounded-lg ${getActionColor(log.action)}`}>
                                                        {log.action?.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2}/></svg>
                                                        {format(date, 'MMM d, yyyy • hh:mm a')}
                                                    </span>
                                                </div>

                                                <h4 className="text-lg font-black text-gray-900 leading-tight tracking-tight">
                                                    {log.entityLabel || 'Redacted Entity'}
                                                    <span className="font-bold text-gray-300 mx-3 lowercase text-sm">was</span>
                                                    <span className="text-[#E31E24] lowercase font-black">{toPastTense(log.action?.split('_')[0])}</span>
                                                </h4>

                                                <div className="flex items-center gap-3 mt-5">
                                                    <div className="flex items-center gap-3 bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm">
                                                        <div className="w-6 h-6 rounded-xl bg-gray-900 flex items-center justify-center text-[9px] font-black text-white group-hover/item:bg-[#E31E24] transition-all uppercase">{log.performedByName?.[0]}</div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-gray-700 tracking-tight leading-none">{log.performedByName}</span>
                                                            <span className="text-[8px] text-gray-400 uppercase font-black mt-1 tracking-widest">{log.performedByRole}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => { setSelectedLog(log); setIsModalOpen(true); }}
                                                className="px-8 py-4 text-[10px] font-black text-gray-400 hover:text-white hover:bg-gray-900 border border-gray-100 rounded-2xl transition-all uppercase tracking-[0.2em] active:scale-95 shadow-sm hover:shadow-xl hover:-translate-y-1"
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Enhanced Pagination Controls */}
                <div className="p-10 border-t border-gray-100 bg-gray-50/20 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                            Institutional Registry Browser 
                        </p>
                        <p className="text-[12px] font-black text-gray-900 tracking-tighter italic">
                            Currently showing sector indices on page {currentPage}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={handlePrev}
                            disabled={currentPage === 1 || loading}
                            className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm disabled:opacity-30 disabled:grayscale hover:bg-gray-900 group transition-all active:scale-90"
                        >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        
                        <div className="px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                             <span className="text-sm font-black text-gray-900 tracking-widest uppercase">Page {currentPage}</span>
                        </div>

                        <button 
                            onClick={handleNext}
                            disabled={!hasNext || loading}
                            className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm disabled:opacity-30 disabled:grayscale hover:bg-gray-900 group transition-all active:scale-90"
                        >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && selectedLog && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-gray-950/80 backdrop-blur-2xl" 
                            onClick={() => setIsModalOpen(false)} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 50, rotateX: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="relative bg-white rounded-[4rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 perspective-1000"
                        >
                            <div className="px-12 py-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-md border border-red-50 flex items-center justify-center p-3">
                                        <img src="/assets/biyani-logo.png" alt="Biyani" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">Registry Isolation</h3>
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest py-1 px-3 bg-red-50 rounded-lg border border-red-100">TX-ID: {selectedLog.id.slice(0, 14).toUpperCase()}</span>
                                            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedLog.collection}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white hover:bg-red-500 rounded-[1.5rem] text-gray-300 hover:text-white transition-all border border-gray-100 shadow-sm active:scale-90 group">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>

                            <div className="p-12 overflow-y-auto space-y-12 custom-scrollbar overscroll-contain">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <DataPoint label="Protocol Classification" value={selectedLog.action?.toUpperCase()} isAction color={getActionColor(selectedLog.action)} />
                                    <DataPoint label="Isolation Timestamp" value={format(selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate() : new Date(selectedLog.timestamp), 'PPP pp')} />
                                    <DataPoint label="Authorized Actor" value={selectedLog.performedByName} subValue={selectedLog.performedByRole} />
                                    <DataPoint label="Target Entity" value={selectedLog.entityLabel} subValue={selectedLog.entityType} />
                                </div>

                                {selectedLog.entityPath && (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-3">
                                            <div className="w-2 h-4 bg-[#E31E24] rounded-full" />
                                            Administrative Jurisdiction
                                        </label>
                                        <div className="p-8 bg-gray-900 rounded-[2.5rem] text-[11px] font-mono font-black text-white/60 break-all leading-relaxed shadow-2xl border border-white/5">
                                            {selectedLog.entityPath}
                                        </div>
                                    </div>
                                )}

                                {((selectedLog.before && typeof selectedLog.before === 'object' && Object.keys(selectedLog.before).length > 0) || (selectedLog.after && typeof selectedLog.after === 'object' && Object.keys(selectedLog.after).length > 0)) ? (
                                    <div className="space-y-10">
                                        {selectedLog.before && typeof selectedLog.before === 'object' && Object.keys(selectedLog.before).length > 0 && <Snapshot label="INITIAL STATE (PRE-TRANSACTION)" data={selectedLog.before} color="red" />}
                                        {selectedLog.after && typeof selectedLog.after === 'object' && Object.keys(selectedLog.after).length > 0 && <Snapshot label="SYNCHRONIZED STATE (POST-TRANSACTION)" data={selectedLog.after} color="emerald" />}
                                    </div>
                                ) : (
                                    <div className="p-12 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200 text-center">
                                         <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Atomic Transaction: No configuration delta detected.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-12 border-t border-gray-50 bg-gray-50/30 flex justify-end shrink-0">
                                <button 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="px-14 py-6 bg-gray-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl shadow-gray-200 hover:shadow-gray-400 hover:-translate-y-1 active:scale-95"
                                >
                                    Terminate Isolation
                                </button>
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>
        </div>
    );
}

const DataPoint = ({ label, value, subValue, isAction, color }) => (
    <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 hover:border-red-100 hover:shadow-xl hover:shadow-red-500/5 transition-all group relative overflow-hidden">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] block mb-4 group-hover:text-[#E31E24] transition-colors">{label}</label>
        {isAction ? (
            <span className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl ${color} shadow-sm border border-current opacity-80`}>{value}</span>
        ) : (
            <div className="flex flex-col">
                <span className="text-base font-black text-gray-900 tracking-tighter leading-none">{value}</span>
                {subValue && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{subValue}</span>}
            </div>
        )}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-gray-50 rounded-full group-hover:bg-red-50/50 transition-colors" />
    </div>
);

const Snapshot = ({ label, data, color }) => (
    <div className="space-y-5">
        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-4 ${color === 'red' ? 'text-red-600' : 'text-emerald-600'}`}>
            <span className={`w-3 h-3 rounded-full ring-[6px] ${color === 'red' ? 'bg-red-600 ring-red-50' : 'bg-emerald-600 ring-emerald-50'}`} />
            {label}
        </h4>
        <div className="relative group perspective-1000">
            <div className="absolute inset-0 bg-gray-100 blur-[60px] opacity-10 rounded-full" />
            <pre className={`relative p-10 rounded-[3rem] text-[11px] font-mono font-bold overflow-x-auto border border-dashed leading-relaxed max-h-96 no-scrollbar shadow-2xl ${color === 'red' ? 'bg-red-50/10 border-red-200 text-red-950/40' : 'bg-emerald-50/10 border-emerald-200 text-emerald-950/40'}`}>
                {JSON.stringify(data, null, 2)}
            </pre>
            <div className={`absolute top-8 right-8 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${color === 'red' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'} shadow-sm`}>
                DATA_STRUC_JSON
            </div>
        </div>
    </div>
);
