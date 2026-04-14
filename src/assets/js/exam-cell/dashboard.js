/**
 * Exam Cell Dashboard Controller
 */

let currentUser = null;
let currentView = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const allowedRoles = [ROLES.EXAM_HEAD, ROLES.ADMIN]; // Admin allows for supervision
    const hasAccess = await protectPage();
    if (!hasAccess) return;

    currentUser = await getCurrentUser();

    // Check role specifically if protectPage was generic
    if (!allowedRoles.includes(currentUser.role)) {
        alert("Access Denied: Exam Cell Only");
        window.location.href = '/';
        return;
    }

    displayUserInfo();
    setupExamDashboard();

    console.log('✅ Exam Cell Dashboard Initialized');
});

function displayUserInfo() {
    document.getElementById('userName').textContent = currentUser.full_name || 'Exam Head';
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = getUserInitials(currentUser.full_name);
}

function logout() {
    auth.signOut().then(() => window.location.href = '/src/auth/login.html');
}

/**
 * Navigation
 */
function showDashboard() {
    switchView('dashboard');
    loadDashboardStats();
}

function showExamSchedule() {
    switchView('exams');
    loadExamList();
}

function showMarksEntry() {
    switchView('marks');
    loadMarksExamList();
}

function showResults() {
    alert("Results Module coming in Phase 5!");
}

function showReports() {
    alert("Reports Module coming soon!");
}

function showSettings() {
    alert("Settings coming soon!");
}

function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.dashboard-view').forEach(el => el.style.display = 'none');

    const view = document.getElementById(`view-${viewName}`);
    if (view) view.style.display = 'block';

    // Update Sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    // Simple match logic (can be refined)
    // ...
}

/**
 * Dashboard Stats
 */
async function loadDashboardStats() {
    try {
        const exams = await collections.exams.where('status', '==', 'scheduled').get();
        document.getElementById('statsUpcomingExams').textContent = exams.size;

        // Active Papers (Mock or complex query on subcollection)
        document.getElementById('statsActivePapers').textContent = '0';

        const results = await collections.exams.where('status', '==', 'completed').get();
        document.getElementById('statsResultsPending').textContent = results.size;

    } catch (e) {
        console.error("Stats Error:", e);
    }
}

/**
 * Exam Management
 */
function showExamModal() {
    document.getElementById('examForm').reset();
    document.getElementById('examId').value = '';
    loadCoursesIntoSelect('examCourse');
    document.getElementById('examModal').classList.add('active');
}

function closeExamModal() {
    document.getElementById('examModal').classList.remove('active');
}

async function loadCoursesIntoSelect(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">Loading...</option>';
    try {
        const snap = await collections.courses.get();
        let html = '<option value="">Select Course...</option>';
        snap.forEach(doc => {
            const c = doc.data();
            html += `<option value="${doc.id}">${c.name} (${c.code})</option>`;
        });
        select.innerHTML = html;
    } catch (e) {
        console.error(e);
        select.innerHTML = '<option value="">Error loading courses</option>';
    }
}

document.getElementById('examForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        const examId = document.getElementById('examId').value;
        const data = {
            name: document.getElementById('examName').value,
            type: document.getElementById('examType').value,
            course_id: document.getElementById('examCourse').value,
            semester: document.getElementById('examSemester').value,
            status: document.getElementById('examStatus').value,
            start_date: document.getElementById('examStartDate').value,
            end_date: document.getElementById('examEndDate').value,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: currentUser.uid
        };

        if (examId) {
            await collections.exams.doc(examId).update(data);
            await logAction('UPDATE', 'EXAM', `Updated Exam: ${data.name}`, examId);
        } else {
            data.created_at = firebase.firestore.FieldValue.serverTimestamp();
            data.created_by = currentUser.uid;
            const ref = await collections.exams.add(data);
            await logAction('CREATE', 'EXAM', `Created Exam: ${data.name}`, ref.id);
        }

        alert("Exam Saved Successfully!");
        closeExamModal();
        loadExamList();
        loadDashboardStats();

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Schedule Exam";
    }
});

async function loadExamList() {
    const container = document.getElementById('examListContainer');
    container.innerHTML = 'Loading...';

    try {
        const snap = await collections.exams.orderBy('start_date', 'asc').get();
        if (snap.empty) {
            container.innerHTML = '<div class="empty-state">No exams scheduled.</div>';
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const exam = doc.data();
            html += `
            <div class="management-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                     <h3>${exam.name}</h3>
                     <p>${exam.type.toUpperCase()} | Sem ${exam.semester}</p>
                     <small>📅 ${exam.start_date} to ${exam.end_date}</small>
                </div>
                <div>
                     <span class="badge badge-${getStatusColor(exam.status)}">${exam.status.toUpperCase()}</span>
                </div>
            </div>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = "Error: " + e.message;
    }
}

function getStatusColor(status) {
    if (status === 'scheduled') return 'warning';
    if (status === 'ongoing') return 'success';
    return 'secondary';
}

/**
 * Marks Entry (Placeholder)
 */
async function loadMarksExamList() {
    const container = document.getElementById('marksExamListContainer');
    // Load exams that are 'completed' or 'ongoing'
    try {
        const snap = await collections.exams.where('status', 'in', ['ongoing', 'completed']).get();
        if (snap.empty) {
            container.innerHTML = '<div class="empty-state">No active exams for marks entry.</div>';
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const start = async () => alert(`Opening Marks Entry for ${doc.data().name}`);
            html += `
            <div class="management-card" onclick="alert('Marks Entry UI coming soon!')" style="cursor:pointer">
                 <h3>${doc.data().name}</h3>
                 <p>Click to Enter Marks</p>
            </div>`;
        });
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = "Error: " + e.message;
    }
}

function setupExamDashboard() {
    showDashboard();
}

// Global Exports
window.showDashboard = showDashboard;
window.showExamSchedule = showExamSchedule;
window.showMarksEntry = showMarksEntry;
window.showResults = showResults;
window.showReports = showReports;
window.showSettings = showSettings;
window.logout = logout;
window.showExamModal = showExamModal;
window.closeExamModal = closeExamModal;
window.loadExamList = loadExamList;
window.processBulkImport = null; // Disable bulk import here if not needed
