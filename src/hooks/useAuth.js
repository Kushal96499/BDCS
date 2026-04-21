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
                    // Fetch user data from Firestore
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
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
