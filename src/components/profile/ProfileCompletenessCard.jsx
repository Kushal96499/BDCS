// ============================================
// BDCS - Profile Completeness Card Component
// Displays profile strength and completion suggestions
// ============================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    calculateProfileCompleteness,
    getSectionCompletionStatus,
    getProfileStrength
} from '../../utils/profileUtils';

export default function ProfileCompletenessCard({ user }) {
    const navigate = useNavigate();
    const completeness = calculateProfileCompleteness(user);
    const sections = getSectionCompletionStatus(user);
    const strength = getProfileStrength(completeness);

    const incompleteSections = sections.filter(s => !s.completed);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Profile Strength</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${strength.bgColor} ${strength.color}`}>
                    {strength.level}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Completeness</span>
                    <span className="text-2xl font-black text-gray-900">{completeness}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${strength.barColor} transition-all duration-700 ease-out`}
                        style={{ width: `${completeness}%` }}
                    />
                </div>
            </div>

            {/* Section Checklist */}
            <div className="space-y-3 mb-6">
                {sections.map(section => (
                    <div
                        key={section.key}
                        className={`flex items-start justify-between p-3 rounded-lg transition-colors ${section.completed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                    >
                        <div className="flex items-start gap-3 flex-1">
                            {/* Checkbox */}
                            <div className="mt-0.5">
                                {section.completed ? (
                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                )}
                            </div>

                            {/* Section Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-semibold ${section.completed ? 'text-green-900' : 'text-gray-900'
                                        }`}>
                                        {section.name}
                                    </span>
                                    {!section.completed && (
                                        <span className="text-xs text-gray-500">
                                            {section.current}/{section.required}
                                        </span>
                                    )}
                                </div>
                                {!section.completed && (
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {section.suggestion}
                                    </p>
                                )}
                            </div>

                            {/* Weight */}
                            <div className="text-xs font-bold text-gray-400">
                                {section.weight}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Call to Action */}
            {completeness < 100 && (
                <div className="border-t border-gray-200 pt-4">
                    <div className="bg-gradient-to-r from-biyani-red to-red-600 text-white rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                                <h4 className="font-bold mb-1">
                                    {incompleteSections.length} {incompleteSections.length === 1 ? 'section' : 'sections'} remaining
                                </h4>
                                <p className="text-sm text-red-100 mb-3">
                                    Complete your profile to stand out and unlock opportunities!
                                </p>
                                <button
                                    onClick={() => {
                                        // Scroll to first incomplete section
                                        const firstIncomplete = incompleteSections[0];
                                        const element = document.getElementById(`section-${firstIncomplete.key}`);
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }}
                                    className="px-4 py-2 bg-white text-biyani-red rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                                >
                                    Complete Now →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Completion Celebration */}
            {completeness === 100 && (
                <div className="border-t border-gray-200 pt-4">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4 text-center">
                        <div className="text-4xl mb-2">🎉</div>
                        <h4 className="font-bold text-lg mb-1">All-Star Profile!</h4>
                        <p className="text-sm text-green-100">
                            Your profile is 100% complete. You're ready to shine!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
