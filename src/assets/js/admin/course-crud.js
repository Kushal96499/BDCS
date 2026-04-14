// ============================================
// COURSE MANAGEMENT
// ============================================

/**
 * Show Course Management
 */
function showCourseManagement() {
    currentView = 'courses';
    document.getElementById('pageTitle').textContent = 'Course Management';
    document.getElementById('dashboardView').style.display = 'none';
    updateSidebarActiveState('courses');

    const dynamicContent = document.getElementById('dynamicContent');
    dynamicContent.style.display = 'block';

    dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Courses</span>
    </div>

    <div class="action-toolbar">
      <div class="toolbar-search">
        <input type="text" placeholder="Search courses..." id="courseSearch">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" onclick="showCourseModal()">+ Create Course</button>
      </div>
    </div>

    <div class="management-grid" id="courseListContainer">
      <div style="text-align: center; padding: 2rem;">
        <div class="spinner"></div>
        Loading courses...
      </div>
    </div>
  `;

    loadCoursesCards();
}

/**
 * Load courses as cards
 */
async function loadCoursesCards() {
    try {
        const snapshot = await collections.courses.get();
        const container = document.getElementById('courseListContainer');

        if (snapshot.empty) {
            container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <h3>No Courses Yet</h3>
            <p>Create your first course to get started</p>
            <button class="btn btn-primary" onclick="showCourseModal()">+ Create Course</button>
          </div>
        </div>
      `;
            return;
        }

        const courseCards = await Promise.all(snapshot.docs.map(async doc => {
            const course = doc.data();

            // Get college name
            let collegeName = 'Unknown College';
            try {
                const collegeDoc = await collections.colleges.doc(course.college_id).get();
                if (collegeDoc.exists) {
                    collegeName = collegeDoc.data().name;
                }
            } catch (err) {
                console.error('Error fetching college:', err);
            }

            return `
        <div class="management-card">
          <div class="management-card-icon">📘</div>
          <h3 class="management-card-title">${course.name || 'N/A'}</h3>
          <p class="management-card-desc">${collegeName}</p>
          <div class="management-card-meta">
            <span class="badge">Code: ${course.code || 'N/A'}</span>
            <span class="badge">${course.degree_type || 'N/A'}</span>
          </div>
          <div class="management-card-stats">
            <div class="management-stat">
              <div class="management-stat-value">${course.duration || 0}</div>
              <div class="management-stat-label">Years</div>
            </div>
            <div class="management-stat">
              <div class="management-stat-value">0</div>
              <div class="management-stat-label">Students</div>
            </div>
          </div>
          <div class="management-card-actions">
            <button class="btn btn-outline btn-sm" onclick="showCourseModal('${doc.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCourse('${doc.id}', '${course.name}')">🗑️ Delete</button>
          </div>
        </div>
      `;
        }));

        container.innerHTML = courseCards.join('');

    } catch (error) {
        console.error('Error loading courses:', error);
        document.getElementById('courseListContainer').innerHTML = `
      <div style="grid-column: 1/-1; color: var(--error); text-align: center; padding: 2rem;">
        Error loading courses. ${error.message}
      </div>
    `;
    }
}

/**
 * Show course modal for create or edit
 */
async function showCourseModal(courseId = null) {
    const modal = document.getElementById('courseModal');
    const form = document.getElementById('courseForm');
    const title = document.getElementById('courseModalTitle');
    const submitBtn = document.getElementById('courseSubmitBtn');
    const errorMsg = document.getElementById('courseErrorMessage');
    const successMsg = document.getElementById('courseSuccessMessage');

    // Reset
    form.reset();
    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');
    document.getElementById('courseId').value = '';

    if (courseId) {
        // Edit mode
        title.textContent = 'Edit Course';
        submitBtn.textContent = 'Update Course';

        // Load course data
        try {
            const doc = await collections.courses.doc(courseId).get();
            if (doc.exists) {
                const course = doc.data();
                document.getElementById('courseId').value = courseId;
                document.getElementById('courseName').value = course.name;
                document.getElementById('courseCode').value = course.code;
                document.getElementById('courseDegreeType').value = course.degree_type;
                document.getElementById('courseDuration').value = course.duration;
                document.getElementById('courseDescription').value = course.description || '';

                // Load colleges first, then set value
                await loadCollegesForDropdown();
                document.getElementById('courseCollege').value = course.college_id;
            }
        } catch (error) {
            console.error('Error loading course:', error);
        }
    } else {
        // Create mode
        title.textContent = 'Create New Course';
        submitBtn.textContent = 'Create Course';

        // Load colleges
        await loadCollegesForDropdown();
    }

    modal.classList.add('active');
}

/**
 * Close course modal
 */
function closeCourseModal() {
    document.getElementById('courseModal').classList.remove('active');
}

/**
 * Load colleges into dropdown for course form
 */
async function loadCollegesForCourseDropdown() {
    try {
        const dropdown = document.getElementById('courseCollege');
        dropdown.innerHTML = '<option value="">Loading colleges...</option>';

        const snapshot = await collections.colleges.orderBy('name').get();

        dropdown.innerHTML = '<option value="">Select College</option>';

        snapshot.forEach(doc => {
            const college = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = college.name;
            dropdown.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading colleges:', error);
        const dropdown = document.getElementById('courseCollege');
        dropdown.innerHTML = '<option value="">Error loading colleges</option>';
    }
}

// Make functions globally accessible
window.showCourseManagement = showCourseManagement;
window.showCourseModal = showCourseModal;
window.closeCourseModal = closeCourseModal;
