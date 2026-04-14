// ============================================
// BIYANI DIGITAL CAMPUS SYSTEM (BDCS)
// Protected Route Component with Role-Based Access
// ============================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="spinner"></div>
            <p className="text-gray-600">Loading...</p>
        </div>
    );
}

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user must reset password on first login
    if (user.mustResetPassword && location.pathname !== '/reset') {
        return <Navigate to="/reset" replace />;
    }

    // Status-based access control
    if (user.status === 'relieved') {
        if (!location.pathname.startsWith('/relieved')) {
            return <Navigate to="/relieved" replace />;
        }
    } else {
        // Active users shouldn't access relieved portal
        if (location.pathname.startsWith('/relieved')) {
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
            const userPath = rolePaths[user.role] || '/';
            return <Navigate to={userPath} replace />;
        }
    }

    // Role-based access control (Multi-Role Support)
    if (allowedRoles) {
        // Get user's current active role (or fallback to primaryRole/role)
        const activeRole = user.currentActiveRole || user.role;
        const userRoles = user.roles || [activeRole];

        // SECURITY: The user's ACTIVE role must match the allowed roles for this route
        // Even if user has the role in their array, they must be "switched" to it
        const isActiveRoleAllowed = allowedRoles.includes(activeRole);

        if (!isActiveRoleAllowed) {
            // Check if user has any of the allowed roles (they have access, just not switched)
            const hasRoleButNotActive = allowedRoles.some(r => userRoles.includes(r));

            if (hasRoleButNotActive) {
                // User has the role but isn't currently in that mode
                // Redirect to role selection so they can switch properly
                return <Navigate to="/select-role" replace />;
            }

            // User doesn't have the role at all — redirect to their active dashboard
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

            const userPath = rolePaths[activeRole] || '/';
            return <Navigate to={userPath} replace />;
        }
    }

    return children;
}
