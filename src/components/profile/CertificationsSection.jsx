// ============================================
// BDCS - Certifications Section Component
// Manage professional certifications and licenses
// ============================================

import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { validateCertification } from '../../utils/profileUtils';
import { toast } from '../admin/Toast';

export default function CertificationsSection({ user, editable = false }) {
    const [certifications, setCertifications] = useState(user?.professionalProfile?.certifications || []);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAddCertification = async (certData) => {
        setLoading(true);
        try {
            const validation = validateCertification(certData);
            if (!validation.valid) {
                toast.error(validation.errors[0]);
                setLoading(false);
                return;
            }

            const newCert = {
                id: `cert_${Date.now()}`,
                ...certData,
                addedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'users', user.uid), {
                'professionalProfile.certifications': arrayUnion(newCert),
                'socialStats.certificationsCount': increment(1),
                updatedAt: new Date()
            });

            setCertifications([...certifications, newCert]);
            setShowAddModal(false);
            toast.success('Certification added successfully!');
        } catch (error) {
            console.error('Error adding certification:', error);
            toast.error('Failed to add certification');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveCertification = async (certToRemove) => {
        if (!window.confirm('Remove this certification from your profile?')) return;

        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                'professionalProfile.certifications': arrayRemove(certToRemove),
                'socialStats.certificationsCount': increment(-1),
                updatedAt: new Date()
            });

            setCertifications(certifications.filter(c => c.id !== certToRemove.id));
            toast.success('Certification removed');
        } catch (error) {
            console.error('Error removing certification:', error);
            toast.error('Failed to remove certification');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="section-certifications" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Certifications & Licenses</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {certifications.length === 0 ? 'Showcase your professional certifications' : `${certifications.length} certification${certifications.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
                {editable && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Certification
                    </button>
                )}
            </div>

            {/* Certifications Grid */}
            {certifications.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏆</div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">No certifications added</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Add certifications, licenses, and professional credentials
                    </p>
                    {editable && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Add Your First Certification
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {certifications
                        .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
                        .map((cert) => (
                            <CertificationCard
                                key={cert.id}
                                certification={cert}
                                editable={editable}
                                onRemove={() => handleRemoveCertification(cert)}
                                loading={loading}
                            />
                        ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <CertificationModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddCertification}
                    loading={loading}
                />
            )}
        </div>
    );
}

// Certification Card Component
function CertificationCard({ certification, editable, onRemove, loading }) {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const isExpired = certification.expiryDate && new Date(certification.expiryDate) < new Date();

    return (
        <div className={`group relative bg-gradient-to-br from-gray-50 to-white border-2 rounded-xl p-5 hover:shadow-lg transition-all ${isExpired ? 'border-red-200' : 'border-gray-200 hover:border-biyani-red'
            }`}>
            {/* Badge Icon */}
            <div className="absolute top-4 right-4 text-3xl opacity-10">🎓</div>

            {/* Content */}
            <div className="relative">
                <h4 className="text-base font-bold text-gray-900 mb-1 pr-8">
                    {certification.name}
                </h4>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                    {certification.issuingOrganization}
                </p>

                <div className="space-y-1 mb-3">
                    <p className="text-xs text-gray-600">
                        <span className="font-medium">Issued:</span> {formatDate(certification.issueDate)}
                    </p>
                    {certification.expiryDate && (
                        <p className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                            <span className="font-medium">
                                {isExpired ? 'Expired:' : 'Expires:'}
                            </span> {formatDate(certification.expiryDate)}
                        </p>
                    )}
                    {certification.credentialId && (
                        <p className="text-xs text-gray-500">
                            <span className="font-medium">ID:</span> {certification.credentialId}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {certification.credentialUrl && (
                        <a
                            href={certification.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-biyani-red hover:underline flex items-center gap-1"
                        >
                            Verify
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    )}
                    {editable && (
                        <button
                            onClick={onRemove}
                            disabled={loading}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Remove certification"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Certification Modal Component
function CertificationModal({ onClose, onSave, loading }) {
    const [formData, setFormData] = useState({
        name: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: '',
        credentialId: '',
        credentialUrl: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8 animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Add Certification</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Certification Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Certification Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., AWS Certified Cloud Practitioner"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Issuing Organization */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Issuing Organization *
                            </label>
                            <input
                                type="text"
                                value={formData.issuingOrganization}
                                onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })}
                                placeholder="e.g., Amazon Web Services (AWS)"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Issue Date *
                                </label>
                                <input
                                    type="month"
                                    value={formData.issueDate}
                                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Expiry Date (Optional)
                                </label>
                                <input
                                    type="month"
                                    value={formData.expiryDate}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Credential ID */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Credential ID (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.credentialId}
                                onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
                                placeholder="e.g., ABC-123-XYZ"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            />
                        </div>

                        {/* Credential URL */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Credential URL (Optional)
                            </label>
                            <input
                                type="url"
                                value={formData.credentialUrl}
                                onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Add a link to verify your certification online
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.name || !formData.issuingOrganization || !formData.issueDate}
                                className="flex-1 px-4 py-2.5 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving...' : 'Save Certification'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
