// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Validation Utilities
// ============================================

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean}
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate institutional email (Biyani domain)
 * @param {string} email - Email address to validate
 * @returns {boolean}
 */
function validateInstitutionalEmail(email) {
    // Allow both @biyani.edu and other domains for flexibility
    // Modify this regex to enforce strict institutional email if needed
    const institutionalRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return institutionalRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} {valid: boolean, message: string}
 */
function validatePassword(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true, message: 'Password is strong' };
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
function validatePhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate enrollment number format
 * @param {string} enrollmentNumber - Enrollment number
 * @returns {boolean}
 */
function validateEnrollmentNumber(enrollmentNumber) {
    // Format: YY-DEPT-NNNN (e.g., 24-CSE-0001)
    const enrollmentRegex = /^\d{2}-[A-Z]{2,4}-\d{4}$/;
    return enrollmentRegex.test(enrollmentNumber);
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Validate required fields in a form
 * @param {Object} formData - Object with field names and values
 * @returns {Object} {valid: boolean, errors: Array}
 */
function validateRequiredFields(formData) {
    const errors = [];

    for (const [field, value] of Object.entries(formData)) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push(`${field} is required`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Check if user has permission for campus
 * @param {string} userCampusId - User's campus ID
 * @param {string} targetCampusId - Target campus ID
 * @param {string} userRole - User's role
 * @returns {boolean}
 */
function canAccessCampus(userCampusId, targetCampusId, userRole) {
    // Admin can access all campuses
    if (userRole === ROLES.ADMIN) {
        return true;
    }

    // Others can only access their own campus
    return userCampusId === targetCampusId;
}

/**
 * Check if user can create another user based on hierarchy
 * @param {string} creatorRole - Role of user creating
 * @param {string} newUserRole - Role of user being created
 * @returns {boolean}
 */
function canCreateUser(creatorRole, newUserRole) {
    const hierarchy = {
        [ROLES.ADMIN]: [ROLES.HOD],
        [ROLES.HOD]: [ROLES.TEACHER],
        [ROLES.TEACHER]: [ROLES.STUDENT]
    };

    return hierarchy[creatorRole]?.includes(newUserRole) || false;
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.validateEmail = validateEmail;
    window.validateInstitutionalEmail = validateInstitutionalEmail;
    window.validatePassword = validatePassword;
    window.validatePhone = validatePhone;
    window.validateEnrollmentNumber = validateEnrollmentNumber;
    window.sanitizeInput = sanitizeInput;
    window.validateRequiredFields = validateRequiredFields;
    window.canAccessCampus = canAccessCampus;
    window.canCreateUser = canCreateUser;
}
