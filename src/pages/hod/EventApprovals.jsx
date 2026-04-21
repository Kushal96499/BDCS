// ============================================
// BDCS - HOD Event Approvals
// Manage Event Proposals — "Neo-Campus" Edition
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/admin/DataTable';
import StatusPill from '../../components/common/StatusPill';
import { toast } from '../../components/admin/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';

export default function EventApprovals() {
    const { user, loading: authLoading } = useAuth();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFilter, setCurrentFilter] = useState('pending');
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        if (!authLoading && user) fetchRequests();
    }, [user, authLoading]);

    useEffect(() => {
        if (currentFilter === 'all') {
            setFilteredEvents(events);
        } else {
            setFilteredEvents(events.filter(e => e.status === currentFilter));
        }
    }, [events, currentFilter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            let q;
            if (user.departmentId) {
                q = query(collection(db, 'events'), where('departmentId', '==', user.departmentId));
            } else {
                q = query(collection(db, 'events'));
            }

            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            setEvents(data);
        } catch (error) {
            console.error('Error fetching event requests:', error);
            toast.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        const reason = status === 'rejected' ? window.prompt('Enter rejection reason:') : null;
        if (status === 'rejected' && !reason) return;

        try {
            await updateDoc(doc(db, 'events', id), {
                status,
                approverId: user.uid,
                approverName: user.name,
                rejectionReason: reason || null,
                approvedAt: serverTimestamp()
            });
            toast.success(`Manifest ${status.toUpperCase()} Successfully`);
            setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
        } catch (error) {
            console.error('Error updating event:', error);
            toast.error('Action failed');
        }
    };

    const columns = [
        {
            header: 'Event Identity',
            field: 'title',
            render: (row) => (
                <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E31E24] flex items-center justify-center font-black text-[10px] border border-red-100 shadow-sm">
                        {row.title?.[0]}
                    </div>
                    <div>
                        <div className="font-black text-gray-900 tracking-tight">{row.title}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{row.type}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Origin (Organizer)',
            field: 'organizerName',
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <div className="font-bold text-gray-800 tracking-tight text-sm">{row.organizerName}</div>
                    <div className="text-[10px] font-black text-violet-600 uppercase tracking-widest">{row.batchName || row.organizerRole}</div>
                </div>
            )
        },
        {
            header: 'Jurisdiction',
            field: 'scope',
            render: (row) => {
                const scope = row.scope || 'department';
                const colors = {
                    department: 'bg-violet-50 text-violet-600 border-violet-100',
                    college: 'bg-blue-50 text-blue-600 border-blue-100',
                    campus: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                };
                return (
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${colors[scope] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {scope}
                    </span>
                );
            }
        },
        {
            header: 'Schedule & Sector',
            field: 'date',
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <div className="text-sm font-bold text-gray-700">{row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.venue || 'Global Campus'} • {row.startTime || row.time || 'TBA'}</div>
                </div>
            )
        },
        {
            header: 'Protocol Status',
            field: 'status',
            render: (row) => <StatusPill status={row.status} />
        },
        {
            header: 'Operations',
            field: 'actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSelectedEvent(row)}
                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-100 active:scale-95"
                        title="View Details"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>

                    { (row.status === 'pending' || row.status === 'pending_hod') ? (
                        <>
                            <button
                                onClick={() => handleAction(row.id, 'approved')}
                                className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 active:scale-95"
                                title="Approve"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                                onClick={() => handleAction(row.id, 'rejected')}
                                className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-black hover:text-white transition-all border border-red-100 active:scale-95"
                                title="Reject"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </>
                    ) : null}
                </div>
            )
        }
    ];

    if (authLoading) return null;

    return (
        <div className="space-y-8 pb-12">
            {/* Executive Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Event List</h2>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        Manage Event Permissions • {user?.departmentName}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/50 backdrop-blur-xl p-2 rounded-[2rem] border border-gray-100 flex flex-wrap items-center gap-1">
                        {['pending', 'approved', 'rejected', 'all'].map(f => (
                            <button
                                key={f}
                                onClick={() => setCurrentFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    currentFilter === f 
                                        ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
                                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabular Event Ledger */}
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-blue-500/5 min-h-[400px]">
                <DataTable
                    columns={columns}
                    data={filteredEvents}
                    loading={loading}
                    actions={false}
                    emptyMessage={`Event archive is void for isolated sector: ${currentFilter}`}
                />
            </div>

            {/* Premium Detail Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <DetailModal 
                        event={selectedEvent} 
                        onClose={() => setSelectedEvent(null)} 
                        onApprove={() => { handleAction(selectedEvent.id, 'approved'); setSelectedEvent(null); }}
                        onReject={() => { handleAction(selectedEvent.id, 'rejected'); setSelectedEvent(null); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function DetailModal({ event, onClose, onApprove, onReject }) {
    const isMobile = window.innerWidth < 768;
    const dateObj = event.date ? new Date(event.date) : new Date();
    
    if (typeof document === 'undefined') return null;
    
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-6 isolate">
            {/* Full-Screen Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={onClose} 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" 
            />
            
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: isMobile ? 100 : 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
                style={{ willChange: 'transform, opacity' }}
                className={`w-full max-w-5xl relative z-10 flex flex-col md:flex-row bg-slate-950 overflow-hidden isolate shadow-[0_50px_100px_rgba(0,0,0,0.5)] 
                    ${isMobile ? 'h-full max-h-[100dvh] rounded-t-[2.5rem] rounded-b-none' : 'max-h-[90vh] rounded-[3rem] p-0'}
                `}
            >
                {/* Visual Section (Poster) */}
                <div className="w-full md:w-2/5 h-72 md:h-auto bg-slate-950 flex-shrink-0 relative flex flex-col items-center justify-center border-r border-white/5 z-20">
                    {/* PHYSICAL GAP MASK: This covers the sub-pixel white leak at the top */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-950 z-50 rounded-t-[inherit]" />
                    
                    {event.posterUrl ? (
                         <div className="relative w-full h-full group/poster cursor-zoom-in flex items-center justify-center p-4 md:p-8" onClick={() => window.open(event.posterUrl, '_blank')}>
                            <img src={event.posterUrl} alt={event.title} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover/poster:scale-[1.02]" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Click to View Full</span>
                            </div>
                         </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 md:p-12 text-center">
                            <span className="text-4xl md:text-6xl mb-4 opacity-50">📅</span>
                            <h3 className="text-lg md:text-xl font-black uppercase tracking-widest leading-tight">{event.title}</h3>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col min-h-0 bg-white relative z-20">
                    {/* TOP GAP MASK FOR WHITE SIDE */}
                    <div className="absolute top-0 right-0 w-full h-1.5 bg-white z-50 rounded-tr-[inherit] md:block hidden" />
                    
                    <div className="p-5 md:p-12 overflow-y-auto no-scrollbar flex-1">
                        <div className="flex justify-between items-start gap-4 mb-6 md:mb-8">
                             <div className="space-y-3 md:space-y-4">
                                 <div className="flex items-center gap-2 mb-2">
                                     <span className="px-2.5 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                                         {event.type}
                                     </span>
                                 </div>
                                 <h2 className="text-xl md:text-4xl font-black text-slate-900 uppercase tracking-tight leading-[0.9]">
                                    {event.title}
                                 </h2>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-red-600 pl-3">
                                        {format(dateObj, 'PPPP')}
                                    </span>
                                 </div>
                             </div>
                             <button onClick={onClose} className="w-9 h-9 md:w-12 md:h-12 bg-slate-50 hover:bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center text-xs md:text-lg transition-all shrink-0">✕</button>
                        </div>

                        <div className="space-y-6 md:space-y-10">
                            <div className="p-4 md:p-8 bg-slate-50 rounded-[1.2rem] md:rounded-[2rem] border border-slate-100 grid grid-cols-2 sm:grid-cols-2 gap-4 md:gap-8 text-left">
                                <DetailItem label="Location" value={event.venue || 'Campus Wide'} />
                                <DetailItem label="Start Time" value={event.startTime || event.time || 'TBA'} />
                                <DetailItem label="Organizer" value={event.organizerName || 'Biyani College'} />
                                <DetailItem label="Scope" value={event.scope || 'Department'} />
                                {event.registrationLink && <DetailItem label="Reg. Link" value={<a href={event.registrationLink} target="_blank" className="text-blue-600 lowercase underline">Check Link</a>} />}
                            </div>

                            <div className="space-y-4 text-left">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    <span className="w-6 h-[2px] bg-red-600" /> Description
                                </h4>
                                <p className="text-sm md:text-base font-medium text-slate-600 leading-relaxed whitespace-pre-wrap pl-9">
                                    {event.description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Footer Actions (In-flow) */}
                            <div className="pt-10 md:pt-14 mt-10 border-t border-slate-50 flex flex-col sm:flex-row gap-3 md:gap-4">
                                {(event.status === 'pending' || event.status === 'pending_hod') && (
                                    <>
                                        <button 
                                            onClick={onApprove}
                                            className="flex-1 py-3.5 md:py-5 rounded-xl md:rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] md:text-[11px] shadow-lg hover:bg-emerald-600 transition-all active:scale-[0.98]"
                                        >
                                            Approve Manifest
                                        </button>
                                        <button 
                                            onClick={onReject}
                                            className="flex-1 py-3.5 md:py-5 rounded-xl md:rounded-2xl bg-slate-950 text-white font-black uppercase tracking-widest text-[9px] md:text-[11px] shadow-lg hover:bg-red-600 transition-all active:scale-[0.98]"
                                        >
                                            Reject Proposal
                                        </button>
                                    </>
                                )}
                                <button onClick={onClose} className="px-6 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-2xl border border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[11px] hover:bg-slate-50 transition-all">Close Viewer</button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <div className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-none truncate">{value}</div>
        </div>
    );
}
