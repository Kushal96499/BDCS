// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Session Management & Protection
// ============================================

/**
 * Initialize session protection for authenticated pages
 * Call this function on every protected page
 */
async function initializeSession() {
    try {
        const user = await getCurrentUser();
        console.log('✅ Session active for:', user.email, '| Role:', user.role);
        return user;
    } catch (error) {
        console.error('❌ Session invalid:', error);
        window.location.href = '/src/auth/login.html';
        return null;
    }
}

/**
 * Logout function - signs out user and redirects to login
 */
async function logout() {
    const confirmLogout = confirm('Are you sure you want to logout?');

    if (confirmLogout) {
        try {
            await auth.signOut();
            console.log('✅ User logged out successfully');
            window.location.href = '/src/auth/login.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
            alert('Failed to logout. Please try again.');
        }
    }
}

/**
 * Check if current user has permission to access a specific role's functionality
 * @param {string[]} allowedRoles - Array of roles that can access
 * @returns {Promise<boolean>}
 */
async function checkPermission(allowedRoles) {
    try {
        const user = await getCurrentUser();
        return allowedRoles.includes(user.role);
    } catch (error) {
        console.error('Permission check failed:', error);
        return false;
    }
}

/**
 * Get user initials for avatar
 * @param {string} name - User name or email
 * @returns {string} Initials
 */
function getUserInitials(name) {
    if (!name) return '?';

    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
        return name.substring(0, 2).toUpperCase();
    }
}

/**
 * Format timestamp to readable date
 * @param {Object} timestamp - Firebase timestamp
 * @returns {string} Formatted date
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('en-IN', options);
}

/**
 * Get campus name from campus_id
 * @param {string} campus_id - Campus ID
 * @returns {string} Campus name
 */
function getCampusName(campus_id) {
    const campusNames = {
        [CAMPUSES.VDN]: 'VDN Campus',
        [CAMPUSES.CHAMPAPURA]: 'Champapura Campus',
        [CAMPUSES.KALWAR]: 'Kalwar Campus'
    };

    return campusNames[campus_id] || 'Unknown Campus';
}

/**
 * Session timeout warning (optional enhancement)
 * Warns user before session expires
 */
let sessionTimeoutWarning = null;
let sessionTimeout = null;

function resetSessionTimer() {
    // Clear existing timers
    if (sessionTimeoutWarning) clearTimeout(sessionTimeoutWarning);
    if (sessionTimeout) clearTimeout(sessionTimeout);

    // Warn 2 minutes before timeout (58 minutes)
    sessionTimeoutWarning = setTimeout(() => {
        const extendSession = confirm('Your session will expire in 2 minutes. Do you want to continue?');
        if (extendSession) {
            resetSessionTimer();
        }
    }, 58 * 60 * 1000);

    // Auto logout after 60 minutes of inactivity
    sessionTimeout = setTimeout(async () => {
        alert('Your session has expired due to inactivity.');
        await auth.signOut();
        window.location.href = '/src/auth/login.html';
    }, 60 * 60 * 1000);
}

// Reset timer on user activity
if (typeof document !== 'undefined') {
    ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetSessionTimer, true);
    });
}

// Export functions for use in browser
if (typeof window !== 'undefined') {
    window.initializeSession = initializeSession;
    window.logout = logout;
    window.checkPermission = checkPermission;
    window.getUserInitials = getUserInitials;
    window.formatDate = formatDate;
    window.getCampusName = getCampusName;
    window.resetSessionTimer = resetSessionTimer;
}
