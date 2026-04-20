import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import HODLayout from './layouts/HODLayout';
import PrincipalLayout from './layouts/PrincipalLayout';
import TeacherLayout from './layouts/TeacherLayout';
import StudentLayout from './layouts/StudentLayout';

// Auth
import Login from './pages/Login';
import Landing from './pages/Landing';
import SessionManager from './components/SessionManager';
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
const AdminHome = lazy(() => import('./pages/admin/AdminHome'));
const UserList = lazy(() => import('./pages/admin/user/UserList'));
const CampusList = lazy(() => import('./pages/admin/campus/CampusList'));
const CollegeList = lazy(() => import('./pages/admin/college/CollegeList'));
const DepartmentList = lazy(() => import('./pages/admin/department/DepartmentList'));
const CourseList = lazy(() => import('./pages/admin/course/CourseList'));
const SpecialResponsibility = lazy(() => import('./pages/admin/academic/SpecialResponsibility'));
const AuditLogViewer = lazy(() => import('./pages/admin/audit/AuditLogs'));
const SystemRules = lazy(() => import('./pages/admin/config/AcademicConfig'));
const AlumniPortal = lazy(() => import('./pages/alumni/AlumniPortal'));

// HOD Pages
const HODDashboard = lazy(() => import('./pages/dashboards/HODDashboard'));
const FacultyList = lazy(() => import('./pages/hod/TeacherManagement'));
const BatchList = lazy(() => import('./pages/hod/BatchManagement'));
const SubjectList = lazy(() => import('./pages/hod/SubjectMaster'));
const AssignmentList = lazy(() => import('./pages/hod/ClassAssignment'));
const HODApprovals = lazy(() => import('./pages/hod/HODApprovalsWrapper'));
const HODEventApprovals = lazy(() => import('./pages/hod/EventApprovals'));
const CouncilManagement = lazy(() => import('./pages/hod/CouncilManagement'));
const HODAuditLogs = lazy(() => import('./pages/hod/HODAuditLogs'));


// Principal Pages
const PrincipalDashboard = lazy(() => import('./pages/principal/PrincipalDashboard'));
const InstitutionalAnalytics = lazy(() => import('./pages/dashboards/AdminDashboard'));
const DepartmentOverview = lazy(() => import('./pages/principal/DepartmentManagement'));
const PolicyManagement = lazy(() => import('./pages/principal/CollegeUserManagement'));
const StudentOversight = lazy(() => import('./pages/principal/StudentOversight'));
const TeacherOversight = lazy(() => import('./pages/principal/TeacherOversight'));
const PrincipalAuditLogs = lazy(() => import('./pages/principal/PrincipalAuditLogs'));
const PrincipalCouncil = lazy(() => import('./pages/principal/PrincipalCouncil'));

// Teacher Pages
const TeacherDashboard = lazy(() => import('./pages/dashboards/TeacherDashboard'));
const MyClasses = lazy(() => import('./pages/teacher/MyClasses'));
const StudentManagement = lazy(() => import('./pages/teacher/StudentManagement'));
const AttendanceMarking = lazy(() => import('./pages/teacher/AttendanceMarking'));
const AssessmentDashboard = lazy(() => import('./pages/teacher/AssessmentDashboard'));
const TeacherEventRequest = lazy(() => import('./pages/teacher/TeacherEventRequest'));
const TeacherAuditLogs = lazy(() => import('./pages/teacher/TeacherAuditLogs'));


