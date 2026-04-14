// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Login Page - Polished UI
// ============================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth, db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Input from '../components/Input';
import { loginSchema } from '../schemas/auth';

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: ''
        },
        mode: 'onSubmit'
    });

    // Helper function to get highest priority role
    const getHighestPriorityRole = (userData) => {
        // If user has roles array, prioritize highest role
        if (userData?.roles && Array.isArray(userData.roles)) {
            const rolePriority = ['admin', 'director', 'principal', 'exam_cell', 'placement', 'hr', 'hod', 'teacher', 'student'];
            for (const role of rolePriority) {
                if (userData.roles.includes(role)) {
                    return role;
                }
            }
        }
        // Fallback to single role field
        return userData?.role || 'student';
    };

    // Redirect if already logged in
    React.useEffect(() => {
        if (user && !user.mustResetPassword) {
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
            const userRoles = user.roles || [user.role];
            if (userRoles.length > 1) {
                // Multi-role user → role selection page
                navigate('/select-role', { state: { roles: userRoles } });
            } else {
                // Single role → direct dashboard
                const singleRole = userRoles[0] || user.role || 'student';
                navigate(rolePaths[singleRole] || '/');
            }
        } else if (user && user.mustResetPassword) {
            navigate('/reset');
        }
    }, [user, navigate]);

    const onSubmit = async (data) => {
        setSubmitError('');

        try {
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            const uid = userCredential.user.uid;

            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', uid));

            if (!userDoc.exists()) {
                setSubmitError('User profile not found. Contact your administrator.');
                await auth.signOut();
                return;
            }

            const userData = userDoc.data();

            // Update last login timestamp
            await updateDoc(doc(db, 'users', uid), {
                lastLogin: serverTimestamp()
            });

            // Check if password reset is required
            if (userData.mustResetPassword) {
                navigate('/reset');
            } else {
                // Check roles for multi-role redirect
                const userRoles = userData.roles || [userData.role];
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

                if (userRoles.length > 1) {
                    // Multi-role user → role selection page
                    navigate('/select-role', { state: { roles: userRoles } });
                } else {
                    // Single role → direct dashboard
                    const singleRole = userRoles[0] || userData.role || 'student';
                    sessionStorage.setItem('bdcs_activeRole', singleRole);
                    navigate(rolePaths[singleRole] || '/');
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
                setSubmitError('Invalid email or password.');
            } else if (err.code === 'auth/too-many-requests') {
                setSubmitError('Too many failed attempts. Please try again later.');
            } else {
                setSubmitError('Login failed. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
            {/* Dynamic Background with Gradient Blobs */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 z-0"></div>
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-200/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-biyani-red/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

            {/* Back to Home Link */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 text-gray-600 hover:text-biyani-red flex items-center gap-2 font-medium transition-colors z-20 group"
                type="button"
            >
                <div className="p-2 bg-white/50 backdrop-blur-sm rounded-full group-hover:bg-white transition-all shadow-sm">
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>
                <span className="opacity-70 group-hover:opacity-100 transition-opacity">Back to Home</span>
            </button>

            {/* Glass Login Card */}
            <div className="w-full max-w-[450px] relative z-10 glass-panel rounded-3xl p-8 md:p-12 animate-fade-in shadow-2xl border-white/40">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6 relative">
                        <div className="absolute inset-0 bg-biyani-red/5 blur-2xl rounded-full"></div>
                        <img
                            src="/assets/biyani-logo.png"
                            alt="Biyani Group of Colleges"
                            className="w-28 h-28 object-contain relative z-10 drop-shadow-lg transform hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">
                        Biyani Digital Campus System
                    </p>
                </div>

                {/* Warning Notice - Collapsible/Subtle */}
                <div className="bg-orange-50/80 backdrop-blur-sm border border-orange-200/60 rounded-xl p-4 mb-8 animate-fade-in-delay-100">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="font-semibold text-orange-900 text-sm mb-0.5">
                                Authorized Access Only
                            </p>
                            <p className="text-orange-800/80 text-xs leading-relaxed">
                                Use your institutional credentials to login.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50/90 border border-green-200 text-green-800 rounded-xl p-4 mb-6 shadow-sm animate-slide-in">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{successMessage}</span>
                        </div>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in-delay-200">
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Email Application"
                                type="email"
                                placeholder="name@biyanicolleges.org"
                                error={errors.email?.message}
                                disabled={isSubmitting}
                                autoComplete="username"
                            />
                        )}
                    />

                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <Input
                                {...field}
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                error={errors.password?.message}
                                disabled={isSubmitting}
                                autoComplete="current-password"
                                endIcon={
                                    <div onClick={() => setShowPassword(!showPassword)}>
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
                                    </div>
                                }
                            />
                        )}
                    />

                    {/* General Submit Error */}
                    {submitError && (
                        <div className="bg-red-50/80 border border-red-200 text-red-600 rounded-lg p-3 text-sm text-center flex items-center justify-center gap-2 animate-slide-in">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {submitError}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        className="w-full py-3.5 text-base font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transform hover:-translate-y-0.5 transition-all mt-4"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Authenticating...
                            </span>
                        ) : (
                            'Sign In to Dashboard'
                        )}
                    </Button>
                </form>

                {/* Footer Notice */}
                <div className="mt-8 pt-6 border-t border-gray-200/50">
                    <p className="text-center text-xs text-gray-500">
                        © 2026 Biyani Group of Colleges. <br />
                        Managed by <span className="font-semibold text-gray-700">BitBrawlers</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
