// ============================================
// BDCS - Academic Configuration Page
// System-wide academic settings
// ============================================

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../components/admin/Toast';
import { logUpdate } from '../../../utils/auditLogger';
import { validateAcademicYear } from '../../../utils/validators';
import Input from '../../../components/Input';

export default function AcademicConfig() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configData, setConfigData] = useState({
        currentAcademicYear: '',
        academicSessionStart: '',
        academicSessionEnd: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const configRef = doc(db, 'systemConfig', 'academic_settings');
            const configDoc = await getDoc(configRef);

            if (configDoc.exists()) {
                const data = configDoc.data();
                setConfigData({
                    currentAcademicYear: data.currentAcademicYear || '',
                    academicSessionStart: data.academicSessionStart?.toDate().toISOString().split('T')[0] || '',
                    academicSessionEnd: data.academicSessionEnd?.toDate().toISOString().split('T')[0] || ''
                });
            }
        } catch (error) {
            console.error('Error fetching config:', error);
            toast.error('Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setConfigData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) : value
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};

        if (!configData.currentAcademicYear) {
            newErrors.currentAcademicYear = 'Academic year is required';
        } else {
            const yearValidation = validateAcademicYear(configData.currentAcademicYear);
            if (!yearValidation.valid) {
                newErrors.currentAcademicYear = yearValidation.error;
            }
        }

        if (configData.semesterStartDate && configData.semesterEndDate) {
            if (new Date(configData.semesterStartDate) >= new Date(configData.semesterEndDate)) {
                newErrors.semesterEndDate = 'End date must be after start date';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);

        try {
            const configRef = doc(db, 'systemConfig', 'academic_settings');
            const existingDoc = await getDoc(configRef);
            const beforeData = existingDoc.exists() ? existingDoc.data() : null;

            const newData = {
                currentAcademicYear: configData.currentAcademicYear,
                academicSessionStart: configData.academicSessionStart ? new Date(configData.academicSessionStart) : null,
                academicSessionEnd: configData.academicSessionEnd ? new Date(configData.academicSessionEnd) : null,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
            };

            await setDoc(configRef, newData, { merge: true });
            await logUpdate('systemConfig', 'academic_settings', beforeData, newData, user);

            toast.success('Academic configuration updated successfully');
            fetchConfig();
        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Failed to update configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-biyani-red"></div>
                <p className="mt-4 text-gray-600">Loading configuration...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Academic Configuration</h2>
                <p className="text-sm text-gray-600">Manage system-wide academic settings</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-yellow-800">Important Notice</p>
                        <p className="text-sm text-yellow-700 mt-1">
                            These settings affect the entire system. Changes will be reflected across all campuses, colleges, and departments.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Current Academic Year"
                        name=" currentAcademicYear"
                        value={configData.currentAcademicYear}
                        onChange={handleChange}
                        error={errors.currentAcademicYear}
                        placeholder="e.g., 2025-2026"
                        required
                        helperText="Format: YYYY-YYYY"
                    />

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Semester management and batch promotion are handled by <strong>HODs</strong> (Department Level) and <strong>Exam Cell</strong> (Result Declaration).
                            Admin only sets the global Financial/Academic Year here.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Session Start Date
                            </label>
                            <input
                                type="date"
                                name="academicSessionStart"
                                value={configData.academicSessionStart}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Session End Date
                            </label>
                            <input
                                type="date"
                                name="academicSessionEnd"
                                value={configData.academicSessionEnd}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={fetchConfig}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={saving}
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Configuration Info</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Academic year format: Start Year - End Year (e.g., 2025-2026)</li>
                    <li>• Used for financial and global reporting</li>
                    <li>• Settings can be viewed by all roles, editable only by Admin</li>
                </ul>
            </div>
        </div>
    );
}
