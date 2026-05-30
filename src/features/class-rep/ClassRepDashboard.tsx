import { useState, useEffect, useCallback, useRef } from 'react';
import { QrCode, Users, Bell, RefreshCw, CheckCircle, Clock, XCircle, Play, Square, Send } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import { AttendanceBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { StatCardSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeTable } from '../../hooks/useRealtime';
import { AttendanceRecord } from '../../types';

// Simple QR display using CSS pattern (no library needed)
function QRDisplay({ token, expiresAt }: { token: string; expiresAt: Date }) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(secs);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const pct = (timeLeft / 60) * 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-48 h-48 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden">
        {/* Simulated QR pattern */}
        <div className="grid grid-cols-8 gap-0.5 p-3 opacity-80">
          {Array.from({ length: 64 }).map((_, i) => {
            const isBlack = (i + (i % 8) + Math.floor(i / 8)) % 2 === 0 || [0,1,6,7,8,15,48,55,56,57,62,63].includes(i);
            return <div key={i} className={`w-3.5 h-3.5 rounded-[2px] ${isBlack ? 'bg-gray-900' : 'bg-white'}`} />;
          })}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl">
            <QrCode className="w-8 h-8 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="w-full">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Expires in</span>
          <span className={`font-bold ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>{timeLeft}s</span>
        </div>
        <div className="progress-bar">
          <div className={`progress-fill transition-all duration-1000 ${timeLeft < 15 ? 'bg-red-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="text-xs text-gray-400 font-mono text-center break-all px-2">{token.slice(0, 32)}...</p>
    </div>
  );
}

export default function ClassRepDashboard() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrExpires, setQrExpires] = useState<Date>(new Date());
  const [showQR, setShowQR] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({ title: '', body: '', priority: 'medium' });
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAttendance = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name)')
      .order('scanned_at', { ascending: false })
      .limit(20);
    setAttendance((data || []) as AttendanceRecord[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  useRealtimeTable('attendance', 'INSERT', useCallback(() => { fetchAttendance(); }, [fetchAttendance]));

  const generateToken = () => {
    const token = `QR_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const expires = new Date(Date.now() + 60000);
    setQrToken(token);
    setQrExpires(expires);
    return token;
  };

  const startSession = () => {
    setIsSessionActive(true);
    generateToken();
    setShowQR(true);
    refreshRef.current = setInterval(generateToken, 55000);
  };

  const endSession = () => {
    setIsSessionActive(false);
    setShowQR(false);
    if (refreshRef.current) clearInterval(refreshRef.current);
  };

  useEffect(() => () => { if (refreshRef.current) clearInterval(refreshRef.current); }, []);

  const stats = {
    present: attendance.filter(a => ['present', 'early'].includes(a.status)).length,
    late: attendance.filter(a => a.status === 'late').length,
    absent: attendance.filter(a => a.status === 'absent').length,
  };

  return (
    <DashboardLayout
      title="Class Rep Dashboard"
      subtitle={`Manage attendance and alerts for your class`}
      actions={
        <div className="flex gap-2">
          {!isSessionActive ? (
            <button onClick={startSession} className="btn-primary text-xs">
              <Play className="w-3.5 h-3.5" />
              Start Class
            </button>
          ) : (
            <button onClick={endSession} className="btn-danger text-xs">
              <Square className="w-3.5 h-3.5" />
              End Session
            </button>
          )}
          <button onClick={() => setShowAlert(true)} className="btn-secondary text-xs">
            <Bell className="w-3.5 h-3.5" />
            Send Alert
          </button>
        </div>
      }
    >
      {/* Active Session Banner */}
      {isSessionActive && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft" />
            <p className="text-sm font-medium text-green-800">Session Active — QR codes are rotating every 55 seconds</p>
          </div>
          <button onClick={() => setShowQR(true)} className="text-xs text-green-700 font-medium hover:underline flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5" />
            Show QR
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard title="Present" value={stats.present} icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" />
            <StatCard title="Late" value={stats.late} icon={<Clock className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50" />
            <StatCard title="Absent" value={stats.absent} icon={<XCircle className="w-5 h-5 text-red-500" />} iconBg="bg-red-50" />
          </>
        )}
      </div>

      {/* Live Attendance */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Live Attendance</h2>
          <button onClick={fetchAttendance} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
        {attendance.length === 0 ? (
          <EmptyState title="No scans yet" description="Start a session and students will appear here as they scan." icon={<Users className="w-5 h-5 text-gray-400" />} />
        ) : (
          <div className="divide-y divide-gray-50">
            {attendance.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <Avatar name={(r.profiles as { full_name?: string })?.full_name || 'S'} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{(r.profiles as { full_name?: string })?.full_name || 'Student'}</p>
                    <p className="text-xs text-gray-400">{r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : '-'}</p>
                  </div>
                </div>
                <AttendanceBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Modal */}
      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Active QR Code" size="sm">
        <QRDisplay token={qrToken} expiresAt={qrExpires} />
      </Modal>

      {/* Send Alert Modal */}
      <Modal isOpen={showAlert} onClose={() => setShowAlert(false)} title="Send Class Alert" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Title</label>
            <input value={alertForm.title} onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
              placeholder="e.g. Class starts in 5 minutes" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Message</label>
            <textarea value={alertForm.body} onChange={(e) => setAlertForm({ ...alertForm, body: e.target.value })}
              placeholder="Write your message..." rows={3} className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Priority</label>
            <select value={alertForm.priority} onChange={(e) => setAlertForm({ ...alertForm, priority: e.target.value })} className="input-field">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical (DND-breaking)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAlert(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button className="btn-primary flex-1 justify-center">
              <Send className="w-3.5 h-3.5" />
              Send Alert
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
