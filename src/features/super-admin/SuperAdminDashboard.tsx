import { useState, useEffect, useCallback } from 'react';
import { Building2, Users, BookOpen, BarChart3, Plus, Settings, ChevronRight, Globe } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import { RoleBadge, ApprovalBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { StatCardSkeleton, TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { Profile, Department } from '../../types';

interface GlobalStats {
  totalDepartments: number;
  totalUsers: number;
  totalCourses: number;
  totalAttendance: number;
  pendingApprovals: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDeptModal, setShowNewDeptModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const [deptRes, usersRes, coursesRes, attRes] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('courses').select('id'),
      supabase.from('attendance').select('id'),
    ]);

    const users = usersRes.data || [];
    setDepartments(deptRes.data || []);
    setRecentUsers(users as Profile[]);
    setStats({
      totalDepartments: deptRes.data?.length || 0,
      totalUsers: users.length,
      totalCourses: coursesRes.data?.length || 0,
      totalAttendance: attRes.data?.length || 0,
      pendingApprovals: users.filter((u: Profile) => u.approval_status === 'pending').length,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateDept = async () => {
    if (!newDept.name || !newDept.code) return;
    setCreating(true);
    await supabase.from('departments').insert(newDept);
    setNewDept({ name: '', code: '' });
    setShowNewDeptModal(false);
    setCreating(false);
    fetchData();
  };

  return (
    <DashboardLayout
      title="Super Admin Dashboard"
      subtitle="Platform-wide administration and oversight"
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewDeptModal(true)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            New Department
          </button>
          <button className="btn-secondary text-xs">
            <Settings className="w-3.5 h-3.5" />
            Config
          </button>
        </div>
      }
    >
      {/* Global Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Departments" value={stats?.totalDepartments || 0} icon={<Building2 className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-50" />
            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<Users className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-50" />
            <StatCard title="Courses" value={stats?.totalCourses || 0} icon={<BookOpen className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50" />
            <StatCard title="Attendance Records" value={stats?.totalAttendance || 0} icon={<BarChart3 className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" />
            <StatCard title="Pending" value={stats?.pendingApprovals || 0} subtitle="Awaiting approval" icon={<Globe className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Departments */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Departments</h2>
            <button onClick={() => setShowNewDeptModal(true)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <Plus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {isLoading ? <TableSkeleton rows={3} /> : departments.length === 0 ? (
            <EmptyState title="No departments" action={
              <button onClick={() => setShowNewDeptModal(true)} className="btn-primary text-xs">Add Department</button>
            } />
          ) : (
            <div className="divide-y divide-gray-50">
              {departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Building2 className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{d.code}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Users</h2>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          {isLoading ? <TableSkeleton rows={6} /> : recentUsers.length === 0 ? (
            <EmptyState title="No users yet" icon={<Users className="w-5 h-5 text-gray-400" />} />
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
                {recentUsers.slice(0, 10).map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.full_name || 'U'} size="sm" />
                        <span className="text-sm font-medium text-gray-900">{u.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="table-td"><RoleBadge role={u.role} /></td>
                    <td className="table-td"><ApprovalBadge status={u.approval_status} /></td>
                    <td className="table-td text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* System Config Preview */}
      <div className="card mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">System Configuration</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'QR Token Expiry', value: '60 seconds', editable: true },
            { label: 'GPS Geofence Radius', value: '100 meters', editable: true },
            { label: 'AI Chat Limit', value: '30 requests/hour', editable: true },
            { label: 'Late Grace Period', value: '10 minutes', editable: true },
            { label: 'SMS Alert Delay', value: '30 seconds', editable: true },
            { label: 'Attendance Threshold', value: '70%', editable: true },
          ].map((c) => (
            <div key={c.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs font-medium text-gray-700">{c.label}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{c.value}</p>
              </div>
              <Settings className="w-3.5 h-3.5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* New Department Modal */}
      <Modal isOpen={showNewDeptModal} onClose={() => setShowNewDeptModal(false)} title="Create Department" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Department Name</label>
            <input value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
              placeholder="e.g. Computer Science" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Department Code</label>
            <input value={newDept.code} onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
              placeholder="e.g. CSC" maxLength={10} className="input-field font-mono" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowNewDeptModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleCreateDept} disabled={creating || !newDept.name || !newDept.code} className="btn-primary flex-1 justify-center">
              {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
