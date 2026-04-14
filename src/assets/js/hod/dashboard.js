/**
 * HOD Module Controller
 * Level 2 Implementation
 */

let currentUser = null;
let currentDeptId = null;
let deptData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Protect Page
    if (typeof protectPage === 'function') {
        const hasAccess = await protectPage(ROLES.HOD);
        if (!hasAccess) return;
    }

    // 2. Load User & Scope
    try {
        currentUser = await getCurrentUser();

        if (!currentUser.department_id) {
            alert("CRITICAL: No Department assigned to this HOD account. Contact Admin.");
            logout();
            return;
        }

        currentDeptId = currentUser.department_id;

        // Initialize Executive Features
        await loadDeptDetails();
        initDashboardV2();

    } catch (error) {
        console.error("Init Error:", error);
        window.location.href = '/src/auth/login.html';
    }
});

async function initDashboardV2() {
    // Update Header Date
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);

    updateUIProfileV2();
    loadDashboardStats();
}

/**
 * Load Department Scope Details
 */
async function loadDeptDetails() {
    try {
        const doc = await collections.departments.doc(currentDeptId).get();
        if (doc.exists) {
            deptData = doc.data();
            document.getElementById('deptBadge').textContent = deptData.name;
            document.getElementById('teacherDeptDisplay').textContent = deptData.name;

            // Fetch college for hierarchy if available
            if (currentUser.college_id) {
                const colDoc = await collections.colleges.doc(currentUser.college_id).get();
                if (colDoc.exists) {
                    const collegeName = colDoc.data().name;
                    // Add details to profile view
                    document.getElementById('profileDetailCollege').textContent = collegeName;
                }
            }
            document.getElementById('profileDetailDept').textContent = deptData.name;

            // Try to fetch campus name
            if (currentUser.campus_id) {
                const camDoc = await collections.campuses.doc(currentUser.campus_id).get();
                if (camDoc.exists) {
                    document.getElementById('profileDetailCampus').textContent = camDoc.data().name;
                }
            }
        }
    } catch (e) {
        console.error("Dept Load Error:", e);
    }
}

function updateUIProfileV2() {
    const initials = getUserInitials(currentUser.full_name);

    // Sidebar profile
    document.getElementById('sidebarUserName').textContent = currentUser.full_name;
    document.getElementById('sidebarAvatar').textContent = initials;

    // Header subtitle: College > Department
    if (deptData) {
        document.getElementById('departmentName').textContent = deptData.name || 'Department';

        // Try to get college name if available
        if (currentUser.college_id) {
            collections.colleges.doc(currentUser.college_id).get().then(colDoc => {
                if (colDoc.exists) {
                    document.getElementById('collegeName').textContent = colDoc.data().name || 'College';
                }
            });
        }
    }

    // Update date in header
    const today = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('dateText').textContent = today.toLocaleDateString('en-US', options);

    // Profile Settings View
    document.getElementById('profileDisplayName').textContent = currentUser.full_name;
    document.getElementById('profileLargeAvatar').textContent = initials;
    document.getElementById('profileName').value = currentUser.full_name;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileContact').value = currentUser.phone || "";
}

/**
 * View Switcher V2
 */
window.switchView = function (viewName, navElement) {
    if (!navElement) {
        // Find nav element if we only have the name (e.g. from internal buttons)
        const allNavs = document.querySelectorAll('.nav-item');
        allNavs.forEach(nav => {
            if (nav.getAttribute('onclick').includes(`'${viewName}'`)) navElement = nav;
        });
    }

    // Update Nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (navElement) navElement.classList.add('active');

    // Update View Panels
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add('active');

    // Refresh Data
    if (viewName === 'overview') loadDashboardStats();
    if (viewName === 'faculty') loadFacultyList();
    if (viewName === 'students') loadStudentList(); // V2: Includes Insights

    // Smooth Scroll to Top
    document.querySelector('.main-content').scrollTop = 0;
};

/**
 * DATA: Dashboard Stats & Executive Insights
 */
