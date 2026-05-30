import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, Calendar,
  Bell, BarChart3, Settings, LogOut, QrCode, Brain,
  Building2, Shield, ChevronRight, FileText, UserCheck, X, Menu
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import { UserRole } from '../../types';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const navByRole: Record<UserRole, NavItem[]> = {
  student: [
    { to: '/student/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
    { to: '/student/timetable', icon: <Calendar className="w-4 h-4" />, label: 'Timetable' },
    { to: '/student/attendance', icon: <UserCheck className="w-4 h-4" />, label: 'My Attendance' },
    { to: '/student/ai-assistant', icon: <Brain className="w-4 h-4" />, label: 'AI Assistant' },
    { to: '/student/alerts', icon: <Bell className="w-4 h-4" />, label: 'Alerts' },
  ],
  class_rep: [
    { to: '/class-rep/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
    { to: '/class-rep/attendance', icon: <QrCode className="w-4 h-4" />, label: 'QR Attendance' },
    { to: '/class-rep/timetable', icon: <Calendar className="w-4 h-4" />, label: 'Timetable' },
    { to: '/class-rep/alerts', icon: <Bell className="w-4 h-4" />, label: 'Send Alerts' },
  ],
  teacher: [
    { to: '/teacher/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
    { to: '/teacher/classes', icon: <BookOpen className="w-4 h-4" />, label: 'My Classes' },
    { to: '/teacher/attendance', icon: <BarChart3 className="w-4 h-4" />, label: 'Attendance' },
    { to: '/teacher/materials', icon: <FileText className="w-4 h-4" />, label: 'Materials' },
    { to: '/teacher/timetable', icon: <Calendar className="w-4 h-4" />, label: 'Timetable' },
    { to: '/teacher/alerts', icon: <Bell className="w-4 h-4" />, label: 'Alerts' },
  ],
  dept_admin: [],
  super_admin: [],
};

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  student: { label: 'Student', color: 'text-gray-500' },
  class_rep: { label: 'Class Rep', color: 'text-blue-600' },
  teacher: { label: 'Teacher', color: 'text-teal-600' },
  dept_admin: { label: 'Dept Admin', color: 'text-amber-600' },
  super_admin: { label: 'Super Admin', color: 'text-red-600' },
};

export default function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile) return null;

  const navItems = navByRole[profile.role] || [];
  const { label: roleLabel, color: roleColor } = roleLabels[profile.role];

  return (
    <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="p-2 bg-primary-600 rounded-xl">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">SmartClass</p>
          <p className="text-[10px] text-gray-400 font-medium">Academic Platform</p>
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3 px-4 py-3.5 mx-3 my-3 bg-gray-50 rounded-xl">
        <Avatar name={profile.full_name || 'User'} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{profile.full_name || 'User'}</p>
          <p className={`text-[10px] font-medium ${roleColor}`}>{roleLabel}</p>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="sidebar-item-inactive w-full text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Mobile Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </aside>
  );
}
