import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { PageLoader } from './components/ui/LoadingSkeleton';
import { UserRole } from './types';

// Auth
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ApprovalPendingPage from './features/auth/ApprovalPendingPage';

// Teacher
import TeacherDashboard from './features/teacher/TeacherDashboard';
import TeacherAttendancePage from './features/teacher/TeacherAttendancePage';
import TeacherMaterialsPage from './features/teacher/TeacherMaterialsPage';


// Student
import StudentDashboard from './features/student/StudentDashboard';
import StudentAIAssistantPage from './features/student/StudentAIAssistantPage';

// Class Rep
import ClassRepDashboard from './features/class-rep/ClassRepDashboard';

// Shared
import TimetablePage from './features/shared/TimetablePage';
import AlertsPage from './features/shared/AlertsPage';

const roleRoutes: Record<UserRole, string> = {
  student: '/student/dashboard',
  class_rep: '/class-rep/dashboard',
  teacher: '/teacher/dashboard',
  dept_admin: '/login',
  super_admin: '/login',
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!isLoading && profile?.approval_status === 'pending') {
      navigate('/approval-pending', { replace: true });
    }
  }, [isAuthenticated, isLoading, profile, navigate]);

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function RoleGuard({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;

  // Block access to admin routes
  if (profile && (profile.role === 'dept_admin' || profile.role === 'super_admin')) {
    return <Navigate to={roleRoutes[profile.role]} replace />;
  }

  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to={profile ? roleRoutes[profile.role] : '/login'} replace />;
  }
  return <>{children}</>;
}

function RedirectToDashboard() {
  const { profile, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (profile?.approval_status === 'pending') return <Navigate to="/approval-pending" replace />;

  // Redirect admin users to login (hide access)
  if (profile && (profile.role === 'dept_admin' || profile.role === 'super_admin')) {
    return <Navigate to="/login" replace />;
  }

  if (profile) return <Navigate to={roleRoutes[profile.role]} replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/approval-pending" element={<ApprovalPendingPage />} />
        <Route path="/" element={<RedirectToDashboard />} />

        {/* Student */}
        <Route path="/student/*" element={
          <AuthGuard>
            <RoleGuard roles={['student']}>
              <Routes>
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="attendance" element={<TeacherAttendancePage />} />
                <Route path="ai-assistant" element={<StudentAIAssistantPage />} />
                <Route path="alerts" element={<AlertsPage />} />
              </Routes>
            </RoleGuard>
          </AuthGuard>
        } />

        {/* Class Rep */}
        <Route path="/class-rep/*" element={
          <AuthGuard>
            <RoleGuard roles={['class_rep']}>
              <Routes>
                <Route path="dashboard" element={<ClassRepDashboard />} />
                <Route path="attendance" element={<ClassRepDashboard />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="alerts" element={<AlertsPage />} />
              </Routes>
            </RoleGuard>
          </AuthGuard>
        } />

        {/* Teacher */}
        <Route path="/teacher/*" element={
          <AuthGuard>
            <RoleGuard roles={['teacher']}>
              <Routes>
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="classes" element={<TeacherDashboard />} />
                <Route path="attendance" element={<TeacherAttendancePage />} />
                <Route path="materials" element={<TeacherMaterialsPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="alerts" element={<AlertsPage />} />
              </Routes>
            </RoleGuard>
          </AuthGuard>
        } />


        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
