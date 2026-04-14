// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Helper Utilities
// ============================================

/**
 * Show loading spinner
 * @param {string} containerId - ID of container to show spinner in
 */
function showLoading(containerId = 'content-area') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div class="spinner"></div>';
    }
}

/**
 * Hide loading spinner
 * @param {string} containerId - ID of container
 */
function hideLoading(containerId = 'content-area') {
    const container = document.getElementById(containerId);
    if (container) {
        const spinner = container.querySelector('.spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of alert (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    // Add styles
    toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    max-width: 400px;
  `;

    // Set colors based on type
    const colors = {
        success: { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
        error: { bg: '#FEE2E2', color: '#991B1B', border: '#EF4444' },
        warning: { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
        info: { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6' }
    };

    const style = colors[type] || colors.info;
    toast.style.backgroundColor = style.bg;
    toast.style.color = style.color;
    toast.style.borderLeft = `4px solid ${style.border}`;

    document.body.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Confirm dialog
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>}
 */
async function confirmAction(message) {
    return new Promise((resolve) => {
        const result = confirm(message);
        resolve(result);
    });
}

/**
 * Generate unique ID
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function}
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Failed to copy', 'error');
    }
}

/**
 * Download data as JSON file
 * @param {Object} data - Data to download
 * @param {string} filename - Filename
 */
function downloadJSON(data, filename = 'data.json') {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get query parameter from URL
 * @param {string} param - Parameter name
 * @returns {string|null}
 */
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set page title with BDCS prefix
 * @param {string} title - Page title
 */
function setPageTitle(title) {
    document.title = `${title} - BDCS`;
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

/**
 * Log System Action (Audit Trail)
 * @param {string} action - Action type (CREATE, UPDATE, DELETE, AUTH)
 * @param {string} module - Module name (USER, COURSE, DEPT, etc.)
 * @param {string} details - Detailed description
 * @param {string} targetId - ID of target object
 */
async function logAction(action, module, details, targetId = null) {
    try {
        // Determine user (if available globally or pass as arg? use auth.currentUser)
        // Note: 'auth' and 'db' are defined in firebase.js which is loaded before helpers.js?
        // Actually firebase.js is loaded BEFORE helpers.js in HTML order.
        // So 'auth' and 'db' are available globally.

        const user = (typeof auth !== 'undefined' && auth.currentUser)
            ? auth.currentUser
            : { uid: 'system', email: 'system' };

        if (!typeof db !== 'undefined') {
            const logData = {
                action,
                module,
                details,
                target_id: targetId,
                performed_by: user.uid,
                performed_by_email: user.email,
                timestamp: new Date(), // Client side timestamp, serverTimestamp preferred if firebase available
                user_agent: navigator.userAgent
            };

            // Check if db is valid
            if (window.db) {
                logData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
                await window.db.collection('audit_logs').add(logData);
            } else {
                console.log('[AUDIT MOCK]', logData);
            }
        }
    } catch (error) {
        console.error('Audit log failed:', error);
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showToast = showToast;
    window.confirmAction = confirmAction;
    window.generateId = generateId;
    window.debounce = debounce;
    window.formatFileSize = formatFileSize;
    window.copyToClipboard = copyToClipboard;
    window.downloadJSON = downloadJSON;
    window.sleep = sleep;
    window.getQueryParam = getQueryParam;
    window.setPageTitle = setPageTitle;
    window.logAction = logAction;
}
