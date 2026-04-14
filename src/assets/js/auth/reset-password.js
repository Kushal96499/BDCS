// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Authentication Module - Force Password Change
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = document.getElementById('submitBtn');

    // Protect Page: Ensure user is logged in
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '/src/auth/login.html';
        }
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset UI
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validation
        if (newPassword.length < 6) {
            showError('Password must be at least 6 characters long');
            resetBtn();
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('Passwords do not match');
            resetBtn();
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No active session. Please login again.');
            }

            // 1. Update Password in Firebase Auth
            await user.updatePassword(newPassword);

            // 2. Update Firestore: Set first_login = false
            await collections.users.doc(user.uid).update({
                first_login: false,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. Success & Redirect
            successMessage.style.display = 'block';

            // Get role to redirect correctly
            const userDoc = await collections.users.doc(user.uid).get();
            const userData = userDoc.data();

            setTimeout(() => {
                redirectToDashboard(userData.role);
            }, 2000);

        } catch (error) {
            console.error('Password Update Error:', error);
            if (error.code === 'auth/requires-recent-login') {
                showError('Session expired. Please login again to change password.');
            } else {
                showError(error.message || 'Failed to update password');
            }
            resetBtn();
        }
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }

    function resetBtn() {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
    }
});
