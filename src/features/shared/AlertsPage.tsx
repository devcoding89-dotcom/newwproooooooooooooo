import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PriorityBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../../types';

const priorityColors: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50/30',
  high: 'border-l-orange-500 bg-orange-50/30',
  medium: 'border-l-blue-500 bg-blue-50/30',
  low: 'border-l-gray-300 bg-gray-50/10',
};

export default function AlertsPage() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');

  const fetchAlerts = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false });
    setAlerts((data || []) as Alert[]);
    setIsLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markAllRead = async () => {
    if (!profile?.id) return;
    await supabase.from('alerts').update({ is_read: true }).eq('recipient_id', profile.id).eq('is_read', false);
    fetchAlerts();
  };

  const filtered = alerts.filter((a) => !priorityFilter || a.priority === priorityFilter);
  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <DashboardLayout title="Alerts" subtitle="Notifications and important announcements"
      actions={
        unreadCount > 0 ? (
          <button onClick={markAllRead} className="btn-secondary text-xs">
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        ) : undefined
      }
    >
      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {['', 'critical', 'high', 'medium', 'low'].map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                priorityFilter === p ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {p ? p.charAt(0).toUpperCase() + p.slice(1) : 'All'}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white border border-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No alerts" description="You're all caught up! No notifications to display."
          icon={<Bell className="w-5 h-5 text-gray-400" />} />
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`card border-l-4 px-5 py-4 transition-all ${priorityColors[alert.priority]} ${!alert.is_read ? 'ring-1 ring-inset ring-gray-100' : 'opacity-80'}`}
              onClick={async () => {
                if (!alert.is_read) {
                  await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id);
                  fetchAlerts();
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!alert.is_read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />}
                    <p className={`text-sm font-semibold ${alert.is_read ? 'text-gray-600' : 'text-gray-900'}`}>{alert.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{alert.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                <PriorityBadge priority={alert.priority} />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
