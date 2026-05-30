import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Filter, UserCheck, UserX } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ApprovalBadge, RoleBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Profile } from '../../types';

export default function DeptAdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!profile?.department_id) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('department_id', profile.department_id)
      .order('created_at', { ascending: false });
    setUsers((data || []) as Profile[]);
    setIsLoading(false);
  }, [profile?.department_id]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleApproval = async (userId: string, status: 'approved' | 'rejected') => {
    setProcessingId(userId);
    await supabase.from('profiles').update({ approval_status: status }).eq('id', userId);
    await fetchUsers();
    setProcessingId(null);
  };

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus = !statusFilter || u.approval_status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <DashboardLayout title="User Management" subtitle="Manage department members and approval requests">
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-gray-100">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..." className="pl-9 input-field text-xs py-2" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field text-xs py-2 w-36">
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="class_rep">Class Rep</option>
              <option value="teacher">Teacher</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-xs py-2 w-36">
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} users</span>
        </div>

        {isLoading ? <TableSkeleton rows={8} /> : filtered.length === 0 ? (
          <EmptyState title="No users found" icon={<Users className="w-5 h-5 text-gray-400" />} />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th">Joined</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.id} className="table-row">
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.full_name || 'U'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{u.phone || 'No phone'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td"><RoleBadge role={u.role} /></td>
                  <td className="table-td"><ApprovalBadge status={u.approval_status} /></td>
                  <td className="table-td text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="table-td">
                    {u.approval_status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleApproval(u.id, 'approved')} disabled={processingId === u.id}
                          className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
                          {processingId === u.id ? <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleApproval(u.id, 'rejected')} disabled={processingId === u.id}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