const AssessmentTestDetail = lazy(() => import('./pages/teacher/AssessmentTestDetail'));
const BulkStudentUpload = lazy(() => import('./pages/teacher/BulkStudentUpload'));
const TeacherAttendanceReport = lazy(() => import('./pages/hod/AttendanceReport'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'));
const EventExplorer = lazy(() => import('./pages/student/EventExplorer'));
const StudentResults = lazy(() => import('./pages/student/StudentResults'));
const MyCouncil = lazy(() => import('./pages/student/MyCouncil'));
const StudentEventRequest = lazy(() => import('./pages/student/StudentEventRequest'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const ProjectShowcase = lazy(() => import('./pages/student/ProjectShowcase'));
const StudentTestHistory = lazy(() => import('./pages/student/StudentTestHistory'));

const StudentProgressTimeline = lazy(() => import('./pages/student/StudentProgressTimeline'));
const CommunityExplore = lazy(() => import('./pages/student/CommunityExplore'));
const StudentDirectory = lazy(() => import('./pages/student/StudentDirectory'));
const StudentPublicProfile = lazy(() => import('./pages/student/StudentPublicProfile'));

// Utils
const LoadingScreen = () => (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-biyani-red"></div>
    </div>
);

export default function App() {
    // RECOVERY: Handle "Failed to fetch module" errors (Chunk load failures)
    // This happens when a new version is deployed on Vercel and old chunks are missing.
    React.useEffect(() => {
        const handleChunkError = (e) => {
            const msg = e.message || '';
            if (msg.includes('Failed to fetch dynamically imported module') || 
                msg.includes('Importing a module script failed') ||
                msg.includes('module script')) {
                console.warn('BDCS: Chunk load failure detected. Reloading for latest version...');
                window.location.reload();
            }
        };
        window.addEventListener('error', handleChunkError);
        return () => window.removeEventListener('error', handleChunkError);
    }, []);

    return (
        <Suspense fallback={<LoadingScreen />}>
            <SessionManager />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Landing />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<AdminHome />} />
                    <Route path="campuses" element={<CampusList />} />
                    <Route path="colleges" element={<CollegeList />} />
                    <Route path="users" element={<UserList />} />
                    <Route path="departments" element={<DepartmentList />} />
                    <Route path="courses" element={<CourseList />} />
                    <Route path="responsibilities" element={<SpecialResponsibility />} />
                    <Route path="audit-logs" element={<AuditLogViewer />} />
                    <Route path="rules" element={<SystemRules />} />
                    <Route path="alumni" element={<AlumniPortal />} />
                    <Route path="profile" element={<AccountSettings />} />
                </Route>

                {/* HOD Routes */}
                <Route path="/hod" element={
                    <ProtectedRoute allowedRoles={['hod']}>
                        <HODLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<HODDashboard />} />
                    <Route path="teachers" element={<FacultyList />} />
                    <Route path="batches" element={<BatchList />} />
                    <Route path="subjects" element={<SubjectList />} />
                    <Route path="assignments" element={<AssignmentList />} />
                    <Route path="approvals" element={<HODApprovals />} />
                    <Route path="event-approvals" element={<HODEventApprovals />} />
                    <Route path="council" element={<CouncilManagement />} />
                    <Route path="audit-logs" element={<HODAuditLogs />} />
                    <Route path="profile" element={<AccountSettings />} />
                </Route>

                {/* Principal Routes */}
                <Route path="/principal" element={
                    <ProtectedRoute allowedRoles={['principal']}>
                        <PrincipalLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<PrincipalDashboard />} />
                    <Route path="analytics" element={<InstitutionalAnalytics />} />
                    <Route path="departments" element={<DepartmentOverview />} />
                    <Route path="hods" element={<PolicyManagement />} />
                    <Route path="teachers" element={<TeacherOversight />} />
                    <Route path="students" element={<StudentOversight />} />
                    <Route path="audit-logs" element={<PrincipalAuditLogs />} />
                    <Route path="council" element={<PrincipalCouncil />} />
                    <Route path="profile" element={<AccountSettings />} />
                </Route>

                {/* Teacher Routes */}
                <Route path="/teacher" element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                        <TeacherLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<TeacherDashboard />} />
                    <Route path="students" element={<StudentManagement />} />
                    <Route path="classes" element={<MyClasses />} />
                    <Route path="attendance" element={<AttendanceMarking />} />
                    <Route path="events" element={<TeacherEventRequest />} />
                    <Route path="reports" element={<TeacherAttendanceReport />} />
                    <Route path="profile" element={<AccountSettings />} />
                    <Route path="audit-logs" element={<TeacherAuditLogs />} />
                    <Route path="bulk-upload" element={<BulkStudentUpload />} />

                    {/* Assessment Module */}
                    <Route path="tests" element={<AssessmentDashboard />} />
                    <Route path="tests/:testId" element={<AssessmentTestDetail />} />
                </Route>

                {/* Student Route */}
                <Route path="/student" element={
                    <ProtectedRoute allowedRoles={['student']}>
                        <StudentLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<StudentDashboard />} />
                    <Route path="attendance" element={<StudentAttendance />} />
                    <Route path="events" element={<EventExplorer />} />
                    <Route path="results" element={<StudentResults />} />
                    <Route path="council" element={<MyCouncil />} />
                    <Route path="council/propose-event" element={<StudentEventRequest />} />
                    <Route path="profile" element={<StudentProfile />} />
                    <Route path="projects" element={<ProjectShowcase />} />
                    <Route path="test-history" element={<StudentTestHistory />} />
                    <Route path="test-history/timeline" element={<StudentProgressTimeline />} />
                    <Route path="community" element={<CommunityExplore />} />
                    <Route path="directory" element={<StudentDirectory />} />
                    <Route path="view/:studentId" element={<StudentPublicProfile />} />
                </Route>

                {/* Account Settings - accessible by all authenticated staff */}
                <Route path="/account-settings" element={<AccountSettings />} />

                {/* Password Reset - must be outside ProtectedRoute so mustResetPassword users can reach it */}
                <Route path="/reset" element={<ResetPassword />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Suspense>
    );
}
