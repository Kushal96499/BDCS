import React, { useState } from 'react';
import EventApprovals from './EventApprovals';
import AttendanceApprovals from './AttendanceApprovals';

export default function HODApprovalsWrapper() {
    const [activeTab, setActiveTab] = useState('events');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Administrative Registry</h1>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                        Unified Departmental Authorization Queue
                    </p>
                </div>

                <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-gray-100">
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'events' 
                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Event Permissions
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'attendance' 
                                ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Attendance Unlocks
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="transition-all duration-300">
                {activeTab === 'events' ? <EventApprovals /> : <AttendanceApprovals />}
            </div>
        </div>
    );
}
