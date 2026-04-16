// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Authentication Hook
// ============================================

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Resolve active role with sessionStorage fallback
    const resolveActiveRole = (userData) => {
        const sessionRole = sessionStorage.getItem('bdcs_activeRole');
        const firestoreRole = userData.currentActiveRole;
        const primaryRole = userData.primaryRole || userData.role;

        // Priority: Firestore currentActiveRole → sessionStorage → primaryRole → role
        let activeRole = firestoreRole || sessionRole || primaryRole;

        // Validate that the resolved role is actually in the user's roles array
        const allRoles = userData.roles || [userData.role];
        if (activeRole && !allRoles.includes(activeRole)) {
            activeRole = primaryRole; // Fallback to primary if resolved role is invalid
        }

        return activeRole;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    // Check for 2-hour session timeout
                    const loginTime = sessionStorage.getItem('bdcs_loginTime');
                    const now = Date.now();
                    const TWO_HOURS = 2 * 60 * 60 * 1000;
                    
                    if (loginTime && (now - parseInt(loginTime, 10) > TWO_HOURS)) {
                        console.log('useAuth: Session expired (2 hours), logging out.');
                        await auth.signOut();
                        sessionStorage.removeItem('bdcs_loginTime');
                        sessionStorage.removeItem('bdcs_activeRole');
                        setUser(null);
                        setLoading(false);
                        return;
                    } else if (!loginTime) {
                        // If no loginTime is set but user is authenticated, it might be a refreshed tab
                        // or an existing session. Let's set it now to start the 2-hour timer.
                        sessionStorage.setItem('bdcs_loginTime', Date.now().toString());
                    }

                    // Fetch user data from Firestore
                    console.log('useAuth: Fetching doc for UID:', firebaseUser.uid);
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        console.log('useAuth: User data found:', userData.role);
                        const activeRole = resolveActiveRole(userData);

                        // Sync sessionStorage
                        if (activeRole) {
                            sessionStorage.setItem('bdcs_activeRole', activeRole);
                        }

                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            ...userData,
                            // CRITICAL: Use resolved activeRole for app-wide permissions
                            role: activeRole,
                            // Preserve original/primary role for reference
                            originalRole: userData.primaryRole || userData.role
                        });
                    } else {
                        console.error('useAuth: No Firestore document for UID:', firebaseUser.uid);
                        setError('User profile not found in database. Please contact admin.');
                        setUser(null);
                    }
                } else {
                    setUser(null);
                    sessionStorage.removeItem('bdcs_activeRole');
                }
            } catch (firestoreErr) {
                console.error('useAuth: Firestore Fetch Error:', firestoreErr);
                setError(`Database access error: ${firestoreErr.message}`);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const refreshUser = async () => {
        try {
            const currentAuthUser = auth.currentUser;
            if (currentAuthUser) {
                const userDocRef = doc(db, 'users', currentAuthUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const activeRole = resolveActiveRole(userData);

                    if (activeRole) {
                        sessionStorage.setItem('bdcs_activeRole', activeRole);
                    }

                    setUser({
                        uid: currentAuthUser.uid,
                        email: currentAuthUser.email,
                        ...userData,
                        role: activeRole,
                        originalRole: userData.primaryRole || userData.role
                    });
                }
            }
        } catch (err) {
            console.error('Error refreshing user:', err);
        }
    };

    // Set active role locally (updates state + sessionStorage, does NOT write to Firestore)
    const setActiveRole = (role) => {
        if (!user) return;
        const allRoles = user.roles || [user.originalRole || user.role];
        if (!allRoles.includes(role)) {
            console.warn('setActiveRole: user does not have role', role);
            return;
        }
        sessionStorage.setItem('bdcs_activeRole', role);
        setUser(prev => prev ? { ...prev, role, currentActiveRole: role } : null);
    };

    return { user, loading, error, refreshUser, setActiveRole };
}
