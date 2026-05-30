import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { TimetableEntry } from '../../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['bg-primary-500', 'bg-teal-500', 'bg-amber-500', 'bg-green-500', 'bg-rose-500', 'bg-sky-500'];

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const today = new Date().getDay();

  const fetchTimetable = useCallback(async () => {
    const { data } = await supabase
      .from('timetable')
      .select('*, courses(name, code), classes(name)')
      .order('start_time');
    setEntries((data || []) as TimetableEntry[]);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  const dayEntries = entries.filter((e) => e.day_of_week === selectedDay);

  return (
    <DashboardLayout title="Timetable" subtitle="Your weekly class schedule"
      actions={
        <button className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" />
          Add Session
        </button>
      }
    >
      {/* Day Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-gray-100 rounded-xl p-1.5 shadow-sm">
        {SHORT_DAYS.map((d, i) => (
          <button
            key={d}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              selectedDay === i
                ? 'bg-primary-600 text-white shadow-sm'
                : i === today
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="block">{d}</span>
            {i === today && selectedDay !== i && <span className="block w-1 h-1 bg-primary-400 rounded-full mx-auto mt-0.5" />}
          </button>
        ))}
      </div>

      {/* Day Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{DAYS[selectedDay]}</h2>
          <p className="text-xs text-gray-500">{dayEntries.length} class{dayEntries.length !== 1 ? 'es' : ''} scheduled</p>
        </div>
        {selectedDay === today && (
          <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">Today</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : dayEntries.length === 0 ? (
        <EmptyState
          title={selectedDay === 0 || selectedDay === 6 ? 'Weekend' : 'No classes today'}
          description={selectedDay === 0 || selectedDay === 6 ? 'Enjoy your weekend!' : 'No classes scheduled for this day.'}
          icon={<Calendar className="w-5 h-5 text-gray-400" />}
        />
      ) : (
        <div className="space-y-3">
          {dayEntries.map((entry, i) => (
            <div key={entry.id} className="card p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`w-1.5 self-stretch rounded-full ${COLORS[i % COLORS.length]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {(entry.courses as { name?: string })?.name || 'Course'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(entry.courses as { code?: string })?.code} · {(entry.classes as { name?: string })?.name}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${COLORS[i % COLORS.length].replace('bg-', 'bg-').replace('500', '100')} text-${COLORS[i % COLORS.length].split('-')[1]}-700`}>
                    {entry.recurrence}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {entry.start_time} – {entry.end_time}
                  </div>
                  {entry.venue && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {entry.venue}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
