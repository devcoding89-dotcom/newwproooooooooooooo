import { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, BarChart3, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Upload, Eye } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import Avatar from '../../components/ui/Avatar';
import { AttendanceBadge } from '../../components/ui/Badge';
import { StatCardSkeleton, TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRealtimeTable } from '../../hooks/useRealtime';
import { Course, AttendanceRecord } from '../../types';

interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  avgAttendance: number;
  activeSessions: number;
}

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;

    const [coursesRes, classesRes, attendanceRes] = await Promise.all([
      supabase.from('courses').select('*, levels(name, year)').eq('teacher_id', profile.id).order('code'),
      supabase.from('classes').select('id, course_id, courses!inner(teacher_id)').eq('courses.teacher_id', profile.id),
      supabase.from('attendance').select('*, profiles(full_name, avatar_url), sessions(start_time, courses(name, code))')
        .in('course_id', [])
        .order('scanned_at', { ascending: false })
        .limit(10),
    ]);

    const courseList = coursesRes.data || [];
    setCourses(courseList);

    const courseIds = courseList.map((c: Course) => c.id);

    if (courseIds.length > 0) {
      const { data: attData } = await supabase
        .from('attendance')
        .select('*, profiles(full_name), sessions(start_time, courses(name, code))')
        .in('course_id', courseIds)
        .order('scanned_at', { ascending: false })
        .limit(10);
      setRecentAttendance((attData || []) as AttendanceRecord[]);

      const { data: attStats } = await supabase
        .from('attendance')
        .select('status')
        .in('course_id', courseIds);

      const total = attStats?.length || 0;
      const present = attStats?.filter((a) => ['present', 'early'].includes(a.status)).length || 0;
      const avgAttendance = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({
        totalClasses: classesRes.data?.length || 0,
        totalStudents: 0,
        avgAttendance,
        activeSessions: 0,
      });
    } else {
      setStats({ totalClasses: 0, totalStudents: 0, avgAttendance: 0, activeSessions: 0 });
    }

    setIsLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtimeTable('attendance', 'INSERT', useCallback(() => { fetchData(); }, [fetchData]));

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <DashboardLayout
      title="Teacher Dashboard"
      subtitle={`Welcome back, ${profile?.full_name?.split(' ')[0] || 'Teacher'}`}
      actions={
        <button className="btn-primary text-xs">
          <Upload className="w-3.5 h-3.5" />
          Upload Materials
        </button>
      }
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="My Courses" value={courses.length} subtitle="Active this semester"
              icon={<BookOpen className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-50" />
            <StatCard title="Classes" value={stats?.totalClasses || 0} subtitle="Registered classes"
              icon={<Users className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-50" />
            <StatCard title="Avg Attendance" value={`${stats?.avgAttendance || 0}%`} subtitle="Across all classes"
              icon={<BarChart3 className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50"
              trend={{ value: 3, label: 'vs last week' }} />
            <StatCard title="Active Now" value={stats?.activeSessions || 0} subtitle="Live sessions"
              icon={<Clock className="w-5 h-5 text-green-600" />} iconBg="bg-green-50" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Courses List */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">My Courses</h2>
            <span className="text-xs text-gray-400">{courses.length} courses</span>
          </div>
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : courses.length === 0 ? (
            <EmptyState title="No courses assigned" description="You haven't been assigned to any courses yet." icon={<BookOpen className="w-5 h-5 text-gray-400" />} />
          ) : (
            <div className="divide-y divide-gray-50">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <BookOpen className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{course.name}</p>
                      <p className="text-xs text-gray-500">{course.code} · {course.credit_units} units</p>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Attendance Overview</h2>
          </div>
          <div className="p-5">
            {/* Donut-style summary */}
            <div className="flex flex-col gap-3 mb-4">
              {[
                { label: 'Present', count: recentAttendance.filter(a => a.status === 'present').length, color: 'bg-green-500', icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" /> },
                { label: 'Early', count: recentAttendance.filter(a => a.status === 'early').length, color: 'bg-blue-500', icon: <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> },
                { label: 'Late', count: recentAttendance.filter(a => a.status === 'late').length, color: 'bg-amber-500', icon: <Clock className="w-3.5 h-3.5 text-amber-600" /> },
                { label: 'Absent', count: recentAttendance.filter(a => a.status === 'absent').length, color: 'bg-red-500', icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
              ].map((item) => {
                const total = recentAttendance.length || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {item.icon}
                        <span className="text-xs text-gray-600">{item.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{item.count}</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 mb-2.5">Recent Scans</h3>
            {recentAttendance.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No recent attendance</p>
            ) : (
              <div className="space-y-2">
                {recentAttendance.slice(0, 4).map((record) => (
                  <div key={record.id} className="flex items-center gap-2.5">
                    <Avatar name={(record.profiles as { full_name?: string })?.full_name || 'Student'} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {(record.profiles as { full_name?: string })?.full_name || 'Student'}
                      </p>
                    </div>
                    <AttendanceBadge status={record.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Schedule Preview */}
      <div className="card mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Weekly Schedule</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => (
              <div key={day} className={`text-center p-2 rounded-lg ${i === new Date().getDay() ? 'bg-primary-50 border border-primary-200' : ''}`}>
                <p className={`text-xs font-medium mb-2 ${i === new Date().getDay() ? 'text-primary-700' : 'text-gray-500'}`}>{day}</p>
                <div className="space-y-1">
                  {courses.slice(0, 1).filter(() => i % 3 === 1).map((c) => (
                    <div key={c.id} className="px-1 py-0.5 bg-primary-100 rounded text-[10px] text-primary-700 truncate">{c.code}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="card mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Attention Required</h2>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {[
              { msg: 'CSC301 attendance below 60% threshold', type: 'warning' },
              { msg: '3 students have not attended any sessions', type: 'error' },
            ].map((alert, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl ${alert.type === 'error' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alert.type === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                <p className={`text-xs ${alert.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}>{alert.msg}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
