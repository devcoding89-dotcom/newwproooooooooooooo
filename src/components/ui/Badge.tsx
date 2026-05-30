import { AttendanceStatus, AlertPriority, ApprovalStatus, UserRole } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'teal';
  className?: string;
}

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  const variants = {
    green: 'badge-green',
    blue: 'badge-blue',
    amber: 'badge-amber',
    red: 'badge-red',
    gray: 'badge-gray',
    teal: 'badge bg-teal-100 text-teal-700',
  };
  return <span className={`${variants[variant]} ${className}`}>{children}</span>;
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { label: string; variant: BadgeProps['variant'] }> = {
    early: { label: 'Early', variant: 'blue' },
    present: { label: 'Present', variant: 'green' },
    late: { label: 'Late', variant: 'amber' },
    absent: { label: 'Absent', variant: 'red' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: AlertPriority }) {
  const map: Record<AlertPriority, { label: string; variant: BadgeProps['variant'] }> = {
    critical: { label: 'Critical', variant: 'red' },
    high: { label: 'High', variant: 'amber' },
    medium: { label: 'Medium', variant: 'blue' },
    low: { label: 'Low', variant: 'gray' },
  };
  const { label, variant } = map[priority];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { label: string; variant: BadgeProps['variant'] }> = {
    approved: { label: 'Approved', variant: 'green' },
    pending: { label: 'Pending', variant: 'amber' },
    rejected: { label: 'Rejected', variant: 'red' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, { label: string; variant: BadgeProps['variant'] }> = {
    student: { label: 'Student', variant: 'gray' },
    class_rep: { label: 'Class Rep', variant: 'blue' },
    teacher: { label: 'Teacher', variant: 'teal' },
    dept_admin: { label: 'Dept Admin', variant: 'amber' },
    super_admin: { label: 'Super Admin', variant: 'red' },
  };
  const { label, variant } = map[role];
  return <Badge variant={variant}>{label}</Badge>;
}
