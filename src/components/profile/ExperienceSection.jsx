// ============================================
// BDCS - Experience Section Component
// Manage work experience and internships
// ============================================

import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { validateExperience, formatDateRange, formatDuration, calculateDuration } from '../../utils/profileUtils';
import { toast } from '../admin/Toast';

export default function ExperienceSection({ user, editable = false }) {
    const [experiences, setExperiences] = useState(user?.professionalProfile?.experience || []);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingExp, setEditingExp] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAddExperience = async (expData) => {
        setLoading(true);
        try {
            const validation = validateExperience(expData);
            if (!validation.valid) {
                toast.error(validation.errors[0]);
                setLoading(false);
                return;
            }

            const newExp = {
                id: `exp_${Date.now()}`,
                ...expData,
                addedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'users', user.uid), {
                'professionalProfile.experience': arrayUnion(newExp),
                'socialStats.experienceCount': increment(1),
                updatedAt: new Date()
            });

            setExperiences([...experiences, newExp]);
            setShowAddModal(false);
            toast.success('Experience added successfully!');
        } catch (error) {
            console.error('Error adding experience:', error);
            toast.error('Failed to add experience');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveExperience = async (expToRemove) => {
        if (!window.confirm('Remove this experience from your profile?')) return;

        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                'professionalProfile.experience': arrayRemove(expToRemove),
                'socialStats.experienceCount': increment(-1),
                updatedAt: new Date()
            });

            setExperiences(experiences.filter(e => e.id !== expToRemove.id));
            toast.success('Experience removed');
        } catch (error) {
            console.error('Error removing experience:', error);
            toast.error('Failed to remove experience');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="section-experience" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Experience</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {experiences.length === 0 ? 'Add your work experience and internships' : `${experiences.length} ${experiences.length === 1 ? 'position' : 'positions'}`}
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
                        Add Experience
                    </button>
                )}
            </div>

            {/* Experience List */}
            {experiences.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">💼</div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">No experience added yet</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Add your internships and work experience to build your professional profile
                    </p>
                    {editable && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Add Your First Experience
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {experiences
                        .sort((a, b) => {
                            // Current positions first, then by start date (newest first)
                            if (a.current && !b.current) return -1;
                            if (!a.current && b.current) return 1;
                            return new Date(b.startDate) - new Date(a.startDate);
                        })
                        .map((exp) => (
                            <ExperienceCard
                                key={exp.id}
                                experience={exp}
                                editable={editable}
                                onRemove={() => handleRemoveExperience(exp)}
                                loading={loading}
                            />
                        ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <ExperienceModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddExperience}
                    loading={loading}
                />
            )}
        </div>
    );
}

// Experience Card Component
function ExperienceCard({ experience, editable, onRemove, loading }) {
    const duration = calculateDuration(experience.startDate, experience.endDate, experience.current);

    return (
        <div className="relative pl-8 pb-6 border-l-2 border-gray-200 last:pb-0 group">
            {/* Timeline Dot */}
            <div className="absolute -left-2 top-2 w-4 h-4 rounded-full bg-biyani-red border-4 border-white" />

            {/* Content */}
            <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900">{experience.title}</h4>
                        <p className="text-base font-semibold text-gray-700">{experience.company}</p>
                    </div>
                    {editable && (
                        <button
                            onClick={onRemove}
                            disabled={loading}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Remove experience"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                {experience.location && (
                    <p className="text-sm text-gray-600 mb-2">📍 {experience.location}</p>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="font-medium">
                        {formatDateRange(experience.startDate, experience.endDate, experience.current)}
                    </span>
                    <span>•</span>
                    <span className="text-gray-500">
                        {formatDuration(duration)}
                    </span>
                    {experience.current && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            Current
                        </span>
                    )}
                </div>

                {experience.description && (
                    <p className="text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-line">
                        {experience.description}
                    </p>
                )}

                {experience.skills && experience.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {experience.skills.map((skill, index) => (
                            <span
                                key={index}
                                className="px-2 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Experience Add/Edit Modal Component
function ExperienceModal({ onClose, onSave, loading, initialData = null }) {
    const [formData, setFormData] = useState(initialData || {
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        skills: []
    });

    const [skillInput, setSkillInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const addSkill = () => {
        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
            setFormData({
                ...formData,
                skills: [...formData.skills, skillInput.trim()]
            });
            setSkillInput('');
        }
    };

    const removeSkill = (skillToRemove) => {
        setFormData({
            ...formData,
            skills: formData.skills.filter(s => s !== skillToRemove)
        });
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8 animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Add Experience</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Frontend Developer Intern"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Company */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Company *</label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                placeholder="e.g., Tech Corp India"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g., Jaipur, Rajasthan"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                                <input
                                    type="month"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                                <input
                                    type="month"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    disabled={formData.current}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent disabled:bg-gray-100"
                                />
                            </div>
                        </div>

                        {/* Current Position */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.current}
                                onChange={(e) => setFormData({ ...formData, current: e.target.checked, endDate: e.target.checked ? '' : formData.endDate })}
                                className="w-4 h-4 text-biyani-red rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">I currently work here</span>
                        </label>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe your responsibilities and achievements..."
                                rows={4}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent resize-none"
                            />
                        </div>

                        {/* Skills */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Skills Used</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                    placeholder="e.g., React, Python"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={addSkill}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {formData.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.skills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                                        >
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => removeSkill(skill)}
                                                className="text-gray-500 hover:text-red-600"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
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
                                disabled={loading || !formData.title || !formData.company || !formData.startDate}
                                className="flex-1 px-4 py-2.5 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving...' : 'Save Experience'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
