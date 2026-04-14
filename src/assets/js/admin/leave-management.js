/**
 * Leave Management System
 * Handles policies, requests, and approvals
 */

let currentLeaveTab = 'dashboard';

/**
 * Show Leave Management View
 */
function showLeaveManagement() {
    currentView = 'leave-management';
    document.getElementById('pageTitle').textContent = 'Leave Management';

    // Hide all views
    document.querySelectorAll('.dashboard-view').forEach(el => el.style.display = 'none');
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('dynamicContent').style.display = 'none';

    // Show Leave View
    const view = document.getElementById('view-leave-management');
    if (view) view.style.display = 'block';

    updateSidebarActiveState('leave-management'); // Needs update in dashboard.js

    // Load default tab
    switchLeaveTab('dashboard');
}

/**
 * Switch Tab
 */
function switchLeaveTab(tabName) {
    currentLeaveTab = tabName;

    // UI Update
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.color = '#6B7280';
        btn.style.borderBottom = '2px solid transparent';
        btn.classList.remove('active');
    });
    document.getElementById(`tab-btn-leave-${tabName}`).style.color = '#374151';
    document.getElementById(`tab-btn-leave-${tabName}`).style.borderBottom = '2px solid #374151';
    document.getElementById(`tab-btn-leave-${tabName}`).classList.add('active');

    document.querySelectorAll('.leave-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(`leave-tab-${tabName}`).style.display = 'block';

    // Load Content
    if (tabName === 'dashboard') loadLeaveDashboard();
    if (tabName === 'requests') loadLeaveRequests();
    if (tabName === 'policies') loadLeavePolicies();
}

/**
 * Load Dashboard Stats
 */
async function loadLeaveDashboard() {
    try {
        // Pending
        const pendingSnap = await collections.leave_requests.where('status', '==', 'pending').get();
        document.getElementById('statsPendingLeaves').textContent = pendingSnap.size;
        document.getElementById('pendingLeaveCount').textContent = pendingSnap.size;

        // On Leave Today
        const today = new Date().toISOString().split('T')[0];
        // Complex query: start <= today <= end. Firestore doesn't support multiple inequalities well.
        // Simplified: Check checks where start_date == today for now
        const todaySnap = await collections.leave_requests
            .where('start_date', '<=', today)
            .where('status', '==', 'approved')
            .get(); // Filter end_date in memory

        let onLeave = 0;
        todaySnap.forEach(doc => {
            if (doc.data().end_date >= today) onLeave++;
        });
        document.getElementById('statsOnLeaveToday').textContent = onLeave;

        // Approved Month
        // ... (Skipping for brevity, mock 0)

    } catch (e) {
        console.error('Error loading leave stats:', e);
    }
}

/**
 * Load Requests
 */
async function loadLeaveRequests() {
    const container = document.getElementById('leaveRequestsContainer');
    const filter = document.getElementById('leaveRequestFilter').value;
    container.innerHTML = '<div class="spinner"></div> Loading...';

    try {
        let query = collections.leave_requests.orderBy('created_at', 'desc');
        if (filter !== 'all') {
            query = query.where('status', '==', filter);
        }

        const snap = await query.limit(50).get();

        if (snap.empty) {
            container.innerHTML = '<div class="empty-state">No requests found</div>';
            return;
        }

        let html = '';

        for (const doc of snap.docs) {
            const req = doc.data();
            const userDoc = await collections.users.doc(req.user_id).get();
            const userName = userDoc.exists ? userDoc.data().full_name : 'Unknown User';

            let statusColor = 'badge-warning';
            if (req.status === 'approved') statusColor = 'badge-success';
            if (req.status === 'rejected') statusColor = 'badge-danger';

            html += `
            <div class="management-card" style="display:flex; flex-direction:column; gap:0.5rem;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${userName}</strong>
                    <span class="badge ${statusColor}">${req.status.toUpperCase()}</span>
                </div>
                <div style="color:#666; font-size:0.9rem;">
                    ${req.type} | ${req.start_date} to ${req.end_date} (${req.days} days)
                </div>
                <div style="font-style:italic; font-size:0.85rem; color:#888;">"${req.reason}"</div>
                
                ${req.status === 'pending' ? `
                <div style="margin-top:0.5rem; display:flex; gap:0.5rem;">
                    <button class="btn btn-sm btn-primary" onclick="handleLeaveAction('${doc.id}', 'approved')">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="handleLeaveAction('${doc.id}', 'rejected')">Reject</button>
                </div>
                ` : ''}
            </div>
            `;
        }

        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = 'Error: ' + e.message;
    }
}

/**
 * Handle Leave Action
 */
async function handleLeaveAction(reqId, action) {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;

    try {
        await collections.leave_requests.doc(reqId).update({
            status: action,
            action_by: auth.currentUser.uid,
            action_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAction('UPDATE', 'LEAVE_REQUEST', `${action.toUpperCase()} request ${reqId}`, reqId);
        loadLeaveRequests();
        loadLeaveDashboard();

    } catch (e) {
        alert("Action failed: " + e.message);
    }
}

/**
 * Load Policies
 */
async function loadLeavePolicies() {
    const container = document.getElementById('leavePoliciesContainer');
    container.innerHTML = 'Loading...';

    try {
        const snap = await collections.leave_types.get();
        if (snap.empty) {
            container.innerHTML = '<div class="empty-state">No leave policies defined. <br><button class="btn btn-primary" onclick="showLeavePolicyModal()">Create First Policy</button></div>';
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const pol = doc.data();
            html += `
            <div class="management-card">
                <h3>${pol.name} (${pol.code})</h3>
                <p>${pol.days_per_year} Days / Year</p>
                <button class="btn btn-sm btn-outline" onclick="deleteLeavePolicy('${doc.id}')">Delete</button>
            </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = 'Error: ' + e.message;
    }
}

// Exports
window.showLeaveManagement = showLeaveManagement;
window.switchLeaveTab = switchLeaveTab;
window.handleLeaveAction = handleLeaveAction;
window.loadLeaveRequests = loadLeaveRequests;
window.loadLeavePolicies = loadLeavePolicies;
