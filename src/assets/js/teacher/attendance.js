// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Teacher Attendance Management
// Period-wise, Subject-wise, Day-wise tracking
// ============================================

let currentUser = null;
let teacherData = null;
let selectedStudents = [];
let attendanceData = {};

// Initialize attendance page
document.addEventListener('DOMContentLoaded', async () => {
    setPageTitle('Mark Attendance - BDCS');

    // Protect page
    const hasAccess = await protectPage(ROLES.TEACHER);
    if (!hasAccess) return;

    // Load session
    currentUser = await initializeSession();
    if (!currentUser) return;

    // Display user info
    displayUserInfo();

    // Load teacher data
    await loadTeacherData();

    // Set today's date
    document.getElementById('attendanceDate').valueAsDate = new Date();

    // Setup form handler
    setupAttendanceFilter();

    // Load recent attendance
    await loadRecentAttendance();

    console.log('✅ Attendance page initialized');
});

/**
 * Display user information
 */
function displayUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) userNameEl.textContent = currentUser.name || 'Teacher';
    if (userEmailEl) userEmailEl.textContent = currentUser.email;
    if (userAvatarEl) userAvatarEl.textContent = getUserInitials(currentUser.name || currentUser.email);
}

/**
 * Load teacher data
 */
async function loadTeacherData() {
    try {
        const teacherSnapshot = await collections.teachers
            .where('user_id', '==', currentUser.uid)
            .limit(1)
            .get();

        if (!teacherSnapshot.empty) {
            teacherData = teacherSnapshot.docs[0].data();
        }
    } catch (error) {
        console.error('Error loading teacher data:', error);
    }
}

/**
 * Setup attendance filter form
 */
function setupAttendanceFilter() {
    const form = document.getElementById('attendanceFilterForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await loadStudentsForAttendance();
    });
}

/**
 * Load students for attendance marking
 */
async function loadStudentsForAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const period = document.getElementById('attendancePeriod').value;
    const subject = document.getElementById('attendanceSubject').value;
    const course = document.getElementById('attendanceCourse').value;
    const semester = document.getElementById('attendanceSemester').value;

    if (!date || !period || !subject || !course || !semester) {
        showToast('Please fill all fields', 'error');
        return;
    }

    try {
        // Check if attendance already exists for this date/period/subject
        const existingAttendance = await collections.attendance
            .where('date', '==', date)
            .where('period', '==', parseInt(period))
            .where('subject', '==', subject)
            .where('course', '==', course)
            .where('semester', '==', parseInt(semester))
            .where('teacher_id', '==', currentUser.uid)
            .limit(1)
            .get();

        if (!existingAttendance.empty) {
            const confirm = window.confirm('Attendance already marked for this period. Do you want to edit it?');
            if (!confirm) return;

            // Load existing attendance for editing
            await loadExistingAttendance(existingAttendance.docs[0]);
            return;
        }

        // Load students
        const studentsSnapshot = await collections.students
            .where('course', '==', course)
            .where('semester', '==', parseInt(semester))
            .where('department_id', '==', currentUser.department_id)
            .where('campus_id', '==', currentUser.campus_id)
            .orderBy('name')
            .get();

        if (studentsSnapshot.empty) {
            showToast('No students found for this course/semester', 'warning');
            return;
        }

        // Get user data for students
        selectedStudents = await Promise.all(
            studentsSnapshot.docs.map(async (doc) => {
                const studentData = doc.data();
                const userDoc = await collections.users.doc(studentData.user_id).get();
                const userData = userDoc.exists ? userDoc.data() : {};
                return {
                    id: doc.id,
                    user_id: studentData.user_id,
                    enrollment_number: studentData.enrollment_number,
                    ...studentData,
                    ...userData
                };
            })
        );

        // Render attendance table
        renderAttendanceTable();

        // Show attendance card
        document.getElementById('attendanceListCard').style.display = 'block';

        // Scroll to attendance table
        document.getElementById('attendanceListCard').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Failed to load students', 'error');
    }
}

/**
 * Render attendance table
 */
