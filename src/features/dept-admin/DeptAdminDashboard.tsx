import { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, BarChart3, Bell, UserCheck, UserX, Clock, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import { ApprovalBadge, RoleBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { StatCardSkeleton, TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Profile } from '../../types';

interface DeptStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  pendingApprovals: number;
  avgAttendance: number;
}

export default function DeptAdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DeptStats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.department_id) return;

    const [usersRes, coursesRes, attRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('department_id', profile.department_id).order('created_at', { ascending: false }),
      supabase.from('courses').select('id').eq('department_id', profile.department_id),
      supabase.from('attendance').select('status').limit(200),
    ]);

    const users = usersRes.data || [];
    const courses = coursesRes.data || [];
    const attData = attRes.data || [];

    setAllUsers(users as Profile[]);
    setPendingUsers(users.filter((u: Profile) => u.approval_status === 'pending') as Profile[]);

    const present = attData.filter((a) => ['present', 'early'].includes(a.status)).length;
    const avgAtt = attData.length > 0 ? Math.round((present / attData.length) * 100) : 0;

    setStats({
      totalStudents: users.filter((u: Profile) => u.role === 'student').length,
      totalTeachers: users.filter((u: Profile) => u.role === 'teacher').length,
      totalCourses: courses.length,
      pendingApprovals: users.filter((u: Profile) => u.approval_status === 'pending').length,
      avgAttendance: avgAtt,
    });

    setIsLoading(false);
  }, [profile?.department_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApproval = async (userId: string, status: 'approved' | 'rejected') => {
    setIsApproving(userId);
    await supabase.from('profiles').update({ approval_status: status }).eq('id', userId);
    await fetchData();
    setIsApproving(null);
  };

  return (
    <DashboardLayout
      title="Department Dashboard"
      subtitle={`Managing your department's academic operations`}
      actions={
        <button className="btn-primary text-xs">
          <Bell className="w-3.5 h-3.5" />
          Send Alert
        </button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Students" value={stats?.totalStudents || 0} icon={<Users className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-50" />
            <StatCard title="Teachers" value={stats?.totalTeachers || 0} icon={<UserCheck className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-50" />
            <StatCard title="Courses" value={stats?.totalCourses || 0} icon={<BookOpen className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50" />
            <StatCard title="Avg Attendance" value={`${stats?.avgAttendance || 0}%`} icon={<BarChart3 className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" />
            <StatCard title="Pending" value={stats?.pendingApprovals || 0} subtitle="Awaiting approval"
              icon={<Clock className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pending Approvals */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Pending Approvals</h2>
            {pendingUsers.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{pendingUsers.length}</span>
            )}
          </div>
          {isLoading ? <TableSkeleton rows={3} /> : pendingUsers.length === 0 ? (
            <EmptyState title="All caught up!" description="No pending approvals." icon={<UserCheck className="w-5 h-5 text-green-400" />} />
          ) : (
            <div className="divide-y divide-gray-50">
              {pendingUsers.map((u) => (
                <div key={u.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <Avatar name={u.full_name || 'U'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                      <RoleBadge role={u.role} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproval(u.id, 'approved')}
                      disabled={isApproving === u.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg transition-colors"
                    >
                      {isApproving === u.id ? <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> : <UserCheck className="w-3 h-3" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(u.id, 'rejected')}
                      disabled={isApproving === u.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                    >
                      <UserX className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Management Table */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Department Users</h2>
            <button className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {isLoading ? <TableSkeleton rows={5} /> : allUsers.length === 0 ? (
            <EmptyState title="No users yet" description="Department members will appear here." icon={<Users className="w-5 h-5 text-gray-400" />} />
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">User</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.slice(0, 8).map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.full_name || 'U'} size="sm" />
                        <span className="font-medium text-gray-900 text-sm">{u.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="table-td"><RoleBadge role={u.role} /></td>
                    <td className="table-td"><ApprovalBadge status={u.approval_status} /></td>
                    <td className="table-td text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Attendance Heatmap Placeholder */}
      <div className="card mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Attendance Heatmap</h2>
          <span className="text-xs text-gray-400">Last 30 days</span>
        </div>
        <div className="p-5">
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 30 }).map((_, i) => {
              const rate = Math.random();
              const bg = rate > 0.8 ? 'bg-green-500' : rate > 0.6 ? 'bg-green-300' : rate > 0.4 ? 'bg-amber-300' : rate > 0.2 ? 'bg-red-300' : 'bg-gray-100';
              return <div key={i} className={`w-7 h-7 rounded-md ${bg} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`} title={`Day ${i + 1}: ${Math.round(rate * 100)}%`} />;
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {[{ label: 'High (>80%)', bg: 'bg-green-500' }, { label: 'Good (60-80%)', bg: 'bg-green-300' }, { label: 'Average (40-60%)', bg: 'bg-amber-300' }, { label: 'Low (<40%)', bg: 'bg-red-300' }].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${l.bg}`} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
