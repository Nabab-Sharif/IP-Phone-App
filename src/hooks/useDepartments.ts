import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/types/phone';

export function useDepartments(officeId?: string) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let q = supabase.from('departments').select('*').order('sort_order').order('created_at');
    if (officeId) q = q.eq('office_id', officeId);
    const { data } = await q;
    if (data) setDepartments(data);
    setLoading(false);
  }, [officeId]);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel(`departments-${officeId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const create = async (office_id: string, name: string, description?: string) => {
    const { error } = await supabase.from('departments').insert({ office_id, name, description });
    return { error: error?.message || null };
  };

  const update = async (id: string, updates: Partial<Department>) => {
    const { error } = await supabase.from('departments').update(updates).eq('id', id);
    return { error: error?.message || null };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    return { error: error?.message || null };
  };

  return { departments, loading, create, update, remove, refetch: fetch };
}
