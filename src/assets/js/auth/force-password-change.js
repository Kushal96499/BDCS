document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Not logged in, redirect to login
            window.location.href = '/src/auth/login.html';
        }
    });

    // 2. Form Elements
    const form = document.getElementById('changePasswordForm');
    const newPassInput = document.getElementById('newPassword');
    const confirmPassInput = document.getElementById('confirmPassword');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMessage');
    const successMsg = document.getElementById('successMessage');

    // 3. Helper: Show Error
    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.add('show');
    }

    // 4. Submit Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset UI
        errorMsg.classList.remove('show');
        const newPass = newPassInput.value;
        const confirmPass = confirmPassInput.value;

        // Validation
        if (newPass.length < 6) {
            showError("Password must be at least 6 characters long.");
            return;
        }

        if (newPass !== confirmPass) {
            showError("Passwords do not match.");
            return;
        }

        // Processing
        submitBtn.disabled = true;
        submitBtn.textContent = "Updating...";

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Session expired. Please login again.");

            // A. Update Password in Firebase Auth
            await user.updatePassword(newPass);

            // B. Update Firestore flag
            await collections.users.doc(user.uid).update({
                requires_password_change: false,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            // C. Success
            successMsg.style.display = 'block';
            form.style.display = 'none'; // Hide form to prevent double submit

            // D. Redirect
            // Fetch role to know where to go
            const userDoc = await collections.users.doc(user.uid).get();
            if (userDoc.exists) {
                const role = userDoc.data().role;
                setTimeout(() => {
                    redirectToDashboard(role);
                }, 2000);
            } else {
                throw new Error("User profile not found.");
            }

        } catch (error) {
            console.error("Update failed:", error);

            let message = error.message;
            if (error.code === 'auth/requires-recent-login') {
                message = "For security, please logout and login again before changing password.";
            }

            showError(message);
            submitBtn.disabled = false;
            submitBtn.textContent = "Update Password";
        }
    });
});
