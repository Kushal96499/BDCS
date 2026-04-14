// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Reset Password Page with Tailwind Layout
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Input from '../components/Input';

export default function ResetPassword() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [needsReauth, setNeedsReauth] = useState(false);

    // Role-based path mapping
    const getRolePath = (role) => {
        const rolePaths = {
            admin: '/admin',
            director: '/director',
            principal: '/principal',
            hod: '/hod',
            teacher: '/teacher',
            student: '/student',
            exam_cell: '/exam',
            placement: '/placement',
            hr: '/hr'
        };
        return rolePaths[role] || '/';
    };

    // Redirect if not logged in or doesn't need reset
    // Use a ref to prevent navigation from firing multiple times when user object re-fetches
    const hasNavigated = useRef(false);
    useEffect(() => {
        if (loading) return;
        if (hasNavigated.current) return; // already navigated once, don't loop

        if (!user) {
            hasNavigated.current = true;
            navigate('/login');
        } else if (user.mustResetPassword === false) {
            // Only redirect away if flag is explicitly false (not undefined/null)
            hasNavigated.current = true;
            navigate(getRolePath(user.role));
        }
    }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    const validatePassword = (password) => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long.';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Password must contain at least one uppercase letter.';
        }
        if (!/[a-z]/.test(password)) {
            return 'Password must contain at least one lowercase letter.';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number.';
        }
        return null;
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate password
        const validationError = validatePassword(newPassword);
        if (validationError) {
            setError(validationError);
            return;
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            const currentUser = auth.currentUser;

            // Update password in Firebase Auth
            await updatePassword(currentUser, newPassword);

            // Update mustResetPassword flag in Firestore
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                mustResetPassword: false,
                lastPasswordChange: new Date()
            });

            // Force a small delay to ensure Firestore write completes
            await new Promise(resolve => setTimeout(resolve, 500));

            // Sign out and redirect to login to get fresh user state
            await signOut(auth);
            navigate('/login', { state: { message: 'Password reset successful! Please login with your new password.' } });
        } catch (err) {
            console.error('Password reset error:', err);

            switch (err.code) {
                case 'auth/weak-password':
                    setError('Password is too weak. Please choose a stronger password.');
                    break;
                case 'auth/requires-recent-login':
                    setError('Your session has expired. Please log out and log back in to reset your password.');
                    setNeedsReauth(true);
                    break;
                default:
                    setError('Failed to reset password. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <img
                            src="/assets/biyani-logo.png"
                            alt="Biyani Group of Colleges"
                            className="w-24 h-24 object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">Reset Your Password</h1>
                    <p className="text-gray-600 text-sm">First-time login detected</p>
                </div>

                {/* Instructions */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 text-sm">
                    <strong className="text-amber-700">🔒 Security Requirement</strong>
                    <br />
                    <span className="text-gray-700">
                        You must change your password before accessing the system. Please choose a
                        strong password that meets the security requirements below.
                    </span>
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Password Requirements:</h4>
                    <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                        <li>At least 8 characters long</li>
                        <li>Contains at least one uppercase letter (A-Z)</li>
                        <li>Contains at least one lowercase letter (a-z)</li>
                        <li>Contains at least one number (0-9)</li>
                    </ul>
                </div>

                {/* Reset Form */}
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm">
                            <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className="text-red-700 font-medium">{error}</p>
                                    {needsReauth && (
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="mt-2 text-sm text-red-600 hover:text-red-800 underline font-semibold"
                                        >
                                            Click here to logout and try again
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            label="New Password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            className="absolute right-3 bottom-3.5 text-gray-500 hover:text-biyani-red transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <Input
                        type={showPassword ? 'text' : 'password'}
                        label="Confirm New Password"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />

                    <div className="pt-2">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting}
                            className="w-full"
                        >
                            {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                        </Button>
                    </div>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-400">
                        © 2026 Biyani Group of Colleges. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
