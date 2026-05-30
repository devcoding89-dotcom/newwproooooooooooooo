import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Filter, Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { AttendanceBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { AttendanceRecord } from '../../types';

export default function TeacherAttendancePage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAttendance = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('attendance')
      .select('*, profiles(full_name), sessions(start_time, session_date), courses(name, code)')
      .order('scanned_at', { ascending: false })
      .limit(100);
    setRecords((data || []) as AttendanceRecord[]);
    setIsLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const filtered = records.filter((r) => {
    const name = (r.profiles as { full_name?: string })?.full_name?.toLowerCase() || '';
    const matchesSearch = !search || name.includes(search.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="Attendance Management" subtitle="View and export attendance records"
      actions={
        <button className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Records', value: records.length, color: 'text-gray-900' },
          { label: 'Present', value: records.filter(r => ['present','early'].includes(r.status)).length, color: 'text-green-600' },
          { label: 'Late', value: records.filter(r => r.status === 'late').length, color: 'text-amber-600' },
          { label: 'Absent', value: records.filter(r => r.status === 'absent').length, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..." className="pl-9 input-field text-xs py-2" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-xs py-2 pr-7 w-32">
              <option value="">All Status</option>
              <option value="early">Early</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {isLoading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
          <EmptyState title="No records found" description="Attendance records will appear here once students start scanning." icon={<BarChart3 className="w-5 h-5 text-gray-400" />} />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">Course</th>
                <th className="table-th">Status</th>
                <th className="table-th">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={(r.profiles as { full_name?: string })?.full_name || 'S'} size="sm" />
                      <span className="font-medium text-gray-900">{(r.profiles as { full_name?: string })?.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{(r.courses as { code?: string })?.code || '-'}</td>
                  <td className="table-td"><AttendanceBadge status={r.status} /></td>
                  <td className="table-td text-gray-500 text-xs">
                    {r.scanned_at ? new Date(r.scanned_at).toLocaleString() : '-'}
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
