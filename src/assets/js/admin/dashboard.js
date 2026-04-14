// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// System Admin Dashboard - Complete
// Institutional Hierarchy Management
// ============================================

let currentUser = null;
let currentView = 'dashboard';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setPageTitle('System Admin Dashboard');

  // Protect page
  const hasAccess = await protectPage(ROLES.ADMIN);
  if (!hasAccess) return;

  // Load session
  currentUser = await initializeSession();
  if (!currentUser) return;

  // Display user info
  displayUserInfo();

  // Load dashboard stats
  await loadDashboardStats();

  // Setup form handlers
  setupCollegeForm();
  setupCampusForm();
  setupCourseForm();
  setupDepartmentForm();
  setupSystemUserForm();

  console.log('✅ System Admin Dashboard initialized');
});

/**
 * Display user information
 */
function displayUserInfo() {
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const userAvatarEl = document.getElementById('userAvatar');

  if (userNameEl) userNameEl.textContent = currentUser.name || 'System Admin';
  if (userEmailEl) userEmailEl.textContent = currentUser.email;
  if (userAvatarEl) userAvatarEl.textContent = getUserInitials(currentUser.name || 'SA');
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
  try {
    // Count colleges
    const collegesSnapshot = await collections.colleges.get();
    document.getElementById('totalColleges').textContent = collegesSnapshot.size;
    document.getElementById('collegeCount').textContent = collegesSnapshot.size;

    // Count courses
    const coursesSnapshot = await collections.courses.get();
    document.getElementById('totalCourses').textContent = coursesSnapshot.size;
    document.getElementById('courseCount').textContent = coursesSnapshot.size;

    // Count departments
    const deptsSnapshot = await collections.departments.get();
    document.getElementById('totalDepartments').textContent = deptsSnapshot.size;
    document.getElementById('deptCount').textContent = deptsSnapshot.size;

    // Count system roles
    const rolesSnapshot = await collections.system_roles.get();
    document.getElementById('systemRolesCount').textContent = rolesSnapshot.size;

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Update sidebar active state
 */
function updateSidebarActiveState(activeView) {
  // Remove active from all
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.classList.remove('active');
  });

  // Add active to current view
  const viewMap = {
    'dashboard': 0,
    'campuses': 1,
    'colleges': 2,
    'courses': 3,
    'departments': 4,
    'roles': 5,
    'manage_users': 6,
    'reports': 7,
    'audit-logs': 8,
    'settings': 9
  };

  const index = viewMap[activeView];
  if (index !== undefined) {
    const links = document.querySelectorAll('.sidebar-nav a');
    if (links[index]) {
      links[index].classList.add('active');
    }
  }
}

/**
 * Reset all views (Hide everything)
 */
function resetAllViews() {
  document.getElementById('dashboardView').style.display = 'none';
  document.getElementById('dynamicContent').style.display = 'none';
  document.querySelectorAll('.dashboard-view').forEach(el => el.style.display = 'none');
}

/**
 * Show dashboard view
 */
function showDashboard() {
  currentView = 'dashboard';
  document.getElementById('pageTitle').textContent = 'System Admin Dashboard';

  resetAllViews();
  document.getElementById('dashboardView').style.display = 'block';

  updateSidebarActiveState('dashboard');
  loadDashboardStats();
}

// ============================================
// CAMPUS MANAGEMENT
// ============================================

/**
 * Show Campus Management
 */
function showCampusManagement() {
  currentView = 'campuses';
  document.getElementById('pageTitle').textContent = 'Campus Management';

  resetAllViews();
  updateSidebarActiveState('campuses');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Campuses</span>
    </div>

    <div class="action-toolbar">
      <div class="toolbar-search">
        <input type="text" placeholder="Search campuses..." id="campusSearch">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" onclick="showCampusModal()">+ Create Campus</button>
      </div>
    </div>

    <div class="management-grid" id="campusListContainer">
      <div style="text-align: center; padding: 2rem;">
        <div class="spinner"></div>
        Loading campuses...
      </div>
    </div>
  `;

  loadCampusesCards();
}

/**
 * Load campuses as cards
 */
async function loadCampusesCards() {
  try {
    const snapshot = await collections.campuses.get();
    const container = document.getElementById('campusListContainer');

    if (snapshot.empty) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <div class="empty-state">
            <div class="empty-state-icon">\uD83C\uDFDB\uFE0F</div>
            <h3>No Campuses Yet</h3>
            <p>Create your first campus to get started</p>
            <button class="btn btn-primary" onclick="showCampusModal()">+ Create Campus</button>
          </div>
        </div>
      `;
      return;
    }

    const campusCards = snapshot.docs.map(doc => {
      const campus = doc.data();
      return `
        <div class="management-card">
          <div class="management-card-icon">${getCampusIcon(doc.id)}</div>
          <h3 class="management-card-title">${campus.name || 'N/A'}</h3>
          <p class="management-card-desc">${campus.location || 'Location not set'}</p>
          <div class="management-card-meta">
            <span class="badge">Code: ${campus.code || 'N/A'}</span>
          </div>
          <div class="management-card-stats">
            <div class="management-stat">
              <div class="management-stat-value">${campus.colleges_count || 0}</div>
              <div class="management-stat-label">Colleges</div>
            </div>
            <div class="management-stat">
              <div class="management-stat-value">${campus.students_count || 0}</div>
              <div class="management-stat-label">Students</div>
            </div>
          </div>
          <div class="management-card-actions">
            <button class="btn btn-outline btn-sm" onclick="showCampusModal('${doc.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCampus('${doc.id}', '${campus.name}')">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = campusCards;

  } catch (error) {
    console.error('Error loading campuses:', error);
    document.getElementById('campusListContainer').innerHTML = `
      <div style="grid-column: 1/-1; color: var(--error); text-align: center; padding: 2rem;">
        Error loading campuses. ${error.message}
      </div>
    `;
  }
}

/**
 * Delete campus
 */
async function deleteCampus(campusId, campusName) {
  try {
    // Check if campus has colleges
    const snapshot = await collections.colleges
      .where('campus_id', '==', campusId)
      .get();

    if (!snapshot.empty) {
      alert(`Cannot delete "${campusName}" because it has ${snapshot.size} college(s). Please delete or move the colleges first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${campusName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    await collections.campuses.doc(campusId).delete();
    alert(`Campus "${campusName}" deleted successfully!`);

    // Reload list
    await loadCampusesCards();
    await loadDashboardStats();

  } catch (error) {
    console.error('Error deleting campus:', error);
    alert('Failed to delete campus. Please try again.');
  }
}

// Make globally accessible
window.deleteCampus = deleteCampus;

/**
 * Get campus icon
 */
function getCampusIcon(campusId) {
  const icons = {
    'vdn': '🏛️',
    'champapura': '🏢',
    'kalwar': '🎓'
  };
  return icons[campusId] || '🏛️';
}

/**
 * Get campus display name
 */
function getCampusDisplayName(campusId) {
  const names = {
    'vdn': 'VDN Campus',
    'champapura': 'Champapura Campus',
    'kalwar': 'Kalwar Campus'
  };
  return names[campusId] || campusId.toUpperCase();
}

// ============================================
// CAMPUS MANAGEMENT
// ============================================

/**
 * Show campus modal for create or edit
 */
async function showCampusModal(campusId = null) {
  const modal = document.getElementById('campusModal');
  const form = document.getElementById('campusForm');
  const title = document.getElementById('campusModalTitle');
  const submitBtn = document.getElementById('campusSubmitBtn');
  const errorMsg = document.getElementById('campusErrorMessage');
  const successMsg = document.getElementById('campusSuccessMessage');

  // Reset
  form.reset();
  errorMsg.classList.remove('show');
  successMsg.classList.remove('show');
  document.getElementById('campusId').value = '';

  if (campusId) {
    // Edit mode
    title.textContent = 'Edit Campus';
    submitBtn.textContent = 'Update Campus';

    // Load campus data
    try {
      const doc = await collections.campuses.doc(campusId).get();
      if (doc.exists) {
        const campus = doc.data();
        document.getElementById('campusId').value = campusId;
        document.getElementById('campusName').value = campus.name;
        document.getElementById('campusCode').value = campus.code;
        document.getElementById('campusLocation').value = campus.location;
        document.getElementById('campusAddress').value = campus.address || '';
      }
    } catch (error) {
      console.error('Error loading campus:', error);
    }
  } else {
    // Create mode
    title.textContent = 'Create New Campus';
    submitBtn.textContent = 'Create Campus';
  }

  modal.classList.add('active');
}

/**
 * Close campus modal
 */
function closeCampusModal() {
  document.getElementById('campusModal').classList.remove('active');
}

/**
 * Show campus error
 */
function showCampusError(message) {
  const errorMsg = document.getElementById('campusErrorMessage');
  const errorText = document.getElementById('campusErrorText');
  errorText.textContent = message;
  errorMsg.classList.add('show');
  document.querySelector('#campusModal .college-modal-body').scrollTop = 0;
}

/**
 * Show campus success
 */
function showCampusSuccess(message) {
  const successMsg = document.getElementById('campusSuccessMessage');
  const successText = document.getElementById('campusSuccessText');
  const errorMsg = document.getElementById('campusErrorMessage');

  errorMsg.classList.remove('show');
  successText.textContent = message;
  successMsg.classList.add('show');
}

/**
 * Check duplicate campus code
 */
async function checkDuplicateCampusCode(code, excludeId = null) {
  try {
    const snapshot = await collections.campuses
      .where('code', '==', code.toUpperCase())
      .get();

    if (snapshot.empty) return false;

    // If editing, exclude current campus
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }

    return true;
  } catch (error) {
    console.error('Error checking duplicate code:', error);
    return false;
  }
}

/**
 * Setup campus form
 */