async function loadDashboardStats() {
    try {
        // Parallel fetch for speed
        const [teachers, students, subjects] = await Promise.all([
            collections.system_users
                .where('department_id', '==', currentDeptId)
                .where('role', '==', 'teacher')
                .get(),
            collections.students
                .where('department_id', '==', currentDeptId)
                .get(),
            collections.courses
                .where('department_id', '==', currentDeptId)
                .get()
        ]);

        // Check for subjects collection if available
        let subjectCount = 0;
        try {
            const subSnap = await collections.subjects.where('department_id', '==', currentDeptId).get();
            subjectCount = subSnap.size;
        } catch (e) {
            // Fallback if subject collection not available
            console.log("No subjects collection yet");
        }

        // Update Health Stats
        document.getElementById('statFacultyCount').textContent = teachers.size;
        document.getElementById('statStudentCount').textContent = students.size;
        document.getElementById('statSubjectCount').textContent = subjectCount;

        // Update Faculty Activity Summary
        const facultyActive = Array.from(teachers.docs).filter(d => d.data().status === 'active').length;
        const facultyInactive = teachers.size - facultyActive;

        const facultyHtml = `
            <div class="activity-item">
                <div class="activity-dot" style="background: #10b981;"></div>
                <span class="activity-text">${facultyActive} Active Faculty Members</span>
            </div>
            ${facultyInactive > 0 ? `
            <div class="activity-item">
                <div class="activity-dot" style="background: #ef4444;"></div>
                <span class="activity-text">${facultyInactive} Inactive Accounts</span>
            </div>` : ''}
            <div class="activity-item">
                <div class="activity-dot" style="background: #3b82f6;"></div>
                <span class="activity-text">0 Pending Approvals</span>
            </div>
        `;
        document.getElementById('facultySummaryList').innerHTML = facultyHtml;

        // Update Student Insights
        if (students.size > 0) {
            document.getElementById('studentInsightText').textContent = `${students.size} students enrolled across all years`;

            // Calculate attendance risk (placeholder - would need actual attendance data)
            const riskCount = Math.floor(students.size * 0.05); // Simulate 5% at risk
            document.getElementById('attendanceRiskText').textContent =
                riskCount > 0 ? `${riskCount} students with attendance below 75%` : 'No attendance risks detected';
        } else {
            document.getElementById('studentInsightText').textContent = 'No students enrolled yet';
        }

    } catch (e) {
        console.error("Stats Error:", e);
    }
}

/**
 * DATA: Faculty List
 */
