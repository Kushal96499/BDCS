/**
 * Teacher Module Controller
 */

let currentUser = null;
let mySubjects = [];

document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await protectPage(ROLES.TEACHER);
    if (!hasAccess) return;

    currentUser = await getCurrentUser();
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userEmail').textContent = currentUser.email;

    // Set Date Default
    document.getElementById('attendanceDate').valueAsDate = new Date();

    loadMySubjects();
});

/**
 * Load Assigned Subjects 
 */
async function loadMySubjects() {
    const container = document.getElementById('subjectList');
    const select = document.getElementById('attendanceSubject');

    container.innerHTML = "Loading subjects...";

    try {
        let subjects = [];
        if (currentUser.department_id) {
            const snap = await collections.subjects.where('department_id', '==', currentUser.department_id).get();
            snap.forEach(doc => subjects.push({ id: doc.id, ...doc.data() }));
        }

        mySubjects = subjects;

        if (subjects.length === 0) {
            container.innerHTML = "No subjects assigned. Contact HOD.";
            return;
        }

        let html = '';
        let options = '<option value="">Select Subject...</option>';

        subjects.forEach(s => {
            html += `
            <div class="management-card">
                <h3>${s.name} (${s.code})</h3>
                <p>Sem: ${s.semester}</p>
                <div style="margin-top:0.5rem">
                    <button class="btn btn-sm btn-outline" onclick="quickAttendance('${s.id}')">Mark Attendance</button>
                </div>
            </div>`;

            options += `<option value="${s.id}">${s.name} (${s.code})</option>`;
        });

        container.innerHTML = html;
        select.innerHTML = options;

    } catch (e) {
        container.innerHTML = "Error loading subjects: " + e.message;
    }
}

/**
 * Attendance Logic
 */
function quickAttendance(subId) {
    showAttendance();
    document.getElementById('attendanceSubject').value = subId;
}

