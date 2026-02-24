import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Office, Department, PhoneEntry } from '@/types/phone';

interface DeptWithEntries extends Department {
  entries: PhoneEntry[];
}

export function useOfficeDetail(officeId?: string) {
  const [office, setOffice] = useState<Office | null>(null);
  const [departments, setDepartments] = useState<DeptWithEntries[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!officeId) return;

    const [officeRes, deptsRes, entriesRes] = await Promise.all([
      supabase.from('offices').select('*').eq('id', officeId).single(),
      supabase.from('departments').select('*').eq('office_id', officeId).order('sort_order').order('name'),
      supabase.from('phone_entries').select('*, departments!inner(office_id)').order('extension'),
    ]);

    setOffice(officeRes.data);
    const depts = deptsRes.data || [];
    const allEntries = (entriesRes.data || []) as (PhoneEntry & { departments: { office_id: string } })[];

    // Filter entries for this office
    const officeEntries = allEntries.filter((e: any) => e.departments?.office_id === officeId);

    const result = depts.map(d => ({
      ...d,
      entries: officeEntries.filter(e => e.department_id === d.id),
    }));

    setDepartments(result);
    setLoading(false);
  }, [officeId]);

  useEffect(() => {
    fetch();
    const ch1 = supabase.channel(`office-${officeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, () => fetch()).subscribe();
    const ch2 = supabase.channel(`office-depts-${officeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetch()).subscribe();
    const ch3 = supabase.channel(`office-entries-${officeId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, () => fetch()).subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [fetch]);

  return { office, departments, loading };
}
