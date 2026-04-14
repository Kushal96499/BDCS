// ============================================
// BDCS - Password Generator Utility
// Generate temporary passwords and validate complexity
// ============================================

/**
 * Generate a random temporary password
 * Format: 8 characters with uppercase, lowercase, numbers
 * @returns {string} - Generated password
 */
export function generateTempPassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$%';

    let password = '';

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill remaining 4 characters
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 0; i < 4; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validate password complexity
 * Requirements: 8+ chars, uppercase, lowercase, number
 * @param {string} password - Password to validate
 * @returns {Object} - {valid: boolean, errors: Array}
 */
export function validatePasswordComplexity(password) {
    const errors = [];

    if (!password || password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Generate a unique enrollment number for students
 * Format: YYYY{COURSE_CODE}{001-999}
 * @param {string} year - Academic year (e.g., "2025")
 * @param {string} courseCode - Course code (e.g., "BCA")
 * @param {number} sequence - Sequence number (1-999)
 * @returns {string} - Enrollment number
 */
export function generateEnrollmentNumber(year, courseCode, sequence) {
    const paddedSequence = String(sequence).padStart(3, '0');
    return `${year}${courseCode.toUpperCase()}${paddedSequence}`;
}

/**
 * Generate a unique employee ID for staff
 * Format: EMP{YYYY}{001-999}
 * @param {string} year - Joining year (e.g., "2025")
 * @param {number} sequence - Sequence number (1-999)
 * @returns {string} - Employee ID
 */
export function generateEmployeeId(year, sequence) {
    const paddedSequence = String(sequence).padStart(3, '0');
    return `EMP${year}${paddedSequence}`;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export function validatePhone(phone) {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[+]?91[-\s]?[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}
