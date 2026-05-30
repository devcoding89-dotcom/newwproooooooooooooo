import { useState, useEffect, useCallback } from 'react';
import { BookOpen, BarChart3, Bell, Zap, Calendar, Target, TrendingUp, Flame } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import { AttendanceBadge } from '../../components/ui/Badge';
import { StatCardSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { AttendanceRecord, Course } from '../../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    const [attRes, enrollRes] = await Promise.all([
      supabase.from('attendance').select('*, courses(name, code), sessions(start_time, session_date)')
        .eq('student_id', profile.id).order('scanned_at', { ascending: false }).limit(10),
      supabase.from('class_enrollments').select('classes(course_id, courses(name, code))')
        .eq('student_id', profile.id),
    ]);

    setRecentAttendance((attRes.data || []) as AttendanceRecord[]);

    const courseList: Course[] = [];
    (enrollRes.data || []).forEach((e: unknown) => {
      const enroll = e as { classes?: { courses?: Course } };
      if (enroll.classes?.courses) courseList.push(enroll.classes.courses);
    });
    setCourses(courseList);
    setIsLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalAtt = recentAttendance.length;
  const presentAtt = recentAttendance.filter(a => ['present', 'early'].includes(a.status)).length;
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
  const streak = recentAttendance.filter(a => a.status !== 'absent').length;

  return (
    <DashboardLayout
      title="My Dashboard"
      subtitle={`${DAYS[new Date().getDay()]}, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Enrolled Courses" value={courses.length}
              icon={<BookOpen className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-50" />
            <StatCard title="Attendance Rate" value={`${attendanceRate}%`} subtitle="Overall"
              icon={<BarChart3 className="w-5 h-5 text-green-600" />} iconBg="bg-green-50"
              trend={{ value: 5, label: 'vs last week' }} />
            <StatCard title="Current Streak" value={streak} subtitle="Consecutive classes"
              icon={<Flame className="w-5 h-5 text-orange-600" />} iconBg="bg-orange-50" />
            <StatCard title="Target" value="70%" subtitle="Min attendance required"
              icon={<Target className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Courses */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">My Courses</h2>
            <span className="text-xs text-gray-400">{courses.length} enrolled</span>
          </div>
          {courses.length === 0 ? (
            <EmptyState title="No courses enrolled" description="Enroll in courses to get started." icon={<BookOpen className="w-5 h-5 text-gray-400" />} />
          ) : (
            <div className="divide-y divide-gray-50">
              {courses.map((c, i) => {
                const att = recentAttendance.filter(a => (a.courses as { id?: string })?.id === c.id);
                const rate = att.length > 0 ? Math.round((att.filter(a => ['present','early'].includes(a.status)).length / att.length) * 100) : 0;
                const colors = ['bg-primary-500', 'bg-teal-500', 'bg-amber-500', 'bg-green-500', 'bg-rose-500'];
                return (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50">
                    <div className={`w-1.5 h-10 rounded-full ${colors[i % colors.length]}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.code}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${rate >= 70 ? 'text-green-600' : 'text-red-500'}`}>{rate}%</p>
                      <p className="text-xs text-gray-400">attendance</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent Activity */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Recent Attendance</h2>
            </div>
            {recentAttendance.length === 0 ? (
              <EmptyState title="No records yet" icon={<TrendingUp className="w-4 h-4 text-gray-400" />} />
            ) : (
              <div className="divide-y divide-gray-50">
                {recentAttendance.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{(r.courses as { code?: string })?.code || 'Course'}</p>
                      <p className="text-[10px] text-gray-400">
                        {r.scanned_at ? new Date(r.scanned_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <AttendanceBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'AI Revision Assistant', icon: <Zap className="w-4 h-4" />, color: 'bg-primary-50 text-primary-700 hover:bg-primary-100', to: '/student/ai-assistant' },
                { label: 'View Timetable', icon: <Calendar className="w-4 h-4" />, color: 'bg-green-50 text-green-700 hover:bg-green-100', to: '/student/timetable' },
                { label: 'Check Alerts', icon: <Bell className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100', to: '/student/alerts' },
              ].map((action) => (
                <button key={action.label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${action.color}`}>
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
