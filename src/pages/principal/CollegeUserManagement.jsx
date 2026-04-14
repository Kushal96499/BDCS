import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { createHODUser, assignHOD, getCollegeDepartments } from '../../services/principalService';
import { toast } from '../../components/admin/Toast';
import HODDetailPanel from '../../components/principal/HODDetailPanel';
import StatusPill from '../../components/common/StatusPill';

export default function CollegeUserManagement() {
    const { user } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [hods, setHods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form Mode: 'create' or 'assign_self'
    const [formMode, setFormMode] = useState('create');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: '',
        joiningDate: new Date().toISOString().split('T')[0]
    });

    const [selectedHOD, setSelectedHOD] = useState(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);

    useEffect(() => {
        if (user?.collegeId) {
            loadData();
        }
    }, [user?.collegeId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [depts, hodsData] = await Promise.all([
                getCollegeDepartments(user.collegeId),
                loadHODs()
            ]);
            setDepartments(depts);

            // Filter out current user (Principal) from HOD list to prevent "Ghost HOD"
            const filteredHods = hodsData.filter(h => h.id !== user.uid);
            setHods(filteredHods);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadHODs = async () => {
        try {
            if (!user?.collegeId) return [];

            // Query for multi-role format (roles array contains 'hod') - ALL HODs in college
            const multiRoleQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('roles', 'array-contains', 'hod'),
                where('status', '==', 'active')
            );

            // Query for single-role format (role === 'hod') - ALL HODs in college
            const singleRoleQuery = query(
                collection(db, 'users'),
                where('collegeId', '==', user.collegeId),
                where('role', '==', 'hod'),
                where('status', '==', 'active')
            );

            // Fetch both and combine
            const [multiRoleSnapshot, singleRoleSnapshot] = await Promise.all([
                getDocs(multiRoleQuery),
                getDocs(singleRoleQuery)
            ]);

            const multiRoleHODs = multiRoleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const singleRoleHODs = singleRoleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Combine and deduplicate by ID
            const allHODs = [...multiRoleHODs, ...singleRoleHODs];
            const uniqueHODs = Array.from(new Map(allHODs.map(hod => [hod.id, hod])).values());

            return uniqueHODs;
        } catch (error) {
            console.error('Error loading HODs:', error);
            return [];
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.departmentId) {
            toast.error('Please select a department');
            return;
        }

        setSubmitting(true);
        try {
            if (formMode === 'assign_self') {
                // Check if department already has HOD
                const selectedDept = departments.find(d => d.id === formData.departmentId);
                if (selectedDept?.currentHOD) {
                    toast.error(`Department ${selectedDept.name} already has an HOD.`);
                    setSubmitting(false);
                    return;
                }

                // Execute Self Assignment
                await assignHOD(formData.departmentId, user.uid, formData.joiningDate, user);
                toast.success('Successfully assigned yourself as HOD!');
            } else {
                // Create New User
                if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
                    toast.error('All fields are required');
                    setSubmitting(false);
                    return;
                }
                if (formData.phone.length < 10) {
                    toast.error('Phone number must be at least 10 digits');
                    setSubmitting(false);
                    return;
                }

                const result = await createHODUser(formData, formData.departmentId, user);
                toast.success(`✅ HOD account created! Initial password: firstname + last 4 of phone. They must reset on first login.`);

            }

            setShowForm(false);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                departmentId: '',
                joiningDate: new Date().toISOString().split('T')[0]
            });
            loadData(); // Reload data
        } catch (error) {
            console.error('Error in HOD operation:', error);
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">HOD Management</h1>
                    <p className="text-gray-600">Create and manage HOD accounts for {user?.collegeName}</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-6 py-3 bg-biyani-red text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
                    </svg>
                    {showForm ? 'Cancel' : 'Create / Assign HOD'}
                </button>
            </div>

            {/* Creation Form */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8 animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">{formMode === 'create' ? 'Create New HOD' : 'Assign Myself as HOD'}</h2>

                        {/* Mode Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setFormMode('create')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${formMode === 'create' ? 'bg-white text-biyani-red shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Create New
                            </button>
                            <button
                                onClick={() => setFormMode('assign_self')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${formMode === 'assign_self' ? 'bg-white text-biyani-red shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Assign Myself
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {formMode === 'create' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                        required
                                        minLength={10}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Department *</label>
                                <select
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                >
                                    <option value="">Select Department {formMode === 'assign_self' ? '(Vacant Only)' : ''}</option>
                                    {departments.map(dept => {
                                        const disabled = formMode === 'assign_self' && dept.currentHOD;
                                        return (
                                            <option key={dept.id} value={dept.id} disabled={disabled}>
                                                {dept.name} {disabled ? '(Has HOD)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                {formMode === 'assign_self' && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        * You can only assign yourself to departments that currently have no HOD.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date *</label>
                                <input
                                    type="date"
                                    value={formData.joiningDate}
                                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        {formMode === 'create' ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900 flex items-start gap-2">
                                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>Password will be auto-generated: <strong>firstname + last 4 digits of phone</strong>. User must reset on first login.</span>
                                </p>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-900 flex items-start gap-2">
                                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>You are assigning <strong>Yourself</strong> as the HOD. You will gain HOD access rights immediately.</span>
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Processing...' : (formMode === 'create' ? 'Create HOD' : 'Assign Myself as HOD')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Existing HODs List - CARD TABLE HYBRID */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-bold text-gray-900">Existing HODs ({hods.length})</h3>
                    {/* Filter placeholder if needed */}
                </div>

                {loading ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500 animate-pulse border border-gray-200">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                    </div>
                ) : hods.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No HODs Found</h3>
                        <p className="text-gray-500 text-sm">Get started by creating a new HOD account.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {hods.map(hod => (
                            <div
                                key={hod.id}
                                onClick={() => {
                                    setSelectedHOD(hod);
                                    setShowDetailPanel(true);
                                }}
                                className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-biyani-red/20 transition-all duration-200 cursor-pointer flex flex-col md:flex-row items-center gap-4"
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0 relative">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-bold border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                        {hod.name?.charAt(0)}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 text-center md:text-left">
                                    <h4 className="font-bold text-gray-900 text-base group-hover:text-biyani-red transition-colors">
                                        {hod.name}
                                    </h4>
                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1 justify-center md:justify-start">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            {hod.email}
                                        </span>
                                        <span className="hidden md:inline text-gray-300">•</span>
                                        <span className="flex items-center gap-1 justify-center md:justify-start font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            {hod.departmentName || 'No Dept'}
                                        </span>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end border-t md:border-none border-gray-50 pt-3 md:pt-0 w-full md:w-auto">
                                    <StatusPill status="Active" type="success" />

                                    <button className="p-2 text-gray-400 hover:text-biyani-red hover:bg-red-50 rounded-lg transition-colors group-hover:opacity-100 opacity-60">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* HOD Detail Panel */}
            {showDetailPanel && selectedHOD && (
                <HODDetailPanel
                    hod={selectedHOD}
                    onClose={() => {
                        setShowDetailPanel(false);
                        setSelectedHOD(null);
                    }}
                    onUpdate={() => {
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
