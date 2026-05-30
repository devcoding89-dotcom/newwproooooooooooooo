import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function ApprovalPendingPage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleRefresh = async () => {
    await refreshProfile();
    if (profile?.approval_status === 'approved') {
      const routes: Record<string, string> = {
        class_rep: '/class-rep/dashboard',
        teacher: '/teacher/dashboard',
        dept_admin: '/dept-admin/dashboard',
        super_admin: '/super-admin/dashboard',
      };
      navigate(routes[profile.role] || '/student/dashboard');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="p-4 bg-amber-500/20 rounded-full">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-pulse-soft" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Approval Pending</h2>
        <p className="text-blue-200/70 text-sm leading-relaxed mb-2">
          Your <span className="text-white font-medium capitalize">{profile?.role?.replace('_', ' ')}</span> account has been created and is awaiting approval.
        </p>
        <p className="text-blue-300/50 text-xs mb-8">
          An administrator will review your account shortly. You will be notified once approved.
        </p>
        <div className="space-y-3">
          <button onClick={handleRefresh} className="btn-primary w-full justify-center">
            <RefreshCw className="w-4 h-4" />
            Check Approval Status
          </button>
          <button onClick={handleSignOut} className="btn-secondary w-full justify-center bg-white/5 border-white/10 text-blue-300 hover:bg-white/10">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