async function loadAttendanceSheet() {
    const subId = document.getElementById('attendanceSubject').value;
    const date = document.getElementById('attendanceDate').value;
    const container = document.getElementById('attendanceSheet');

    if (!subId || !date) { alert("Select Subject and Date"); return; }

    container.style.display = 'block';
    container.innerHTML = "Loading Student List...";

    try {
        const subject = mySubjects.find(s => s.id === subId);
        if (!subject) throw new Error("Invalid Subject");

        const snap = await collections.students
            .where('department_id', '==', subject.department_id)
            .where('semester', '==', parseInt(subject.semester))
            .get();

        if (snap.empty) {
            container.innerHTML = '<div class="info-badge">No students found for this semester.</div>';
            return;
        }

        let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
             <h3>Student List (${snap.size})</h3>
             <div>
                 <button class="btn btn-sm btn-secondary" onclick="toggleAll(true)">Select All</button>
                 <button class="btn btn-sm btn-outline" onclick="toggleAll(false)">Clear</button>
             </div>
        </div>
        <form id="attendanceForm">
        <div class="management-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
        `;

        snap.forEach(doc => {
            const s = doc.data();
            html += `
            <div class="management-card" style="display:flex; align-items:center; gap:1rem;">
                <input type="checkbox" name="student_attendance" value="${doc.id}" style="width:20px; height:20px;" checked>
                <div>
                    <strong>${s.full_name}</strong><br>
                    <small>${s.roll_number || 'No Roll'}</small>
                </div>
            </div>`;
        });

        html += `</div>
        <div style="margin-top:2rem; text-align:right">
             <button type="button" class="btn btn-submit" style="font-size:1.2rem; padding:1rem 2rem;" onclick="submitAttendance()">Submit Attendance</button>
        </div>
        </form>`;

        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = "Error: " + e.message;
    }
}

function toggleAll(state) {
    document.querySelectorAll('input[name="student_attendance"]').forEach(el => el.checked = state);
}

async function submitAttendance() {
    const subId = document.getElementById('attendanceSubject').value;
    const date = document.getElementById('attendanceDate').value;
    const checkboxes = document.querySelectorAll('input[name="student_attendance"]');

    if (!confirm(`Submit attendance for ${checkboxes.length} students?`)) return;

    const batch = db.batch();
    let presentCount = 0;

    checkboxes.forEach(cb => {
        const studentId = cb.value;
        const status = cb.checked ? 'P' : 'A';
        if (status === 'P') presentCount++;

        const docRef = collections.attendance.doc();
        batch.set(docRef, {
            date: date,
            subject_id: subId,
            student_id: studentId,
            teacher_id: currentUser.uid,
            status: status,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    try {
        await batch.commit();
        alert(`Attendance Saved! Present: ${presentCount}, Absent: ${checkboxes.length - presentCount}`);
        showDashboard();
    } catch (e) {
        alert("Error saving: " + e.message);
    }
}

/**
 * GOVERNANCE: Council Management
 */
function showCreateCouncilModal() {
    document.getElementById('createCouncilModal').classList.add('active');
    loadStudentsInternal(); // Populate select
}
function closeCreateCouncilModal() {
    document.getElementById('createCouncilModal').classList.remove('active');
}

async function loadStudentsInternal() {
    const select = document.getElementById('councilPresident');
    select.innerHTML = '<option value="">Loading...</option>';
    try {
        // Load all students from Dept (Simplified, fetching 50)
        let query = collections.students;
        if (currentUser.department_id) {
            query = query.where('department_id', '==', currentUser.department_id);
        }
        const snap = await query.limit(50).get();
        if (snap.empty) {
            select.innerHTML = '<option value="">No students in your dept</option>';
            return;
        }
        let html = '<option value="">Select President...</option>';
        snap.forEach(doc => {
            html += `<option value="${doc.id}">${doc.data().full_name} (${doc.data().roll_number})</option>`;
        });
        select.innerHTML = html;
    } catch (e) {
        console.error(e);
        select.innerHTML = '<option value="">Error loading students</option>';
    }
}

document.getElementById('createCouncilForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('councilName').value;
    const presId = document.getElementById('councilPresident').value;

    if (!name || !presId) return;

    try {
        // 1. Create Council
        await collections.councils.add({
            name: name,
            teacher_incharge_id: currentUser.uid,
            president_id: presId,
            department_id: currentUser.department_id || null,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update Student Role to PRESIDENT
        // This grants them access to Create Events dashboard
        await collections.students.doc(presId).update({
            role: ROLES.STUDENT_COUNCIL_PRESIDENT // Assumes firebase.js exports this string
        });
        // We also need to update the base user record if role is stored there?
        // Our schema stores role in `users/{uid}`.
        await collections.users.doc(presId).update({
            role: ROLES.STUDENT_COUNCIL_PRESIDENT
        });

        alert("Council Created! Student appointed as President.");
        closeCreateCouncilModal();
        loadCouncils();

    } catch (e) {
        alert("Error: " + e.message);
    }
});

async function loadCouncils() {
    const container = document.getElementById('councilList');
    container.innerHTML = 'Loading...';
    try {
        const snap = await collections.councils.where('teacher_incharge_id', '==', currentUser.uid).get();
        if (snap.empty) {
            container.innerHTML = '<div class="empty-state">No councils managed.</div>';
            return;
        }

        let html = '';
        for (const doc of snap.docs) {
            const c = doc.data();
            const presDoc = await collections.users.doc(c.president_id).get();
            const presName = presDoc.exists ? presDoc.data().full_name : 'Unknown';

            html += `
             <div class="management-card">
                 <h3>${c.name}</h3>
                 <p>President: <strong>${presName}</strong></p>
                 <div style="margin-top:0.5rem">
                    <span class="badge badge-success">Active</span>
                 </div>
             </div>`;
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = "Error: " + e.message;
    }
}

/**
 * GOVERNANCE: Event Approvals
 */
async function loadApprovals() {
    const container = document.getElementById('approvalList');
    container.innerHTML = 'Loading...';

    try {
        // Naive approach: Fetch my councils, then fetch pending events for them.
        // Better: Fetch all pending events, filter in memory if small scale.

        // 1. Get my council IDs
        const councilSnap = await collections.councils.where('teacher_incharge_id', '==', currentUser.uid).get();
        if (councilSnap.empty) {
            container.innerHTML = '<div class="empty-state">No councils, no approvals.</div>';
            return;
        }

        const councilIds = councilSnap.docs.map(d => d.id);

        // 2. Fetch Pending Events
        // Firestore 'in' query supports up to 10
        const eventsSnap = await collections.events
            .where('status', '==', 'pending_teacher')
            .where('council_id', 'in', councilIds.slice(0, 10))
            .get();

        if (eventsSnap.empty) {
            container.innerHTML = '<div class="empty-state">No pending requests.</div>';
            return;
        }

        let html = '';
        eventsSnap.forEach(doc => {
            const ev = doc.data();
            html += `
             <div class="management-card" style="border-left: 4px solid #f59e0b; display:flex; justify-content:space-between; align-items:center;">
                 <div>
                     <h3>${ev.title}</h3>
                     <p>Date: ${ev.date} | Budget: ₹${ev.budget}</p>
                     <small>Created By: President</small>
                 </div>
                 <div style="display:flex; gap:0.5rem">
                     <button class="btn btn-sm btn-success" onclick="approveEvent('${doc.id}')">Approve</button>
                     <button class="btn btn-sm btn-danger" onclick="rejectEvent('${doc.id}')">Reject</button>
                 </div>
             </div>
             `;
        });

        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = "Error: " + e.message;
    }
}

async function approveEvent(eventId) {
    if (!confirm("Approve this event?")) return;
    try {
        await collections.events.doc(eventId).update({
            status: 'approved',
            approved_by: currentUser.uid,
            approved_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadApprovals();
    } catch (e) { alert("Error: " + e.message); }
}

async function rejectEvent(eventId) {
    if (!confirm("Reject this event?")) return;
    try {
        await collections.events.doc(eventId).update({
            status: 'rejected',
            rejected_by: currentUser.uid
        });
        loadApprovals();
    } catch (e) { alert("Error: " + e.message); }
}


/**
 * Routing
 */
function showDashboard() { switchView('dashboard'); }
function showAttendance() { switchView('attendance'); }
function showMarks() { alert("Internal Marks Module - Coming Soon"); }
function showLeaves() { alert("Leave Application - Coming Soon"); }
function showCouncils() { switchView('councils'); loadCouncils(); }
function showApprovals() { switchView('approvals'); loadApprovals(); }

function switchView(viewName) {
    document.querySelectorAll('.dashboard-view').forEach(el => el.style.display = 'none');
    document.getElementById(`view-${viewName}`).style.display = 'block';

    // Sidebar Active State (Simple)
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    // (Optional: add logic to highlight correct link)
}

function logout() {
    auth.signOut().then(() => window.location.href = '/src/auth/login.html');
}

// Exports
window.showDashboard = showDashboard;
window.showAttendance = showAttendance;
window.showMarks = showMarks;
window.showLeaves = showLeaves;
window.showCouncils = showCouncils;
window.showApprovals = showApprovals;
window.loadAttendanceSheet = loadAttendanceSheet;
window.quickAttendance = quickAttendance;
window.toggleAll = toggleAll;
window.submitAttendance = submitAttendance;
window.showCreateCouncilModal = showCreateCouncilModal;
window.closeCreateCouncilModal = closeCreateCouncilModal;
window.approveEvent = approveEvent;
window.rejectEvent = rejectEvent;
window.logout = logout;
window.resetAttendanceForm = () => document.getElementById('attendanceSheet').style.display = 'none';