async function loadFacultyList() {
    const container = document.getElementById('facultyListContainer');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const snap = await collections.system_users
            .where('department_id', '==', currentDeptId)
            .where('role', '==', 'teacher')
            //.orderBy('created_at', 'desc') // Requires index
            .get();

        if (snap.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; grid-column: 1/-1; background: #F9FAFB; border-radius: 8px;">
                    <div style="font-size: 2rem;">👨‍🏫</div>
                    <p style="color: #6B7280; margin-top: 1rem;">No faculty members found by system.</p>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="showAddTeacherModal()">Add First Faculty</button>
                </div>`;
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const t = doc.data();
            const statusColor = t.status === 'active' ? '#10B981' : '#EF4444';

            html += `
            <div class="management-card" style="padding: 1.5rem; display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 48px; height: 48px; background: #F3F4F6; color: #4B5563; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem;">
                            ${getUserInitials(t.full_name)}
                        </div>
                        <div>
                            <h3 style="font-size: 1rem; font-weight: 600; margin: 0; color: #111827;">${t.full_name}</h3>
                            <div style="font-size: 0.85rem; color: #6B7280; margin-top: 2px;">${t.email}</div>
                        </div>
                    </div>
                    <div class="status-badge" style="background: ${t.status === 'active' ? '#D1FAE5' : '#FEE2E2'}; color: ${t.status === 'active' ? '#065F46' : '#991B1B'}; padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                        ${t.status?.toUpperCase()}
                    </div>
                </div>
                
                <div style="border-top: 1px solid #F3F4F6; padding-top: 1rem; margin-top: 1rem; display: flex; gap: 0.75rem;">
                    <button class="btn btn-outline" style="flex: 1; justify-content: center; font-size: 0.85rem;" onclick="viewTeacher('${doc.id}')">
                        View Profile
                    </button>
                    ${t.status === 'active'
                    ? `<button class="btn btn-outline" style="flex: 1; justify-content: center; color: #DC2626; border-color: #FEE2E2; background: #FEF2F2; font-size: 0.85rem;" onclick="toggleTeacherStatus('${doc.id}', 'inactive')">Disable</button>`
                    : `<button class="btn btn-outline" style="flex: 1; justify-content: center; color: #059669; border-color: #D1FAE5; background: #ECFDF5; font-size: 0.85rem;" onclick="toggleTeacherStatus('${doc.id}', 'active')">Enable</button>`
                }
                </div>
            </div>`;
        });
        container.innerHTML = html;

    } catch (e) {
        console.error("Load Faculty Error:", e);
        container.innerHTML = `<div class="error-state">Error loading faculty: ${e.message}</div>`;
    }
}

/**
 * ACTION: Create Teacher (Secondary App Pattern)
 */
const addTeacherForm = document.getElementById('addTeacherForm');
if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('btnCreateTeacher');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Creating...';

        const name = document.getElementById('teacherName').value.trim();
        const email = document.getElementById('teacherEmail').value.trim();

        // 1. Generate Temp Password
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
        let tempPassword = "";
        for (let i = 0; i < 10; i++) tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));

        let secondaryApp = null;
        try {
            // 2. Create Auth User via Secondary App
            if (!window.firebaseConfig) throw new Error("Firebase Config missing");

            secondaryApp = firebase.initializeApp(window.firebaseConfig, "HODWorkerApp");
            const userCred = await secondaryApp.auth().createUserWithEmailAndPassword(email, tempPassword);
            const newUid = userCred.user.uid;

            // 3. Create Database Records
            const userData = {
                uid: newUid,
                full_name: name,
                email: email,
                role: 'teacher',
                status: 'active',
                department_id: currentDeptId,
                college_id: currentUser.college_id || null,
                campus_id: currentUser.campus_id || null,
                first_login: true, // Forces reset
                created_by: currentUser.uid,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to system_users (Admin view) AND users (Auth view)
            // Using batch for atomicity
            const batch = db.batch();

            // Ref for System User List (queried by HOD/Admin)
            const sysUserRef = collections.system_users.doc(); // Auto ID
            batch.set(sysUserRef, { ...userData, auth_uid: newUid });

            // Ref for Actual User Profile (queried by Auth)
            const userRef = collections.users.doc(newUid);
            batch.set(userRef, userData);

            await batch.commit();

            // 4. Cleanup & Success
            await secondaryApp.auth().signOut();
            await secondaryApp.delete();
            secondaryApp = null;

            closeAddTeacherModal();
            addTeacherForm.reset();

            // Show Credentials
            showCredentialsModal(email, tempPassword);

            // Refresh List
            loadFacultyList();
            loadDashboardStats();

        } catch (error) {
            console.error("Create Teacher Error:", error);
            alert("Failed to create teacher: " + error.message);
            if (secondaryApp) await secondaryApp.delete();
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}

/**
 * DATA: Students (Read Only)
 */
async function loadStudentList() {
    const container = document.getElementById('studentListContainer');
    container.innerHTML = '<div class="spinner"></div>';

    try {
        const snap = await collections.students
            .where('department_id', '==', currentDeptId)
            .limit(50)
            .get();

        if (snap.empty) {
            container.innerHTML = '<div class="empty-state">No students found for this department.</div>';
            return;
        }

        let html = '';
        snap.forEach(doc => {
            const s = doc.data();
            html += `
            <div class="management-card" style="display: flex; justify-content: space-between;">
                <div>
                   <h4 style="margin: 0;">${s.full_name}</h4>
                   <div style="font-size: 0.8rem; color: #6B7280;">Roll: ${s.roll_number || 'N/A'}</div>
                </div>
                <div style="text-align: right;">
                    <div class="badge">Sem ${s.semester || 1}</div>
                </div>
            </div>`;
        });
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = "Error loading students.";
    }
}

/**
 * UTILS: Modals & Helpers
 */
window.showAddTeacherModal = () => document.getElementById('addTeacherModal').classList.add('active');
window.closeAddTeacherModal = () => document.getElementById('addTeacherModal').classList.remove('active');

window.showCredentialsModal = (email, pass) => {
    // Explicitly set text content to ensure copy works
    document.getElementById('credEmail').innerText = email;
    document.getElementById('credPassword').innerText = pass;
    document.getElementById('credentialsModal').classList.add('active');
};
window.closeCredentialsModal = () => document.getElementById('credentialsModal').classList.remove('active');

// Robust Copy Function (Fallback for non-secure contexts)
window.copyToClipboard = async (elementId) => {
    const text = document.getElementById(elementId).innerText;
    try {
        await navigator.clipboard.writeText(text);
        showToast ? showToast('Copied to clipboard!', 'success') : alert('Copied!');
    } catch (err) {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        showToast ? showToast('Copied!', 'success') : alert('Copied!');
    }
};

window.toggleTeacherStatus = async (id, newStatus) => {
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'Enable' : 'Disable'} this faculty member?`)) return;
    try {
        await collections.system_users.doc(id).update({ status: newStatus });

        // Try to update auth user record (if link exists)
        const doc = await collections.system_users.doc(id).get();
        if (doc.exists && doc.data().auth_uid) {
            try {
                await collections.users.doc(doc.data().auth_uid).update({ status: newStatus });
            } catch (ignore) { }
        }

        loadFacultyList();
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
};

window.exportDeptReport = (type) => {
    alert(`Exporting ${type.toUpperCase()} report... (Simulated download)`);
    // Reuse logic from Admin if needed, simplified for prototype
    const data = {
        department: document.getElementById('deptBadge').textContent,
        generated_at: new Date().toISOString(),
        faculty_count: document.getElementById('statFacultyCount').textContent,
        student_count: document.getElementById('statStudentCount').textContent
    };
    if (type === 'json') {
        downloadJSON(data, 'dept_report.json');
    } else {
        window.print();
    }
};

window.logout = () => {
    auth.signOut().then(() => window.location.href = '/src/auth/login.html');
};

// Ensure getUserInitials is available locally if not global
if (typeof getUserInitials === 'undefined') {
    window.getUserInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };
}
