import React, { useEffect, useState, useCallback } from 'react';
import { auth } from '../config/firebase';
import { toast } from './admin/Toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const TIMEOUT_DURATION = 2 * 60 * 60 * 1000; // 2 hours in ms
const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes warning

export default function SessionManager() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Only for Staff/Admin roles
    const isStaff = user && ['admin', 'hod', 'principal', 'teacher', 'director'].includes(user.role);

    const handleLogout = useCallback(() => {
        auth.signOut().then(() => {
            toast.info('Session expired for security. Please sign in again.');
            navigate('/login');
        });
    }, [navigate]);

    useEffect(() => {
        if (!isStaff) return;

        const handleActivity = () => {
            setLastActivity(Date.now());
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, handleActivity));

        // DEACTIVATED: Inactivity timeout has been disabled per user request.
        // Users will now stay logged in permanently until they manual logout.
        const interval = null; 

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [isStaff, lastActivity, handleLogout]);

    if (!isStaff) return null;

    return null; // Invisible component
}
