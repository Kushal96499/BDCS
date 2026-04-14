// ============================================
// MANAGE SYSTEM USERS
// ============================================

/**
 * Show Manage System Users
 */
function showManageSystemUsers() {
    currentView = 'manage_users';
    document.getElementById('pageTitle').textContent = 'Manage System Users';
    document.getElementById('dashboardView').style.display = 'none';
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
      \u2139\uFE0F Create and manage user accounts with role assignments. Each role has specific scope requirements.
    </div>

    <div class="action-toolbar">
      <div class="toolbar-search">
        <input type="text" placeholder="Search users..." id="userSearch">
      </div>
      <div class="toolbar-actions">
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
            <div class="empty-state-icon">\uD83D\uDC68\u200D\uD83D\uDCBC</div>
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

            const roleNames = {
                'director': 'Director',
                'principal': 'Principal',
                'exam_cell': 'Exam Cell',
                'placement': 'Placement Officer',
                'hr': 'HR Manager'
            };

            const roleIcons = {
                'director': '\uD83D\uDC54',
                'principal': '\uD83C\uDF93',
                'exam_cell': '\uD83D\uDCCB',
                'placement': '\uD83D\uDCBC',
                'hr': '\uD83D\uDC65'
            };

            const statusBadge = user.status === 'active'
                ? '<span class="badge" style="background: #10B981; color: white;">Active</span>'
                : '<span class="badge" style="background: #6B7280; color: white;">Inactive</span>';

            return `
        <div class="management-card">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${roleIcons[user.role] || '\uD83D\uDC64'}</div>
          <h3 class="management-card-title">${user.full_name || 'N/A'}</h3>
          <p class="management-card-desc">${user.email || 'N/A'}</p>
          <div class="management-card-meta">
            <span class="badge">${roleNames[user.role] || user.role}</span>
            ${statusBadge}
          </div>
          ${scopeInfo ? `<div style="margin-top: 0.75rem; font-size: 0.875rem; color: #6B7280;">\uD83D\uDCCD ${scopeInfo}</div>` : ''}
          <div class="management-card-actions" style="margin-top: 1.5rem;">
            <button class="btn btn-outline btn-sm" onclick="showSystemUserModal('${doc.id}')">\u270F\uFE0F Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSystemUser('${doc.id}', '${user.full_name}')">\uD83D\uDDD1\uFE0F Delete</button>
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
                document.getElementById('userFullName').value = user.full_name;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userRole').value = user.role;
                document.getElementById('userStatus').value = user.status;

                // Trigger role change to show appropriate fields
                await handleRoleChange();

                // Set campus/college if applicable
                if (user.campus_id) {
                    await loadCampusesForUserDropdown();
                    document.getElementById('userCampus').value = user.campus_id;

                    if (user.college_id) {
                        await handleCampusChange();
                        document.getElementById('userCollege').value = user.college_id;
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
    const role = document.getElementById('userRole').value;
    const campusRow = document.getElementById('campusFieldRow');
    const collegeRow = document.getElementById('collegeFieldRow');
    const roleInfoBox = document.getElementById('roleInfoBox');
    const roleInfoText = document.getElementById('roleInfoText');
    const campusField = document.getElementById('userCampus');
    const collegeField = document.getElementById('userCollege');

    // Reset
    campusRow.style.display = 'none';
    collegeRow.style.display = 'none';
    roleInfoBox.style.display = 'none';
    campusField.removeAttribute('required');
    collegeField.removeAttribute('required');

    if (!role) return;

    // Role-specific logic
    if (role === 'director') {
        // Director: No scope needed
        roleInfoText.textContent = 'Director has full system access. No campus or college assignment required.';
        roleInfoBox.style.display = 'block';
    } else if (role === 'principal') {
        // Principal: Campus + College required
        campusRow.style.display = 'flex';
        collegeRow.style.display = 'flex';
        campusField.setAttribute('required', 'required');
        collegeField.setAttribute('required', 'required');
        roleInfoText.textContent = 'Principal manages a specific college. Both campus and college selection are required.';
        roleInfoBox.style.display = 'block';

        // Load campuses
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
        const dropdown = document.getElementById('userCampus');
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
        const dropdown = document.getElementById('userCampus');
        dropdown.innerHTML = '<option value="">Error loading campuses</option>';
    }
}

/**
 * Handle campus change - load colleges for selected campus
 */
async function handleCampusChange() {
    const campusId = document.getElementById('userCampus').value;
    const collegeDropdown = document.getElementById('userCollege');

    if (!campusId) {
        collegeDropdown.innerHTML = '<option value="">Select campus first...</option>';
        return;
    }

    try {
        collegeDropdown.innerHTML = '<option value="">Loading colleges...</option>';

        const snapshot = await collections.colleges
            .where('campus_id', '==', campusId)
            .orderBy('name')
            .get();

        collegeDropdown.innerHTML = '<option value="">Select College</option>';

        snapshot.forEach(doc => {
            const college = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = college.name;
            collegeDropdown.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading colleges:', error);
        collegeDropdown.innerHTML = '<option value="">Error loading colleges</option>';
    }
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
        const full_name = document.getElementById('userFullName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;
        const campus_id = document.getElementById('userCampus').value;
        const college_id = document.getElementById('userCollege').value;

        // Validation
        if (!full_name || !email || !role || !status) {
            showSystemUserError('Please fill all required fields');
            return;
        }

        // Role-specific validation
        if (role === 'principal') {
            if (!campus_id || !college_id) {
                showSystemUserError('Principal role requires both campus and college selection');
                return;
            }
        } else if (['exam_cell', 'placement', 'hr'].includes(role)) {
            if (!campus_id) {
                showSystemUserError(`${role} role requires campus selection`);
                return;
            }
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const userData = {
                full_name,
                email,
                role,
                status,
                campus_id: campus_id || null,
                college_id: college_id || null,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (userId) {
                // Update
                await collections.system_users.doc(userId).update(userData);
                showSystemUserSuccess(`User "${full_name}" updated successfully!`);
            } else {
                // Create
                userData.created_at = firebase.firestore.FieldValue.serverTimestamp();
                await collections.system_users.add(userData);
                showSystemUserSuccess(`User "${full_name}" created successfully!`);
            }

            form.reset();
            await loadSystemUsersCards();

            setTimeout(() => closeSystemUserModal(), 2000);

        } catch (error) {
            console.error('Error saving system user:', error);
            showSystemUserError('Failed to save user. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = userId ? 'Update User' : 'Create User';
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
window.deleteSystemUser = deleteSystemUser;
