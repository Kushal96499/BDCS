// ============================================
// BDCS - Archived User Banner Component
// Display read-only warning for relieved/archived users
// ============================================

import React from 'react';

export default function ArchivedUserBanner({ user, showCloseButton = false, onClose }) {
    if (!user || !['relieved', 'archived'].includes(user.status)) {
        return null;
    }

    const statusText = user.status === 'relieved' ? 'RELIEVED' : 'ARCHIVED';
    const bgColor = user.status === 'relieved' ? 'bg-orange-50' : 'bg-gray-50';
    const borderColor = user.status === 'relieved' ? 'border-orange-200' : 'border-gray-300';
    const textColor = user.status === 'relieved' ? 'text-orange-800' : 'text-gray-800';
    const iconColor = user.status === 'relieved' ? 'text-orange-600' : 'text-gray-600';

    return (
        <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-4`}>
            <div className="flex items-start gap-3">
                <svg className={`w-6 h-6 ${iconColor} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${textColor} tracking-wide`}>
                            STATUS: {statusText} (READ ONLY)
                        </span>
                        {user.lifecycleMetadata?.relievedDate && (
                            <span className="text-xs text-gray-500">
                                • Since {new Date(user.lifecycleMetadata.relievedDate.toDate?.() || user.lifecycleMetadata.relievedDate).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <p className={`text-sm ${textColor} mt-1`}>
                        This account is archived for institutional record purposes. All actions are disabled.
                    </p>
                    {user.lifecycleMetadata?.relievedReason && (
                        <p className="text-xs text-gray-600 mt-1">
                            Reason: <span className="capitalize">{user.lifecycleMetadata.relievedReason}</span>
                        </p>
                    )}
                </div>
                {showCloseButton && onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
