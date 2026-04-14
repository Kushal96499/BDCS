// ============================================
// BDCS - Profile Utilities
// Calculate profile completeness and manage profile data
// ============================================

/**
 * Calculate overall profile completeness percentage
 * @param {Object} user - User object with professionalProfile
 * @returns {number} - Completeness percentage (0-100)
 */
export function calculateProfileCompleteness(user) {
    const sections = [
        {
            name: 'basicInfo',
            weight: 20,
            check: () => !!(user?.name && user?.email && user?.phone && user?.photoURL)
        },
        {
            name: 'education',
            weight: 20,
            check: () => !!(user?.courseName && user?.departmentId && user?.batchId)
        },
        {
            name: 'skills',
            weight: 15,
            check: () => (user?.professionalProfile?.skills?.length || 0) >= 5
        },
        {
            name: 'experience',
            weight: 15,
            check: () => (user?.professionalProfile?.experience?.length || 0) >= 1
        },
        {
            name: 'certifications',
            weight: 10,
            check: () => (user?.professionalProfile?.certifications?.length || 0) >= 1
        },
        {
            name: 'projects',
            weight: 10,
            check: () => (user?.socialStats?.projectsCount || 0) >= 1
        },
        {
            name: 'awards',
            weight: 10,
            check: () => (user?.professionalProfile?.awards?.length || 0) >= 1
        }
    ];

    let totalCompleteness = 0;
    sections.forEach(section => {
        if (section.check()) {
            totalCompleteness += section.weight;
        }
    });

    return totalCompleteness;
}

/**
 * Get section-wise completion status
 * @param {Object} user - User object
 * @returns {Array} - Array of section statuses
 */
export function getSectionCompletionStatus(user) {
    return [
        {
            name: 'Basic Info',
            key: 'basicInfo',
            weight: 20,
            completed: !!(user?.name && user?.email && user?.phone && user?.photoURL),
            current: [user?.name, user?.email, user?.phone, user?.photoURL].filter(Boolean).length,
            required: 4,
            suggestion: 'Add your name, email, phone, and profile photo'
        },
        {
            name: 'Education',
            key: 'education',
            weight: 20,
            completed: !!(user?.courseName && user?.departmentId && user?.batchId),
            current: [user?.courseName, user?.departmentId, user?.batchId].filter(Boolean).length,
            required: 3,
            suggestion: 'Complete your course and department information'
        },
        {
            name: 'Skills',
            key: 'skills',
            weight: 15,
            completed: (user?.professionalProfile?.skills?.length || 0) >= 5,
            current: user?.professionalProfile?.skills?.length || 0,
            required: 5,
            suggestion: 'Add at least 5 skills to your profile'
        },
        {
            name: 'Experience',
            key: 'experience',
            weight: 15,
            completed: (user?.professionalProfile?.experience?.length || 0) >= 1,
            current: user?.professionalProfile?.experience?.length || 0,
            required: 1,
            suggestion: 'Add your internships or work experience'
        },
        {
            name: 'Certifications',
            key: 'certifications',
            weight: 10,
            completed: (user?.professionalProfile?.certifications?.length || 0) >= 1,
            current: user?.professionalProfile?.certifications?.length || 0,
            required: 1,
            suggestion: 'Showcase your certifications and achievements'
        },
        {
            name: 'Projects',
            key: 'projects',
            weight: 10,
            completed: (user?.socialStats?.projectsCount || 0) >= 1,
            current: user?.socialStats?.projectsCount || 0,
            required: 1,
            suggestion: 'Add at least one project to your showcase'
        },
        {
            name: 'Awards',
            key: 'awards',
            weight: 10,
            completed: (user?.professionalProfile?.awards?.length || 0) >= 1,
            current: user?.professionalProfile?.awards?.length || 0,
            required: 1,
            suggestion: 'Add awards and honors you have received'
        }
    ];
}

/**
 * Get profile strength level and color
 * @param {number} completeness - Completeness percentage
 * @returns {Object} - Level info with color and label
 */
export function getProfileStrength(completeness) {
    if (completeness >= 90) {
        return {
            level: 'All-Star',
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            barColor: 'from-green-400 to-green-600'
        };
    } else if (completeness >= 70) {
        return {
            level: 'Expert',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            barColor: 'from-blue-400 to-blue-600'
        };
    } else if (completeness >= 50) {
        return {
            level: 'Intermediate',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-100',
            barColor: 'from-yellow-400 to-yellow-600'
        };
    } else if (completeness >= 30) {
        return {
            level: 'Beginner',
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            barColor: 'from-orange-400 to-orange-600'
        };
    } else {
        return {
            level: 'Getting Started',
            color: 'text-red-600',
            bgColor: 'bg-red-100',
            barColor: 'from-red-400 to-red-600'
        };
    }
}

/**
 * Validate skill data
 * @param {Object} skillData - Skill object to validate
 * @returns {Object} - Validation result
 */
export function validateSkill(skillData) {
    const errors = [];

    if (!skillData.name || skillData.name.trim().length < 2) {
        errors.push('Skill name must be at least 2 characters');
    }

    if (skillData.name && skillData.name.length > 50) {
        errors.push('Skill name must be less than 50 characters');
    }

    const validLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    if (skillData.level && !validLevels.includes(skillData.level)) {
        errors.push('Invalid skill level');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate experience data
 * @param {Object} expData - Experience object to validate
 * @returns {Object} - Validation result
 */
export function validateExperience(expData) {
    const errors = [];

    if (!expData.title || expData.title.trim().length < 2) {
        errors.push('Job title is required');
    }

    if (!expData.company || expData.company.trim().length < 2) {
        errors.push('Company name is required');
    }

    if (!expData.startDate) {
        errors.push('Start date is required');
    }

    if (!expData.current && !expData.endDate) {
        errors.push('End date is required for past positions');
    }

    if (expData.startDate && expData.endDate) {
        if (new Date(expData.endDate) < new Date(expData.startDate)) {
            errors.push('End date must be after start date');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate certification data
 * @param {Object} certData - Certification object to validate
 * @returns {Object} - Validation result
 */
export function validateCertification(certData) {
    const errors = [];

    if (!certData.name || certData.name.trim().length < 2) {
        errors.push('Certification name is required');
    }

    if (!certData.issuingOrganization || certData.issuingOrganization.trim().length < 2) {
        errors.push('Issuing organization is required');
    }

    if (!certData.issueDate) {
        errors.push('Issue date is required');
    }

    if (certData.credentialUrl && !isValidUrl(certData.credentialUrl)) {
        errors.push('Invalid credential URL');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Check if string is valid URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Format date range for display
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {boolean} current - Is this current position
 * @returns {string} - Formatted date range
 */
export function formatDateRange(startDate, endDate, current = false) {
    if (!startDate) return '';

    const start = new Date(startDate);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (current) {
        return `${startStr} - Present`;
    }

    if (!endDate) {
        return startStr;
    }

    const end = new Date(endDate);
    const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return `${startStr} - ${endStr}`;
}

/**
 * Calculate duration in months
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {boolean} current - Is current position
 * @returns {number} - Duration in months
 */
export function calculateDuration(startDate, endDate, current = false) {
    if (!startDate) return 0;

    const start = new Date(startDate);
    const end = current ? new Date() : new Date(endDate);

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, months);
}

/**
 * Format duration in human-readable format
 * @param {number} months - Duration in months
 * @returns {string} - Formatted duration
 */
export function formatDuration(months) {
    if (months < 1) return 'Less than a month';
    if (months === 1) return '1 month';
    if (months < 12) return `${months} months`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
    }

    return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
}
