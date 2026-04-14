// ============================================
// BDCS - Skills Section Component
// Manage and display user skills with proficiency levels
// ============================================

import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { validateSkill } from '../../utils/profileUtils';
import { toast } from '../admin/Toast';

export default function SkillsSection({ user, editable = false }) {
    const [skills, setSkills] = useState(user?.professionalProfile?.skills || []);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    const handleAddSkill = async (skillData) => {
        setLoading(true);
        try {
            const validation = validateSkill(skillData);
            if (!validation.valid) {
                toast.error(validation.errors[0]);
                setLoading(false);
                return;
            }

            const newSkill = {
                id: `skill_${Date.now()}`,
                name: skillData.name.trim(),
                level: skillData.level || 'Beginner',
                addedAt: new Date().toISOString(),
                endorsedBy: [],
                endorsementCount: 0
            };

            await updateDoc(doc(db, 'users', user.uid), {
                'professionalProfile.skills': arrayUnion(newSkill),
                'socialStats.skillsCount': increment(1),
                updatedAt: new Date()
            });

            setSkills([...skills, newSkill]);
            setShowAddModal(false);
            toast.success('Skill added successfully!');
        } catch (error) {
            console.error('Error adding skill:', error);
            toast.error('Failed to add skill');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveSkill = async (skillToRemove) => {
        if (!window.confirm('Remove this skill from your profile?')) return;

        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                'professionalProfile.skills': arrayRemove(skillToRemove),
                'socialStats.skillsCount': increment(-1),
                updatedAt: new Date()
            });

            setSkills(skills.filter(s => s.id !== skillToRemove.id));
            toast.success('Skill removed');
        } catch (error) {
            console.error('Error removing skill:', error);
            toast.error('Failed to remove skill');
        } finally {
            setLoading(false);
        }
    };

    const getLevelColor = (level) => {
        const colors = {
            'Beginner': 'bg-gray-100 text-gray-700 border-gray-300',
            'Intermediate': 'bg-blue-100 text-blue-700 border-blue-300',
            'Advanced': 'bg-purple-100 text-purple-700 border-purple-300',
            'Expert': 'bg-green-100 text-green-700 border-green-300'
        };
        return colors[level] || colors['Beginner'];
    };

    return (
        <div id="section-skills" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Skills</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {skills.length === 0 ? 'Add your skills to showcase your expertise' : `${skills.length} skill${skills.length !== 1 ? 's' : ''} added`}
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
                        Add Skill
                    </button>
                )}
            </div>

            {/* Skills Display */}
            {skills.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">💡</div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">No skills added yet</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Showcase your technical and soft skills to stand out
                    </p>
                    {editable && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Add Your First Skill
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {skills.map((skill) => (
                        <div
                            key={skill.id}
                            className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all hover:shadow-md ${getLevelColor(skill.level)}`}
                        >
                            <span className="font-semibold">{skill.name}</span>
                            {skill.level && (
                                <span className="text-xs opacity-75 ml-1">
                                    •  {skill.level}
                                </span>
                            )}
                            {editable && (
                                <button
                                    onClick={() => handleRemoveSkill(skill)}
                                    disabled={loading}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 disabled:opacity-50"
                                    title="Remove skill"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Skill Modal */}
            {showAddModal && (
                <SkillAddModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddSkill}
                    loading={loading}
                />
            )}
        </div>
    );
}

// Add Skill Modal Component
function SkillAddModal({ onClose, onSave, loading }) {
    const [formData, setFormData] = useState({
        name: '',
        level: 'Beginner'
    });

    const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">Add Skill</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Skill Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Skill Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., React.js, Python, Communication"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biyani-red focus:border-transparent"
                                required
                                maxLength={50}
                            />
                        </div>

                        {/* Proficiency Level */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Proficiency Level
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {skillLevels.map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, level })}
                                        className={`px-4 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${formData.level === level
                                                ? 'bg-biyani-red text-white border-biyani-red'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-biyani-red'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
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
                                disabled={loading || !formData.name.trim()}
                                className="flex-1 px-4 py-2.5 bg-biyani-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Adding...' : 'Add Skill'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
