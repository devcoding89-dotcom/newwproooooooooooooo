export type UserRole = 'student' | 'class_rep' | 'teacher' | 'dept_admin' | 'super_admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceStatus = 'early' | 'present' | 'late' | 'absent';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type MaterialStatus = 'pending' | 'processing' | 'processed' | 'failed';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  department_id: string | null;
  level_id: string | null;
  approval_status: ApprovalStatus;
  device_fingerprint: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Level {
  id: string;
  department_id: string;
  name: string;
  year: number;
  created_at: string;
  departments?: Department;
}

export interface Course {
  id: string;
  level_id: string;
  department_id: string;
  code: string;
  name: string;
  teacher_id: string | null;
  credit_units: number;
  created_at: string;
  levels?: Level;
  profiles?: Profile;
}

export interface Class {
  id: string;
  course_id: string;
  name: string;
  capacity: number;
  rep_id: string | null;
  created_at: string;
  courses?: Course;
  profiles?: Profile;
}

export interface TimetableEntry {
  id: string;
  class_id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue: string;
  recurrence: string;
  created_at: string;
  classes?: Class;
  courses?: Course;
}

export interface Session {
  id: string;
  timetable_id: string | null;
  class_id: string;
  course_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  qr_token: string;
  qr_expires_at: string | null;
  is_active: boolean;
  is_makeup: boolean;
  created_at: string;
  classes?: Class;
  courses?: Course;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  class_id: string;
  course_id: string;
  student_id: string;
  status: AttendanceStatus;
  scanned_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  device_fingerprint: string;
  profiles?: Profile;
  sessions?: Session;
}

export interface Alert {
  id: string;
  sender_id: string;
  recipient_id: string;
  title: string;
  body: string;
  priority: AlertPriority;
  type: string;
  course_id: string | null;
  is_read: boolean;
  delivery_status: string;
  created_at: string;
}

export interface Material {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  file_path: string;
  file_size: number;
  processing_status: MaterialStatus;
  uploaded_at: string;
  courses?: Course;
}

export interface AIConversation {
  id: string;
  student_id: string;
  course_id: string;
  question: string;
  answer: string;
  sources: { doc: string; page: number; similarity: number }[];
  created_at: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalCourses: number;
  totalClasses: number;
  avgAttendance: number;
  pendingApprovals: number;
  activeAlerts: number;
}
