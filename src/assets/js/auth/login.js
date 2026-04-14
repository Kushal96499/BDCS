// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Authentication Module - Login
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = document.getElementById('loginButton');

    // Toggle Password Visibility
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🔒';
    });

    // Handle Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset state
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Please enter both email and password');
            resetButton();
            return;
        }

        try {
            // 1. Authenticate with Firebase
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // 2. Get User Role & Status from Firestore
            const userDoc = await collections.users.doc(user.uid).get();

            if (!userDoc.exists) {
                throw new Error('User record not found. Contact Admin.');
            }

            const userData = userDoc.data();

            // 3. User Status Check
            if (userData.status === 'inactive' || userData.status === 'suspended') {
                await auth.signOut();
                throw new Error('Your account is deactivated. Contact Admin.');
            }

            // 4. Force Password Reset Check
            if (userData.first_login === true) {
                // Redirect to forced reset page
                window.location.href = '/src/auth/reset-password.html';
                return;
            }

            // 5. Role-Based Routing
            redirectToDashboard(userData.role);

        } catch (error) {
            console.error('Login Error:', error);

            let message = 'Login failed. Please check your credentials.';

            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = 'Invalid email or password.';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many failed attempts. Try again later.';
            } else if (error.message) {
                message = error.message;
            }

            showError(message);
            resetButton();
        }
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }

    function resetButton() {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
});
