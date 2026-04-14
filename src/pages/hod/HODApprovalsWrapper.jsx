import React, { useState } from 'react';
import AttendanceApprovals from './AttendanceApprovals';
import LeaveApprovals from './LeaveApprovals';
import EventApprovals from './EventApprovals';

export default function HODApprovalsWrapper() {
    const [activeTab, setActiveTab] = useState('leaves'); // leaves | attendance | events

    const tabs = [
        { id: 'leaves', label: 'Leave Requests' },
        { id: 'attendance', label: 'Attendance Unlocks' },
        { id: 'events', label: 'Event Proposals' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Approvals & Requests</h1>
                    <p className="text-gray-500 font-medium">Unified Inbox for Department Decisions</p>
                </div>

                <div className="flex bg-gray-100 p-1.5 rounded-xl self-start md:self-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-white text-black shadow-md shadow-gray-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'leaves' && <LeaveApprovals />}
                {activeTab === 'attendance' && <AttendanceApprovals />}
                {activeTab === 'events' && <EventApprovals />}
            </div>
        </div>
    );
}
