import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Office, Department, PhoneEntry } from '@/types/phone';
import { saveDataCache, loadDataCache, isOnline } from '@/lib/offlineDb';

interface OfficeWithStats extends Office {
  departmentCount: number;
  entryCount: number;
  previewEntries: PhoneEntry[];
}

function buildOfficeStats(allOffices: Office[], allDepts: Department[], allEntries: PhoneEntry[], search?: string, statusFilter?: string): OfficeWithStats[] {
  let entries = [...allEntries];
  if (statusFilter && statusFilter !== 'all') entries = entries.filter(e => e.status === statusFilter);
  if (search?.trim()) {
    const q = search.toLowerCase();
    entries = entries.filter(e => (e.extension || '').toLowerCase().includes(q) || (e.name || '').toLowerCase().includes(q) || (e.designation || '').toLowerCase().includes(q));
  }

  const deptToOffice = new Map<string, string>();
  allDepts.forEach(d => deptToOffice.set(d.id, d.office_id));

  const officeEntries = new Map<string, PhoneEntry[]>();
  entries.forEach(e => {
    const officeId = deptToOffice.get(e.department_id);
    if (officeId) {
      if (!officeEntries.has(officeId)) officeEntries.set(officeId, []);
      officeEntries.get(officeId)!.push(e);
    }
  });

  return allOffices.map(office => {
    const officeDepts = allDepts.filter(d => d.office_id === office.id);
    const ents = officeEntries.get(office.id) || [];
    let matchesSearch = true;
    if (search?.trim()) {
      const q = search.toLowerCase();
      matchesSearch = office.name.toLowerCase().includes(q) || officeDepts.some(d => d.name.toLowerCase().includes(q)) || ents.length > 0;
    }
    if (!matchesSearch && search?.trim()) return null;
    return { ...office, departmentCount: officeDepts.length, entryCount: ents.length, previewEntries: ents };
  }).filter(Boolean) as OfficeWithStats[];
}

export function useAllData(search?: string, statusFilter?: string) {
  const [offices, setOffices] = useState<OfficeWithStats[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (isOnline()) {
      try {
        const [officesRes, deptsRes, entriesRes] = await Promise.all([
          supabase.from('offices').select('*').order('sort_order').order('created_at'),
          supabase.from('departments').select('*').order('sort_order').order('created_at'),
          supabase.from('phone_entries').select('*').order('extension'),
        ]);

        const allOffices = officesRes.data || [];
        const allDepts = deptsRes.data || [];
        const allEntries = entriesRes.data || [];

        // Save to IndexedDB for offline
        await saveDataCache(allOffices, allDepts, allEntries);

        setDepartments(allDepts);
        setOffices(buildOfficeStats(allOffices, allDepts, allEntries, search, statusFilter));
      } catch {
        // Fall back to IndexedDB
        const cached = await loadDataCache();
        if (cached) {
          setDepartments(cached.depts);
          setOffices(buildOfficeStats(cached.offices, cached.depts, cached.entries, search, statusFilter));
        }
      }
    } else {
      // Offline: load from IndexedDB
      const cached = await loadDataCache();
      if (cached) {
        setDepartments(cached.depts);
        setOffices(buildOfficeStats(cached.offices, cached.depts, cached.entries, search, statusFilter));
      }
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
    if (isOnline()) {
      const ch1 = supabase.channel('all-offices').on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, () => fetchData()).subscribe();
      const ch2 = supabase.channel('all-depts').on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetchData()).subscribe();
      const ch3 = supabase.channel('all-entries').on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, () => fetchData()).subscribe();
      return () => {
        supabase.removeChannel(ch1);
        supabase.removeChannel(ch2);
        supabase.removeChannel(ch3);
      };
    }
  }, [fetchData]);

  return { offices, departments, loading, refetch: fetchData };
}
