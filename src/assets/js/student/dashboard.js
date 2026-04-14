/**
 * Student Module Controller
 */

let currentUser = null;
let isPresident = false;
let myCouncilId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Determine Role
    // Note: protectPage might be strict. We need to allow STUDENT and STUDENT_COUNCIL_PRESIDENT
    // Ideally protectPage should allow an array.
    // For now, let's assume session check passes if logged in, and we verify role here.

    // Manual check to avoid redirect loop if strict role is single string
    // But we updated firebase.js with ROLES.

    // Check session
    auth.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = '/src/auth/login.html'; return; }

        try {
            const doc = await collections.users.doc(user.uid).get();
            if (!doc.exists) throw new Error("No profile");

            currentUser = { uid: user.uid, email: user.email, ...doc.data() };

            // Check Role
            if (currentUser.role === ROLES.STUDENT_COUNCIL_PRESIDENT) {
                isPresident = true;
                enablePresidentFeatures();
            } else if (currentUser.role !== ROLES.STUDENT) {
                // Wrong page
                // alert("Redirecting...");
                // redirectToDashboard(currentUser.role);
                // return;
            }

            initDashboard();

        } catch (e) {
            console.error(e);
            alert("Login Error");
        }
    });
});

function initDashboard() {
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = getUserInitials(currentUser.full_name);

    loadStats();
}

async function enablePresidentFeatures() {
    document.getElementById('presidentBadge').style.display = 'inline-block';
    document.getElementById('nav-president').style.display = 'block';
    document.getElementById('btnCreateEvent').style.display = 'inline-block';

    // Fetch My Council
    try {
        const snap = await collections.councils.where('president_id', '==', currentUser.uid).get();
        if (!snap.empty) {
            myCouncilId = snap.docs[0].id; // Assume 1 council per president
            document.getElementById('myCouncilName').textContent = snap.docs[0].data().name;
        }
    } catch (e) { console.error("Council fetch error", e); }
}

async function loadStats() {
    // Showcase Count
    const sSnap = await collections.showcase_items.where('student_id', '==', currentUser.uid).get();
    document.getElementById('statShowcase').textContent = sSnap.size;

    // Events Count (Active)
    const eSnap = await collections.events.where('status', '==', 'approved').get();
    document.getElementById('statEvents').textContent = eSnap.size;
}

/**
 * SHOWCASE LOGIC
 */
async function loadShowcase() {
    const container = document.getElementById('showcaseContainer');
    container.innerHTML = "Loading...";

    try {
        // Fetch My Items
        const snap = await collections.showcase_items.where('student_id', '==', currentUser.uid).get();

        let html = '';
        if (snap.empty) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:2rem;">No items uploaded yet. Show the world what you can do!</div>';
            return;
        }

        snap.forEach(doc => {
            const item = doc.data();
            const statusColor = item.status === 'approved' ? 'green' : (item.status === 'rejected' ? 'red' : 'orange');

            html += `
            <div class="showcase-card">
                <div class="card-img">
                   ${item.type.toUpperCase()}
                </div>
                <div class="card-body">
                    <span class="tag tag-${getCategoryClass(item.type)}">${item.type}</span>
                    <h3 style="font-size:1.1rem; margin:0.5rem 0;">${item.title}</h3>
                    <p style="color:#64748b; font-size:0.9rem; margin-bottom:1rem;">
                        ${item.description.substring(0, 80)}...
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:${statusColor}; font-weight:bold; font-size:0.8rem; text-transform:uppercase;">${item.status}</span>
                        ${item.link ? `<a href="${item.link}" target="_blank" style="color:blue">View Link ↗</a>` : ''}
                    </div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = "Error: " + e.message;
    }
}

function getCategoryClass(type) {
    if (type === 'tech') return 'tech';
    if (type === 'design') return 'art';
    return 'research';
}

document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await collections.showcase_items.add({
            title: document.getElementById('workTitle').value,
            type: document.getElementById('workType').value,
            description: document.getElementById('workDesc').value,
            link: document.getElementById('workLink').value,
            student_id: currentUser.uid,
            department_id: currentUser.department_id || null,
            status: 'pending',
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Uploaded successfully! Waiting for teacher approval.");
        closeUploadModal();
        loadShowcase();
        loadStats();
    } catch (e) { alert("Error: " + e.message); }
});

/**
 * EVENT LOGIC
 */
async function loadEvents() {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = "Loading...";
    try {
        const snap = await collections.events.where('status', '==', 'approved').orderBy('date', 'asc').get();
        if (snap.empty) {
            container.innerHTML = "No upcoming events.";
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const ev = doc.data();
            html += `
            <div class="management-card" style="border-left: 4px solid #8b5cf6;">
                <h3>${ev.title}</h3>
                <p>📅 ${ev.date} | 💰 Free Entry</p>
                <p style="margin-top:0.5rem">${ev.description || 'No description'}</p>
            </div>`;
        });
        container.innerHTML = html;

    } catch (e) {
        // Index error might happen on complex query
        container.innerHTML = "No events (or query error: " + e.message + ")";
    }
}

/**
 * PRESIDENT LOGIC: Create Event
 */
document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isPresident || !myCouncilId) { alert("Unauthorized"); return; }

    try {
        await collections.events.add({
            title: document.getElementById('eventTitle').value,
            date: document.getElementById('eventDate').value,
            budget: document.getElementById('eventBudget').value,
            description: document.getElementById('eventDesc').value,
            council_id: myCouncilId,
            created_by: currentUser.uid,
            status: 'pending_teacher', // Waits for teacher approval
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Event Proposed! Sent to Teacher for approval.");
        closeEventModal();
        showView('council'); // Show my proposed events
    } catch (e) { alert("Error: " + e.message); }
});

async function loadMyCouncilEvents() {
    const container = document.getElementById('myEventsList');
    container.innerHTML = "Loading...";
    try {
        const snap = await collections.events.where('created_by', '==', currentUser.uid).get();
        let html = '';
        snap.forEach(doc => {
            const ev = doc.data();
            html += `
             <div class="management-card">
                <h3>${ev.title}</h3>
                <p>Status: <strong>${ev.status.toUpperCase()}</strong></p>
             </div>`;
        });
        container.innerHTML = html || "No events proposed yet.";
    } catch (e) { container.innerHTML = "Error: " + e.message; }
}


/**
 * Routing
 */
function showView(viewName) {
    document.querySelectorAll('.dashboard-view').forEach(el => el.style.display = 'none');
    document.getElementById(`view-${viewName}`).style.display = 'block';

    if (viewName === 'showcase') loadShowcase();
    if (viewName === 'events') loadEvents();
    if (viewName === 'council') loadMyCouncilEvents();
}

function showUploadModal() { document.getElementById('uploadModal').classList.add('active'); }
function closeUploadModal() { document.getElementById('uploadModal').classList.remove('active'); }

function showCreateEventModal() { document.getElementById('eventModal').classList.add('active'); }
function closeEventModal() { document.getElementById('eventModal').classList.remove('active'); }

function logout() {
    auth.signOut().then(() => window.location.href = '/src/pages/login.html');
}

// Global
window.showView = showView;
window.showUploadModal = showUploadModal;
window.closeUploadModal = closeUploadModal;
window.showCreateEventModal = showCreateEventModal;
window.closeEventModal = closeEventModal;
window.logout = logout;
