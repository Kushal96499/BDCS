// ============================================
// BDCS - Shared Audit Logs Component
// Standardized logger view for all administrative roles
// Modernized with Server-Side Firestore Pagination
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, limit, getDocs, startAfter, endBefore, limitToLast } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Select from './Select';
import Button from '../Button';
import { useScrollLock } from '../../hooks/useScrollLock';
import { toast } from 'react-hot-toast';

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
    
    // Success/Creation
    if (a.includes('create') || a === 'enable' || a.includes('upload')) return 'bg-emerald-100/10 text-emerald-600';
    
    // Danger/Deletion
    if (a.includes('delete') || a.includes('remove') || a === 'disable' || a.includes('reject')) return 'bg-red-100/10 text-red-600';
    
    // Updates/Changes
    if (a.includes('update') || a.includes('change') || a.includes('edit')) return 'bg-blue-100/10 text-blue-600';
    
    // Assignments
    if (a.includes('assign') || a.includes('transfer')) return 'bg-purple-100/10 text-purple-600';

    // Academic Specifics
    if (a.includes('attendance') || a === 'present' || a === 'absent') return 'bg-amber-100/10 text-amber-600';
    if (a.includes('promote') || a.includes('graduate')) return 'bg-indigo-100/10 text-indigo-600';
    
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
    const [totalDocs, setTotalDocs] = useState(0);

    const rowsPerPageOptions = [
        { value: 10, label: '10 Logs' },
        { value: 25, label: '25 Logs' },
        { value: 50, label: '50 Logs' },
        { value: 100, label: '100 Logs' }
    ];
    
    // Safety helper for date formatting
    const safeFormat = (timestamp, formatStr) => {
        try {
            if (!timestamp) return '---';
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return format(date, formatStr);
        } catch (e) {
            return 'N/A';
        }
    };

    const fetchLogs = useCallback(async (direction = 'initial') => {
        if (!user?.uid) return;
        
        try {
            setLoading(true);
            const baseRef = collection(db, 'auditLogs');

            // Broad fetch — bring back a wide window and filter client-side.
            // This avoids composite index requirements for teacher/hod/principal roles.
            const broadLimit = Math.max(rowsPerPage * 10, 500);
            let q;

            if (direction === 'next' && lastVisible) {
                q = query(baseRef, orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(broadLimit));
            } else if (direction === 'prev' && firstVisible) {
                q = query(baseRef, orderBy('timestamp', 'desc'), endBefore(firstVisible), limitToLast(broadLimit));
            } else {
                q = query(baseRef, orderBy('timestamp', 'desc'), limit(broadLimit));
            }

            const snap = await getDocs(q);
            if (snap.empty) {
                if (direction === 'initial') setLogs([]);
                setHasNext(false);
                setLoading(false);
                return;
            }

            const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Full client-side role filtering
            const myUid = user.uid;
            const myDeptId = user.departmentId || '';
            const myDeptName = user.departmentName || '';
            const collegeId = user.collegeId || '';
            const collegeName = user.collegeName || '';

            let filtered = allLogs.filter(log => {
                const role = (log.performedByRole || '').toLowerCase();
                // Never show super-admin logs to non-admins
                if (['admin', 'director'].includes(role) && user.role !== 'admin') return false;

                if (user.role === 'teacher') {
                    // Teachers only see their own actions
                    return log.performedBy === myUid;
                }

                if (user.role === 'hod') {
                    const isSelf = log.performedBy === myUid;
                    const isInMyDept = (
                        log.performerDept === myDeptId ||
                        log.performerDept === myDeptName ||
                        log.entityPath?.includes(myDeptName) ||
                        log.metadata?.departmentId === myDeptId
                    );
                    return isSelf || (isInMyDept && (role === 'teacher' || role === 'hod'));
                }

                if (user.role === 'principal') {
                    const isSelf = log.performedBy === myUid;
                    const isInMyCollege = (
                        log.performerCollege === collegeId ||
                        log.performerCollege === collegeName ||
                        log.entityPath?.includes(collegeName) ||
                        log.metadata?.collegeName === collegeName
                    );
                    return isSelf || isInMyCollege;
                }

                return true; // admin sees all
            });

            // Apply text search client-side
            if (searchQuery.trim()) {
                const sq = searchQuery.trim().toLowerCase();
                filtered = filtered.filter(log =>
                    (log.performedByName || '').toLowerCase().includes(sq) ||
                    (log.entityLabel || '').toLowerCase().includes(sq) ||
                    (log.action || '').toLowerCase().includes(sq) ||
                    (log.entityType || '').toLowerCase().includes(sq)
                );
            }

            setTotalDocs(filtered.length);

            // Paginate filtered results manually
            const startIdx = direction === 'initial' ? 0 : (currentPage - 1) * rowsPerPage;
            const page = filtered.slice(
                direction === 'initial' ? 0 : (currentPage - 1) * rowsPerPage,
                (direction === 'initial' ? 0 : (currentPage - 1) * rowsPerPage) + rowsPerPage
            );
            setLogs(filtered); // store all filtered for client pagination

            setFirstVisible(snap.docs[0]);
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setHasPrev(currentPage > 1);
            setHasNext(filtered.length > rowsPerPage * currentPage);

        } catch (error) {
            console.error('Audit log fetch error:', error);
            const errMsg = error?.message || 'Unknown error';
            if (errMsg.includes('index')) {
                // Index missing — retry with minimal query
                console.warn('Firestore index missing, retrying with simpler query...');
                toast.error('Audit log index being built, please wait a moment.');
            } else {
                toast.error('Failed to load activity logs.');
            }
        } finally {
            setLoading(false);
        }
    }, [user, rowsPerPage, lastVisible, firstVisible, currentPage, searchQuery]);

    // TRIGGER SEARCH
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user?.uid) {
                setCurrentPage(1);
                setLastVisible(null);
                setFirstVisible(null);
                fetchLogs('initial');
            }
        }, 500); // 500ms Debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (user?.uid && !searchQuery) {
            fetchLogs('initial');
        }
    }, [user?.role, user?.uid, rowsPerPage]);

    const handleNext = () => {
        setCurrentPage(p => p + 1);
        fetchLogs('next');
    };

    const handlePrev = () => {
        setCurrentPage(p => Math.max(1, p - 1));
        fetchLogs('prev');
    };

    // Paginate and filter for action type display
    const displayLogs = logs
        .filter(log => filterAction === 'all' || log.action === filterAction)
        .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Activity History</h2>
                        <p className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest flex items-center gap-2">
                             <span className="w-2 h-2 bg-[#E31E24] rounded-full animate-pulse" />
                             Tracking System Records • Session Logs
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
            <div className="relative z-30 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
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

            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 overflow-hidden flex flex-col min-h-[500px] shadow-2xl shadow-gray-200/50">
                <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-48 space-y-4">
                            <div className="w-12 h-12 border-4 border-gray-100 border-t-[#E31E24] rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Loading Activity...</p>
                        </div>
                    ) : displayLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-48 space-y-4 opacity-40 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2}/></svg>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic max-w-xs mx-auto">No history records found.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-100 table-auto">
                            <thead>
                                <tr className="bg-gray-50/30">
                                    <th className="px-4 md:px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Time Recorded</th>
                                    <th className="px-4 md:px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Action By</th>
                                    <th className="px-4 md:px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Activity</th>
                                    <th className="px-4 md:px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Resource</th>
                                    <th className="px-4 md:px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white/30">
                                {displayLogs.map((log, index) => {
                                    return (
                                        <tr key={log.id} className="group hover:bg-red-50/20 transition-all duration-300">
                                            {/* Execution Timeline */}
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col min-w-[140px]">
                                                    <span className="text-[11px] font-black text-gray-900 tracking-tight">{safeFormat(log.timestamp, 'MMM d, yyyy')}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{safeFormat(log.timestamp, 'hh:mm a')}</span>
                                                </div>
                                            </td>

                                            {/* Factor Persona */}
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg group-hover:bg-[#E31E24] group-hover:rotate-6 transition-all shrink-0 uppercase">
                                                        {log.performedByName?.[0] || 'A'}
                                                    </div>
                                                    <div className="flex flex-col min-w-[160px]">
                                                        <span className="text-sm font-black text-gray-900 group-hover:text-[#E31E24] transition-colors">{log.performedByName}</span>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{log.performedByRole}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Protocol */}
                                            <td className="px-8 py-6 text-center">
                                                <span className={`inline-flex px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.1em] rounded-lg border shadow-sm ${getActionColor(log.action)}`}>
                                                    {log.action?.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Targeted Entity */}
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col min-w-[200px]">
                                                    <span className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1.5">{log.entityLabel || 'Redacted Entity'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{log.entityType}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Insight */}
                                            <td className="px-4 md:px-8 py-6 text-right">
                                                <button 
                                                    onClick={() => { setSelectedLog(log); setIsModalOpen(true); }}
                                                    className="px-4 md:px-6 py-2.5 text-[10px] font-black text-gray-400 hover:text-white hover:bg-gray-900 border border-gray-100 rounded-xl transition-all uppercase tracking-widest active:scale-95 shadow-sm hover:shadow-xl shrink-0"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Enhanced Pagination Controls */}
                <div className="p-10 border-t border-gray-100 bg-gray-50/20 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                            Audit Logs
                        </p>
                        <p className="text-[12px] font-black text-gray-900 tracking-tighter">
                            Page {currentPage} of {Math.ceil(totalDocs / rowsPerPage) || 1}
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
                        
                        <div className="px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm min-w-[140px] text-center">
                             <span className="text-sm font-black text-gray-900 tracking-widest uppercase">Page {currentPage} / {Math.ceil(totalDocs / rowsPerPage) || 1}</span>
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

            {isModalOpen && selectedLog && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-6 p-0 overflow-hidden">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="absolute inset-0 bg-gray-950/40 backdrop-blur-md" 
                        onClick={() => setIsModalOpen(false)} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.98 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        className="relative bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[95dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden border border-gray-100 shadow-gray-900/10"
                    >
                        {/* Modal Header */}
                        <div className="px-8 py-6 md:px-12 md:py-8 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center p-2.5">
                                    <img src="/assets/biyani-logo.png" alt="Biyani" className="w-full h-full object-contain opacity-80" />
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Audit Details</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black text-[#E31E24] uppercase tracking-wider px-2 py-0.5 bg-red-50 rounded border border-red-100/50">
                                            #{String(selectedLog?.id || '---').slice(0, 8).toUpperCase()}
                                        </span>
                                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedLog.entityType || 'Registry'}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 transition-all border border-gray-100 active:scale-90">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 md:p-10 md:pt-6 pt-4 overflow-y-auto space-y-10 custom-scrollbar smooth-scroll">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <DataPoint label="Action Type" value={String(selectedLog?.action || 'UNKNOWN').toUpperCase()} isAction color={getActionColor(selectedLog?.action)} />
                                <DataPoint label="Exact Time" value={safeFormat(selectedLog?.timestamp, 'PPP pp')} />
                                <DataPoint label="User Account" value={String(selectedLog?.performedByName || 'Unknown')} subValue={selectedLog?.performedByRole} />
                                <DataPoint label="Platform Resource" value={String(selectedLog?.entityLabel || 'N/A')} subValue={selectedLog?.entityType} />
                            </div>

                            {selectedLog?.entityPath && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-3">
                                        <div className="w-2 h-4 bg-[#E31E24] rounded-full" />
                                        Module Path
                                    </label>
                                    <div className="p-8 bg-gray-900 rounded-[2.5rem] text-[11px] font-mono font-black text-white/60 break-all leading-relaxed shadow-2xl border border-white/5">
                                        {String(selectedLog.entityPath)}
                                    </div>
                                </div>
                            )}

                            {((selectedLog?.before && typeof selectedLog.before === 'object') || (selectedLog?.after && typeof selectedLog.after === 'object')) ? (
                                <div className="space-y-10">
                                    {selectedLog.before && typeof selectedLog.before === 'object' && <Snapshot label="INITIAL STATE (BEFORE)" data={selectedLog.before} color="red" />}
                                    {selectedLog.after && typeof selectedLog.after === 'object' && <Snapshot label="UPDATED STATE (AFTER)" data={selectedLog.after} color="emerald" />}
                                </div>
                            ) : (
                                <div className="p-12 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200 text-center">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Atomic Transaction: No configuration delta detected.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 md:p-10 border-t border-gray-50 bg-gray-50/30 flex justify-end shrink-0 gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:bg-black active:scale-95"
                            >
                                Close Details
                            </button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </div>
    );
}

const DataPoint = ({ label, value, subValue, isAction, color }) => {
    const safeValue = typeof value === 'object' ? JSON.stringify(value) : String(value || 'N/A');
    const safeSubValue = typeof subValue === 'object' ? JSON.stringify(subValue) : (subValue ? String(subValue) : null);

    return (
        <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 hover:border-red-100 transition-all group relative overflow-hidden">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-3 group-hover:text-[#E31E24] transition-colors">{label}</label>
            {isAction ? (
                <span className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl ${color} border border-current opacity-80 inline-block`}>{safeValue}</span>
            ) : (
                <div className="flex flex-col">
                    <span className="text-sm md:text-base font-black text-gray-900 tracking-tight leading-none">{safeValue}</span>
                    {safeSubValue && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 block truncate">{safeSubValue}</span>}
                </div>
            )}
        </div>
    );
};

const Snapshot = ({ label, data, color }) => {
    let safeJson = 'Processing Error';
    try {
        safeJson = JSON.stringify(data, null, 2);
    } catch (e) {
        safeJson = 'Error stringifying data structure.';
    }

    return (
        <div className="space-y-4">
            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${color === 'red' ? 'text-red-600' : 'text-emerald-600'}`}>
                <span className={`w-2 h-2 rounded-full ${color === 'red' ? 'bg-red-600' : 'bg-emerald-600'}`} />
                {label}
            </h4>
            <div className="relative">
                <pre className={`p-6 md:p-8 rounded-3xl text-[11px] font-mono font-bold overflow-auto border border-dashed leading-relaxed max-h-[60vh] custom-scrollbar ${color === 'red' ? 'bg-gray-950 text-red-100/60 border-red-900/40' : 'bg-gray-950 text-emerald-100/60 border-emerald-900/40'}`}>
                    {safeJson}
                </pre>
                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${color === 'red' ? 'bg-red-950 text-red-500 border-red-900/30' : 'bg-emerald-950 text-emerald-500 border-emerald-900/30'}`}>
                    JSON_BLOB
                </div>
            </div>
        </div>
    );
};
