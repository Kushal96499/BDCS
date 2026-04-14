// ============================================
// BDCS - Event Proposal Form (President Only)
// Scoped: department / college / campus
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../components/admin/Toast';

import { proposeEvent, getMyProposals } from '../../services/eventService';
import { format, parseISO } from 'date-fns';

const SCOPE_OPTIONS = [
    {
        value: 'department',
        label: '🏛️ Department Only',
        desc: 'Visible only to students in your department',
        color: 'border-violet-200 bg-violet-50 text-violet-800'
    },
    {
        value: 'college',
        label: '🏫 Entire College',
        desc: 'Visible to all students in your college',
        color: 'border-blue-200 bg-blue-50 text-blue-800'
    },
    {
        value: 'campus',
        label: '🌐 Whole Campus',
        desc: 'Visible to all students across all departments',
        color: 'border-emerald-200 bg-emerald-50 text-emerald-800'
    },
];

const STATUS_STYLE = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

export default function StudentEventRequest() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [myProposals, setMyProposals] = useState([]);
    const [loadingProposals, setLoadingProposals] = useState(true);
    const [form, setForm] = useState({
        title: '',
        type: 'Cultural',
        description: '',
        date: '',
        venue: '',
        scope: 'department',
        registrationLink: '', // optional Google Form URL
    });

    useEffect(() => {
        if (user?.uid) loadMyProposals();
    }, [user]);

    const loadMyProposals = async () => {
        try {
            const data = await getMyProposals(user.uid);
            setMyProposals(data);
        } finally {
            setLoadingProposals(false);
        }
    };

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.date || !form.description.trim()) {
            toast.error('Please fill all required fields');
            return;
        }
        setSubmitting(true);
        try {
            await proposeEvent(form, user);
            toast.success('Proposal sent to HOD 🚀');
            setForm({ title: '', type: 'Cultural', description: '', date: '', venue: '', scope: 'department' });
            await loadMyProposals(); // refresh list
        } catch (err) {
            console.error(err);
            toast.error('Failed to submit proposal');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Access Guard ──
    if (user?.councilRole?.toLowerCase() !== 'president') {

        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 space-y-6">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-5xl">🔒</div>
                <div>
                    <h2 className="text-3xl font-black text-gray-900">Access Restricted</h2>
                    <p className="text-gray-500 font-medium mt-2 max-w-sm mx-auto">
                        Only the <span className="text-biyani-red font-bold">Department President</span> can propose events.
                    </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl max-w-sm w-full text-left flex gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                        <p className="text-sm font-bold text-gray-800">Have an idea?</p>
                        <p className="text-xs text-gray-600 mt-1">Contact your Batch President to propose this event on your behalf.</p>
                    </div>
                </div>
                <Link
                    to="/student/council"
                    className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all hover:-translate-y-0.5"
                >
                    ← View Council
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-32 space-y-10 font-sans">

            {/* ── Header ── */}
            <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-10 text-white shadow-xl">
                <div className="absolute -right-10 -top-10 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <span className="bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full inline-block mb-4">
                        ✍️ President Portal
                    </span>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Propose an Event</h1>
                    <p className="text-white/60 font-medium">Your proposal goes to the HOD for review before being published.</p>
                </div>
            </div>

            {/* ── Proposal Form ── */}
            <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 space-y-8"
            >
                {/* Title */}
                <div>
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Event Title *</label>
                    <input
                        required
                        type="text"
                        value={form.title}
                        onChange={e => handleChange('title', e.target.value)}
                        placeholder="e.g. Freshers Party 2026"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none font-bold text-lg transition-colors"
                    />
                </div>

                {/* Type + Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Event Type *</label>
                        <select
                            value={form.type}
                            onChange={e => handleChange('type', e.target.value)}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none font-medium"
                        >
                            {['Cultural', 'Sports', 'Technical', 'Workshop', 'Social'].map(t => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Proposed Date *</label>
                        <input
                            required
                            type="date"
                            value={form.date}
                            onChange={e => handleChange('date', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none font-medium"
                        />
                    </div>
                </div>

                {/* Venue */}
                <div>
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Venue</label>
                    <input
                        type="text"
                        value={form.venue}
                        onChange={e => handleChange('venue', e.target.value)}
                        placeholder="e.g. Campus Auditorium"
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none font-medium"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Description & Plan *</label>
                    <textarea
                        required
                        rows={4}
                        value={form.description}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder="Describe the event purpose, activities, estimated budget, and any requirements..."
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none font-medium resize-none"
                    />
                </div>

                {/* Registration Link (optional) */}
                <div>
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-2">
                        Registration Form Link
                        <span className="ml-2 text-gray-400 font-medium normal-case tracking-normal text-xs">(optional — Google Form URL)</span>
                    </label>
                    <input
                        type="url"
                        value={form.registrationLink}
                        onChange={e => handleChange('registrationLink', e.target.value)}
                        placeholder="https://forms.google.com/..."
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none font-medium"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave blank if no pre-registration is needed.</p>
                </div>

                {/* Scope Selector */}
                <div>
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-3">Event Scope *</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {SCOPE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleChange('scope', opt.value)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${form.scope === opt.value
                                    ? opt.color + ' border-current'
                                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                <div className="font-black text-sm mb-1">{opt.label}</div>
                                <div className="text-xs opacity-70 leading-snug">{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4 pt-2">
                    <button
                        type="button"
                        onClick={() => navigate('/student/events')}
                        className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Sending...
                            </>
                        ) : 'Send to HOD 🚀'}
                    </button>
                </div>
            </motion.form>

            {/* ── My Previous Proposals ── */}
            {myProposals.length > 0 && (
                <div>
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                        My Proposals
                    </h3>
                    <div className="space-y-3">
                        {myProposals.map(p => (
                            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900 truncate">{p.title}</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {p.date ? format(parseISO(p.date), 'dd MMM yyyy') : '—'} • {p.type} • {SCOPE_OPTIONS.find(s => s.value === p.scope)?.label || p.scope}
                                    </p>
                                    {p.rejectionReason && (
                                        <p className="text-xs text-red-500 mt-1 font-medium">Rejected: {p.rejectionReason}</p>
                                    )}
                                </div>
                                <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[p.status] || 'bg-gray-100 text-gray-500'}`}>
                                    {p.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
