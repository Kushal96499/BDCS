// ============================================
// BDCS - Assessment Dashboard (Teacher)
// Main interface for continuous assessment system
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getTestsByTeacher } from '../../services/testService';
import { motion } from 'framer-motion';
import CreateTestModal from '../../components/teacher/CreateTestModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AssessmentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [filteredTests, setFilteredTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({
        batch: 'all',
        semester: 'all',
        status: 'all'
    });

    useEffect(() => {
        if (user) {
            loadTests();
        }
    }, [user]);

    useEffect(() => {
        applyFilters();
    }, [tests, filters]);

    const loadTests = async () => {
        try {
            setLoading(true);
            console.log('Loading tests for teacher:', user.uid);
            const testsData = await getTestsByTeacher(user.uid);
            console.log('Tests loaded:', testsData);
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

        if (filters.batch !== 'all') {
            filtered = filtered.filter(test => test.batchId === filters.batch);
        }
        if (filters.semester !== 'all') {
            filtered = filtered.filter(test => test.semester === parseInt(filters.semester));
        }
        if (filters.status !== 'all') {
            filtered = filtered.filter(test => test.status === filters.status);
        }

        console.log('Filtered tests:', filtered);
        setFilteredTests(filtered);
    };

    const handleTestCreated = () => {
        setShowCreateModal(false);
        loadTests();
        toast.success('Test created successfully');
    };

    // Get unique batches and semesters for filters
    const uniqueBatches = [...new Set(tests.map(t => t.batchId).filter(Boolean))];
    const uniqueSemesters = [...new Set(tests.map(t => t.semester).filter(Boolean))].sort();

    const stats = {
        total: tests.length,
        pending: tests.filter(t =>
            (t.status === 'completed' || (t.status === 'scheduled' && new Date() >= new Date(t.testDate))) &&
            t.resultsMissing > 0
        ).length,
        toPublish: tests.filter(t =>
            (t.status === 'completed' || (t.status === 'scheduled' && new Date() >= new Date(t.testDate))) &&
            t.resultsMissing === 0
        ).length,
        published: tests.filter(t => t.status === 'published').length
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Continuous Assessment</h1>
                    <p className="text-gray-600 mt-1">Manage batch tests, upload marks, and track student progress</p>
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
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Pending Marks</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Ready to Publish</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.toPublish}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-1">Published</p>
                    <p className="text-3xl font-bold text-green-600">{stats.published}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
                        <select
                            value={filters.batch}
                            onChange={(e) => setFilters({ ...filters, batch: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                        >
                            <option value="all">All Batches</option>
                            {uniqueBatches.map(batchId => {
                                const test = tests.find(t => t.batch === batchId);
                                return (
                                    <option key={batchId} value={batchId}>
                                        {test?.batchName || batchId}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                        <select
                            value={filters.semester}
                            onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                        >
                            <option value="all">All Semesters</option>
                            {uniqueSemesters.map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tests Grid */}
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
                    <p className="text-gray-600">Create your first assessment test to get started</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 px-6 py-2 bg-biyani-red text-white rounded-lg font-semibold hover:bg-red-700"
                    >
                        Create Test
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTests.map(test => (
                        <TestCard key={test.id} test={test} onClick={() => navigate(`/teacher/tests/${test.id}`)} />
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

function TestCard({ test, onClick }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700';
            case 'scheduled': return 'bg-blue-100 text-blue-700';
            case 'completed': return 'bg-yellow-100 text-yellow-700';
            case 'published': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-biyani-red transition-all cursor-pointer group"
            onClick={onClick}
        >
            {/* Header */}
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

            {/* Details */}
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

            {/* Progress */}
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

            {/* Action Hint */}
            <div className="text-sm font-semibold text-gray-600 group-hover:text-biyani-red transition-colors">
                {test.status === 'draft' ? 'Edit Test →' :
                    (test.status === 'completed' || (test.status === 'scheduled' && new Date() >= new Date(test.testDate))) && test.resultsMissing > 0 ? 'Enter Marks →' :
                        (test.status === 'completed' || (test.status === 'scheduled' && new Date() >= new Date(test.testDate))) && test.resultsMissing === 0 ? 'Publish Results →' :
                            'View Details →'}
            </div>
        </motion.div>
    );
}
