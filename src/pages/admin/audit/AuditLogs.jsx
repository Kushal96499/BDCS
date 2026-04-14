// ============================================
// BDCS - Enhanced Audit Logs Viewer
// Human-readable audit trail with entity metadata
// ============================================

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { format } from 'date-fns';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState(null);
    const [filters, setFilters] = useState({
        collection: 'all',
        role: 'all',
        action: 'all',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchLogs();
    }, [filters.collection, filters.role, filters.action, filters.startDate, filters.endDate]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));

            // Apply Date Filters (Client-side approximation if index missing, or server side if possible. 
            // Using client-side filtering for date to avoid index explosion for now, but fetching more logs)
            // Ideally we use where() but that requires composite index for each field combo.
            // Let's stick to limit(150) -> limit(500) and client filter for now.
            q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(300));

            const snapshot = await getDocs(q);
            let fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side filtering
            if (filters.collection !== 'all') {
                fetchedLogs = fetchedLogs.filter(log => log.collection === filters.collection);
            }

            if (filters.role !== 'all') {
                fetchedLogs = fetchedLogs.filter(log => log.performedByRole === filters.role);
            }

            if (filters.action !== 'all') {
                if (filters.action === 'lifecycle') {
                    fetchedLogs = fetchedLogs.filter(log =>
                        ['relieve_user', 'assign_successor', 'archive_user', 'role_change', 'ownership_transfer'].includes(log.action)
                    );
                } else {
                    fetchedLogs = fetchedLogs.filter(log => log.action === filters.action);
                }
            }

            // STRICT RULE: Admin should NOT see Student Activity Logs here (too noisy, and privacy)
            // Unless explicitly filtering for students? No, user said "student ke logs kese ko show nhi hongee"
            fetchedLogs = fetchedLogs.filter(log => log.entityType !== 'student_log' && log.performedByRole !== 'student');

            if (filters.startDate) {
                const start = new Date(filters.startDate);
                fetchedLogs = fetchedLogs.filter(log => {
                    const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
                    return logDate >= start;
                });
            }

            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999); // End of day
                fetchedLogs = fetchedLogs.filter(log => {
                    const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
                    return logDate <= end;
                });
            }

            setLogs(fetchedLogs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action?.includes('delete') || action === 'disable') return 'text-red-600 bg-red-50 border-red-200';
        if (action === 'relieve_user' || action === 'archive_user') return 'text-orange-600 bg-orange-50 border-orange-200';
        if (action?.includes('create') || action === 'enable') return 'text-green-600 bg-green-50 border-green-200';
        if (action === 'assign_successor' || action === 'role_change' || action === 'ownership_transfer') return 'text-purple-600 bg-purple-50 border-purple-200';
        if (action?.includes('update')) return 'text-blue-600 bg-blue-50 border-blue-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const formatActionName = (action) => {
        return action?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';
    };

    const isLegacyLog = (log) => {
        return !log.entityLabel && !log.entityPath;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
                    <p className="text-sm text-gray-600">Human-readable audit trail with entity metadata</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={filters.collection}
                        onChange={(e) => setFilters(prev => ({ ...prev, collection: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red"
                    >
                        <option value="all">All Collections</option>
                        <option value="users">Users</option>
                        <option value="departments">Departments</option>
                        <option value="colleges">Colleges</option>
                        <option value="campuses">Campuses</option>
                        <option value="courses">Courses</option>
                    </select>

                    <select
                        value={filters.role}
                        onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="director">Director</option>
                        <option value="principal">Principal</option>
                        <option value="hod">HOD</option>
                        <option value="teacher">Teacher</option>
                    </select>

                    <select
                        value={filters.action}
                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red"
                    >
                        <option value="all">All Actions</option>
                        <option value="lifecycle">Lifecycle Events</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="enable">Enable</option>
                        <option value="disable">Disable</option>
                        <option value="hod_change">HOD Change</option>
                        <option value="teacher_assign">Teacher Assignment</option>
                        <option value="relieve_user">Relieve User</option>
                        <option value="assign_successor">Assign Successor</option>
                        <option value="archive_user">Archive User</option>
                        <option value="role_change">Role Change</option>
                        <option value="ownership_transfer">Ownership Transfer</option>
                    </select>

                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-biyani-red"
                        placeholder="End Date"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-biyani-red"></div>
                                            Loading logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">
                                        No logs found for selected filters.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        >
                                            {/* Timestamp */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, yyyy') : 'N/A'}
                                                <div className="text-xs text-gray-400">
                                                    {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'h:mm a') : ''}
                                                </div>
                                            </td>

                                            {/* Action Badge */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getActionColor(log.action)}`}>
                                                    {formatActionName(log.action)}
                                                </span>
                                            </td>

                                            {/* Entity (Human-Readable) */}
                                            <td className="px-6 py-4 text-sm">
                                                {isLegacyLog(log) ? (
                                                    <div className="text-gray-400 italic">
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>(Legacy Entry)</span>
                                                        </div>
                                                        <div className="text-xs mt-1 font-mono">{log.collection}: {log.documentId?.slice(0, 8)}...</div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {/* Enhanced label logic: Use entityLabel, fallback to snapshot data if "Unknown User" */}
                                                            {(log.entityLabel && log.entityLabel !== 'Unknown User' && log.entityLabel !== 'Unknown')
                                                                ? log.entityLabel
                                                                : (log.after?.userName || log.after?.name || log.before?.userName || log.before?.name || log.entityLabel || 'Unknown')}
                                                        </div>
                                                        {log.entityPath && (
                                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                                </svg>
                                                                {log.entityPath}
                                                            </div>
                                                        )}
                                                        {log.targetLabel && (
                                                            <div className="text-xs text-purple-600 mt-1">
                                                                → {log.targetLabel}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Performed By */}
                                            <td className="px-6 py-4 text-sm">
                                                <div className="font-medium text-gray-900">{log.performedByName || 'System'}</div>
                                                {log.performedByRole && (
                                                    <div className="text-xs text-gray-500 capitalize">{log.performedByRole}</div>
                                                )}
                                            </td>

                                            {/* Details Toggle */}
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <button className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1">
                                                    {expandedLog === log.id ? (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                            </svg>
                                                            Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                            View Details
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expandable Details Row */}
                                        {expandedLog === log.id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan="5" className="px-6 py-4">
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-700 mb-2">Technical Details</h4>
                                                            <div className="space-y-1 text-xs">
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500">Collection:</span>
                                                                    <span className="font-mono text-gray-700">{log.collection}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500">Document ID:</span>
                                                                    <span className="font-mono text-gray-700" title={log.documentId}>
                                                                        {log.documentId?.slice(0, 20)}...
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-500">Performer ID:</span>
                                                                    <span className="font-mono text-gray-700" title={log.performedBy}>
                                                                        {log.performedBy?.slice(0, 20)}...
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {(log.before || log.after || log.metadata) && (
                                                            <div>
                                                                <h4 className="font-semibold text-gray-700 mb-2">Changes</h4>
                                                                {log.before && (
                                                                    <div className="text-xs mb-2">
                                                                        <span className="text-red-600 font-semibold">Before:</span>
                                                                        <pre className="mt-1 bg-red-50 p-2 rounded text-red-700 overflow-auto max-h-32">
                                                                            {JSON.stringify(log.before, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                                {log.after && (
                                                                    <div className="text-xs">
                                                                        <span className="text-green-600 font-semibold">After:</span>
                                                                        <pre className="mt-1 bg-green-50 p-2 rounded text-green-700 overflow-auto max-h-32">
                                                                            {JSON.stringify(log.after, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                    Showing <span className="font-semibold text-gray-900">{logs.length}</span> audit log entries
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Active logging</span>
                </div>
            </div>
        </div>
    );
}
