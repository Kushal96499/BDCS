// ============================================
// BDCS - Scope Enforcement Utility
// Filters data based on user's assigned scope
// ============================================

import { query, where } from 'firebase/firestore';

/**
 * Get user's scope level based on role
 * @param {Object} user - User object with role and scope fields
 * @returns {string} - 'system' | 'campus' | 'college' | 'department'
 */
export function getUserScopeLevel(user) {
    if (!user || !user.role) return null;

    const scopeMap = {
        admin: 'system',
        director: 'campus',
        principal: 'college',
        hod: 'department',
        teacher: 'department',
        student: 'department',
        exam_cell: 'college',
        placement: 'college',
        hr: 'campus'
    };

    return scopeMap[user.role] || null;
}

/**
 * Get user's complete scope information
 * @param {Object} user - User object
 * @returns {Object} - Scope details
 */
export function getUserScope(user) {
    if (!user) return null;

    return {
        level: getUserScopeLevel(user),
        campusId: user.campusId || null,
        campusName: user.campusName || null,
        collegeId: user.collegeId || null,
        collegeName: user.collegeName || null,
        departmentId: user.departmentId || null,
        departmentName: user.departmentName || null
    };
}

/**
 * Apply scope filter to a Firestore query
 * @param {Query} baseQuery - Base Firestore query
 * @param {Object} user - Current user
 * @param {string} scopeField - Field to filter on ('campusId', 'collegeId', 'departmentId')
 * @returns {Query} - Filtered query
 */
export function applyScopeFilter(baseQuery, user, scopeField = 'auto') {
    if (!user) return baseQuery;

    const scopeLevel = getUserScopeLevel(user);

    // Admin has system-wide access
    if (scopeLevel === 'system') {
        return baseQuery;
    }

    // Auto-detect scope field based on user's scope level
    if (scopeField === 'auto') {
        if (scopeLevel === 'department' && user.departmentId) {
            return query(baseQuery, where('departmentId', '==', user.departmentId));
        }
        if (scopeLevel === 'college' && user.collegeId) {
            return query(baseQuery, where('collegeId', '==', user.collegeId));
        }
        if (scopeLevel === 'campus' && user.campusId) {
            return query(baseQuery, where('campusId', '==', user.campusId));
        }
    }

    // Manual scope field specification
    if (scopeField === 'departmentId' && user.departmentId) {
        return query(baseQuery, where('departmentId', '==', user.departmentId));
    }
    if (scopeField === 'collegeId' && user.collegeId) {
        return query(baseQuery, where('collegeId', '==', user.collegeId));
    }
    if (scopeField === 'campusId' && user.campusId) {
        return query(baseQuery, where('campusId', '==', user.campusId));
    }

    return baseQuery;
}

/**
 * Check if user can access a specific campus
 * @param {Object} user - Current user
 * @param {string} campusId - Campus ID to check
 * @returns {boolean}
 */
export function canAccessCampus(user, campusId) {
    if (!user || !campusId) return false;

    const scopeLevel = getUserScopeLevel(user);
    if (scopeLevel === 'system') return true;

    return user.campusId === campusId;
}

/**
 * Check if user can access a specific college
 * @param {Object} user - Current user
 * @param {string} collegeId - College ID to check
 * @returns {boolean}
 */
export function canAccessCollege(user, collegeId) {
    if (!user || !collegeId) return false;

    const scopeLevel = getUserScopeLevel(user);
    if (scopeLevel === 'system') return true;
    if (scopeLevel === 'campus') return true; // Campus-level can see all colleges in campus

    return user.collegeId === collegeId;
}

/**
 * Check if user can access a specific department
 * @param {Object} user - Current user
 * @param {string} departmentId - Department ID to check
 * @returns {boolean}
 */
export function canAccessDepartment(user, departmentId) {
    if (!user || !departmentId) return false;

    const scopeLevel = getUserScopeLevel(user);
    if (scopeLevel === 'system') return true;
    if (scopeLevel === 'campus') return true;
    if (scopeLevel === 'college') return true; // College-level can see all departments in college

    return user.departmentId === departmentId;
}

/**
 * Check if user can create users of a specific role
 * @param {Object} user - Current user
 * @param {string} targetRole - Role to create
 * @returns {boolean}
 */
export function canCreateRole(user, targetRole) {
    if (!user || !targetRole) return false;

    const roleHierarchy = {
        admin: ['admin', 'director', 'principal', 'hod', 'teacher', 'student', 'exam_cell', 'placement', 'hr'],
        hod: ['teacher'],
        teacher: ['student']
    };

    const allowedRoles = roleHierarchy[user.role] || [];
    return allowedRoles.includes(targetRole);
}

/**
 * Get required scope fields for a role
 * @param {string} role - User role
 * @returns {Array} - Required scope fields
 */
export function getRequiredScopeFields(role) {
    const scopeRequirements = {
        admin: [],
        director: ['campusId'],
        principal: ['campusId', 'collegeId'],
        hod: ['campusId', 'collegeId', 'departmentId'],
        teacher: ['campusId', 'collegeId', 'departmentId'],
        student: ['campusId', 'collegeId', 'departmentId'],
        exam_cell: ['campusId', 'collegeId'],
        placement: ['campusId', 'collegeId'],
        hr: ['campusId']
    };

    return scopeRequirements[role] || [];
}

/**
 * Validate if user has required scope fields for their role
 * @param {Object} user - User object
 * @returns {Object} - {valid: boolean, missing: Array}
 */
export function validateUserScope(user) {
    if (!user || !user.role) {
        return { valid: false, missing: ['role'] };
    }

    const required = getRequiredScopeFields(user.role);
    const missing = required.filter(field => !user[field]);

    return {
        valid: missing.length === 0,
        missing
    };
}

/**
 * Filter users based on current user's scope
 * Used for user management lists
 * @param {Array} users - Array of user objects
 * @param {Object} currentUser - Current logged-in user
 * @returns {Array} - Filtered users
 */
export function filterUsersByScope(users, currentUser) {
    if (!currentUser) return [];

    const scopeLevel = getUserScopeLevel(currentUser);

    if (scopeLevel === 'system') {
        return users; // Admin sees all
    }

    return users.filter(user => {
        if (scopeLevel === 'campus') {
            return user.campusId === currentUser.campusId;
        }
        if (scopeLevel === 'college') {
            return user.collegeId === currentUser.collegeId;
        }
        if (scopeLevel === 'department') {
            // HOD sees teachers in their department
            // Teacher sees students in their courses
            if (currentUser.role === 'hod') {
                return user.departmentId === currentUser.departmentId && user.role === 'teacher';
            }
            if (currentUser.role === 'teacher') {
                return user.departmentId === currentUser.departmentId && user.role === 'student';
            }
        }
        return false;
    });
}
