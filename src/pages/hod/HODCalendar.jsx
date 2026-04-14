
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../../components/admin/Toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export default function HODCalendar() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMonth, setViewMonth] = useState(new Date());
    const [type, setType] = useState('HOLIDAY'); // HOLIDAY | EXAM
    const [description, setDescription] = useState('');
    const [target, setTarget] = useState('ALL'); // ALL | batchId
    const [batches, setBatches] = useState([]);

    useEffect(() => {
        if (user) {
            fetchBatches();
            fetchEvents();
        }
    }, [user, viewMonth]);

    const fetchBatches = async () => {
        const q = query(collection(db, 'batches'), where('departmentId', '==', user.departmentId));
        const snap = await getDocs(q);
        setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const fetchEvents = async () => {
        setLoading(true);
        // Fetch events for this department
        const start = startOfMonth(viewMonth).toISOString();
        const end = endOfMonth(viewMonth).toISOString();

        // Simple fetch all for department (Calendar view usually needs full month)
        // Ideally filter by date range, but string compare works if ISO format used
        const q = query(
            collection(db, 'calendar_events'),
            where('departmentId', '==', user.departmentId)
        );

        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEvents(data);
        setLoading(false);
    };

    const handleAddEvent = async () => {
        if (!description) return toast.error('Please add a description');

        try {
            await addDoc(collection(db, 'calendar_events'), {
                date: format(selectedDate, 'yyyy-MM-dd'),
                type,
                description,
                departmentId: user.departmentId,
                targetBatchId: target === 'ALL' ? 'ALL' : target,
                targetBatchName: target === 'ALL' ? 'All Batches' : batches.find(b => b.id === target)?.courseName,
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });
            toast.success('Event Added!');
            setDescription('');
            fetchEvents();
        } catch (error) {
            console.error(error);
            toast.error('Failed to add event');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this event?')) return;
        try {
            await deleteDoc(doc(db, 'calendar_events', id));
            toast.success('Event Deleted');
            fetchEvents();
        } catch (error) {
            toast.error('Failed delete');
        }
    };

    // Calendar Grid
    const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });

    return (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Calendar & List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Academic Calendar</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setViewMonth(new Date(viewMonth.setMonth(viewMonth.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded">←</button>
                            <span className="font-bold text-gray-700 pt-1">{format(viewMonth, 'MMMM yyyy')}</span>
                            <button onClick={() => setViewMonth(new Date(viewMonth.setMonth(viewMonth.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded">→</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-xs font-bold text-gray-400">{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {[...Array(startOfMonth(viewMonth).getDay())].map((_, i) => <div key={i}></div>)}
                        {days.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayEvents = events.filter(e => e.date === dateStr);
                            const isSelected = isSameDay(day, selectedDate);

                            // Color logic
                            let bgClass = isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50';
                            if (dayEvents.some(e => e.type === 'HOLIDAY')) bgClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                            if (dayEvents.some(e => e.type === 'EXAM')) bgClass = 'bg-purple-100 text-purple-800 border-purple-200';

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(day)}
                                    className={`h-12 rounded-lg border flex flex-col items-center justify-center text-sm font-medium transition-all ${bgClass}`}
                                >
                                    {day.getDate()}
                                    {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-current mt-1"></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right: Add Event Form */}
            <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">
                        Manage Date: {format(selectedDate, 'MMM dd, yyyy')}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Event Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setType('HOLIDAY')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border ${type === 'HOLIDAY' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'border-gray-200 text-gray-600'}`}
                                >
                                    Holiday (Off)
                                </button>
                                <button
                                    onClick={() => setType('EXAM')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border ${type === 'EXAM' ? 'bg-purple-100 border-purple-300 text-purple-800' : 'border-gray-200 text-gray-600'}`}
                                >
                                    Exam (No Att.)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                placeholder="e.g. Diwali Break / Mid-Sem Exam"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Applies To</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                            >
                                <option value="ALL">Entire Department</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.courseName} Sem {b.semester}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleAddEvent}
                            className="w-full bg-biyani-red text-white py-2 rounded-lg font-bold shadow-lg hover:bg-red-700 transition-colors"
                        >
                            Mark Date
                        </button>
                    </div>
                </div>

                {/* Existing Events List for Date */}
                <div className="bg-gray-50 rounded-2xl p-6">
                    <h4 className="font-bold text-gray-700 mb-3 text-sm">Events on this day</h4>
                    <div className="space-y-2">
                        {events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).length === 0 && (
                            <p className="text-gray-400 text-sm italic">No events scheduled</p>
                        )}
                        {events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).map(e => (
                            <div key={e.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                                <div>
                                    <div className={`text-xs font-bold px-2 py-0.5 rounded inline-block mb-1 ${e.type === 'HOLIDAY' ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {e.type}
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">{e.description}</p>
                                    <p className="text-xs text-gray-500">{e.targetBatchName}</p>
                                </div>
                                <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
