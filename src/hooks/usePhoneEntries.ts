import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PhoneEntry } from '@/types/phone';

export function usePhoneEntries(departmentId?: string) {
  const [entries, setEntries] = useState<PhoneEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let q = supabase.from('phone_entries').select('*').order('extension');
    if (departmentId) q = q.eq('department_id', departmentId);
    const { data } = await q;
    if (data) setEntries(data);
    setLoading(false);
  }, [departmentId]);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel(`entries-${departmentId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const create = async (entry: { department_id: string; extension: string; name: string; designation?: string; phone?: string; email?: string; status?: string }) => {
    const { error } = await supabase.from('phone_entries').insert(entry);
    if (!error) await fetch();
    return { error: error?.message || null };
  };

  const update = async (id: string, updates: Partial<PhoneEntry>) => {
    const { error } = await supabase.from('phone_entries').update(updates).eq('id', id);
    if (!error) await fetch();
    return { error: error?.message || null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('phone_entries').delete().eq('id', id);
    if (!error) await fetch();
    return { error: error?.message || null };
  };

  return { entries, loading, create, update, remove, refetch: fetch };
}
