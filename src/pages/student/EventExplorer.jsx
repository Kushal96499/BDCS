// ============================================
// BDCS - Event Explorer (Student View)
// No registration system — click card to view details
// Optional Google Form link for events that need it
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, isFuture, parseISO, isToday } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from '../../components/admin/Toast';
import { getStudentEvents } from '../../services/eventService';

const TYPE_GRADIENTS = {
    Cultural: 'from-pink-500 via-rose-500 to-orange-400',
    Sports: 'from-emerald-500 via-teal-500 to-cyan-500',
    Technical: 'from-blue-600 via-indigo-600 to-violet-600',
    Workshop: 'from-amber-500 via-orange-500 to-red-500',
    Social: 'from-purple-500 via-fuchsia-500 to-pink-500',
    Other: 'from-slate-500 via-gray-500 to-zinc-500',
};

const SCOPE_LABELS = { department: 'Dept', college: 'College', campus: 'Campus' };
const SCOPE_COLORS = {
    department: 'bg-violet-100/80 text-violet-800',
    college: 'bg-blue-100/80 text-blue-800',
    campus: 'bg-emerald-100/80 text-emerald-800',
};

export default function EventExplorer() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('upcoming'); // upcoming | past | my_events
    const [selectedEvent, setSelectedEvent] = useState(null); // detail modal

    useEffect(() => {
        if (user) loadEvents();
    }, [user]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const evs = await getStudentEvents(user);
            setEvents(evs);
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

    const upcoming = useMemo(() => events.filter(e => {
        const d = getEventDate(e);
        return isFuture(d) || isToday(d);
    }), [events]);

    const past = useMemo(() => events.filter(e => {
        const d = getEventDate(e);
        return isPast(d) && !isToday(d);
    }), [events]);

    const myEvents = useMemo(() => events.filter(e => e.organizerId === user?.uid), [events, user]);

    const displayed = useMemo(() => {
        if (tab === 'upcoming') return upcoming;
        if (tab === 'past') return past;
        return myEvents;
    }, [tab, upcoming, past, myEvents]);
    const isPresident = user?.councilRole?.toLowerCase() === 'president';

    return (
        <div className="max-w-5xl mx-auto pb-32 space-y-8 font-sans">

            {/* ── Hero Banner ── */}
            <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-10 text-white shadow-2xl">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                    <div>
                        <span className="bg-white/10 backdrop-blur border border-white/20 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full mb-4 inline-block">
                            📅 Campus Events
                        </span>
                        <h1 className="text-3xl md:text-5xl font-heading font-black tracking-tight mb-2">
                            What's Happening
                        </h1>
                        <p className="text-white/70 font-medium text-base md:text-lg">
                            Events curated for {user?.departmentName || 'your department'} and beyond.
                        </p>
                    </div>
                    {isPresident && (
                        <Link
                            to="/student/council/propose-event"
                            className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 font-black rounded-2xl shadow-xl hover:scale-105 transition-transform text-sm uppercase tracking-widest"
                        >
                            <span>✍️</span> Propose Event
                        </Link>
                    )}
                </div>

                {/* Stats */}
                <div className="relative z-10 mt-8 grid grid-cols-2 md:flex gap-4 md:gap-6">
                    {[
                        { label: 'Upcoming', count: upcoming.length },
                        { label: 'Past', count: past.length },
                        { label: 'My Events', count: myEvents.length },
                    ].filter(s => isPresident || s.label !== 'My Events').map(s => (
                        <div key={s.label} className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-5 py-3">
                            <div className="text-2xl font-black">{s.count}</div>
                            <div className="text-[9px] md:text-[10px] font-black text-white/60 uppercase tracking-widest">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex bg-white shadow-sm border border-gray-100 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
                {[
                    { id: 'upcoming', label: '🚀 Upcoming' },
                    { id: 'past', label: '🗓️ Past' },
                    { id: 'my_events', label: '✍️ My Events' },
                ].filter(t => isPresident || t.id !== 'my_events').map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`whitespace-nowrap flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${tab === t.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-700'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Grid ── */}
            {loading ? (
                <div className="grid md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-72 bg-gray-100 rounded-[2.5rem] animate-pulse" />
                    ))}
                </div>
            ) : displayed.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-24 bg-gray-50/80 rounded-[3rem] border border-gray-100"
                >
                    <span className="text-6xl block mb-5">
                        {tab === 'upcoming' ? '🎪' : tab === 'my_events' ? '✍️' : '📚'}
                    </span>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {tab === 'upcoming' ? 'Nothing Upcoming' : tab === 'my_events' ? 'No Events Proposed' : 'No Past Events Yet'}
                    </h3>
                    <p className="text-gray-400 font-medium max-w-xs mx-auto px-4">
                        {tab === 'upcoming' ? 'Check back soon — events are always in the works!' : tab === 'my_events' ? 'You haven\'t proposed any events yet.' : 'Upcoming events will appear here once they are done.'}
                    </p>
                    {tab === 'my_events' && isPresident && (
                        <Link
                            to="/student/council/propose-event"
                            className="mt-8 inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-black rounded-2xl hover:scale-105 transition-transform"
                        >
                            ✍️ Propose an Event
                        </Link>
                    )}
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {displayed.map((event, i) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            index={i}
                            eventDate={getEventDate(event)}
                            isPast={tab === 'past' || isPast(getEventDate(event))}
                            onClick={() => setSelectedEvent(event)}
                        />
                    ))}
                </div>
            )}

            {/* ── Detail Modal ── */}
            <AnimatePresence>
                {selectedEvent && (
                    <EventModal
                        event={selectedEvent}
                        eventDate={getEventDate(selectedEvent)}
                        onClose={() => setSelectedEvent(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─────────────────────────────────────────────
// Event Card — clickable, no register button
// ─────────────────────────────────────────────
function EventCard({ event, index, eventDate, isPastEvent, onClick }) {
    const gradient = TYPE_GRADIENTS[event.type] || TYPE_GRADIENTS.Other;
    const past = isPast(eventDate) && !isToday(eventDate);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
            onClick={onClick}
            className={`group relative bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl cursor-pointer transition-all overflow-hidden flex flex-col h-full ${past ? 'opacity-70' : 'hover:-translate-y-1'
                }`}
        >
            {/* Poster Header */}
            <div className={`h-40 md:h-48 bg-gradient-to-br ${gradient} p-5 md:p-7 flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

                <div className="relative z-10 flex justify-between items-start gap-2">
                    <div className="flex gap-1.5 md:gap-2 flex-wrap">
                        <span className="bg-black/20 backdrop-blur border border-white/10 text-white px-2.5 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                            {event.type || 'Event'}
                        </span>
                        {event.scope && (
                            <span className="bg-white/20 backdrop-blur text-white px-2.5 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                                {SCOPE_LABELS[event.scope] || event.scope}
                            </span>
                        )}
                        {past && (
                            <span className="bg-black/30 text-white/70 px-2.5 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">Ended</span>
                        )}
                    </div>
                    {/* Date Chip */}
                    <div className="bg-white text-gray-900 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl text-center shadow-lg shrink-0">
                        <span className="block text-[9px] md:text-[10px] font-black uppercase tracking-wider text-gray-400">{format(eventDate, 'MMM')}</span>
                        <span className="block text-lg md:text-xl font-black leading-none">{format(eventDate, 'd')}</span>
                    </div>
                </div>

                <div className="relative z-10 pt-4">
                    <h2 className="text-lg md:text-xl font-black text-white leading-tight mb-1 drop-shadow line-clamp-2">{event.title}</h2>
                    <p className="text-white/80 text-[10px] md:text-xs font-bold flex flex-wrap items-center gap-2 md:gap-3 uppercase tracking-wider">
                        {event.venue && <span>📍 <span className="truncate max-w-[100px] inline-block align-bottom">{event.venue}</span></span>}
                        {event.registrationLink && <span className="bg-white/20 px-2 py-0.5 rounded-full">🔗 Form</span>}
                    </p>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 md:p-6 flex-1 flex flex-col">
                <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-4 line-clamp-2 flex-1">
                    {event.description || 'No description provided.'}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-gray-50 pt-4 gap-3 sm:gap-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                            {event.organizerName?.[0] || '?'}
                        </div>
                        <span className="text-xs font-bold text-gray-600 truncate max-w-[120px]">{event.organizerName || 'Student Council'}</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-black text-gray-400 group-hover:text-gray-700 transition-colors uppercase tracking-widest self-end sm:self-auto">
                        View Details →
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────
// Event Detail Modal
// ─────────────────────────────────────────────
function EventModal({ event, eventDate, onClose }) {
    const gradient = TYPE_GRADIENTS[event.type] || TYPE_GRADIENTS.Other;

    return (
        // Overlay
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xl z-[9999] flex items-center justify-center p-4"
        >
            {/* Modal Card */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-[3rem] shadow-[0_32px_128px_rgba(0,0,0,0.18)] max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col border border-white"
            >
                {/* Gradient Header with Glass Overlay */}
                <div className={`shrink-0 h-64 bg-gradient-to-br ${gradient} p-10 flex flex-col justify-between relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/5" />
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[80px] -mr-40 -mt-40" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-[60px] -ml-32 -mb-32" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex gap-2.5 flex-wrap">
                            <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                                {event.type || 'Event'}
                            </span>
                            {event.scope && (
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm backdrop-blur-md border ${SCOPE_COLORS[event.scope] || 'bg-white/20 text-white border-white/30'}`}>
                                    {SCOPE_LABELS[event.scope]}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="relative z-10 space-y-2">
                         <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em]">Campus Transmission</span>
                        <h2 className="text-3xl md:text-4xl font-heading text-white leading-[1.1] drop-shadow-2xl">{event.title}</h2>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-10 space-y-10 overflow-y-auto no-scrollbar">

                    {/* Meta Row */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100/50 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <span className="text-lg">📅</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recorded Date</p>
                            </div>
                            <p className="font-heading text-xl text-slate-900">{format(eventDate, 'dd MMM')}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{format(eventDate, 'EEEE, yyyy')}</p>
                        </div>
                        
                        <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100/50 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <span className="text-lg">📍</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Event Venue</p>
                            </div>
                            <p className="font-heading text-xl text-slate-900 truncate">{event.venue || 'TBA'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Zone</p>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-4 bg-[#E31E24] rounded-full" />
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">About Transmission</h4>
                        </div>
                        <p className="text-slate-500 font-medium leading-[1.8] text-sm md:text-base selection:bg-red-50">
                            {event.description || 'No description provided for this campus activity.'}
                        </p>
                    </div>

                    {/* Entity Representative */}
                    <div className="flex items-center gap-5 bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center font-black text-white text-xl shadow-xl transform rotate-3">
                            {event.organizerName?.[0] || '?' }
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-[#E31E24] uppercase tracking-[0.3em] mb-1">Authenticated Organizer</p>
                            <p className="font-heading text-lg text-slate-900">{event.organizerName || 'Student Council'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.organizerRole || 'Council Representative'}</p>
                        </div>
                    </div>

                    {/* Action Interface */}
                    <div className="pt-2">
                        {event.registrationLink ? (
                            <a
                                href={event.registrationLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-4 w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-black hover:-translate-y-1 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.1)] text-xs uppercase tracking-[0.3em]"
                            >
                                <span>INITIALIZE REGISTRATION</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </a>
                        ) : (
                            <div className="flex items-center gap-4 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-6">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-50">✅</div>
                                <div>
                                    <p className="font-black text-emerald-900 text-xs uppercase tracking-widest">Public Access Segment</p>
                                    <p className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-tight mt-0.5">No pre-registration required for this sector.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
