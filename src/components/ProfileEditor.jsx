// ============================================
// BDCS - Profile Editor Component
// Manage user profile with locked vs editable fields
// ============================================

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { toast } from './admin/Toast';
import { logUpdate } from '../utils/auditLogger';

export default function ProfileEditor({ userId, userData, onUpdate }) {
    const { user: currentUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        photoURL: '',
        personalEmail: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        },
        bio: '',
        skills: []
    });

    useEffect(() => {
        if (userData?.editableProfile) {
            setFormData({
                ...formData,
                ...userData.editableProfile
            });
        }
    }, [userData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddressChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const userRef = doc(db, 'users', userId);
            const updateData = {
                editableProfile: formData,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid
            };

            await updateDoc(userRef, updateData);

            // Log the update
            await logUpdate('users', userId, userData, { ...userData, ...updateData }, currentUser, {
                label: userData.name
            });

            toast.success('Profile updated successfully');
            setEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const lockedFields = userData?.lockedProfile || {};

    return (
        <div className="space-y-6">
            {/* Locked Fields Section */}
            <div className="bg-gray-50 rounded-lg border-2 border-gray-300 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Institutional Information</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                        🔒 Locked - Cannot be edited
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {lockedFields.employeeId && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Employee ID</label>
                            <p className="text-sm font-mono font-medium text-gray-700 mt-1">{lockedFields.employeeId}</p>
                        </div>
                    )}
                    {lockedFields.enrollmentNumber && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Enrollment Number</label>
                            <p className="text-sm font-mono font-medium text-gray-700 mt-1">{lockedFields.enrollmentNumber}</p>
                        </div>
                    )}
                    {lockedFields.joiningDate && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Joining Date</label>
                            <p className="text-sm font-medium text-gray-700 mt-1">
                                {new Date(lockedFields.joiningDate.toDate()).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                    {lockedFields.originalRole && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Original Role</label>
                            <p className="text-sm font-medium text-gray-700 mt-1 uppercase">{lockedFields.originalRole}</p>
                        </div>
                    )}
                    {lockedFields.createdBy && (
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Created By</label>
                            <p className="text-sm font-medium text-gray-700 mt-1">{userData.createdByName || lockedFields.createdBy}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Editable Fields Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-biyani-red rounded-lg hover:bg-red-700 transition-colors"
                        >
                            ✏️ Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditing(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : '💾 Save'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Personal Email
                        </label>
                        <input
                            type="email"
                            value={formData.personalEmail || ''}
                            onChange={(e) => handleChange('personalEmail', e.target.value)}
                            disabled={!editing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                            placeholder="personal@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            disabled={!editing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                            placeholder="+91 XXXXX XXXXX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Photo URL
                        </label>
                        <input
                            type="url"
                            value={formData.photoURL || ''}
                            onChange={(e) => handleChange('photoURL', e.target.value)}
                            disabled={!editing}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bio
                        </label>
                        <textarea
                            value={formData.bio || ''}
                            onChange={(e) => handleChange('bio', e.target.value)}
                            disabled={!editing}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div className="col-span-2">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Address</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    value={formData.address?.street || ''}
                                    onChange={(e) => handleAddressChange('street', e.target.value)}
                                    disabled={!editing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="Street Address"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={formData.address?.city || ''}
                                    onChange={(e) => handleAddressChange('city', e.target.value)}
                                    disabled={!editing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="City"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={formData.address?.state || ''}
                                    onChange={(e) => handleAddressChange('state', e.target.value)}
                                    disabled={!editing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="State"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    value={formData.address?.pincode || ''}
                                    onChange={(e) => handleAddressChange('pincode', e.target.value)}
                                    disabled={!editing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="PIN Code"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
