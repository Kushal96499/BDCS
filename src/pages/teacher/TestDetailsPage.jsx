// ============================================
// BDCS - Test Details Page (Teacher)
// View test, enter marks, publish results
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getTestById, publishTest, getTestStats } from '../../services/testService';
import { getTestResults, updateStudentMark } from '../../services/testResultService';
import { exportBatchResults, downloadMarksTemplate } from '../../utils/excelExport';
import { format } from 'date-fns';
import { toast } from '../../components/admin/Toast';
import { motion } from 'framer-motion';

export default function TestDetailsPage() {
    const { testId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [results, setResults] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('marks'); // marks, stats
    const [editingRow, setEditingRow] = useState(null);
    const [savingMark, setSavingMark] = useState(false);

    useEffect(() => {
        if (testId) {
            loadTestData();
        }
    }, [testId]);

    const loadTestData = async () => {
        try {
            setLoading(true);
            const [testData, resultsData, statsData] = await Promise.all([
                getTestById(testId),
                getTestResults(testId),
                getTestStats(testId)
            ]);
            setTest(testData);
            setResults(resultsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading test data:', error);
            toast.error('Failed to load test details');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (resultId, field, value) => {
        setResults(prev => prev.map(r =>
            r.id === resultId ? { ...r, [field]: value } : r
        ));
    };

    const handleSaveMark = async (result) => {
        try {
            setSavingMark(true);
            await updateStudentMark(
                testId,
                result.student,
                parseFloat(result.marksObtained),
                result.remarks || '',
                user
            );
            toast.success('Mark saved successfully');
            setEditingRow(null);
            await loadTestData(); // Reload to get updated stats
        } catch (error) {
            console.error('Error saving mark:', error);
            toast.error(error.message || 'Failed to save mark');
        } finally {
            setSavingMark(false);
        }
    };

    const handlePublishResults = async () => {
        if (test.resultsMissing > 0) {
            toast.error(`Cannot publish: ${test.resultsMissing} results still missing`);
            return;
        }

        const confirmed = window.confirm(
            `Publish results for ${test.totalStudents} students?\n\nThis will make results visible to students.`
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await publishTest(testId, user);
            toast.success('Results published successfully!');
            await loadTestData();
        } catch (error) {
            console.error('Error publishing results:', error);
            toast.error(error.message || 'Failed to publish results');
        } finally {
            setLoading(false);
        }
    };

    const handleExportResults = async () => {
        try {
            await exportBatchResults(results, test, `${test.subjectName}_${test.topic}_results.csv`, user);
            toast.success('Results exported successfully');
        } catch (error) {
            console.error('Error exporting results:', error);
            toast.error('Failed to export results');
        }
    };

    const handleDownloadTemplate = () => {
        try {
            const students = results.map(r => ({
                enrollmentNumber: r.enrollmentNumber,
                name: r.studentName
            }));
            downloadMarksTemplate(students, test);
            toast.success('Template downloaded');
        } catch (error) {
            console.error('Error downloading template:', error);
            toast.error('Failed to download template');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PASS': return 'bg-green-100 text-green-700';
            case 'FAIL': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading && !test) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-biyani-red"></div>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-600">Test not found</p>
                <button onClick={() => navigate('/teacher/tests')} className="mt-4 text-biyani-red hover:underline">
                    Back to Tests
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/teacher/tests')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Tests
                </button>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{test.subjectName}</h1>
                            <p className="text-xl text-gray-700 mb-4">{test.topic}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {format(test.testDate, 'MMMM dd, yyyy')}
                                </span>
                                <span>•</span>
                                <span>{test.batchName}</span>
                                <span>•</span>
                                <span>Max Marks: {test.maxMarks}</span>
                                <span>•</span>
                                <span className="capitalize">{test.testType.replace('_', ' ')}</span>
                            </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${test.status === 'published' ? 'bg-green-100 text-green-700' :
                            test.status === 'completed' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {test.status.toUpperCase()}
                        </span>
                    </div>

                    {test.description && (
                        <p className="mt-4 text-gray-600 bg-gray-50 rounded-lg p-3">{test.description}</p>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {test.status !== 'published' && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900">Marks Entry Progress</h3>
                        <span className="text-sm font-medium text-gray-600">
                            {test.resultsEntered} / {test.totalStudents} students
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="bg-biyani-red h-3 rounded-full transition-all"
                            style={{ width: `${(test.resultsEntered / test.totalStudents) * 100}%` }}
                        ></div>
                    </div>
                    {test.resultsMissing > 0 && (
                        <p className="text-sm text-yellow-600 mt-2">
                            ⚠️ {test.resultsMissing} student(s) pending marks entry
                        </p>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
                {test.status !== 'published' && test.resultsMissing === 0 && (
                    <button
                        onClick={handlePublishResults}
                        disabled={loading}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50"
                    >
                        📢 Publish Results
                    </button>
                )}
                <button
                    onClick={handleDownloadTemplate}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                >
                    📥 Download Template
                </button>
                <button
                    onClick={handleExportResults}
                    className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg"
                >
                    📊 Export Excel
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('marks')}
                    className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'marks'
                        ? 'text-biyani-red border-b-2 border-biyani-red'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Marks Entry ({results.length})
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'stats'
                        ? 'text-biyani-red border-b-2 border-biyani-red'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Statistics
                </button>
            </div>

            {/* Content */}
            {activeTab === 'marks' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Roll No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Marks</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Percentage</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remarks</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {results.map((result) => {
                                    const isEditing = editingRow === result.id;
                                    const isPass = result.passFailStatus === 'PASS';

                                    return (
                                        <tr
                                            key={result.id}
                                            className={`hover:bg-gray-50 ${isPass ? 'bg-green-50/30' : result.marksObtained !== undefined ? 'bg-red-50/30' : ''}`}
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-900">{result.enrollmentNumber}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{result.studentName}</td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={result.marksObtained || ''}
                                                        onChange={(e) => handleMarkChange(result.id, 'marksObtained', e.target.value)}
                                                        min="0"
                                                        max={test.maxMarks}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-900">
                                                        {result.marksObtained !== undefined ? `${result.marksObtained}/${test.maxMarks}` : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {result.percentage !== undefined ? `${result.percentage}%` : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {result.passFailStatus && (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(result.passFailStatus)}`}>
                                                        {result.passFailStatus}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={result.remarks || ''}
                                                        onChange={(e) => handleMarkChange(result.id, 'remarks', e.target.value)}
                                                        placeholder="Optional remarks"
                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-600">{result.remarks || '-'}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSaveMark(result)}
                                                            disabled={savingMark || !result.marksObtained}
                                                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingRow(null);
                                                                loadTestData();
                                                            }}
                                                            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingRow(result.id)}
                                                        disabled={test.status === 'published'}
                                                        className="px-3 py-1 bg-biyani-red text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {result.marksObtained !== undefined ? 'Edit' : 'Enter'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'stats' && stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <p className="text-sm font-medium text-gray-500 mb-2">Average Marks</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.averageMarks}</p>
                        <p className="text-sm text-gray-600 mt-1">out of {test.maxMarks}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <p className="text-sm font-medium text-gray-500 mb-2">Pass Percentage</p>
                        <p className="text-3xl font-bold text-green-600">{stats.passPercentage}%</p>
                        <p className="text-sm text-gray-600 mt-1">{stats.passCount} students</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <p className="text-sm font-medium text-gray-500 mb-2">Highest Score</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.highest}</p>
                        <p className="text-sm text-gray-600 mt-1">out of {test.maxMarks}</p>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <p className="text-sm font-medium text-gray-500 mb-2">Lowest Score</p>
                        <p className="text-3xl font-bold text-orange-600">{stats.lowest}</p>
                        <p className="text-sm text-gray-600 mt-1">out of {test.maxMarks}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
