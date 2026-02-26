import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Office } from '@/types/phone';

export function useOffices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('offices').select('*').order('sort_order').order('created_at');
    if (data) setOffices(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('offices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const create = async (name: string, description?: string) => {
    const { error } = await supabase.from('offices').insert({ name, description });
    if (!error) await fetch(); // Immediately refetch after successful creation
    return { error: error?.message || null };
  };

  const update = async (id: string, updates: Partial<Office>) => {
    const { error } = await supabase.from('offices').update(updates).eq('id', id);
    if (!error) await fetch(); // Immediately refetch after successful update
    return { error: error?.message || null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('offices').delete().eq('id', id);
    if (!error) await fetch(); // Immediately refetch after successful deletion
    return { error: error?.message || null };
  };

  return { offices, loading, create, update, remove, refetch: fetch };
}
