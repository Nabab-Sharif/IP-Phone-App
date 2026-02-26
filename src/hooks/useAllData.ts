import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Office, Department, PhoneEntry } from '@/types/phone';
import { isOnline } from '@/lib/offlineDb';
import { initBroadcastChannel, onDataChange } from '@/lib/broadcastSync';

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
    try {
      const [officesRes, deptsRes, entriesRes] = await Promise.all([
        supabase.from('offices').select('*').order('sort_order').order('created_at'),
        supabase.from('departments').select('*').order('sort_order').order('created_at'),
        supabase.from('phone_entries').select('*').order('extension'),
      ]);

      const allOffices = officesRes.data || [];
      const allDepts = deptsRes.data || [];
      const allEntries = entriesRes.data || [];

      setDepartments(allDepts);
      setOffices(buildOfficeStats(allOffices, allDepts, allEntries, search, statusFilter));
    } catch (error) {
      console.error('Failed to fetch data from Supabase:', error);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
    
    // Initialize broadcast channel for cross-tab sync
    initBroadcastChannel();
    
    // Listen for data changes from other tabs
    onDataChange(() => {
      setTimeout(() => fetchData(), 300);
    });

    // Real-time subscriptions with delayed refetch
    const handleChange = () => {
      setTimeout(() => fetchData(), 300);
    };

    const ch1 = supabase.channel('all-offices').on('postgres_changes', { event: '*', schema: 'public', table: 'offices' }, handleChange).subscribe();
    const ch2 = supabase.channel('all-depts').on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, handleChange).subscribe();
    const ch3 = supabase.channel('all-entries').on('postgres_changes', { event: '*', schema: 'public', table: 'phone_entries' }, handleChange).subscribe();

    // Periodic refetch as backup (every 3 seconds) to ensure data stays fresh
    const intervalId = setInterval(() => {
      fetchData();
    }, 3000);

    // Page visibility change - refetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => fetchData(), 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Window focus - refetch when window regains focus
    const handleFocus = () => {
      setTimeout(() => fetchData(), 300);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData]);

  return { offices, departments, loading, refetch: fetchData };
}
