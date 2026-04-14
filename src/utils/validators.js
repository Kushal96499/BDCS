// ============================================
// BDCS - Validation Utilities
// Common validation functions for forms
// ============================================

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Validate required fields
 * @param {object} data - Data object to validate
 * @param {array} requiredFields - Array of required field names
 * @returns {object} - { valid: boolean, errors: object }
 */
export function validateRequired(data, requiredFields) {
    const errors = {};

    requiredFields.forEach(field => {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            errors[field] = 'This field is required';
        }
    });

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Check if a code is unique in a collection
 * @param {string} collectionName - Collection to check
 * @param {string} code - Code to validate
 * @param {string} excludeId - Document ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if unique, false if duplicate
 */
export async function isCodeUnique(collectionName, code, excludeId = null) {
    try {
        const q = query(
            collection(db, collectionName),
            where('code', '==', code.toUpperCase())
        );

        const snapshot = await getDocs(q);

        // If no documents found, code is unique
        if (snapshot.empty) {
            return true;
        }

        // If updating, exclude the current document
        if (excludeId) {
            const duplicates = snapshot.docs.filter(doc => doc.id !== excludeId);
            return duplicates.length === 0;
        }

        // Code already exists
        return false;
    } catch (error) {
        console.error('Error checking code uniqueness:', error);
        throw new Error('Failed to validate code uniqueness');
    }
}

/**
 * Validate code format (uppercase alphanumeric, 2-10 chars)
 * @param {string} code - Code to validate
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateCodeFormat(code) {
    if (!code || code.trim() === '') {
        return { valid: false, error: 'Code is required' };
    }

    const codePattern = /^[A-Z0-9]{2,10}$/;

    if (!codePattern.test(code.toUpperCase())) {
        return {
            valid: false,
            error: 'Code must be 2-10 uppercase letters/numbers'
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
export function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

/**
 * Validate academic year format (YYYY-YYYY)
 * @param {string} year - Academic year string
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateAcademicYear(year) {
    if (!year || year.trim() === '') {
        return { valid: false, error: 'Academic year is required' };
    }

    const yearPattern = /^\d{4}-\d{4}$/;

    if (!yearPattern.test(year)) {
        return {
            valid: false,
            error: 'Academic year must be in YYYY-YYYY format'
        };
    }

    const [startYear, endYear] = year.split('-').map(Number);

    if (endYear !== startYear + 1) {
        return {
            valid: false,
            error: 'End year must be start year + 1'
        };
    }

    return { valid: true, error: null };
}

/**
 * Validate duration (positive integer)
 * @param {number} duration - Duration in years
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateDuration(duration) {
    if (!duration || duration < 1 || duration > 10) {
        return {
            valid: false,
            error: 'Duration must be between 1 and 10 years'
        };
    }

    if (!Number.isInteger(duration)) {
        return {
            valid: false,
            error: 'Duration must be a whole number'
        };
    }

    return { valid: true, error: null };
}

/**
 * Sanitize input string (remove HTML, trim whitespace)
 * @param {string} input - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
        .trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate campus selection
 * @param {string} campusId - Campus ID to validate
 * @param {array} availableCampuses - Array of active campus objects
 * @returns {object} - { valid: boolean, error: string }
 */
export function validateCampusSelection(campusId, availableCampuses) {
    if (!campusId || campusId === '') {
        return { valid: false, error: 'Please select a campus' };
    }

    const campusExists = availableCampuses.some(c => c.id === campusId && c.status === 'active');

    if (!campusExists) {
        return {
            valid: false,
            error: 'Selected campus is not available'
        };
    }

    return { valid: true, error: null };
}
