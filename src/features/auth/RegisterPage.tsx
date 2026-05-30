import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, Phone, AlertCircle, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
import { UserRole, Department, Level } from '../../types';

const roles: { value: UserRole; label: string; desc: string; color: string }[] = [
  { value: 'student', label: 'Student', desc: 'Access timetable, scan QR attendance, use AI tutor', color: 'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10' },
  { value: 'class_rep', label: 'Class Rep', desc: 'Generate QR codes, send alerts, manage attendance', color: 'border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10' },
  { value: 'teacher', label: 'Teacher', desc: 'View attendance analytics, manage materials', color: 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10' },
  { value: 'dept_admin', label: 'Dept Admin', desc: 'Manage users, courses, and department reports', color: 'border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10' },
  { value: 'super_admin', label: 'Super Admin', desc: 'Full platform administration and configuration', color: 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
    department_id: '', level_id: '',
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  useEffect(() => {
    if (form.department_id) {
      supabase.from('levels').select('*').eq('department_id', form.department_id).order('year').then(({ data }) => {
        if (data) setLevels(data);
        setForm((f) => ({ ...f, level_id: '' }));
      });
    }
  }, [form.department_id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError('');
    setIsLoading(true);
    try {
      await signUp(form.email, form.password, {
        full_name: form.full_name,
        role: selectedRole,
        phone: form.phone,
        department_id: form.department_id || undefined,
        level_id: form.level_id || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3.5 bg-green-500/20 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
          <p className="text-blue-200/70 text-sm mb-6">
            {selectedRole === 'student'
              ? 'Your student account is ready. You can sign in now.'
              : 'Your account is pending approval from an administrator. You will be notified once approved.'}
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full justify-center">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="p-2.5 bg-primary-600 rounded-xl">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">SmartClass</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-7">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-white/10 text-blue-300/50'
                }`}>{s}</div>
                {s < 2 && <div className={`h-px w-12 transition-all ${step > s ? 'bg-primary-600' : 'bg-white/10'}`} />}
              </div>
            ))}
            <span className="text-xs text-blue-300/60 ml-2">
              {step === 1 ? 'Choose your role' : 'Enter your details'}
            </span>
          </div>

          {step === 1 ? (
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Select your role</h1>
              <p className="text-blue-300/60 text-sm mb-5">Choose the role that matches your position in the institution.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRole(r.value)}
                    className={`text-left p-4 rounded-xl border transition-all ${r.color} ${
                      selectedRole === r.value ? 'ring-2 ring-primary-500' : ''
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{r.label}</p>
                    <p className="text-xs text-blue-300/60 mt-1 leading-relaxed">{r.desc}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedRole}
                className="btn-primary w-full justify-center mt-5"
              >
                Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 mb-5">
                <button type="button" onClick={() => setStep(1)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <ChevronLeft className="w-4 h-4 text-blue-300" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Create your account</h1>
                  <p className="text-blue-300/60 text-xs">Registering as <span className="text-primary-400 font-medium">{roles.find(r => r.value === selectedRole)?.label}</span></p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                    <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="John Doe" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@university.edu" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                    <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 8 characters" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/60" />
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+234 800 000 0000" className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-300/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Department</label>
                  <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="" className="bg-slate-800">Select department</option>
                    {departments.map((d) => <option key={d.id} value={d.id} className="bg-slate-800">{d.name}</option>)}
                  </select>
                </div>

                {(selectedRole === 'student' || selectedRole === 'class_rep') && (
                  <div>
                    <label className="block text-xs font-medium text-blue-200/80 mb-1.5">Level</label>
                    <select value={form.level_id} onChange={(e) => setForm({ ...form, level_id: e.target.value })}
                      disabled={!form.department_id}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50">
                      <option value="" className="bg-slate-800">Select level</option>
                      {levels.map((l) => <option key={l.id} value={l.id} className="bg-slate-800">{l.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center mt-5">
                {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</> : 'Create Account'}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-blue-300/60">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
