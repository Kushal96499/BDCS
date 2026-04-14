// ============================================
// BDCS - Test Management (Teacher)
// Main dashboard for creating and managing tests
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getTestsByTeacher } from '../../services/testService';
import { motion } from 'framer-motion';
import CreateTestModal from '../../components/teacher/CreateTestModal';
import { format } from 'date-fns';
import { toast } from '../../components/admin/Toast';

export default function TestManagement() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [filteredTests, setFilteredTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // all, scheduled, completed, published
    const [filters, setFilters] = useState({
        batch: '',
        subject: '',
        semester: ''
    });

    useEffect(() => {
        if (user) {
            loadTests();
        }
    }, [user]);

    useEffect(() => {
        applyFilters();
    }, [tests, activeTab, filters]);

    const loadTests = async () => {
        try {
            setLoading(true);
            const testsData = await getTestsByTeacher(user.uid);
            setTests(testsData);
        } catch (error) {
            console.error('Error loading tests:', error);
            toast.error('Failed to load tests');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...tests];

        // Tab filter
        if (activeTab !== 'all') {
            filtered = filtered.filter(test => test.status === activeTab);
        }

        // Additional filters
        if (filters.batch) {
            filtered = filtered.filter(test => test.batch === filters.batch);
        }
        if (filters.subject) {
            filtered = filtered.filter(test => test.subject === filters.subject);
        }
        if (filters.semester) {
            filtered = filtered.filter(test => test.semester === parseInt(filters.semester));
        }

        setFilteredTests(filtered);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700';
            case 'scheduled': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-yellow-100 text-yellow-700';
            case 'published': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleTestCreated = () => {
        setShowCreateModal(false);
        loadTests();
        toast.success('Test created successfully');
    };

    const tabs = [
        { value: 'all', label: 'All Tests', count: tests.length },
        { value: 'draft', label: 'Drafts', count: tests.filter(t => t.status === 'draft').length },
        { value: 'scheduled', label: 'Scheduled', count: tests.filter(t => t.status === 'scheduled').length },
        { value: 'completed', label: 'Completed', count: tests.filter(t => t.status === 'completed').length },
        { value: 'published', label: 'Published', count: tests.filter(t => t.status === 'published').length }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Test Management</h1>
                    <p className="text-gray-600 mt-1">Create, manage, and publish continuous tests</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-biyani-red text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Test
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Tests</p>
                    <p className="text-3xl font-bold text-gray-900">{tests.length}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Pending Marks</p>
                    <p className="text-3xl font-bold text-yellow-600">
                        {tests.filter(t => t.status === 'completed' && t.resultsMissing > 0).length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">To Publish</p>
                    <p className="text-3xl font-bold text-blue-600">
                        {tests.filter(t => t.status === 'completed' && t.resultsMissing === 0).length}
                    </p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Published</p>
                    <p className="text-3xl font-bold text-green-600">
                        {tests.filter(t => t.status === 'published').length}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-4 py-3 font-semibold transition-colors relative whitespace-nowrap ${activeTab === tab.value
                            ? 'text-biyani-red border-b-2 border-biyani-red'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {tab.label}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.value ? 'bg-red-100 text-biyani-red' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tests List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : filteredTests.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tests Found</h3>
                    <p className="text-gray-600">
                        {activeTab === 'all'
                            ? 'Create your first test to get started'
                            : `No ${activeTab} tests at the moment`
                        }
                    </p>
                    {activeTab === 'all' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-6 py-2 bg-biyani-red text-white rounded-lg font-semibold hover:bg-red-700"
                        >
                            Create Test
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTests.map(test => (
                        <motion.div
                            key={test.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
                            onClick={() => navigate(`/teacher/tests/${test.id}`)}
                        >
                            {/* Test Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-biyani-red transition-colors">
                                        {test.subjectName}
                                    </h3>
                                    <p className="text-sm text-gray-600">{test.topic}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(test.status)}`}>
                                    {test.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Test Details */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {format(test.testDate, 'MMM dd, yyyy')}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {test.batchName}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Max Marks: {test.maxMarks}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {test.status !== 'draft' && (
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>Marks Entered</span>
                                        <span>{test.resultsEntered}/{test.totalStudents}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-biyani-red h-2 rounded-full transition-all"
                                            style={{ width: `${(test.resultsEntered / test.totalStudents) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/teacher/tests/${test.id}`);
                                }}
                                className="w-full py-2 bg-gray-50 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors group-hover:bg-biyani-red group-hover:text-white"
                            >
                                {test.status === 'draft' ? 'Edit Test' :
                                    test.status === 'completed' && test.resultsMissing > 0 ? 'Enter Marks' :
                                        test.status === 'completed' && test.resultsMissing === 0 ? 'Publish Results' :
                                            'View Details'}
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Test Modal */}
            {showCreateModal && (
                <CreateTestModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleTestCreated}
                    teacherUser={user}
                />
            )}
        </div>
    );
}