function setupCampusForm() {
  const form = document.getElementById('campusForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('campusSubmitBtn');
    const errorMsg = document.getElementById('campusErrorMessage');
    const successMsg = document.getElementById('campusSuccessMessage');

    // Hide messages
    errorMsg.classList.remove('show');
    successMsg.classList.remove('show');

    // Get values
    const campusId = document.getElementById('campusId').value;
    const name = document.getElementById('campusName').value.trim();
    const code = document.getElementById('campusCode').value.trim().toUpperCase();
    const location = document.getElementById('campusLocation').value.trim();
    const address = document.getElementById('campusAddress').value.trim();

    // Validate
    if (!name) {
      showCampusError('Campus Name is required');
      return;
    }

    if (!code) {
      showCampusError('Campus Code is required');
      return;
    }

    if (code.length < 2) {
      showCampusError('Campus Code must be at least 2 characters');
      return;
    }

    if (!location) {
      showCampusError('Location is required');
      return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';

    try {
      // Check duplicate (exclude current if editing)
      const isDuplicate = await checkDuplicateCampusCode(code, campusId);

      if (isDuplicate) {
        showCampusError(`Campus Code "${code}" already exists. Please use a unique code.`);
        submitBtn.disabled = false;
        submitBtn.textContent = campusId ? 'Update Campus' : 'Create Campus';
        return;
      }

      submitBtn.textContent = campusId ? 'Updating...' : 'Creating...';

      const campusData = {
        name: name,
        code: code,
        location: location,
        address: address || '',
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (campusId) {
        // Update existing
        await collections.campuses.doc(campusId).update(campusData);
        showCampusSuccess(`Campus "${name}" updated successfully!`);
      } else {
        // Create new
        campusData.colleges_count = 0;
        campusData.created_at = firebase.firestore.FieldValue.serverTimestamp();
        await collections.campuses.add(campusData);
        showCampusSuccess(`Campus "${name}" created successfully!`);
      }

      // Reset form
      form.reset();

      // Reload campuses
      await loadCampusesCards();

      // Reload dashboard stats
      await loadDashboardStats();

      // Close after 2 seconds
      setTimeout(() => {
        closeCampusModal();
      }, 2000);

    } catch (error) {
      console.error('Error saving campus:', error);
      showCampusError('Failed to save campus. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = campusId ? 'Update Campus' : 'Create Campus';
    }
  });
}

// Make globally accessible
window.showCampusModal = showCampusModal;
window.closeCampusModal = closeCampusModal;

// ============================================
// COLLEGE MANAGEMENT
// ============================================

/**
 * Show College Management
 */
function showCollegeManagement() {
  currentView = 'colleges';
  document.getElementById('pageTitle').textContent = 'College Management';

  resetAllViews();
  updateSidebarActiveState('colleges');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Colleges</span>
    </div>

    <div class="action-toolbar">
      <div class="toolbar-search">
        <input type="text" placeholder="Search colleges..." id="collegeSearch">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" onclick="showCreateCollegeModal()">+ Create College</button>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>College Name</th>
              <th>Campus</th>
              <th>Courses</th>
              <th>Departments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="collegesTableBody">
            <tr>
              <td colspan="5" style="text-align: center; padding: 2rem;">
                <div class="spinner"></div>
                Loading colleges...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadCollegesList();
}

/**
 * Load colleges list
 */
async function loadCollegesList() {
  try {
    const snapshot = await collections.colleges.get();
    const tbody = document.getElementById('collegesTableBody');

    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem;">
            <div class="empty-state">
              <div class="empty-state-icon">\uD83C\uDF93</div>
              <h3>No Colleges Yet</h3>
              <p>Create your first college to get started</p>
              <button class="btn btn-primary" onclick="showCreateCollegeModal()">+ Create College</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = snapshot.docs.map(doc => {
      const college = doc.data();
      return `
        <tr>
          <td><strong>${college.name || 'N/A'}</strong></td>
          <td>${getCampusDisplayName(college.campus_id)}</td>
          <td>${college.courses_count || 0}</td>
          <td>${college.departments_count || 0}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="showCreateCollegeModal('${doc.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCollege('${doc.id}', '${college.name}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading colleges:', error);
  }
}

/**
 * Show create college modal
 */
async function showCreateCollegeModal(collegeId = null) {
  const modal = document.getElementById('createCollegeModal');
  const form = document.getElementById('createCollegeForm');
  const title = document.querySelector('#createCollegeModal .college-modal-header h2');
  const submitBtn = document.getElementById('createCollegeBtn');
  const successMsg = document.getElementById('collegeSuccessMessage');
  const errorMsg = document.getElementById('collegeErrorMessage');

  if (!modal) {
    console.error('âŒ Modal element not found!');
    alert('Error: Modal element not found. Please refresh the page.');
    return;
  }

  // Reset
  if (form) form.reset();
  if (successMsg) successMsg.classList.remove('show');
  if (errorMsg) errorMsg.classList.remove('show');

  // Store collegeId for edit mode
  form.dataset.collegeId = collegeId || '';

  if (collegeId) {
    // Edit mode
    title.textContent = 'Edit College';
    submitBtn.textContent = 'Update College';

    // Load college data
    try {
      const doc = await collections.colleges.doc(collegeId).get();
      if (doc.exists) {
        const college = doc.data();
        document.getElementById('collegeName').value = college.name;
        document.getElementById('collegeCode').value = college.code;
        document.getElementById('collegeType').value = college.type;
        document.getElementById('collegeAddress').value = college.address || '';

        // Load campuses first, then set value
        await loadCampusesForDropdown();
        document.getElementById('collegeCampus').value = college.campus_id;
      }
    } catch (error) {
      console.error('Error loading college:', error);
    }
  } else {
    // Create mode
    title.textContent = 'Create New College';
    submitBtn.textContent = 'Create College';

    // Load campuses dynamically
    await loadCampusesForDropdown();
  }

  // Show modal
  modal.classList.add('active');
}

// Make function globally accessible
window.showCreateCollegeModal = showCreateCollegeModal;
window.closeCreateCollegeModal = closeCreateCollegeModal;

/**
 * Load campuses into dropdown
 */
async function loadCampusesForDropdown() {
  try {
    const campusDropdown = document.getElementById('collegeCampus');
    campusDropdown.innerHTML = '<option value="">Loading campuses...</option>';

    const snapshot = await collections.campuses.orderBy('name').get();

    campusDropdown.innerHTML = '<option value="">Select Campus</option>';

    snapshot.forEach(doc => {
      const campus = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = campus.name;
      campusDropdown.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading campuses:', error);
    const campusDropdown = document.getElementById('collegeCampus');
    campusDropdown.innerHTML = '<option value="">Error loading campuses</option>';
  }
}

/**
 * Close create college modal
 */
function closeCreateCollegeModal() {
  const modal = document.getElementById('createCollegeModal');
  modal.classList.remove('active');
}

/**
 * Show error message
 */
function showCollegeError(message) {
  const errorMsg = document.getElementById('collegeErrorMessage');
  const errorText = document.getElementById('errorText');
  errorText.textContent = message;
  errorMsg.classList.add('show');
  // Scroll to top to show error
  document.querySelector('.college-modal-body').scrollTop = 0;
}

/**
 * Show success message
 */
function showCollegeSuccess(message) {
  const successMsg = document.getElementById('collegeSuccessMessage');
  const successText = document.getElementById('successText');
  const errorMsg = document.getElementById('collegeErrorMessage');

  errorMsg.classList.remove('show');
  successText.textContent = message;
  successMsg.classList.add('show');
}

/**
 * Check if college code already exists
 */
async function checkDuplicateCollegeCode(code) {
  try {
    const snapshot = await collections.colleges
      .where('code', '==', code.toUpperCase())
      .get();
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking duplicate code:', error);
    return false;
  }
}

/**
 * Setup College Form
 */
function setupCollegeForm() {
  const form = document.getElementById('createCollegeForm');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('createCollegeBtn');
    const errorMsg = document.getElementById('collegeErrorMessage');
    const successMsg = document.getElementById('collegeSuccessMessage');

    // Hide previous messages
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    // Get form values
    const collegeId = form.dataset.collegeId;
    const name = document.getElementById('collegeName').value.trim();
    const code = document.getElementById('collegeCode').value.trim().toUpperCase();
    const campus_id = document.getElementById('collegeCampus').value;
    const type = document.getElementById('collegeType').value;
    const address = document.getElementById('collegeAddress').value.trim();

    // Validation
    if (!name) {
      showCollegeError('College Name is required');
      return;
    }

    if (!code) {
      showCollegeError('College Code is required');
      return;
    }

    if (!campus_id) {
      showCollegeError('Please select a campus');
      return;
    }

    if (!type) {
      showCollegeError('Please select college type');
      return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';

    try {
      // Check for duplicate code (exclude current if editing)
      const duplicateSnapshot = await collections.colleges
        .where('code', '==', code)
        .get();

      const isDuplicate = duplicateSnapshot.docs.some(doc => doc.id !== collegeId);

      if (isDuplicate) {
        showCollegeError(`College Code "${code}" already exists. Please use a unique code.`);
        submitBtn.disabled = false;
        submitBtn.textContent = collegeId ? 'Update College' : 'Create College';
        return;
      }

      submitBtn.textContent = collegeId ? 'Updating...' : 'Creating...';

      const collegeData = {
        name: name,
        code: code,
        campus_id: campus_id,
        type: type,
        address: address || '',
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (collegeId) {
        // Update existing college
        await collections.colleges.doc(collegeId).update(collegeData);
        showCollegeSuccess(`College "${name}" updated successfully!`);
      } else {
        // Create new college
        collegeData.courses_count = 0;
        collegeData.departments_count = 0;
        collegeData.created_at = firebase.firestore.FieldValue.serverTimestamp();
        await collections.colleges.add(collegeData);
        showCollegeSuccess(`College "${name}" created successfully!`);

        // Update campus college count
        await updateCampusCollegeCount(campus_id);
      }

      // Reset form
      form.reset();

      // Reload colleges list
      await loadCollegesList();

      // Reload dashboard stats
      await loadDashboardStats();

      // Close modal after 2 seconds
      setTimeout(() => {
        closeCreateCollegeModal();
      }, 2000);

    } catch (error) {
      console.error('Error saving college:', error);
      showCollegeError('Failed to save college. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = collegeId ? 'Update College' : 'Create College';
    }
  });
}

/**
 * Delete college
 */
async function deleteCollege(collegeId, collegeName) {
  try {
    // Check if college has courses or departments
    const coursesSnapshot = await collections.courses
      .where('college_id', '==', collegeId)
      .get();

    const deptSnapshot = await collections.departments
      .where('college_id', '==', collegeId)
      .get();

    if (!coursesSnapshot.empty || !deptSnapshot.empty) {
      alert(`Cannot delete "${collegeName}" because it has ${coursesSnapshot.size} course(s) and ${deptSnapshot.size} department(s). Please delete them first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${collegeName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    // Get campus_id before deleting
    const collegeDoc = await collections.colleges.doc(collegeId).get();
    const campus_id = collegeDoc.data().campus_id;

    await collections.colleges.doc(collegeId).delete();
    alert(`College "${collegeName}" deleted successfully!`);

    // Update campus college count
    await updateCampusCollegeCount(campus_id);

    // Reload list
    await loadCollegesList();
    await loadDashboardStats();

  } catch (error) {
    console.error('Error deleting college:', error);
    alert('Failed to delete college. Please try again.');
  }
}

// Make globally accessible
window.deleteCollege = deleteCollege;

/**
 * Update campus college count
 */
async function updateCampusCollegeCount(campusId) {
  try {
    const collegesSnapshot = await collections.colleges
      .where('campus_id', '==', campusId)
      .get();

    await collections.campuses.doc(campusId).update({
      colleges_count: collegesSnapshot.size
    });
  } catch (error) {
    console.error('Error updating campus stats:', error);
  }
}

function editCollege(id) {
  showToast('Edit College - Coming soon!', 'info');
}

function viewCollege(id) {
  showToast('View College - Coming soon!', 'info');
}

// ============================================
// SYSTEM ROLES
// ============================================

/**
 * Predefined system roles
 */
const SYSTEM_ROLES = [
  {
    id: 'system_admin',
    name: 'System Administrator',
    description: 'Full system access with all permissions',
    icon: '\uD83D\uDC68\u200D\uD83D\uDCBC',
    color: '#E31E24',
    permissions: [
      'Manage all campuses, colleges, courses',
      'Manage departments and roles',
      'View all reports and analytics',
      'System configuration access',
      'User management',
      'Data export and backup'
    ]
  },
  {
    id: 'college_admin',
    name: 'College Administrator',
    description: 'College-level management access',
    icon: '\uD83D\uDC54',
    color: '#2563EB',
    permissions: [
      'Manage assigned college',
      'Manage courses and departments',
      'View college reports',
      'Manage teachers and students',
      'Approve enrollments',
      'Generate college reports'
    ]
  },
  {
    id: 'teacher',
    name: 'Teacher',
    description: 'Teaching and student management',
    icon: '\uD83D\uDC68\u200D\uD83C\uDFEB',
    color: '#10B981',
    permissions: [
      'View assigned courses',
      'Manage student attendance',
      'Grade assignments and exams',
      'View student profiles',
      'Submit academic reports',
      'Communication with students'
    ]
  },
  {
    id: 'student',
    name: 'Student',
    description: 'Student portal access',
    icon: '\uD83C\uDF93',
    color: '#8B5CF6',
    permissions: [
      'View enrolled courses',
      'Access study materials',
      'Submit assignments',
      'View grades and attendance',
      'View academic calendar',
      'Profile management'
    ]
  }
];

/**
 * Show System Roles
 */
function showSystemRoles() {
  currentView = 'roles';
  document.getElementById('pageTitle').textContent = 'System Roles';

  resetAllViews();
  updateSidebarActiveState('roles');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">System Roles</span>
    </div>

    <div class="info-badge" style="margin-bottom: 1.5rem;">
      \u2139\uFE0F  These are predefined system roles. Each role has specific permissions and access levels.
    </div>

    <div class="management-grid" id="rolesContainer">
      ${SYSTEM_ROLES.map(role => `
        <div class="management-card" style="border-left: 4px solid ${role.color};">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${role.icon}</div>
          <h3 class="management-card-title">${role.name}</h3>
          <p class="management-card-desc">${role.description}</p>
          
          <div style="margin-top: 1.5rem;">
            <h4 style="font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem;">
              \uD83D\uDD12 Permissions:
            </h4>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${role.permissions.map(perm => `
                <li style="padding: 0.5rem 0; font-size: 0.875rem; color: #6B7280; display: flex; align-items: start; gap: 0.5rem;">
                  <span style="color: ${role.color}; flex-shrink: 0;">\u2714\uFE0F</span>
                  <span>${perm}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #E5E7EB;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #9CA3AF;">
              <span>\uD83D\uDC65</span>
              <span>Role ID: <code style="background: #F3F4F6; padding: 0.125rem 0.375rem; border-radius: 4px;">${role.id}</code></span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================
// REPORTS
// ============================================

/**
 * Show Reports
 */
function showReports() {
  currentView = 'reports';
  document.getElementById('pageTitle').textContent = 'Reports & Analytics';

  resetAllViews();
  updateSidebarActiveState('reports');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Reports</span>
    </div>

    <h3 style="margin-bottom: 1.5rem; color: #374151;">\uD83D\uDCCA System Statistics</h3>

    <div class="stats-grid" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #E31E24, #c71a1f);">\uD83C\uDFDB\uFE0F</div>
        <div class="stat-info">
          <div class="stat-label">Total Campuses</div>
          <div class="stat-value" id="reportCampusCount">0</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #2563EB, #1d4ed8);">\uD83C\uDF93</div>
        <div class="stat-info">
          <div class="stat-label">Total Colleges</div>
          <div class="stat-value" id="reportCollegeCount">0</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #10B981, #059669);">\uD83D\uDCDA</div>
        <div class="stat-info">
          <div class="stat-label">Total Courses</div>
          <div class="stat-value" id="reportCourseCount">0</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #F59E0B, #d97706);">\uD83C\uDFE2</div>
        <div class="stat-info">
          <div class="stat-label">Total Departments</div>
          <div class="stat-value" id="reportDeptCount">0</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>\uD83D\uDCC8 Data Export</h3>
      </div>
      <div class="card-body">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <button class="btn btn-outline" id="btnExportCSV" onclick="exportReport('csv')">
            \uD83D\uDCC4 Export as CSV
          </button>
          <button class="btn btn-outline" id="btnExportPDF" onclick="exportReport('pdf')">
            \uD83D\uDCD1 Export as PDF
          </button>
          <button class="btn btn-outline" id="btnExportJSON" onclick="exportReport('json')">
            \uD83D\uDCBE Export as JSON
          </button>
        </div>
      </div>
    </div>
  `;

  // Load stats
  loadReportStats();
}

/**
 * Load report statistics
 */
async function loadReportStats() {
  try {
    const campusSnap = await collections.campuses.get();
    const collegeSnap = await collections.colleges.get();
    const courseSnap = await collections.courses.get();
    const deptSnap = await collections.departments.get();

    document.getElementById('reportCampusCount').textContent = campusSnap.size;
    document.getElementById('reportCollegeCount').textContent = collegeSnap.size;
    document.getElementById('reportCourseCount').textContent = courseSnap.size;
    document.getElementById('reportDeptCount').textContent = deptSnap.size;
  } catch (error) {
    console.error('Error loading report stats:', error);
  }
}

/**
 * Export Report Data
 */
async function exportReport(type) {
  const btn = document.getElementById(`btnExport${type.toUpperCase()}`);
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Exporting...`;

  try {
    // Fetch all data
    const [campuses, colleges, courses, departments] = await Promise.all([
      collections.campuses.get(),
      collections.colleges.get(),
      collections.courses.get(),
      collections.departments.get()
    ]);

    const data = {
      stats: {
        campuses: campuses.size,
        colleges: colleges.size,
        courses: courses.size,
        departments: departments.size,
        generated_at: new Date().toISOString()
      },
      items: {
        campuses: campuses.docs.map(d => d.data()),
        colleges: colleges.docs.map(d => d.data()),
        courses: courses.docs.map(d => d.data()),
        departments: departments.docs.map(d => d.data())
      }
    };

    if (type === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadFile(blob, `bdcs_report_${new Date().toISOString().slice(0, 10)}.json`);
    } else if (type === 'csv') {
      let csvContent = "TYPE,NAME,CODE,DETAILS\n";

      // Campuses
      data.items.campuses.forEach(i => csvContent += `CAMPUS,"${i.name}",${i.code || '-'},-\n`);
      // Colleges
      data.items.colleges.forEach(i => csvContent += `COLLEGE,"${i.name}",${i.code || '-'},CampusID:${i.campus_id}\n`);
      // Departments
      data.items.departments.forEach(i => csvContent += `DEPARTMENT,"${i.name}",${i.code || '-'},CollegeID:${i.college_id}\n`);
      // Courses
      data.items.courses.forEach(i => csvContent += `COURSE,"${i.name}",${i.code || '-'},CollegeID:${i.college_id}\n`);

      const blob = new Blob([csvContent], { type: 'text/csv' });
      downloadFile(blob, `bdcs_report_${new Date().toISOString().slice(0, 10)}.csv`);
    } else if (type === 'pdf') {
      window.print(); // Simple fallback for now
    }

  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ============================================
// SETTINGS
// ============================================

/**
 * Show Settings
 */
function showSettings() {
  currentView = 'settings';
  document.getElementById('pageTitle').textContent = 'System Settings';

  resetAllViews();
  updateSidebarActiveState('settings');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  const user = firebase.auth().currentUser;

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Settings</span>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <h3>\uD83D\uDC64 Profile Information</h3>
      </div>
      <div class="card-body">
        <div style="display: grid; gap: 1rem;">
          <div>
            <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 0.5rem;">Name</label>
            <div style="color: #6B7280;">${user?.displayName || 'Not set'}</div>
          </div>
          <div>
            <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 0.5rem;">Email</label>
            <div style="color: #6B7280;">${user?.email || 'Not set'}</div>
          </div>
          <div>
            <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 0.5rem;">Role</label>
            <div style="color: #6B7280;">System Administrator</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-header">
        <h3>\u2699\uFE0F System Information</h3>
      </div>
      <div class="card-body">
        <div style="display: grid; gap: 1rem;">
          <div>
            <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 0.5rem;">System Name</label>
            <div style="color: #6B7280;">Biyani Digital Campus System (BDCS)</div>
          </div>
          <div>
            <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 0.5rem;">Version</label>
            <div style="color: #6B7280;">1.0.0</div>
          </div>
          <div>
            <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 0.5rem;">Database</label>
            <div style="color: #6B7280;">Firebase Firestore</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>\uD83D\uDD10 Account Actions</h3>
      </div>
      <div class="card-body">
        <button class="btn btn-outline" onclick="alert('Change password feature - Coming soon!')" style="margin-right: 1rem;">
          \uD83D\uDD11 Change Password
        </button>
        <button class="btn btn-danger" onclick="if(confirm('Are you sure you want to logout?')) logout()">
          \uD83D\uDEAA Logout
        </button>
      </div>
    </div>
  `;
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Make all navigation functions globally accessible
window.showDashboard = showDashboard;
window.showCampusManagement = showCampusManagement;
window.showCollegeManagement = showCollegeManagement;
window.showCourseManagement = showCourseManagement;
window.showDepartmentManagement = showDepartmentManagement;
window.showReports = showReports;
window.showSettings = showSettings;

// ============================================
// COURSE MANAGEMENT
// ============================================

/**
 * Show Course Management
 */
function showCourseManagement() {
  currentView = 'courses';
  document.getElementById('pageTitle').textContent = 'Course Management';

  resetAllViews();
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
            <div class="empty-state-icon">\uD83D\uDCDA</div>
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
          <div class="management-card-icon">\uD83D\uDCD8</div>
          <h3 class="management-card-title">${course.name || 'N/A'}</h3>
          <p class="management-card-desc">${collegeName}</p>
          <div class="management-card-meta">
            <span class="badge">Code: ${course.code || 'N/A'}</span>
            <span class="badge">${course.degree_type || 'N/A'}</span>
            <span class="badge">${course.course_type || 'Semester'}</span>
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
            <button class="btn btn-outline btn-sm" onclick="showCourseModal('${doc.id}')">\u270F\uFE0F Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCourse('${doc.id}', '${course.name}', '${course.college_id}')">\uD83D\uDDD1\uFE0F Delete</button>
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
        document.getElementById('courseCourseType').value = course.course_type || 'Semester';
        document.getElementById('courseDuration').value = course.duration;
        document.getElementById('courseDescription').value = course.description || '';

        // Load colleges first, then set value
        await loadCollegesForCourseDropdown();
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
    await loadCollegesForCourseDropdown();
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

/**
 * Show course error
 */
function showCourseError(message) {
  const errorMsg = document.getElementById('courseErrorMessage');
  const errorText = document.getElementById('courseErrorText');
  errorText.textContent = message;
  errorMsg.classList.add('show');
  document.querySelector('#courseModal .college-modal-body').scrollTop = 0;
}

/**
 * Show course success
 */
function showCourseSuccess(message) {
  const successMsg = document.getElementById('courseSuccessMessage');
  const successText = document.getElementById('courseSuccessText');
  const errorMsg = document.getElementById('courseErrorMessage');

  errorMsg.classList.remove('show');
  successText.textContent = message;
  successMsg.classList.add('show');
}

/**
 * Setup Course Form
 */
function setupCourseForm() {
  const form = document.getElementById('courseForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('courseSubmitBtn');
    const courseId = document.getElementById('courseId').value;
    const name = document.getElementById('courseName').value.trim();
    const code = document.getElementById('courseCode').value.trim().toUpperCase();
    const college_id = document.getElementById('courseCollege').value;
    const degree_type = document.getElementById('courseDegreeType').value;
    const course_type = document.getElementById('courseCourseType').value;
    const duration = document.getElementById('courseDuration').value;
    const description = document.getElementById('courseDescription').value.trim();

    // Validation
    if (!name || !code || !college_id || !degree_type || !course_type || !duration) {
      showCourseError('Please fill all required fields');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';

    try {
      // Check duplicate code
      const duplicateSnapshot = await collections.courses
        .where('code', '==', code)
        .get();

      const isDuplicate = duplicateSnapshot.docs.some(doc => doc.id !== courseId);

      if (isDuplicate) {
        showCourseError(`Course Code "${code}" already exists.`);
        submitBtn.disabled = false;
        submitBtn.textContent = courseId ? 'Update Course' : 'Create Course';
        return;
      }

      submitBtn.textContent = courseId ? 'Updating...' : 'Creating...';

      const courseData = {
        name,
        code,
        college_id,
        degree_type,
        course_type,
        duration: parseInt(duration),
        description: description || '',
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (courseId) {
        // Update
        await collections.courses.doc(courseId).update(courseData);
        showCourseSuccess(`Course "${name}" updated successfully!`);
      } else {
        // Create
        courseData.created_at = firebase.firestore.FieldValue.serverTimestamp();
        await collections.courses.add(courseData);
        showCourseSuccess(`Course "${name}" created successfully!`);

        // Update college course count
        await collections.colleges.doc(college_id).update({
          courses_count: firebase.firestore.FieldValue.increment(1)
        });
      }

      form.reset();
      await loadCoursesCards();
      await loadDashboardStats();

      setTimeout(() => closeCourseModal(), 2000);

    } catch (error) {
      console.error('Error saving course:', error);
      showCourseError('Failed to save course. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = courseId ? 'Update Course' : 'Create Course';
    }
  });
}

/**
 * Delete course
 */
async function deleteCourse(courseId, courseName, college_id) {
  try {
    if (!confirm(`Are you sure you want to delete "${courseName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    await collections.courses.doc(courseId).delete();
    alert(`Course "${courseName}" deleted successfully!`);

    // Update college course count
    await collections.colleges.doc(college_id).update({
      courses_count: firebase.firestore.FieldValue.increment(-1)
    });

    await loadCoursesCards();
    await loadDashboardStats();

  } catch (error) {
    console.error('Error deleting course:', error);
    alert('Failed to delete course. Please try again.');
  }
}

// Make functions globally accessible
window.showCourseModal = showCourseModal;
window.closeCourseModal = closeCourseModal;
window.deleteCourse = deleteCourse;

// ============================================
// DEPARTMENT MANAGEMENT
// ============================================

/**
 * Show Department Management
 */
function showDepartmentManagement() {
  currentView = 'departments';
  document.getElementById('pageTitle').textContent = 'Department Management';

  resetAllViews();
  updateSidebarActiveState('departments');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Departments</span>
    </div>

    <div class="action-toolbar">
      <div class="toolbar-search">
        <input type="text" placeholder="Search departments..." id="departmentSearch">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" onclick="showDepartmentModal()">+ Create Department</button>
      </div>
    </div>

    <div class="management-grid" id="departmentListContainer">
      <div style="text-align: center; padding: 2rem;">
        <div class="spinner"></div>
        Loading departments...
      </div>
    </div>
  `;

  loadDepartmentsCards();
}

/**
 * Load departments as cards
 */
async function loadDepartmentsCards() {
  try {
    const snapshot = await collections.departments.get();
    const container = document.getElementById('departmentListContainer');

    if (snapshot.empty) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <div class="empty-state">
            <div class="empty-state-icon">\uD83C\uDFE2</div>
            <h3>No Departments Yet</h3>
            <p>Create your first department to get started</p>
            <button class="btn btn-primary" onclick="showDepartmentModal()">+ Create Department</button>
          </div>
        </div>
      `;
      return;
    }

    const deptCards = await Promise.all(snapshot.docs.map(async doc => {
      const dept = doc.data();

      // Get college name
      // Get college and course names
      // Get college and course names
      let collegeName = 'Unknown College';
      let campusName = 'Unknown Campus';
      let courseNames = [];

      try {
        const collegeDoc = await collections.colleges.doc(dept.college_id).get();
        if (collegeDoc.exists) {
          const colData = collegeDoc.data();
          collegeName = colData.name;

          // Get Campus Name
          if (colData.campus_id) {
            const campusDoc = await collections.campuses.doc(colData.campus_id).get();
            if (campusDoc.exists) {
              campusName = campusDoc.data().name;
            }
          }
        }

        // Handle multiple courses
        let courseIds = [];
        if (dept.course_ids && Array.isArray(dept.course_ids)) {
          courseIds = dept.course_ids;
        } else if (dept.course_id) {
          courseIds = [dept.course_id];
        }

        if (courseIds.length > 0) {
          const batches = [];
          while (courseIds.length) {
            const batch = courseIds.splice(0, 10);
            if (batch.length > 0) {
              const promises = batch.map(id => collections.courses.doc(id).get());
              const docs = await Promise.all(promises);
              docs.forEach(d => {
                if (d.exists) courseNames.push(d.data().name);
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      }

      const statusColor = dept.status === 'inactive' ? '#9CA3AF' : '#10B981';
      const statusText = dept.status === 'inactive' ? 'Inactive' : 'Active';

      const courseTags = courseNames.length > 0
        ? courseNames.map(c => `<span style="background: #EFF6FF; color: #3B82F6; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; border: 1px solid #DBEAFE;">${c}</span>`).join(' ')
        : '<span style="color: #9CA3AF; font-style: italic; font-size: 0.875rem;">No courses assigned</span>';

      return `
        <div class="management-card" style="display: flex; flex-direction: column; gap: 1rem; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${statusColor};"></div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                 <span style="font-size: 0.75rem; font-weight: 700; background: #F3F4F6; padding: 4px 8px; border-radius: 6px; color: #374151; letter-spacing: 0.05em;">${dept.code || 'CODE'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 500; color: ${statusColor};">
                <span style="width: 8px; height: 8px; background: ${statusColor}; border-radius: 50%;"></span>
                ${statusText}
            </div>
          </div>

          <div>
             <h3 class="management-card-title" style="margin-bottom: 0.5rem; font-size: 1.125rem;">${dept.name || 'N/A'}</h3>
             
             <div style="display: flex; align-items: center; gap: 6px; color: #6B7280; font-size: 0.875rem; line-height: 1.4;">
                <span>🏛️</span>
                <span>${campusName}</span>
                <span style="color: #D1D5DB;">›</span>
                <span>${collegeName}</span>
             </div>
          </div>

          <div style="background: #F9FAFB; padding: 0.75rem; border-radius: 8px; border: 1px solid #F3F4F6;">
             <div style="font-size: 0.75rem; font-weight: 600; color: #6B7280; margin-bottom: 0.5rem; text-transform: uppercase;">Courses Offered</div>
             <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${courseTags}
             </div>
          </div>

          ${dept.hod ? `
            <div style="display: flex; align-items: center; gap: 10px; padding-top: 0.5rem; border-top: 1px dashed #E5E7EB;">
                <div style="width: 32px; height: 32px; background: #EEF2FF; color: #4F46E5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem;">👤</div>
                <div>
                    <div style="font-size: 0.75rem; color: #6B7280;">Head of Department</div>
                    <div style="font-size: 0.875rem; font-weight: 600; color: #1F2937;">${dept.hod}</div>
                </div>
            </div>
          ` : ''}

          <div class="management-card-actions" style="margin-top: auto; padding-top: 1rem;">
            <button class="btn btn-outline btn-sm" style="flex: 1; justify-content: center;" onclick="showDepartmentModal('${doc.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" style="flex: 1; justify-content: center;" onclick="deleteDepartment('${doc.id}', '${dept.name}', '${dept.college_id}')">Delete</button>
          </div>
        </div>
      `;
    }));

    container.innerHTML = deptCards.join('');

  } catch (error) {
    console.error('Error loading departments:', error);
    document.getElementById('departmentListContainer').innerHTML = `
      <div style="grid-column: 1/-1; color: var(--error); text-align: center; padding: 2rem;">
        Error loading departments. ${error.message}
      </div>
    `;
  }
}

/**
 * Show department modal
 */
async function showDepartmentModal(deptId = null) {
  const modal = document.getElementById('departmentModal');
  const form = document.getElementById('departmentForm');
  const title = document.getElementById('departmentModalTitle');
  const submitBtn = document.getElementById('departmentSubmitBtn');
  const errorMsg = document.getElementById('departmentErrorMessage');
  const successMsg = document.getElementById('departmentSuccessMessage');

  // Reset
  form.reset();
  errorMsg.classList.remove('show');
  successMsg.classList.remove('show');
  document.getElementById('departmentId').value = '';
  document.getElementById('departmentCoursesContainer').innerHTML = '<div style="color: #6B7280; font-size: 0.875rem; text-align: center; padding: 1rem;">Select college first...</div>';

  if (deptId) {
    // Edit mode
    title.textContent = 'Edit Department';
    submitBtn.textContent = 'Update Department';

    try {
      const doc = await collections.departments.doc(deptId).get();
      if (doc.exists) {
        const dept = doc.data();
        document.getElementById('departmentId').value = deptId;
        document.getElementById('departmentName').value = dept.name;
        document.getElementById('departmentCode').value = dept.code;
        document.getElementById('departmentHOD').innerHTML = '<option value="">Loading...</option>'; // Will be refilled
        document.getElementById('departmentStatus').value = dept.status || 'active';
        document.getElementById('departmentDescription').value = dept.description || '';

        await loadCollegesForDepartmentDropdown();
        document.getElementById('departmentCollege').value = dept.college_id;

        // Load courses and set selected (Handle multiple)
        // Pass the saved course IDs to the handler to pre-select them
        let savedCourseIds = [];
        if (dept.course_ids && Array.isArray(dept.course_ids)) {
          savedCourseIds = dept.course_ids;
        } else if (dept.course_id) {
          savedCourseIds = [dept.course_id];
        }

        await handleDepartmentCollegeChange(savedCourseIds);

        // Load HODs
        await loadPotentialHODs(dept.college_id);
        if (dept.hod) {
          // Use a timeout to ensure options are loaded or handled
          // Simpler: Just set it, logic in loadPotentialHODs handles matching value
          setTimeout(() => {
            document.getElementById('departmentHOD').value = dept.hod;
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error loading department:', error);
    }
  } else {
    // Create mode
    title.textContent = 'Create New Department';
    submitBtn.textContent = 'Create Department';
    await loadCollegesForDepartmentDropdown();
  }

  modal.classList.add('active');
}

/**
 * Close department modal
 */
function closeDepartmentModal() {
  document.getElementById('departmentModal').classList.remove('active');
}

/**
 * Load colleges for department dropdown
 */
async function loadCollegesForDepartmentDropdown() {
  try {
    const dropdown = document.getElementById('departmentCollege');
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
    const dropdown = document.getElementById('departmentCollege');
    dropdown.innerHTML = '<option value="">Error loading colleges</option>';
  }
}

/**
 * Handle Department College Change - Load Courses
 */
/**
 * Handle Department College Change - Load Courses (Multi-select)
 * @param {Array} selectedIds - Optional array of course IDs to pre-select
 */
async function handleDepartmentCollegeChange(selectedIds = []) {
  const collegeId = document.getElementById('departmentCollege').value;
  const container = document.getElementById('departmentCoursesContainer');

  if (!collegeId) {
    container.innerHTML = '<div style="color: #6B7280; font-size: 0.875rem; text-align: center; padding: 1rem;">Select college first...</div>';
    return;
  }

  try {
    container.innerHTML = '<div class="spinner"></div> Loading courses...';

    const snapshot = await collections.courses
      .where('college_id', '==', collegeId)
      .get();

    // Load potential HODs
    loadPotentialHODs(collegeId);

    if (snapshot.empty) {
      container.innerHTML = '<div style="color: #6B7280; font-size: 0.875rem; text-align: center; padding: 1rem;">No courses found for this college.</div>';
      return;
    }

    // Client-side sort
    const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    container.innerHTML = ''; // Clear loading

    courses.forEach(course => {
      const isChecked = selectedIds.includes(course.id) ? 'checked' : '';

      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: start; gap: 0.75rem; padding: 0.5rem; border-bottom: 1px solid #F3F4F6;';
      item.innerHTML = `
        <input type="checkbox" name="deptCourses" value="${course.id}" id="c_${course.id}" ${isChecked} style="margin-top: 0.25rem;">
        <label for="c_${course.id}" style="font-size: 0.9rem; color: #374151; cursor: pointer; line-height: 1.4;">
            <div style="font-weight: 500;">${course.name}</div>
            <div style="font-size: 0.75rem; color: #6B7280;">Code: ${course.code}</div>
        </label>
      `;
      container.appendChild(item);
    });

  } catch (error) {
    console.error('Error loading courses:', error);
    container.innerHTML = '<div style="color: red; font-size: 0.875rem; text-align: center; padding: 1rem;">Error loading courses</div>';
  }
}

// Make functions globally accessible
window.showDepartmentModal = showDepartmentModal;
window.closeDepartmentModal = closeDepartmentModal;
window.handleDepartmentCollegeChange = handleDepartmentCollegeChange;

/**
 * Load potential HODs for dropdown
 */
async function loadPotentialHODs(collegeId) {
  const dropdown = document.getElementById('departmentHOD');
  dropdown.innerHTML = '<option value="">Loading staff...</option>';

  try {
    // Get users with role 'teacher' or 'hod' in this college
    // Note: 'in' query supports up to 10 values
    const snapshot = await collections.system_users
      .where('college_id', '==', collegeId)
      .where('role', 'in', ['teacher', 'hod'])
      .get();

    dropdown.innerHTML = '<option value="">Select Staff Member...</option>';

    if (snapshot.empty) {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = 'No eligible staff found';
      dropdown.appendChild(option);
      return;
    }

    // Sort by name
    const users = snapshot.docs.map(doc => ({ id: doc.data().full_name, name: doc.data().full_name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.name; // Storing Name as HOD value to match current schema (string name)
      option.textContent = user.name;
      dropdown.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading potential HODs:', error);
    dropdown.innerHTML = '<option value="">Error loading staff</option>';
  }
}

/**
 * Show department error
 */
function showDepartmentError(message) {
  const errorMsg = document.getElementById('departmentErrorMessage');
  const errorText = document.getElementById('departmentErrorText');
  errorText.textContent = message;
  errorMsg.classList.add('show');
  document.querySelector('#departmentModal .college-modal-body').scrollTop = 0;
}

/**
 * Show department success
 */
function showDepartmentSuccess(message) {
  const successMsg = document.getElementById('departmentSuccessMessage');
  const successText = document.getElementById('departmentSuccessText');
  const errorMsg = document.getElementById('departmentErrorMessage');

  errorMsg.classList.remove('show');
  successText.textContent = message;
  successMsg.classList.add('show');
}

/**
 * Setup Department Form
 */
function setupDepartmentForm() {
  const form = document.getElementById('departmentForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('departmentSubmitBtn');
    const deptId = document.getElementById('departmentId').value;
    const name = document.getElementById('departmentName').value.trim();
    const code = document.getElementById('departmentCode').value.trim().toUpperCase();
    const college_id = document.getElementById('departmentCollege').value;

    // Get all checked courses
    const selectedCourses = Array.from(document.querySelectorAll('input[name="deptCourses"]:checked')).map(cb => cb.value);

    const hod = document.getElementById('departmentHOD').value.trim();
    const status = document.getElementById('departmentStatus').value;
    const description = document.getElementById('departmentDescription').value.trim();

    // Validation
    if (!name || !code || !college_id) {
      showDepartmentError('Please fill all required fields');
      return;
    }

    if (selectedCourses.length === 0) {
      showDepartmentError('Please select at least one course');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const deptData = {
        name,
        code,
        college_id,
        course_ids: selectedCourses, // Save array
        course_id: selectedCourses[0], // Backward compatibility: ensure legacy field has value
        hod: hod || null,
        status: status || 'active',
        description: description || null,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (deptId) {
        // Update
        await collections.departments.doc(deptId).update(deptData);
        showDepartmentSuccess(`Department "${name}" updated successfully!`);
      } else {
        // Create
        deptData.created_at = firebase.firestore.FieldValue.serverTimestamp();
        await collections.departments.add(deptData);
        showDepartmentSuccess(`Department "${name}" created successfully!`);
      }

      form.reset();
      await loadDepartmentsCards();

      setTimeout(() => closeDepartmentModal(), 2000);

    } catch (error) {
      console.error('Error saving department:', error);
      showDepartmentError('Failed to save department. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = deptId ? 'Update Department' : 'Create Department';
    }
  });
}

/**
 * Delete department
 */
async function deleteDepartment(deptId, deptName, college_id) {
  try {
    if (!confirm(`Are you sure you want to delete "${deptName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    await collections.departments.doc(deptId).delete();
    alert(`Department "${deptName}" deleted successfully!`);

    // Update college department count
    await collections.colleges.doc(college_id).update({
      departments_count: firebase.firestore.FieldValue.increment(-1)
    });

    await loadDepartmentsCards();
    await loadDashboardStats();

  } catch (error) {
    console.error('Error deleting department:', error);
    alert('Failed to delete department. Please try again.');
  }
}

window.deleteDepartment = deleteDepartment;

// ============================================
// SYSTEM SETTINGS
// ============================================

/**
 * Show Settings
 */
async function showSettings() {
  currentView = 'settings';
  document.getElementById('pageTitle').textContent = 'System Settings';
  document.getElementById('dashboardView').style.display = 'none';
  updateSidebarActiveState('settings');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'none'; // Settings has its own view div in HTML

  // Show the settings view
  document.getElementById('view-settings').style.display = 'block';

  // Load settings
  try {
    const doc = await collections.settings.doc('system_config').get();
    if (doc.exists) {
      const config = doc.data();
      if (config.academic_year) document.getElementById('settingAcademicYear').value = config.academic_year;
      if (config.system_name) document.getElementById('settingSystemName').value = config.system_name;
      if (config.min_password_length) document.getElementById('settingPasswordLength').value = config.min_password_length;
      if (config.max_login_attempts) document.getElementById('settingLoginAttempts').value = config.max_login_attempts;
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

/**
 * Save Settings
 */
async function saveSettings() {
  const academic_year = document.getElementById('settingAcademicYear').value;
  const system_name = document.getElementById('settingSystemName').value;
  const min_password_length = document.getElementById('settingPasswordLength').value;
  const max_login_attempts = document.getElementById('settingLoginAttempts').value;

  try {
    await collections.settings.doc('system_config').set({
      academic_year,
      system_name,
      min_password_length: parseInt(min_password_length),
      max_login_attempts: parseInt(max_login_attempts),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    alert('✅ Settings saved successfully!');
  } catch (err) {
    console.error('Error saving settings:', err);
    alert('❌ Failed to save settings.');
  }
}

// Make globally accessible
window.showSettings = showSettings;
window.saveSettings = saveSettings;
// ============================================
// MANAGE SYSTEM USERS
// ============================================

/**
 * Show Manage System Users
 */
function showManageSystemUsers() {
  currentView = 'manage_users';
  document.getElementById('pageTitle').textContent = 'Manage System Users';

  resetAllViews();
  updateSidebarActiveState('manage_users');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Manage System Users</span>
    </div>

    <div class="info-badge" style="margin-bottom: 1.5rem;">
      ℹ️ Create and manage user accounts with role assignments. Each role has specific scope requirements.
    </div>

    <div class="action-toolbar">
      <div class="toolbar-search">
        <input type="text" placeholder="Search users..." id="userSearch">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline" onclick="showBulkImportModal()">📤 Bulk Import</button>
        <button class="btn btn-primary" onclick="showSystemUserModal()">+ Create System User</button>
      </div>
    </div>

    <div class="management-grid" id="systemUsersListContainer">
      <div style="text-align: center; padding: 2rem;">
        <div class="spinner"></div>
        Loading system users...
      </div>
    </div>
  `;

  loadSystemUsersCards();
}

/**
 * Load system users as cards
 */
async function loadSystemUsersCards() {
  try {
    const snapshot = await collections.system_users.get();
    const container = document.getElementById('systemUsersListContainer');

    if (snapshot.empty) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <div class="empty-state">
            <div class="empty-state-icon">👨‍💼</div>
            <h3>No System Users Yet</h3>
            <p>Create your first system user to get started</p>
            <button class="btn btn-primary" onclick="showSystemUserModal()">+ Create System User</button>
          </div>
        </div>
      `;
      return;
    }

    const userCards = await Promise.all(snapshot.docs.map(async doc => {
      const user = doc.data();

      // Get campus name if applicable
      let scopeInfo = '';
      if (user.campus_id) {
        try {
          const campusDoc = await collections.campuses.doc(user.campus_id).get();
          if (campusDoc.exists) {
            scopeInfo = campusDoc.data().name;
          }
        } catch (err) {
          console.error('Error fetching campus:', err);
        }
      }

      // Get college name if applicable
      if (user.college_id) {
        try {
          const collegeDoc = await collections.colleges.doc(user.college_id).get();
          if (collegeDoc.exists) {
            scopeInfo += ` › ${collegeDoc.data().name}`;
          }
        } catch (err) {
          console.error('Error fetching college:', err);
        }
      }

      // Get department name for HOD and Teacher
      if (['hod', 'teacher'].includes(user.role) && user.department_id) {
        try {
          const deptDoc = await collections.departments.doc(user.department_id).get();
          if (deptDoc.exists) {
            scopeInfo += ` › ${deptDoc.data().name}`;
          }
        } catch (err) {
          console.error('Error fetching department:', err);
        }
      }

      const roleNames = {
        'director': 'Director',
        'principal': 'Principal',
        'exam_cell': 'Exam Cell Head',
        'placement': 'Placement Officer',
        'hr': 'HR Manager',
        'hod': 'HOD',
        'teacher': 'Teacher'
      };

      const roleIcons = {
        'director': '👔',
        'principal': '🎓',
        'exam_cell': '📋',
        'placement': '💼',
        'hr': '👥',
        'hod': '🏢',
        'teacher': '👨‍🏫'
      };

      const statusBadge = user.status === 'active'
        ? '<span class="badge" style="background: #10B981; color: white;">Active</span>'
        : '<span class="badge" style="background: #6B7280; color: white;">Inactive</span>';

      return `
        <div class="management-card">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${roleIcons[user.role] || '👤'}</div>
          <h3 class="management-card-title">${user.full_name || 'N/A'}</h3>
          <p class="management-card-desc">${user.email || 'N/A'}</p>
          <div class="management-card-meta">
            <span class="badge">${roleNames[user.role] || user.role}</span>
            ${statusBadge}
          </div>
          ${scopeInfo ? `<div style="margin-top: 0.75rem; font-size: 0.875rem; color: #6B7280;">📍 ${scopeInfo}</div>` : ''}
          <div class="management-card-actions" style="margin-top: 1.5rem;">
            <button class="btn btn-outline btn-sm" onclick="showSystemUserModal('${doc.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSystemUser('${doc.id}', '${user.full_name}')">🗑️ Delete</button>
          </div>
        </div>
      `;
    }));

    container.innerHTML = userCards.join('');

  } catch (error) {
    console.error('Error loading system users:', error);
    document.getElementById('systemUsersListContainer').innerHTML = `
      <div style="grid-column: 1/-1; color: var(--error); text-align: center; padding: 2rem;">
        Error loading system users. ${error.message}
      </div>
    `;
  }
}

/**
 * Show system user modal
 */
async function showSystemUserModal(userId = null) {
  const modal = document.getElementById('systemUserModal');
  const form = document.getElementById('systemUserForm');
  const title = document.getElementById('systemUserModalTitle');
  const submitBtn = document.getElementById('systemUserSubmitBtn');
  const errorMsg = document.getElementById('systemUserErrorMessage');
  const successMsg = document.getElementById('systemUserSuccessMessage');

  // Reset
  form.reset();
  errorMsg.classList.remove('show');
  successMsg.classList.remove('show');
  document.getElementById('systemUserId').value = '';
  document.getElementById('campusFieldRow').style.display = 'none';
  document.getElementById('collegeFieldRow').style.display = 'none';
  document.getElementById('departmentFieldRow').style.display = 'none';
  document.getElementById('roleInfoBox').style.display = 'none';

  if (userId) {
    // Edit mode
    title.textContent = 'Edit System User';
    submitBtn.textContent = 'Update User';

    try {
      const doc = await collections.system_users.doc(userId).get();
      if (doc.exists) {
        const user = doc.data();
        document.getElementById('systemUserId').value = userId;
        document.getElementById('systemUserFullName').value = user.full_name;
        document.getElementById('systemUserEmail').value = user.email;
        document.getElementById('systemUserRole').value = user.role;
        document.getElementById('systemUserStatus').value = user.status;

        // Trigger role change to show appropriate fields
        await handleRoleChange();

        // Set campus/college if applicable
        if (user.campus_id) {
          await loadCampusesForUserDropdown();
          document.getElementById('systemUserCampus').value = user.campus_id;

          if (user.college_id) {
            await handleCampusChange();
            document.getElementById('systemUserCollege').value = user.college_id;

            if (['hod', 'teacher'].includes(user.role) && user.department_id) {
              await handleCollegeChange();
              document.getElementById('systemUserDepartment').value = user.department_id;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  } else {
    // Create mode
    title.textContent = 'Create System User';
    submitBtn.textContent = 'Create User';
  }

  modal.classList.add('active');
}

/**
 * Close system user modal
 */
function closeSystemUserModal() {
  document.getElementById('systemUserModal').classList.remove('active');
}

/**
 * Handle role change - show/hide conditional fields
 */
async function handleRoleChange() {
  const role = document.getElementById('systemUserRole').value;
  const campusRow = document.getElementById('campusFieldRow');
  const collegeRow = document.getElementById('collegeFieldRow');
  const roleInfoBox = document.getElementById('roleInfoBox');
  const roleInfoText = document.getElementById('roleInfoText');
  const campusField = document.getElementById('systemUserCampus');
  const collegeField = document.getElementById('systemUserCollege');
  const departmentField = document.getElementById('systemUserDepartment');

  // Reset
  campusRow.style.display = 'none';
  collegeRow.style.display = 'none';
  document.getElementById('departmentFieldRow').style.display = 'none';

  roleInfoBox.style.display = 'none';
  campusField.removeAttribute('required');
  collegeField.removeAttribute('required');
  departmentField.removeAttribute('required');

  if (!role) return;

  // Role-specific logic
  // Role-specific logic
  if (role === 'director') {
    // Director: No scope needed (System Wide)
    // REVISED PLAN: Strict Level 1 Requirement - Director has NO Scope.
    roleInfoText.textContent = 'Director has full system-wide access. No specific scope assignment required.';
    roleInfoBox.style.display = 'block';

  } else if (role === 'principal') {
    // Principal (College Level): Campus + College required
    campusRow.style.display = 'flex';
    collegeRow.style.display = 'flex';
    campusField.setAttribute('required', 'required');
    collegeField.setAttribute('required', 'required');
    roleInfoText.textContent = 'Principal manages a specific college. Both campus and college selection are required.';
    roleInfoBox.style.display = 'block';

    // Load campuses
    await loadCampusesForUserDropdown();
  } else if (role === 'hod' || role === 'teacher') {
    // HOD & Teacher: Campus + College + Department required
    campusRow.style.display = 'flex';
    collegeRow.style.display = 'flex';
    document.getElementById('departmentFieldRow').style.display = 'flex';

    campusField.setAttribute('required', 'required');
    collegeField.setAttribute('required', 'required');
    document.getElementById('systemUserDepartment').setAttribute('required', 'required');

    const roleName = role === 'hod' ? 'HOD' : 'Teacher';
    roleInfoText.textContent = `${roleName} belongs to a specific department. Campus, College, and Department selection are required.`;
    roleInfoBox.style.display = 'block';

    await loadCampusesForUserDropdown();
  } else if (['exam_cell', 'placement', 'hr'].includes(role)) {
    // Campus-level roles: Campus required, College not needed
    campusRow.style.display = 'flex';
    campusField.setAttribute('required', 'required');

    const roleLabels = {
      'exam_cell': 'Exam Cell',
      'placement': 'Placement Officer',
      'hr': 'HR Manager'
    };
    roleInfoText.textContent = `${roleLabels[role]} manages campus-level operations. Campus selection required.`;
    roleInfoBox.style.display = 'block';

    // Load campuses
    await loadCampusesForUserDropdown();
  }
}

/**
 * Load campuses for user dropdown
 */
async function loadCampusesForUserDropdown() {
  try {
    const dropdown = document.getElementById('systemUserCampus');
    dropdown.innerHTML = '<option value="">Loading campuses...</option>';

    const snapshot = await collections.campuses.orderBy('name').get();
    dropdown.innerHTML = '<option value="">Select Campus</option>';

    snapshot.forEach(doc => {
      const campus = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = campus.name;
      dropdown.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading campuses:', error);
    const dropdown = document.getElementById('systemUserCampus');
    dropdown.innerHTML = '<option value="">Error loading campuses</option>';
  }
}

/**
 * Handle campus change - load colleges for selected campus
 */
async function handleCampusChange() {
  const campusId = document.getElementById('systemUserCampus').value;
  const collegeDropdown = document.getElementById('systemUserCollege');

  if (!campusId) {
    collegeDropdown.innerHTML = '<option value="">Select campus first...</option>';
    return;
  }

  try {
    collegeDropdown.innerHTML = '<option value="">Loading colleges...</option>';

    const snapshot = await collections.colleges
      .where('campus_id', '==', campusId)
      .get();

    // Client-side sort to avoid missing index error
    const colleges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    collegeDropdown.innerHTML = '<option value="">Select College</option>';

    colleges.forEach(college => {
      const option = document.createElement('option');
      option.value = college.id;
      option.textContent = college.name;
      collegeDropdown.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading colleges:', error);
    collegeDropdown.innerHTML = '<option value="">Error loading colleges</option>';
  }
}

/**
 * Handle college change - load departments for selected college
 */
async function handleCollegeChange() {
  const collegeId = document.getElementById('systemUserCollege').value;
  const departmentDropdown = document.getElementById('systemUserDepartment');

  // Only proceed if department row is visible (i.e. role is HOD or Teacher)
  if (document.getElementById('departmentFieldRow').style.display === 'none') return;

  if (!collegeId) {
    departmentDropdown.innerHTML = '<option value="">Select college first...</option>';
    return;
  }

  try {
    departmentDropdown.innerHTML = '<option value="">Loading departments...</option>';

    const snapshot = await collections.departments
      .where('college_id', '==', collegeId)
      .get();

    if (snapshot.empty) {
      departmentDropdown.innerHTML = '<option value="">No departments found</option>';
      return;
    }

    // Client-side sort
    const depts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    departmentDropdown.innerHTML = '<option value="">Select Department</option>';

    depts.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept.id;
      option.textContent = dept.name;
      departmentDropdown.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading departments:', error);
    departmentDropdown.innerHTML = '<option value="">Error loading departments</option>';
  }
}

/**
 * Load departments for user dropdown (helper)
 */
async function loadDepartmentsForUserDropdown() {
  // This is mainly used when editing a user to pre-fill
  // Logic handled in handleCollegeChange usually
  // But we might need it for direct calls
}

/**
 * Show system user error
 */
function showSystemUserError(message) {
  const errorMsg = document.getElementById('systemUserErrorMessage');
  const errorText = document.getElementById('systemUserErrorText');
  errorText.textContent = message;
  errorMsg.classList.add('show');
  document.querySelector('#systemUserModal .college-modal-body').scrollTop = 0;
}

/**
 * Show system user success
 */
function showSystemUserSuccess(message) {
  const successMsg = document.getElementById('systemUserSuccessMessage');
  const successText = document.getElementById('systemUserSuccessText');
  const errorMsg = document.getElementById('systemUserErrorMessage');

  errorMsg.classList.remove('show');
  successText.textContent = message;
  successMsg.classList.add('show');
}

/**
 * Setup System User Form
 */
function setupSystemUserForm() {
  const form = document.getElementById('systemUserForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('systemUserSubmitBtn');
    const userId = document.getElementById('systemUserId').value;
    const full_name = document.getElementById('systemUserFullName').value.trim();
    const email = document.getElementById('systemUserEmail').value.trim();
    const role = document.getElementById('systemUserRole').value;
    const status = document.getElementById('systemUserStatus').value;
    const campus_id = document.getElementById('systemUserCampus').value;
    const college_id = document.getElementById('systemUserCollege').value;

    // Validation
    if (!full_name || !email || !role || !status) {
      showSystemUserError('Please fill all required fields');
      return;
    }

    // Role-specific validation
    if (role === 'director') {
      // Director: No scope validation needed
    } else if (role === 'principal') {
      if (!campus_id || !college_id) {
        showSystemUserError('Principal role requires both campus and college selection');
        return;
      }
    } else if (role === 'hod' || role === 'teacher') {
      const department_id = document.getElementById('systemUserDepartment').value;
      if (!campus_id || !college_id || !department_id) {
        showSystemUserError(`${role.toUpperCase()} role requires Campus, College, and Department selection`);
        return;
      }
    } else if (['exam_cell', 'placement', 'hr'].includes(role)) {
      if (!campus_id) {
        showSystemUserError(`${role} role requires campus selection`);
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = userId ? 'Updating...' : 'Creating User...';

    let secondaryApp = null;

    try {
      const userData = {
        full_name,
        email,
        role,
        status,
        campus_id: campus_id || null,
        college_id: college_id || null,
        department_id: (['hod', 'teacher'].includes(role) ? document.getElementById('systemUserDepartment').value : null),
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (userId) {
        // Update
        await collections.system_users.doc(userId).update(userData);
        await logAction('UPDATE', 'SYSTEM_USER', `Updated user: ${full_name}`, userId);
        showSystemUserSuccess(`User "${full_name}" updated successfully!`);

        form.reset();
        await loadSystemUsersCards();
        setTimeout(() => closeSystemUserModal(), 2000);
      } else {
        // Create with Auth
        if (!window.firebaseConfig) {
          throw new Error('Firebase Configuration not found. Cannot create auth user.');
        }

        // Generate Random Temporary Password
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let tempPassword = "";
        for (let i = 0; i < 12; i++) {
          tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Initialize secondary app to create user without logging out admin
        secondaryApp = firebase.initializeApp(window.firebaseConfig, "SecondaryApp");
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, tempPassword);
        const newUid = userCredential.user.uid;

        // 1. Save to 'users' collection (Critical for Login)
        userData.created_at = firebase.firestore.FieldValue.serverTimestamp();
        userData.uid = newUid;
        userData.first_login = true; // Force password change on first login
        await collections.users.doc(newUid).set(userData);

        // 2. Save to 'system_users' collection (For Admin List)
        await collections.system_users.add({
          ...userData,
          auth_uid: newUid
          // Note: NOT storing temp_password in DB for security, but Admin sees it once below
        });

        // Log Creation
        await logAction('CREATE', 'SYSTEM_USER', `Created new user: ${full_name} (${role})`, newUid);

        // 3. Cleanup secondary app
        await secondaryApp.auth().signOut();

        // Success Message with Credentials

        // Show Credentials Modal instead of Alert
        if (typeof showCredentialsModal === 'function') {
          showCredentialsModal(email, tempPassword);
        } else {
          // Fallback if modal function missing
          const credentialMsg = `✅ User Created Successfully!\n\n📧 Email: ${email}\n🔑 Temp Password: ${tempPassword}\n\n⚠️ IMPORTANT: Copy this password now. It will NOT be shown again.`;
          alert(credentialMsg);
        }

        showSystemUserSuccess(`User created!`);

        form.reset();
        await loadSystemUsersCards();
        setTimeout(() => closeSystemUserModal(), 2000);
      }

    } catch (error) {
      console.error('Error saving system user:', error);
      let errMsg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errMsg = 'Email is already registered.';
      }
      showSystemUserError(errMsg);
    } finally {
      if (secondaryApp) {
        try { await secondaryApp.delete(); } catch (e) { console.error(e); }
      }
      submitBtn.disabled = false;
      submitBtn.textContent = userId ? 'Update User' : 'Create System User';
    }
  });
}

/**
 * Delete system user
 */
async function deleteSystemUser(userId, userName) {
  try {
    if (!confirm(`Are you sure you want to delete "${userName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    await collections.system_users.doc(userId).delete();
    await logAction('DELETE', 'SYSTEM_USER', `Deleted user: ${userName}`, userId);
    alert(`User "${userName}" deleted successfully!`);

    await loadSystemUsersCards();

  } catch (error) {
    console.error('Error deleting system user:', error);
    alert('Failed to delete user. Please try again.');
  }
}

// Make functions globally accessible
window.showManageSystemUsers = showManageSystemUsers;
window.showSystemUserModal = showSystemUserModal;
window.closeSystemUserModal = closeSystemUserModal;
window.handleRoleChange = handleRoleChange;
window.handleCampusChange = handleCampusChange;
window.handleCollegeChange = handleCollegeChange;
window.deleteSystemUser = deleteSystemUser;

/**
 * Show Audit Logs
 */
function showAuditLogs() {
  currentView = 'audit-logs';
  document.getElementById('pageTitle').textContent = 'System Audit Logs';

  resetAllViews();

  // Show Audit View
  const view = document.getElementById('view-audit-logs');
  if (view) view.style.display = 'block';

  // Dynamic content defaults to none from resetAllViews
  document.getElementById('dynamicContent').style.display = 'none';

  updateSidebarActiveState('audit-logs');
  loadAuditLogs();
}

/**
 * Load Audit Logs
 */
async function loadAuditLogs() {
  const container = document.getElementById('auditLogsContainer');
  container.innerHTML = '<div class="spinner"></div> Loading logs...';

  try {
    const snapshot = await db.collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      container.innerHTML = '<div class="empty-state">No audit logs found</div>';
      return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Details</th>
                    <th>User</th>
                </tr>
            </thead>
            <tbody>
    `;

    snapshot.forEach(doc => {
      const log = doc.data();
      const time = log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : 'N/A';

      let badgeClass = 'badge-info';
      if (log.action === 'CREATE') badgeClass = 'badge-success';
      if (log.action === 'DELETE') badgeClass = 'badge-danger';
      if (log.action === 'UPDATE') badgeClass = 'badge-warning';

      html += `
            <tr>
                <td>${time}</td>
                <td><span class="${badgeClass}">${log.action}</span></td>
                <td>${log.module}</td>
                <td>${log.details}</td>
                <td>${log.performed_by_email || 'System'}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading logs:', error);
    container.innerHTML = `<div class="error-message">Error loading logs: ${error.message}</div>`;
  }
}

/**
 * Export Audit Logs
 */
async function exportAuditLogs() {
  try {
    const snapshot = await db.collection('audit_logs').orderBy('timestamp', 'desc').get();
    const data = [];
    snapshot.forEach(doc => {
      const log = doc.data();
      data.push({
        Time: log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : 'N/A',
        Action: log.action,
        Module: log.module,
        Details: log.details,
        User: log.performed_by_email,
        IP: log.user_agent
      });
    });

    // Simple CSV export
    const csvContent = "data:text/csv;charset=utf-8,"
      + Object.keys(data[0]).join(",") + "\n"
      + data.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_logs.csv");
    document.body.appendChild(link);
    link.click();

  } catch (e) {
    alert('Export failed');
  }
}

// Make audit functions globally accessible
window.showAuditLogs = showAuditLogs;
window.loadAuditLogs = loadAuditLogs;
window.exportAuditLogs = exportAuditLogs;
window.showBulkImportModal = showBulkImportModal;
// ============================================
// REPORTS & ANALYTICS
// ============================================

/**
 * Show Reports
 */
async function showReports() {
  currentView = 'reports';
  document.getElementById('pageTitle').textContent = 'Reports & Analytics';

  // Hide all views
  document.querySelectorAll('.dashboard-view').forEach(el => el.style.display = 'none');
  document.getElementById('dashboardView').style.display = 'none';

  updateSidebarActiveState('reports');

  const dynamicContent = document.getElementById('dynamicContent');
  dynamicContent.style.display = 'block';

  // Get current stats
  const campusCount = document.getElementById('totalCampuses').textContent;
  const collegeCount = document.getElementById('totalColleges').textContent;
  const courseCount = document.getElementById('totalCourses').textContent;
  const deptCount = document.getElementById('totalDepartments').textContent;

  dynamicContent.innerHTML = `
    <div class="hierarchy-breadcrumb">
      <span class="hierarchy-breadcrumb-item" onclick="showDashboard()" style="cursor: pointer;">Dashboard</span>
      <span class="hierarchy-breadcrumb-separator">›</span>
      <span class="hierarchy-breadcrumb-item active">Reports</span>
    </div>

    <div class="reports-section">
      <h3 style="margin-bottom: 1.5rem; color: #374151; font-weight: 600;">System Statistics</h3>
      
      <style>
        .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .analytics-card {
            background: white; border-radius: 12px; padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border-left: 5px solid transparent;
            transition: transform 0.2s;
        }
        .analytics-card:hover { transform: translateY(-5px); }
        .ac-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .ac-label { color: #6B7280; font-size: 0.875rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .ac-value { font-size: 2.5rem; font-weight: 700; color: #111827; margin-top: 0.5rem; }
        
        .c-purple { border-left-color: #8B5CF6; } .c-purple .ac-icon { background: #F3E8FF; padding: 10px; border-radius: 8px; color: #7C3AED; display: inline-block; }
        .c-blue { border-left-color: #3B82F6; } .c-blue .ac-icon { background: #DBEAFE; padding: 10px; border-radius: 8px; color: #2563EB; display: inline-block; }
        .c-green { border-left-color: #10B981; } .c-green .ac-icon { background: #D1FAE5; padding: 10px; border-radius: 8px; color: #059669; display: inline-block; }
        .c-orange { border-left-color: #F59E0B; } .c-orange .ac-icon { background: #FEF3C7; padding: 10px; border-radius: 8px; color: #D97706; display: inline-block; }

        .export-section { background: white; padding: 2rem; border-radius: 12px; border: 1px solid #E5E7EB; }
        .export-buttons { display: flex; gap: 1rem; margin-top: 1.5rem; }
      </style>

      <div class="analytics-grid">
        <div class="analytics-card c-purple">
            <div class="ac-icon">🏛️</div>
            <div class="ac-label">Total Campuses</div>
            <div class="ac-value">${campusCount}</div>
        </div>
        <div class="analytics-card c-blue">
            <div class="ac-icon">🎓</div>
            <div class="ac-label">Total Colleges</div>
            <div class="ac-value">${collegeCount}</div>
        </div>
        <div class="analytics-card c-green">
            <div class="ac-icon">📚</div>
            <div class="ac-label">Active Courses</div>
            <div class="ac-value">${courseCount}</div>
        </div>
        <div class="analytics-card c-orange">
            <div class="ac-icon">🏢</div>
            <div class="ac-label">Departments</div>
            <div class="ac-value">${deptCount}</div>
        </div>
      </div>

      <div class="export-section">
        <h3 style="margin-top: 0;">📉 Data Export</h3>
        <p style="color: #6B7280;">Download system reports in your preferred format.</p>
        
        <div class="export-buttons">
            <button class="btn btn-outline" onclick="exportAuditLogs()">📄 Export as CSV</button>
            <button class="btn btn-outline">📑 Export as PDF</button>
            <button class="btn btn-outline">💾 Export as JSON</button>
        </div>
      </div>
    </div>
  `;
}

window.showReports = showReports;
window.downloadBulkTemplate = downloadBulkTemplate;
window.processBulkImport = processBulkImport;

/**
 * Show Bulk Import Modal
 */
function showBulkImportModal() {
  const modal = document.getElementById('bulkImportModal');
  document.getElementById('bulkImportFile').value = '';
  document.getElementById('bulkImportProgress').style.display = 'none';
  document.getElementById('bulkImportResults').style.display = 'none';
  modal.classList.add('active');
}

function closeBulkImportModal() {
  document.getElementById('bulkImportModal').classList.remove('active');
}

function downloadBulkTemplate() {
  const csvContent = "data:text/csv;charset=utf-8,Full Name,Email,Role,Campus Name,College Name\nExample User,user@example.com,student,VDN Campus,Science College";
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "user_import_template.csv");
  document.body.appendChild(link);
  link.click();
}

async function processBulkImport() {
  const fileInput = document.getElementById('bulkImportFile');
  const progressDiv = document.getElementById('bulkImportProgress');
  const statusSpan = document.getElementById('bulkImportStatus');
  const resultsDiv = document.getElementById('bulkImportResults');

  if (!fileInput.files.length) {
    alert('Please select a CSV file');
    return;
  }

  const file = fileInput.files[0];
  progressDiv.style.display = 'block';
  resultsDiv.style.display = 'none';
  statusSpan.textContent = 'Reading file...';

  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    // Simple CSV parser (handles basic comma separation)
    const rows = text.split('\n').map(row => row.split(',').map(c => c.trim()));
    const header = rows.shift(); // Remove header

    let successCount = 0;
    let failCount = 0;
    let logs = [];

    statusSpan.textContent = `Initializing...`;

    // Initialize Secondary App
    let secondaryApp = null;
    try {
      if (!window.firebaseConfig) throw new Error("Firebase Config missing");
      secondaryApp = firebase.initializeApp(window.firebaseConfig, "BulkImportApp");
    } catch (err) {
      alert("Error initializing: " + err.message);
      progressDiv.style.display = 'none';
      return;
    }

    // Cache for IDs
    const campusCache = {};
    const collegeCache = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue; // Skip empty

      // Expected: Name, Email, Role, Campus, College
      const fullName = row[0];
      const email = row[1];
      const role = row[2] ? row[2].toLowerCase() : 'student';
      const campusName = row[3];
      const collegeName = row[4];

      if (!email) continue;

      statusSpan.textContent = `Processing ${i + 1}/${rows.length}: ${email}`;

      try {
        // Lookup IDs
        let campusId = null;
        let collegeId = null;

        if (campusName) {
          if (campusCache[campusName]) campusId = campusCache[campusName];
          else {
            const snap = await collections.campuses.where('name', '==', campusName).get();
            if (!snap.empty) {
              campusId = snap.docs[0].id;
              campusCache[campusName] = campusId;
            }
          }
        }

        if (collegeName) {
          if (collegeCache[collegeName]) collegeId = collegeCache[collegeName];
          else {
            const snap = await collections.colleges.where('name', '==', collegeName).get();
            if (!snap.empty) {
              collegeId = snap.docs[0].id;
              collegeCache[collegeName] = collegeId;
            }
          }
        }

        const defaultPassword = "Biyani@" + new Date().getFullYear();

        // Create Auth
        const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, defaultPassword);
        const uid = cred.user.uid;

        // Save DB
        const data = {
          full_name: fullName,
          email: email,
          role: role,
          campus_id: campusId,
          college_id: collegeId,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          uid: uid,
          requires_password_change: true
        };

        await collections.users.doc(uid).set(data);
        await collections.system_users.add({ ...data, auth_uid: uid, temp_password: defaultPassword });

        // Log (Silent log to avoid flooding audit logs collection? Or batch?)
        // Individual log is safer for audit trail.
        await logAction('CREATE', 'USER_BULK', `Imported ${email}`, uid);

        successCount++;
        logs.push(`<div style="color:green">✅ ${email}: Created</div>`);

      } catch (err) {
        failCount++;
        logs.push(`<div style="color:red">❌ ${email}: ${err.message}</div>`);
      }
    }

    // Cleanup
    if (secondaryApp) await secondaryApp.delete();

    progressDiv.style.display = 'none';
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `<strong>Result:</strong> ${successCount} Success, ${failCount} Failed<br><hr>` + logs.join('');

    await loadSystemUsersCards();
  };

  reader.readAsText(file);
}
/**
 * Show Credentials Modal
 */
function showCredentialsModal(email, password) {
  document.getElementById('credEmail').textContent = email;
  document.getElementById('credPassword').textContent = password;
  document.getElementById('credentialsModal').classList.add('active');
}

/**
 * Close Credentials Modal
 */
function closeCredentialsModal() {
  document.getElementById('credentialsModal').classList.remove('active');
}

/**
 * Copy to Clipboard Helper
 */
function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    // Visual feedback
    const btn = document.getElementById(elementId).nextElementSibling;
    const originalIcon = btn.textContent;
    btn.textContent = '✅';
    setTimeout(() => {
      btn.textContent = originalIcon;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  });
}

// Global exports for credentials modal
window.showCredentialsModal = showCredentialsModal;
window.closeCredentialsModal = closeCredentialsModal;
window.copyToClipboard = copyToClipboard;