function renderAttendanceTable() {
    const date = document.getElementById('attendanceDate').value;
    const period = document.getElementById('attendancePeriod').value;
    const subject = document.getElementById('attendanceSubject').value;
    const course = document.getElementById('attendanceCourse').value;
    const semester = document.getElementById('attendanceSemester').value;

    // Update info section
    const infoEl = document.getElementById('attendanceInfo');
    infoEl.innerHTML = `
    <strong>Date:</strong> ${new Date(date).toLocaleDateString('en-IN')} &nbsp;|&nbsp;
    <strong>Subject:</strong> ${subject} &nbsp;|&nbsp;
    <strong>Period:</strong> ${period} &nbsp;|&nbsp;
    <strong>Course:</strong> ${course} &nbsp;|&nbsp;
    <strong>Semester:</strong> ${semester} &nbsp;|&nbsp;
    <strong>Total Students:</strong> ${selectedStudents.length}
  `;

    // Render table rows
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = selectedStudents.map((student, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${student.name || 'N/A'}</td>
      <td>${student.enrollment_number || 'N/A'}</td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
            <input type="radio" name="attendance_${student.id}" value="present" checked>
            <span style="color: var(--success); font-weight: 500;">Present</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
            <input type="radio" name="attendance_${student.id}" value="absent">
            <span style="color: var(--error); font-weight: 500;">Absent</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
            <input type="radio" name="attendance_${student.id}" value="late">
            <span style="color: var(--warning); font-weight: 500;">Late</span>
          </label>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Mark all present
 */
function markAllPresent() {
    const radios = document.querySelectorAll('input[type="radio"][value="present"]');
    radios.forEach(radio => radio.checked = true);
    showToast('All marked as Present', 'success');
}

/**
 * Mark all absent
 */
function markAllAbsent() {
    const radios = document.querySelectorAll('input[type="radio"][value="absent"]');
    radios.forEach(radio => radio.checked = true);
    showToast('All marked as Absent', 'warning');
}

/**
 * Cancel attendance
 */
function cancelAttendance() {
    document.getElementById('attendanceListCard').style.display = 'none';
    document.getElementById('attendanceFilterForm').reset();
    document.getElementById('attendanceDate').valueAsDate = new Date();
    selectedStudents = [];
}

/**
 * Save attendance
 */
async function saveAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const period = parseInt(document.getElementById('attendancePeriod').value);
    const subject = document.getElementById('attendanceSubject').value;
    const course = document.getElementById('attendanceCourse').value;
    const semester = parseInt(document.getElementById('attendanceSemester').value);

    const saveBtn = document.getElementById('saveAttendanceBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Collect attendance records
        const records = selectedStudents.map(student => {
            const statusRadio = document.querySelector(`input[name="attendance_${student.id}"]:checked`);
            return {
                student_id: student.user_id,
                student_name: student.name,
                enrollment_number: student.enrollment_number,
                status: statusRadio ? statusRadio.value : 'absent'
            };
        });

        // Count stats
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;
        const lateCount = records.filter(r => r.status === 'late').length;

        // Save to Firestore
        await collections.attendance.add({
            date: date,
            period: period,
            subject: subject,
            course: course,
            semester: semester,
            campus_id: currentUser.campus_id,
            department_id: currentUser.department_id,
            teacher_id: currentUser.uid,
            teacher_name: currentUser.name,
            records: records,
            stats: {
                total: selectedStudents.length,
                present: presentCount,
                absent: absentCount,
                late: lateCount
            },
            marked_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Attendance saved successfully!', 'success');

        // Reset form
        cancelAttendance();

        // Reload recent attendance
        await loadRecentAttendance();

    } catch (error) {
        console.error('Error saving attendance:', error);
        showToast('Failed to save attendance', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Attendance';
    }
}

/**
 * Load recent attendance records
 */
async function loadRecentAttendance() {
    try {
        const snapshot = await collections.attendance
            .where('teacher_id', '==', currentUser.uid)
            .orderBy('marked_at', 'desc')
            .limit(10)
            .get();

        const tbody = document.getElementById('recentAttendanceBody');

        if (snapshot.empty) {
            tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem;">
            <p>No attendance records yet. Mark your first attendance above!</p>
          </td>
        </tr>
      `;
            return;
        }

        tbody.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
        <tr>
          <td>${new Date(data.date).toLocaleDateString('en-IN')}</td>
          <td>${data.subject}</td>
          <td>Period ${data.period}</td>
          <td>${data.course} - Sem ${data.semester}</td>
          <td><span style="color: var(--success); font-weight: 500;">${data.stats.present}</span></td>
          <td><span style="color: var(--error); font-weight: 500;">${data.stats.absent}</span></td>
          <td>
            <button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.875rem;" onclick="viewAttendanceDetails('${doc.id}')">
              View
            </button>
          </td>
        </tr>
      `;
        }).join('');

    } catch (error) {
        console.error('Error loading recent attendance:', error);
    }
}

/**
 * View attendance details (placeholder)
 */
function viewAttendanceDetails(attendanceId) {
    showToast('View attendance details - Coming soon!', 'info');
}

/**
 * Load existing attendance for editing
 */
async function loadExistingAttendance(attendanceDoc) {
    showToast('Editing existing attendance - Feature coming soon!', 'info');
    // TODO: Implement edit functionality
}
