// ============================================
// BDCS - Event Explorer (Simple & Clean Redesign)
// ============================================

import React, { useState, useEffect, useMemo, memo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, parseISO, isToday } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from '../../components/admin/Toast';
import { getStudentEvents, getMyRegistrations, registerForEvent, getMyProposals } from '../../services/eventService';
import PremiumSelect from '../../components/common/PremiumSelect';
import { createPortal } from 'react-dom';
import Skeleton, { EventCardSkeleton } from '../../components/common/Skeleton';
import { 
    GraduationCap, 
    Music, 
    Trophy, 
    Lightbulb, 
    Users, 
    Star, 
    Plus, 
    Search, 
    MapPin, 
    Calendar, 
    Clock, 
    X,
    Code2
} from 'lucide-react';

const EVENT_TYPES = [
    { id: 'Technical', icon: <Code2 className="w-full h-full" /> },
    { id: 'Cultural', icon: <Music className="w-full h-full" /> },
    { id: 'Sports', icon: <Trophy className="w-full h-full" /> },
    { id: 'Workshop', icon: <Lightbulb className="w-full h-full" /> },
    { id: 'Social', icon: <Users className="w-full h-full" /> },
    { id: 'Other', icon: <Star className="w-full h-full" /> }
];

export default function EventExplorer() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming'); 
    const [activeType, setActiveType] = useState('All');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [evs, regs, props] = await Promise.all([
                getStudentEvents(user),
                getMyRegistrations(user.uid),
                getMyProposals(user.uid)
            ]);
            
            // Integrate proposals into general events list but avoid duplicates if approved
            const propsMap = new Map(props.map(p => [p.id, p]));
            const combined = [...evs];
            
            // Add proposals that aren't in 'evs' (approved list)
            props.forEach(p => {
                if (!combined.some(e => e.id === p.id)) {
                    combined.push(p);
                } else {
                    // Update the approved event with any extra proposal data (like status) if needed
                    const idx = combined.findIndex(e => e.id === p.id);
                    combined[idx] = { ...combined[idx], ...p };
                }
            });

            setEvents(combined);
            setMyRegistrations(regs);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const getEventDate = (ev) => {
        if (ev.date) {
            try { return parseISO(ev.date); } catch { return new Date(); }
        }
        if (ev.startDate?.toDate) return ev.startDate.toDate();
        return new Date();
    };

    const handleRegister = async (eventId, title) => {
        if (isRegistering) return;
        setIsRegistering(true);
        try {
            await registerForEvent(eventId, title, user);
            setMyRegistrations(prev => [...prev, eventId]);
            toast.success('Registered successfully');
        } catch (err) {
            console.error(err);
            toast.error('Registration failed');
        } finally {
            setIsRegistering(false);
        }
    };

    const eventList = useMemo(() => {
        return events.map(ev => {
            const date = getEventDate(ev);
            const past = isPast(date) && !isToday(date);
            const registered = myRegistrations.includes(ev.id);
            return { ...ev, dateObj: date, isPast: past, isRegistered: registered };
        });
    }, [events, myRegistrations]);

    const upcoming = useMemo(() => eventList.filter(e => !e.isPast && e.status === 'approved'), [eventList]);
    const past = useMemo(() => eventList.filter(e => e.isPast && e.status === 'approved'), [eventList]);
    const myEvents = useMemo(() => eventList.filter(e => e.organizerId === user?.uid || e.isRegistered), [eventList, user]);

    const filteredEvents = useMemo(() => {
        let base = [];
        if (activeTab === 'upcoming') base = upcoming;
        else if (activeTab === 'past') base = past;
        else base = myEvents;

        if (activeType !== 'All') {
            base = base.filter(e => e.type === activeType);
        }
        return base;
    }, [activeTab, activeType, upcoming, past, myEvents]);

    const isPresident = user?.councilRole?.toLowerCase() === 'president';

    if (loading && events.length === 0) return (
        <div className="space-y-12">
            <header className="flex justify-between items-end gap-8">
                <div className="space-y-4">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-48 h-12" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="w-32 h-12 rounded-xl" />
                    <Skeleton className="w-32 h-12 rounded-xl" />
                </div>
            </header>
            <div className="h-20 bg-white rounded-[2rem] border border-slate-100 p-4 flex gap-4">
                 <Skeleton className="w-32 h-full rounded-xl" />
                 <Skeleton className="w-32 h-full rounded-xl" />
                 <Skeleton className="flex-1 h-full rounded-xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {[1, 2, 3, 4].map(i => <EventCardSkeleton key={i} />)}
            </div>
        </div>
    );

    return (
        <div className="text-slate-900 pb-32">
            
            {/* ── SIMPLE HEADER ────────────────────────────── */}
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                         <span className="w-2 h-2 bg-[#E31E24] rounded-full" />
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campus Feed</p>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        Events<span className="text-[#E31E24]">.</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <StatBadge label="Upcoming" value={upcoming.length} />
                    <StatBadge label="Going" value={myRegistrations.length} color="red" />
                    {isPresident && (
                        <Link to="/student/council/propose-event" className="px-6 py-4 bg-slate-950 text-white rounded-2xl flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest hover:bg-[#E31E24] transition-all shadow-xl">
                            <Plus className="w-4 h-4" /> Propose Event
                        </Link>
                    )}
                </div>
            </header>

            {/* ── SIMPLE FILTERS ────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-12 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex p-1 bg-slate-50 rounded-xl w-full sm:w-auto">
                    {[
                        { id: 'upcoming', label: 'Upcoming' },
                        { id: 'past', label: 'Past' },
                        { id: 'my_events', label: 'My Events' },
                    ].filter(t => isPresident || t.id !== 'my_events' || myRegistrations.length > 0).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex-1 px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="w-full sm:w-64">
                    <PremiumSelect
                        value={activeType}
                        onChange={(e) => setActiveType(e.target.value)}
                        options={[
                            { value: 'All', label: 'All Categories' },
                            ...EVENT_TYPES.map(t => ({ value: t.id, label: `${t.icon} ${t.id}` }))
                        ]}
                    />
                </div>
            </div>

            {/* ── CONTENT GRID ───────────────────────────────────── */}
            <main>
                {filteredEvents.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[2rem] border border-dashed border-slate-100">
                        <Calendar className="w-12 h-12 mx-auto mb-6 opacity-20 text-slate-400" />
                        <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight mb-2">No Events Found</h3>
                        <p className="text-sm text-slate-400 font-medium">Try changing the filters or check back later.</p>
                    </div>
                ) : (
                    <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                        <AnimatePresence mode="popLayout">
                            {filteredEvents.map((event, i) => (
                                <SimpleEventCard
                                    key={event.id}
                                    event={event}
                                    index={i}
                                    currentUserId={user?.uid}
                                    onView={() => setSelectedEvent(event)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>

            {/* Modal - Portaled to Root */}
            <AnimatePresence>
                {selectedEvent && (
                    <SimpleEventModal
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        onRegister={() => handleRegister(selectedEvent.id, selectedEvent.title)}
                        isRegistering={isRegistering}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────────────────
// SIMPLE SUB-COMPONENTS
// ─────────────────────────────────────────────

function StatBadge({ label, value, color = 'slate' }) {
    const colors = {
        slate: 'bg-slate-50 text-slate-500 border-slate-100',
        red: 'bg-red-50 text-[#E31E24] border-red-100',
    };
    return (
        <div className={`px-5 py-2.5 rounded-xl border flex items-center gap-3 ${colors[color] || colors.slate}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{label}:</span>
            <span className="text-sm font-black tracking-tighter">{value}</span>
        </div>
    );
}

const SimpleEventCard = memo(({ event, index, currentUserId, onView }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={onView}
            className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full"
        >
            {/* Poster / Image Section */}
            <div className="relative h-48 sm:h-56 overflow-hidden bg-slate-100">
                {event.posterUrl ? (
                    <img 
                        src={event.posterUrl} 
                        alt={event.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
                        <Calendar className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50 font-sans">No Poster Available</span>
                    </div>
                )}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                            {event.type}
                        </span>
                        {event.isRegistered && (
                            <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">
                                Registered
                            </span>
                        )}
                    </div>
                    {event.organizerId === currentUserId && event.status !== 'approved' && (
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm self-start ${
                            event.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-amber-400 text-slate-900 border border-amber-500/20'
                        }`}>
                            {event.status === 'rejected' ? 'Proposal Rejected' : 'Under Review'}
                        </span>
                    )}
                </div>
                
                {/* Date Overlay in Card */}
                <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-xl text-white flex items-center gap-2">
                    <span className="text-sm font-black tracking-tighter">{format(event.dateObj, 'dd')}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-80 border-l border-white/20 pl-2">{format(event.dateObj, 'MMM')}</span>
                </div>
            </div>

            {/* Info Section */}
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                    <h4 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight group-hover:text-[#E31E24] transition-colors line-clamp-2 leading-none mb-4">
                        {event.title}
                    </h4>
                </div>

                <div className="flex items-center justify-between gap-4 mt-auto">
                    <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-red-50 group-hover:text-[#E31E24] transition-colors">
                            <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{event.venue || 'Campus Main Hub'}</p>
                    </div>
                    <span className="text-[10px] font-black text-slate-950 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Details →</span>
                </div>
            </div>
        </motion.div>
    );
});

function SimpleEventModal({ event, onClose, onRegister, isRegistering }) {
    const isMobile = window.innerWidth < 768;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-6 isolate">
            {/* Full-Screen Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={onClose} 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
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
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 md:p-12 text-center">
                            <Calendar className="w-12 h-12 mb-4 opacity-50" />
                            <h3 className="text-lg md:text-xl font-black uppercase tracking-widest leading-tight">{event.title}</h3>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 flex flex-col min-h-0 bg-white relative z-20">
                    {/* TOP GAP MASK FOR WHITE SIDE */}
                    <div className="absolute top-0 right-0 w-full h-1.5 bg-white z-50 rounded-tr-[inherit] md:block hidden" />

                    <div className="p-6 md:p-12 overflow-y-auto no-scrollbar flex-1">
                        <div className="flex justify-between items-start gap-4 mb-6 md:mb-8">
                             <div className="space-y-3 md:space-y-4">
                                 <div className="flex items-center gap-2 mb-2">
                                     <span className="px-2.5 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                                         {event.type}
                                     </span>
                                 </div>
                                 <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tight leading-[0.9]">
                                    {event.title}
                                 </h2>
                                 <div className="flex items-center gap-3">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-2 border-red-600 pl-3">
                                        {format(event.dateObj, 'PPPP')}
                                    </span>
                                 </div>
                             </div>
                             <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 hover:bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center text-sm md:text-lg transition-all shrink-0"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-8 md:space-y-10">
                            {event.status === 'rejected' && (
                                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl space-y-2">
                                    <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">Rejection Feedback</h4>
                                    <p className="text-sm font-medium text-red-900 leading-relaxed italic border-l-2 border-red-200 pl-4">
                                        "{event.rejectionReason || 'No specific reason provided by HOD.'}"
                                    </p>
                                </div>
                            )}

                            <div className="p-5 md:p-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 text-left">
                                <DetailItem label="Location" value={event.venue || 'Campus Wide'} />
                                <DetailItem label="Start Time" value={event.startTime || event.time || 'TBA'} />
                                <DetailItem label="Organizer" value={event.organizerName || 'Biyani College'} />
                                <DetailItem label="Registration" value={event.isRegistered ? 'Confirmed' : 'Open'} />
                            </div>

                            <div className="space-y-4 text-left">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    <span className="w-6 h-[2px] bg-red-600" /> Description
                                </h4>
                                <p className="text-sm md:text-base font-medium text-slate-600 leading-relaxed whitespace-pre-wrap pl-9">
                                    {event.description || 'No description provided for this event.'}
                                </p>
                            </div>

                            {/* Footer Actions (In-flow) */}
                            <div className="pt-8 md:pt-12 mt-10 border-t border-slate-50 flex flex-col sm:flex-row gap-4">
                                {!event.isPast && !event.isRegistered && event.status === 'approved' ? (
                                    <button 
                                        onClick={onRegister}
                                        disabled={isRegistering}
                                        className="flex-1 py-5 rounded-2xl bg-slate-950 text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-red-600 transition-all disabled:opacity-50 active:scale-[0.98]"
                                    >
                                        {isRegistering ? 'Processing...' : 'Register for Event'}
                                    </button>
                                ) : event.isRegistered ? (
                                    <div className="flex-1 py-5 rounded-2xl bg-emerald-50 text-emerald-600 font-black uppercase tracking-widest text-[11px] text-center border border-emerald-100 flex items-center justify-center gap-2">
                                        <span className="text-lg leading-none">✓</span> Already Registered
                                    </div>
                                ) : (
                                    <div className="flex-1 py-5 rounded-2xl bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[11px] text-center border border-slate-100">
                                        {event.status === 'rejected' ? 'Proposal Rejected' : event.status === 'pending' ? 'Under Review' : 'Event Finished'}
                                    </div>
                                )}
                                <button onClick={onClose} className="px-10 py-5 rounded-2xl border border-slate-100 text-slate-400 font-bold uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all">Close</button>
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
            <p className="text-base font-bold text-slate-900 uppercase tracking-tight leading-none">{value}</p>
        </div>
    );
}
