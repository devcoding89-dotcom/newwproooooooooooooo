import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { UserRole } from '../../types';

const roleRoutes: Record<UserRole, string> = {
  student: '/student/dashboard',
  class_rep: '/class-rep/dashboard',
  teacher: '/teacher/dashboard',
  dept_admin: '/dept-admin/dashboard',
  super_admin: '/super-admin/dashboard',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, connectionError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // Check if Supabase is reachable
  useEffect(() => {
    console.log('Checking Supabase connectivity...');
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
      .then((res) => {
        console.log('Supabase connectivity check response:', res.status);
        setIsOnline(res.status === 401 || res.status < 500); // 401 is expected
      })
      .catch((err) => {
        console.error('Supabase connectivity check failed:', err);
        setIsOnline(false);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { user } = await signIn(email, password);
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role, approval_status').eq('id', user.id).maybeSingle();
        if (profile?.approval_status === 'pending') {
          navigate('/approval-pending');
          return;
        }
        if (profile?.approval_status === 'rejected') {
          setError('Your account has been rejected. Please contact your department administrator.');
          return;
        }
        navigate(roleRoutes[profile?.role as UserRole] || '/student/dashboard');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Cannot connect to the server. Please check if Supabase is reachable from this environment.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login for testing when Supabase is unreachable
  const handleDemoLogin = (role: UserRole) => {
    localStorage.setItem('demo_user', JSON.stringify({
      id: 'demo-' + role,
      email: `demo_${role}@smartclass.test`,
      role,
      full_name: role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      approval_status: 'approved',
    }));
    window.location.href = roleRoutes[role];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SmartClass</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Transforming<br />Academic Excellence
          </h2>
          <p className="text-blue-200/80 text-lg leading-relaxed">
            The integrated platform eliminating daily inefficiencies in academic institutions.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative space-y-3">
          {[
            { label: 'QR Attendance with Anti-Cheat', desc: 'GPS + device fingerprint validation' },
            { label: 'DND-Breaking Smart Alerts', desc: 'Critical notifications that get through' },
            { label: 'AI Revision Assistant', desc: 'RAG-powered course material Q&A' },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{f.label}</p>
                <p className="text-xs text-blue-300/70 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <div className="p-2.5 bg-primary-600 rounded-xl">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SmartClass</span>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-5 ${
              isOnline === null ? 'bg-gray-500/10 text-gray-300' :
              isOnline ? 'bg-green-500/10 text-green-300' :
              'bg-red-500/10 text-red-300'
            }`}>
              {isOnline === null ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Checking connection...</span>
                </>
              ) : isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-xs">Connected to Supabase</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-xs">Unable to reach Supabase from this environment</span>
                </>
              )}
            </div>

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-blue-300/70 text-sm mt-1">Sign in to your SmartClass account</p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-300">{error}</p>
                  {error.includes('Cannot connect') && (
                    <p className="text-xs text-red-400/70 mt-1">
                      The Supabase endpoint might be unreachable from this preview environment.
                      Try opening the app in a new tab or check if the project allows requests from this domain.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-blue-400/60 hover:text-blue-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo Mode */}
            {isOnline === false && (
              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="text-xs text-blue-300/50 text-center mb-3">Demo mode (Supabase unreachable)</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['student', 'teacher', 'class_rep', 'super_admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleDemoLogin(r)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-blue-200 transition-colors"
                    >
                      Demo: {r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-5 text-center text-sm text-blue-300/60">
              New to SmartClass?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
