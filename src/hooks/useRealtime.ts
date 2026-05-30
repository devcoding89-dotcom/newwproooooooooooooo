import { useEffect } from 'react';
import { supabase } from '../config/supabase';

export function useRealtimeTable(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: (payload: Record<string, unknown>) => void,
  filter?: string
) {
  useEffect(() => {
    const channelName = `${table}_${event}_${filter || 'all'}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as Parameters<typeof channel.on>[0],
        { event, schema: 'public', table, ...(filter ? { filter } : {}) } as Parameters<typeof channel.on>[1],
        (payload) => callback(payload as Record<string, unknown>)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, event, filter, callback]);
}
