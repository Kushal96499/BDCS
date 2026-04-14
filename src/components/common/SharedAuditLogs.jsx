import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

const toPastTense = (verb) => {
    if (!verb) return '';
    const word = verb.toLowerCase();
    if (word.endsWith('e')) return word + 'd';
    if (word.endsWith('sh')) return word + 'ed';
    return word + 'ed';
};

const getActionColor = (action) => {
    if (!action) return 'bg-gray-100 text-gray-800';
    if (action.includes('create') || action === 'enable') return 'bg-green-100 text-green-800';
    if (action.includes('delete') || action.includes('remove') || action === 'disable') return 'bg-red-100 text-red-800';
    if (action.includes('update') || action.includes('change')) return 'bg-blue-100 text-blue-800';
    if (action.includes('assign')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
};

export default function SharedAuditLogs({ title, subtitle }) {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (user?.uid) fetchLogs();
    }, [user?.uid]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let fetchedLogs = [];

            if (user.role === 'principal') {
                const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(150));
                const snap = await getDocs(q);
                fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const collegeName = user?.collegeName || '';
                fetchedLogs = fetchedLogs.filter(log => {
                    const role = log.performedByRole || '';
                    if (['admin', 'director'].includes(role)) return false;
                    if (role === 'student' || log.entityType === 'student_log') return false;
                    if (log.performedBy === user.uid) return true;
                    const isInCollege = (log.performerCollege && log.performerCollege === collegeName) ||
                        log.entityPath?.includes(collegeName) ||
                        log.metadata?.collegeName === collegeName;
                    const isSubordinate = ['hod', 'teacher', 'clerk', 'exam_cell', 'placement', 'hr', 'sports', 'transport'].includes(role);
                    return isInCollege && (isSubordinate || log.performedBy === user.uid);
                });
            } else if (user.role === 'hod') {
                const q = query(collection(db, 'auditLogs'), where('performerDept', '==', user.departmentName), limit(150));
                const snap = await getDocs(q);
                fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                fetchedLogs = fetchedLogs.filter(log => log.performedByRole === 'teacher' || log.performedBy === user.uid);
                fetchedLogs.sort((a, b) => (b.timestamp?.toMillis?.() || b.timestamp) - (a.timestamp?.toMillis?.() || a.timestamp));
            } else if (user.role === 'teacher') {
                const q = query(collection(db, 'auditLogs'), where('performedBy', '==', user.uid), limit(100));
                const snap = await getDocs(q);
                fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                fetchedLogs.sort((a, b) => (b.timestamp?.toMillis?.() || b.timestamp) - (a.timestamp?.toMillis?.() || a.timestamp));
            }

            setLogs(fetchedLogs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesAction = filterAction === 'all' || log.action === filterAction;
        const matchesSearch = searchQuery === '' ||
            log.entityLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.performedByName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesAction && matchesSearch;
    });

    const uniqueActions = ['all', ...new Set(logs.map(log => log.action))];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{title || 'Audit Logs'}</h1>
                    <p className="text-gray-600">{subtitle}</p>
                </div>
                <button onClick={fetchLogs} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" title="Refresh Logs">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biyani-red/20 focus:border-biyani-red"
                    />
                </div>
                <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-biyani-red/20 focus:border-biyani-red"
                >
                    {uniqueActions.map(action => (
                        <option key={action} value={action}>
                            {action === 'all' ? 'All Actions' : action.toUpperCase().replace('_', ' ')}
                        </option>
                    ))}
                </select>
            </div>

            {/* Logs Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6 min-h-[400px]">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-biyani-red"></div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        No logs found matching your criteria.
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                        {filteredLogs.map((log) => {
                            const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                            return (
                                <div key={log.id} className="relative pl-8 group">
                                    <div className="absolute -left-[9px] top-1">
                                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.action.includes('delete') ? 'bg-red-500' : 'bg-gray-300 group-hover:bg-biyani-red'} transition-colors`}></div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${getActionColor(log.action)}`}>
                                                    {log.action?.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {format(date, 'MMM d, h:mm a')}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-bold text-gray-900 leading-tight">
                                                {log.entityLabel || 'Unknown Entity'}
                                                <span className="font-normal text-gray-500 mx-1">was</span>
                                                <span className="lowercase font-medium text-gray-700">{toPastTense(log.action?.split('_')[0])}</span>
                                            </h4>

                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">
                                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    <span className="font-medium text-gray-700">{log.performedByName}</span>
                                                    <span className="text-gray-400">({log.performedByRole})</span>
                                                </div>
                                                <span>•</span>
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded">{log.entityType}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setSelectedLog(log);
                                                setIsModalOpen(true);
                                            }}
                                            className="self-start sm:self-center px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-900 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Log Details Modal */}
            {isModalOpen && selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Log Details</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    ID: <span className="font-mono text-xs bg-gray-200 px-1 rounded select-all">{selectedLog.id}</span>
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Action</span>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full inline-block ${getActionColor(selectedLog.action)}`}>
                                        {selectedLog.action?.toUpperCase().replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Timestamp</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {format(selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate() : new Date(selectedLog.timestamp), 'PPP pp')}
                                    </span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Performed By</span>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{selectedLog.performedByName}</span>
                                        <span className="text-xs text-mono text-gray-500">{selectedLog.performedByRole}</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Target Entity</span>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{selectedLog.entityLabel}</span>
                                        <span className="text-xs text-gray-500">{selectedLog.entityType}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedLog.entityPath && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Context Path</h4>
                                    <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100 break-all">
                                        {selectedLog.entityPath}
                                    </div>
                                </div>
                            )}

                            {(selectedLog.before || selectedLog.after) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedLog.before && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                                                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                                                Before
                                            </h4>
                                            <pre className="p-3 bg-red-50 text-red-900 text-xs rounded border border-red-100 overflow-x-auto">
                                                {JSON.stringify(selectedLog.before, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {selectedLog.after && (
                                        <div className={!selectedLog.before ? 'md:col-span-2' : ''}>
                                            <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                                After
                                            </h4>
                                            <pre className="p-3 bg-green-50 text-green-900 text-xs rounded border border-green-100 overflow-x-auto">
                                                {JSON.stringify(selectedLog.after, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Additional Metadata</h4>
                                    <pre className="p-3 bg-gray-50 text-gray-700 text-xs rounded border border-gray-200 overflow-x-auto">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0 rounded-b-xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
