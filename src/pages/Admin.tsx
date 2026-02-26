import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { broadcastDataChange } from '@/lib/broadcastSync';
import { useOffices } from '@/hooks/useOffices';
import { useDepartments } from '@/hooks/useDepartments';
import { usePhoneEntries } from '@/hooks/usePhoneEntries';
import { useAccessCodes, AccessCode } from '@/hooks/useAccessCodes';
import { useAllData } from '@/hooks/useAllData';
import { getDeviceName, getBrowserName, getLocationName, getDateTimeInfo } from '@/lib/deviceInfo';
import { Shield, Plus, Pencil, Trash2, Building2, Users, Phone, ArrowLeft, ChevronRight, KeyRound, Clock, Search, Wifi, WifiOff, Smartphone, MapPin, Calendar, Circle, X, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { isOnline } from '@/lib/offlineDb';
import { exportOfficesToCSV, exportOfficesToJSON, importOfficesFromJSON } from '@/lib/officeExportImport';

type Tab = 'access_codes' | 'offices' | 'departments' | 'entries';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isUserOnline(lastActiveStr: string | null): boolean {
  if (!lastActiveStr) return false;
  const lastActive = new Date(lastActiveStr).getTime();
  const now = Date.now();
  const diffMs = now - lastActive;
  const diffMins = Math.floor(diffMs / 60000);
  // Consider online if active within last 30 minutes
  return diffMins < 30;
}

function getLastActiveDay(lastActiveStr: string | null): string {
  if (!lastActiveStr) return 'Never';
  const date = new Date(lastActiveStr);
  
  // Convert to Bangladesh timezone (UTC+6)
  const bdTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[bdTime.getDay()];
  const monthName = months[bdTime.getMonth()];
  const dayNum = bdTime.getDate();
  const year = bdTime.getFullYear();
  
  const hours = String(bdTime.getHours()).padStart(2, '0');
  const minutes = String(bdTime.getMinutes()).padStart(2, '0');
  const seconds = String(bdTime.getSeconds()).padStart(2, '0');
  const time = `${hours}:${minutes}:${seconds}`;
  
  return `${dayName}, ${monthName} ${dayNum}, ${year} ${time}`;
}

function getDeviceType(deviceName: string): string {
  if (!deviceName) return '💻 Unknown Device';
  const lower = deviceName.toLowerCase();
  
  // Laptop detection
  if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('windows laptop') || lower.includes('mac os')) {
    return '💻 Laptop';
  }
  
  // Desktop detection
  if (lower.includes('desktop') || lower.includes('pc') || lower.includes('linux desktop')) {
    return '🖥️ Desktop';
  }
  
  // Mobile detection
  if (lower.includes('iphone') || lower.includes('android') && !lower.includes('pc') || lower.includes('mobile')) {
    return '📱 Mobile Phone';
  }
  
  // Tablet detection
  if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('surface')) {
    return '📱 Tablet';
  }
  
  // Fallback with emoji based on keywords
  if (lower.includes('windows') || lower.includes('linux')) {
    return '💻 ' + deviceName;
  }
  if (lower.includes('mac') || lower.includes('apple')) {
    return '🍎 ' + deviceName;
  }
  
  return '💻 ' + deviceName;
}

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('access_codes');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Search & filter for access codes
  const [codeSearch, setCodeSearch] = useState('');
  const [codeRoleFilter, setCodeRoleFilter] = useState('all');
  const [codeStatusFilter, setCodeStatusFilter] = useState('all');
  const [codeOfficeFilter, setCodeOfficeFilter] = useState('all');
  const [codeDeptFilter, setCodeDeptFilter] = useState('all');

  // Detail page navigation
  const [viewMode, setViewMode] = useState<'overview' | 'office' | 'department' | 'user'>('overview');
  const [selectedOfficeForView, setSelectedOfficeForView] = useState<string | null>(null);
  const [selectedDeptForView, setSelectedDeptForView] = useState<string | null>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<AccessCode | null>(null);

  const { offices, create: createOffice, update: updateOffice, remove: removeOffice } = useOffices();
  const { departments, create: createDept, update: updateDept, remove: removeDept } = useDepartments(selectedOfficeId || undefined);
  const { entries, create: createEntry, update: updateEntry, remove: removeEntry } = usePhoneEntries(selectedDeptId || undefined);
  const { codes, create: createCode, update: updateCode, remove: removeCode } = useAccessCodes();
  const { offices: allOfficesWithStats, departments: allDepartments } = useAllData();
  const [expandedOfficeId, setExpandedOfficeId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'office' | 'department' | 'entry' | 'access_code'>('office');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  // Access Code Details Modal
  const [selectedAccessCode, setSelectedAccessCode] = useState<AccessCode | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'access_code' | 'office' | 'department' | 'entry' | null>(null);
  const [importOfficeDialogOpen, setImportOfficeDialogOpen] = useState(false);
  const [accessCodeDetails, setAccessCodeDetails] = useState({
    deviceName: '',
    browserName: '',
    locationName: '',
    dateTime: { time: '', date: '', day: '' },
    durationStayed: ''
  });

  // Load device info on access code selection
  useEffect(() => {
    if (selectedAccessCode) {
      const deviceName = getDeviceName();
      const browserName = getBrowserName();
      const dateTime = getDateTimeInfo();

      setAccessCodeDetails(prev => ({
        ...prev,
        deviceName,
        browserName,
        dateTime
      }));

      // Load location
      getLocationName().then(location => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: location
        }));
      }).catch(() => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: 'Location unavailable'
        }));
      });

      // Calculate duration stayed
      if (selectedAccessCode.last_active) {
        const lastActive = new Date(selectedAccessCode.last_active);
        const now = new Date();
        const diffMs = now.getTime() - lastActive.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        setAccessCodeDetails(prev => ({
          ...prev,
          durationStayed: duration
        }));
      }

      // Update time every second
      const interval = setInterval(() => {
        const newDateTime = getDateTimeInfo();
        setAccessCodeDetails(prev => ({
          ...prev,
          dateTime: newDateTime
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedAccessCode]);

  // Load device info on user detail view selection
  useEffect(() => {
    if (selectedUserForView) {
      const deviceName = getDeviceName();
      const browserName = getBrowserName();
      const dateTime = getDateTimeInfo();

      setAccessCodeDetails(prev => ({
        ...prev,
        deviceName,
        browserName,
        dateTime
      }));

      // Load location
      getLocationName().then(location => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: location
        }));
      }).catch(() => {
        setAccessCodeDetails(prev => ({
          ...prev,
          locationName: 'Location unavailable'
        }));
      });

      // Calculate duration stayed
      if (selectedUserForView.last_active) {
        const lastActive = new Date(selectedUserForView.last_active);
        const now = new Date();
        const diffMs = now.getTime() - lastActive.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        setAccessCodeDetails(prev => ({
          ...prev,
          durationStayed: duration
        }));
      }

      // Update time every second
      const interval = setInterval(() => {
        const newDateTime = getDateTimeInfo();
        setAccessCodeDetails(prev => ({
          ...prev,
          dateTime: newDateTime
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [selectedUserForView]);

  // Filtered codes
  const filteredCodes = useMemo(() => {
    let result = [...codes];
    if (codeSearch.trim()) {
      const q = codeSearch.toLowerCase();
      result = result.filter(c => c.code.toLowerCase().includes(q) || (c.label || '').toLowerCase().includes(q));
    }
    if (codeRoleFilter !== 'all') result = result.filter(c => c.role === codeRoleFilter);
    if (codeStatusFilter !== 'all') result = result.filter(c => codeStatusFilter === 'active' ? c.is_active : !c.is_active);
    if (codeOfficeFilter !== 'all') result = result.filter(c => c.office_id === codeOfficeFilter);
    if (codeDeptFilter !== 'all') result = result.filter(c => c.department_id === codeDeptFilter);
    return result;
  }, [codes, codeSearch, codeRoleFilter, codeStatusFilter, codeOfficeFilter, codeDeptFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground mt-2">Admin Access ID required</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const clearAccessFilters = () => {
    setCodeSearch('');
    setCodeRoleFilter('all');
    setCodeStatusFilter('all');
    setCodeOfficeFilter('all');
    setCodeDeptFilter('all');
  };

  const openAddCode = () => { setDialogType('access_code'); setEditId(null); setForm({ code: '', label: '', role: 'user', office_id: '', department_id: '' }); setDialogOpen(true); };
  const openEditCode = (c: AccessCode) => { setDialogType('access_code'); setEditId(c.id); setForm({ code: c.code, label: c.label || '', role: c.role, is_active: c.is_active ? 'true' : 'false', office_id: c.office_id || '', department_id: c.department_id || '' }); setDialogOpen(true); };
  const openAddOffice = () => { setDialogType('office'); setEditId(null); setForm({ name: '', description: '', sort_order: '0' }); setDialogOpen(true); };
  const openEditOffice = (o: any) => { setDialogType('office'); setEditId(o.id); setForm({ name: o.name, description: o.description || '', sort_order: String(o.sort_order || 0) }); setDialogOpen(true); };
  const openAddDept = () => { setDialogType('department'); setEditId(null); setForm({ name: '', description: '', sort_order: '0' }); setDialogOpen(true); };
  const openEditDept = (d: any) => { setDialogType('department'); setEditId(d.id); setForm({ name: d.name, description: d.description || '', sort_order: String(d.sort_order || 0) }); setDialogOpen(true); };
  const openAddEntry = () => { setDialogType('entry'); setEditId(null); setForm({ extension: '', name: '', designation: '', phone: '', email: '', status: 'active' }); setDialogOpen(true); };
  const openEditEntry = (e: any) => { setDialogType('entry'); setEditId(e.id); setForm({ extension: e.extension, name: e.name, designation: e.designation || '', phone: e.phone || '', email: e.email || '', status: e.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (dialogType === 'access_code') {
      if (!form.code?.trim()) { toast.error('Access ID দিন'); return; }
      if (editId) {
        const { error } = await updateCode(editId, { code: form.code, label: form.label || null, role: form.role as 'admin' | 'user', is_active: form.is_active !== 'false', office_id: form.office_id || null, department_id: form.department_id || null });
        if (error) toast.error(error); else { toast.success('Updated!'); broadcastDataChange('access_code'); }
      } else {
        const { error } = await createCode(form.code, form.label || '', form.role as 'admin' | 'user', form.office_id || null, form.department_id || null);
        if (error) toast.error(error); else { toast.success('Created!'); broadcastDataChange('access_code'); }
      }
    } else if (dialogType === 'office') {
      if (!form.name?.trim()) { toast.error('Office name দিন'); return; }
      const { error } = editId
        ? await updateOffice(editId, { name: form.name, description: form.description || null, sort_order: parseInt(form.sort_order || '0') })
        : await createOffice(form.name, form.description || undefined);
      if (error) toast.error(error); else { toast.success(editId ? 'Updated!' : 'Created!'); broadcastDataChange('office'); }
    } else if (dialogType === 'department') {
      if (!form.name?.trim()) { toast.error('Department name দিন'); return; }
      const { error } = editId
        ? await updateDept(editId, { name: form.name, description: form.description || null, sort_order: parseInt(form.sort_order || '0') })
        : await createDept(selectedOfficeId, form.name, form.description || undefined);
      if (error) toast.error(error); else { toast.success(editId ? 'Updated!' : 'Created!'); broadcastDataChange('department'); }
    } else {
      const { error } = editId
        ? await updateEntry(editId, { extension: form.extension || '', name: form.name || '', designation: form.designation || '', phone: form.phone || null, email: form.email || null, status: form.status })
        : await createEntry({ department_id: selectedDeptId, extension: form.extension || '', name: form.name || '', designation: form.designation || '', phone: form.phone || undefined, email: form.email || undefined, status: form.status });
      if (error) toast.error(error); else { toast.success(editId ? 'Updated!' : 'Created!'); broadcastDataChange('entry'); }
    }
    setDialogOpen(false);
  };

  const handleDelete = async (type: string, id: string) => {
    let result;
    if (type === 'access_code') result = await removeCode(id);
    else if (type === 'office') result = await removeOffice(id);
    else if (type === 'department') result = await removeDept(id);
    else result = await removeEntry(id);
    if (result.error) toast.error(result.error); else { toast.success('Deleted!'); broadcastDataChange(type as any); }
  };

  const handleImportOffices = async (file: File) => {
    try {
      const data = await importOfficesFromJSON(file);
      
      // Import offices first
      for (const office of data.offices) {
        const existingOffice = offices.find(o => o.id === office.id);
        if (existingOffice) {
          await updateOffice(office.id, { name: office.name, description: office.description, sort_order: office.sort_order });
        } else {
          await createOffice(office.name, office.description);
        }
      }
      
      // Then import departments
      for (const dept of data.departments) {
        const existingDept = allDepartments.find(d => d.id === dept.id);
        if (existingDept) {
          await updateDept(dept.id, { name: dept.name, description: dept.description, sort_order: dept.sort_order });
        }
      }
      
      // Finally import entries
      for (const entry of data.entries) {
        const existingEntry = entries.find(e => e.id === entry.id);
        if (existingEntry) {
          await updateEntry(entry.id, { extension: entry.extension, name: entry.name, designation: entry.designation, phone: entry.phone, email: entry.email, status: entry.status });
        }
      }
      
      toast.success('Import completed successfully!');
      broadcastDataChange('office');
      broadcastDataChange('department');
      broadcastDataChange('entry');
      setImportOfficeDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    }
  };

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);
  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const officeForDetailView = selectedOfficeForView ? allOfficesWithStats.find(o => o.id === selectedOfficeForView) : null;
  const deptForDetailView = selectedDeptForView ? allDepartments.find(d => d.id === selectedDeptForView) : null;
  const online = isOnline();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Admin Panel
          </h2>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            {online ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-destructive" />}
            <span className={online ? 'text-green-600' : 'text-destructive'}>{online ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* OFFICE DETAIL VIEW */}
        {viewMode === 'office' && officeForDetailView && (
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setViewMode('overview'); setSelectedOfficeForView(null); }} 
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Overview
            </Button>
            
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-8 h-8 text-primary" />
                    <h2 className="text-3xl font-bold text-foreground">{officeForDetailView.name}</h2>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <p className="text-sm text-muted-foreground">Departments</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{officeForDetailView.departmentCount}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-muted-foreground">Extensions</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{officeForDetailView.entryCount}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-muted-foreground">Access Users</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{codes.filter(c => c.office_id === selectedOfficeForView).length}</p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">Departments</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDepartments.filter(d => d.office_id === selectedOfficeForView).map(dept => {
                const deptEntries = officeForDetailView.previewEntries.filter(e => e.department_id === dept.id);
                const deptUsers = codes.filter(c => c.department_id === dept.id);
                return (
                  <div 
                    key={dept.id} 
                    className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/50 cursor-pointer transition-all duration-200 group"
                    onClick={() => { setSelectedDeptForView(dept.id); setViewMode('department'); }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Users className="w-6 h-6 text-primary group-hover:scale-110 transition-transform flex-shrink-0" />
                      <h4 className="text-lng font-bold text-foreground group-hover:text-primary transition-colors">{dept.name}</h4>
                    </div>
                    {dept.description && <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>}
                    <div className="flex gap-2 justify-between">
                      <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                        {deptEntries.length} extensions
                      </span>
                      <span className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full font-medium">
                        {deptUsers.length} users
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DEPARTMENT DETAIL VIEW */}
        {viewMode === 'department' && deptForDetailView && (
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setViewMode('office'); setSelectedDeptForView(null); }} 
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Office
            </Button>

            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-8 h-8 text-primary" />
                    <h2 className="text-3xl font-bold text-foreground">{deptForDetailView.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground ml-11">
                    {officeForDetailView?.name || 'Office'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-muted-foreground">Access Users</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{codes.filter(c => c.department_id === selectedDeptForView).length}</p>
                </div>
              </div>

              {deptForDetailView.description && (
                <p className="text-foreground mb-4">{deptForDetailView.description}</p>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-4">Access Users</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {codes.filter(c => c.department_id === selectedDeptForView).map(code => (
                <div 
                  key={code.id}
                  className="bg-card rounded-xl border border-border p-4 hover:shadow-lg hover:border-primary/50 cursor-pointer transition-all duration-200 group"
                  onClick={() => { setSelectedUserForView(code); setViewMode('user'); }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <KeyRound className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        <Circle 
                          className={`w-2.5 h-2.5 absolute -top-1 -right-1 fill-current ${isUserOnline(code.last_active) ? 'text-green-500' : 'text-red-500'}`}
                        />
                      </div>
                      <span className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">{code.code}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${code.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                      {code.role}
                    </span>
                  </div>
                  {code.label && <p className="text-sm text-muted-foreground mb-2">{code.label}</p>}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Last active: {timeAgo(code.last_active)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${isUserOnline(code.last_active) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {isUserOnline(code.last_active) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACCESS USER DETAIL VIEW */}
        {viewMode === 'user' && selectedUserForView && (
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setViewMode('department'); setSelectedUserForView(null); }} 
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Department
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Info */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl border border-border p-6 lg:sticky lg:top-20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary/10 p-3 rounded-lg relative">
                      <KeyRound className="w-6 h-6 text-primary" />
                      <Circle 
                        className={`w-3 h-3 absolute top-1 right-1 fill-current ${isUserOnline(selectedUserForView.last_active) ? 'text-green-500' : 'text-red-500'}`}
                        title={isUserOnline(selectedUserForView.last_active) ? 'Online' : 'Offline'}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Access Code</p>
                      <p className="font-mono font-bold text-lg">{selectedUserForView.code}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Circle 
                          className={`w-2 h-2 fill-current ${isUserOnline(selectedUserForView.last_active) ? 'text-green-500' : 'text-red-500'}`}
                        />
                        <span className={`text-xs font-medium ${isUserOnline(selectedUserForView.last_active) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isUserOnline(selectedUserForView.last_active) ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedUserForView.label && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Label</p>
                      <p className="font-medium text-foreground">{selectedUserForView.label}</p>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Role</p>
                      <p className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${selectedUserForView.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {selectedUserForView.role}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${isUserOnline(selectedUserForView.last_active) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {isUserOnline(selectedUserForView.last_active) ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Last Active</p>
                      <p className="font-medium text-foreground">{getLastActiveDay(selectedUserForView.last_active)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-6">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditCode(selectedUserForView)}
                      className="flex-1 sm:text-sm text-base py-5 sm:py-2"
                    >
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive flex-1 sm:text-sm text-base py-5 sm:py-2"
                      onClick={() => { setDeleteConfirmId(selectedUserForView.id); setDeleteConfirmType('access_code'); }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Assignment Info */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">Assignment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUserForView.office_id ? (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <p className="text-xs text-muted-foreground">Office/Unit</p>
                        </div>
                        <p className="font-semibold text-foreground">{offices.find(o => o.id === selectedUserForView.office_id)?.name || 'Unknown'}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Office/Unit</p>
                        <p className="text-muted-foreground">Not assigned</p>
                      </div>
                    )}

                    {selectedUserForView.department_id ? (
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="text-xs text-muted-foreground">Department</p>
                        </div>
                        <p className="font-semibold text-foreground">{allDepartments.find(d => d.id === selectedUserForView.department_id)?.name || 'Unknown'}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Department</p>
                        <p className="text-muted-foreground">Not assigned</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Device Info Card */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">Device Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Device Type</p>
                      </div>
                      <p className="text-foreground font-semibold">{getDeviceType(accessCodeDetails.deviceName)}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Browser</p>
                      </div>
                      <p className="text-foreground">{accessCodeDetails.browserName || 'Unknown Browser'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">Location</p>
                      </div>
                      <p className="text-foreground">{accessCodeDetails.locationName && accessCodeDetails.locationName !== 'Location unavailable' ? accessCodeDetails.locationName : 'Location access not available (enable in browser settings)'}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <p className="text-sm font-semibold text-green-900 dark:text-green-200">Duration</p>
                      </div>
                      <p className="text-foreground font-semibold">{accessCodeDetails.durationStayed || 'Just now'}</p>
                    </div>
                  </div>
                </div>

                {/* Session Timing Card */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="text-lg font-semibold mb-4">Session Timing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Session Started</p>
                      </div>
                      <p className="font-medium text-foreground">{selectedUserForView.last_active ? new Date(selectedUserForView.last_active).toLocaleTimeString() : 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(selectedUserForView.last_active)}</p>
                    </div>

                    <div className="p-4 bg-gradient-to-br rounded-lg border transition-all" style={{
                      background: isUserOnline(selectedUserForView.last_active)
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)' 
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)',
                      borderColor: isUserOnline(selectedUserForView.last_active) ? 'rgb(134, 239, 172)' : 'rgb(252, 165, 165)'
                    }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className={`w-5 h-5 fill-current ${isUserOnline(selectedUserForView.last_active) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                        <p className={`text-sm font-semibold ${isUserOnline(selectedUserForView.last_active) ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>Current Status</p>
                      </div>
                      <p className={`text-lg font-bold ${isUserOnline(selectedUserForView.last_active) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isUserOnline(selectedUserForView.last_active) ? '🟢 Online' : '🔴 Offline'}
                      </p>
                    </div>

                    {isUserOnline(selectedUserForView.last_active) && (
                      <div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">Time Spent Today</p>
                        </div>
                        <p className="text-xl font-bold text-foreground">{accessCodeDetails.durationStayed || '0m'}</p>
                      </div>
                    )}

                    <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Last Access</p>
                      </div>
                      <p className="font-medium text-foreground">{selectedUserForView.last_active ? new Date(selectedUserForView.last_active).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW MODE - Tab navigation */}
        {viewMode === 'overview' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
          <Button variant={tab === 'access_codes' ? 'default' : 'outline'} size="sm" onClick={() => setTab('access_codes')}>
            <KeyRound className="w-4 h-4 mr-1" /> Access IDs
          </Button>
          <Button variant={tab === 'offices' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('offices'); setSelectedOfficeId(''); setSelectedDeptId(''); }}>
            <Building2 className="w-4 h-4 mr-1" /> Offices
          </Button>
          {selectedOfficeId && (
            <Button variant={tab === 'departments' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('departments'); setSelectedDeptId(''); }}>
              <Users className="w-4 h-4 mr-1" /> {selectedOffice?.name}
            </Button>
          )}
          {selectedDeptId && (
            <Button variant={tab === 'entries' ? 'default' : 'outline'} size="sm">
              <Phone className="w-4 h-4 mr-1" /> {selectedDept?.name}
            </Button>
          )}
            </div>

        {/* ACCESS CODES TAB */}
        {tab === 'access_codes' && (
          <div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">Access IDs ({filteredCodes.length})</h3>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Select value={codeOfficeFilter} onValueChange={setCodeOfficeFilter}>
                  <SelectTrigger className="w-full sm:w-40 h-10 text-xs rounded-lg bg-card"><SelectValue placeholder="Filter Office" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {allOfficesWithStats.map(office => (
                      <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={codeDeptFilter} onValueChange={setCodeDeptFilter}>
                  <SelectTrigger className="w-full sm:w-40 h-10 text-xs rounded-lg bg-card"><SelectValue placeholder="Filter Dept" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {allDepartments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(codeOfficeFilter !== 'all' || codeDeptFilter !== 'all') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearAccessFilters}
                    className="text-xs text-destructive hover:text-destructive whitespace-nowrap"
                  >
                    <X className="w-4 h-4 mr-1" /> Clear
                  </Button>
                )}
                <Button onClick={openAddCode} size="sm" className="text-xs whitespace-nowrap"><Plus className="w-4 h-4 mr-1" /> Add Access ID</Button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <SearchBar value={codeSearch} onChange={setCodeSearch} placeholder="Search by ID or label..." />
              </div>
              <Select value={codeRoleFilter} onValueChange={setCodeRoleFilter}>
                <SelectTrigger className="w-full sm:w-32 h-12 rounded-xl bg-card"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={codeStatusFilter} onValueChange={setCodeStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 h-12 rounded-xl bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              {filteredCodes.map(c => (
                <div key={c.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <KeyRound className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="font-mono font-bold text-foreground">{c.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {c.role}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isUserOnline(c.last_active) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                          {isUserOnline(c.last_active) ? 'online' : 'offline'}
                        </span>
                         {!c.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">inactive</span>}
                      </div>
                      {c.label && <p className="text-sm text-muted-foreground ml-7 mt-0.5">{c.label}</p>}
                      <div className="flex flex-wrap gap-2 ml-7 mt-1">
                        {c.office_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {offices.find(o => o.id === c.office_id)?.name || 'Unknown Office'}
                          </span>
                        )}
                        {c.department_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {allDepartments.find(d => d.id === c.department_id)?.name || 'Unknown Dept'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-7 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Last active: {timeAgo(c.last_active)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEditCode(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeleteConfirmId(c.id); setDeleteConfirmType('access_code'); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCodes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
                  <KeyRound className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{codes.length === 0 ? 'No access codes yet.' : 'No matching access codes.'}</p>
                </div>
              )}
            </div>

            {/* Office & Department Overview */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Office & Department Overview
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allOfficesWithStats.map(office => {
                  const officeDepts = allDepartments.filter(d => d.office_id === office.id);
                  const isExpanded = expandedOfficeId === office.id;
                  return (
                    <div 
                      key={office.id} 
                      className="bg-card rounded-lg border border-border p-3.5 hover:shadow-md hover:border-primary/60 hover:bg-card/98 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
                      onClick={() => { setSelectedOfficeForView(office.id); setViewMode('office'); }}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={(e) => { 
                          e.stopPropagation();
                          setExpandedOfficeId(isExpanded ? null : office.id);
                        }}
                      >
                      <div className="flex items-center gap-2 mb-2.5">
                          <Building2 className="w-4.5 h-4.5 text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{office.name}</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                            <Users className="w-3 h-3 text-primary" />
                            <span className="font-semibold">{office.departmentCount}</span>
                            <span className="text-muted-foreground">Depts</span>
                          </span>
                          <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                            <Phone className="w-3 h-3 text-primary" />
                            <span className="font-semibold">{office.entryCount}</span>
                            <span className="text-muted-foreground">Ext</span>
                          </span>
                          <span className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md">
                            <KeyRound className="w-3 h-3 text-primary" />
                            <span className="font-semibold">{codes.filter(c => c.office_id === office.id).length}</span>
                            <span className="text-muted-foreground">Users</span>
                          </span>
                        </div>
                        <div className="flex justify-end mt-1.5">
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      {isExpanded && officeDepts.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border space-y-2">
                          {officeDepts.map(dept => {
                            const deptEntryCount = office.previewEntries.filter(e => e.department_id === dept.id).length;
                            const deptUserCount = codes.filter(c => c.department_id === dept.id).length;
                            const deptAccessCodes = codes.filter(c => c.department_id === dept.id);
                            return (
                              <div key={dept.id}>
                                {/* Department Header */}
                                <div 
                                  className="flex items-center justify-between bg-muted/40 hover:bg-muted/70 hover:border-primary/40 rounded-md px-2.5 py-1.5 transition-all duration-200 border border-transparent cursor-pointer group"
                                  onClick={() => { setSelectedDeptForView(dept.id); setSelectedOfficeForView(office.id); setViewMode('department'); }}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <Users className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all flex-shrink-0" />
                                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">{dept.name}</span>
                                  </div>
                                  <div className="flex gap-1.5 flex-shrink-0">
                                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                      {deptEntryCount} ext
                                    </span>
                                    <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                      {deptUserCount} user
                                    </span>
                                  </div>
                                </div>

                                {/* Access IDs for this Department */}
                                {deptAccessCodes.length > 0 && (
                                  <div className="ml-1 space-y-0.5 mt-1">
                                    {deptAccessCodes.map(accessCode => (
                                      <div 
                                        key={accessCode.id}
                                        className="flex items-center justify-between bg-gradient-to-r from-primary/4 to-primary/8 hover:from-primary/15 hover:to-primary/22 rounded px-1.5 py-0.75 transition-all duration-150 cursor-pointer border border-primary/15 hover:border-primary/35 text-xs group"
                                        onClick={() => { setSelectedUserForView(accessCode); setSelectedOfficeForView(office.id); setSelectedDeptForView(dept.id); setViewMode('user'); }}
                                      >
                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                          <div className="relative flex-shrink-0">
                                            <KeyRound className="w-2.5 h-2.5 text-primary group-hover:scale-110 transition-transform" />
                                            <Circle 
                                              className={`w-1 h-1 absolute -top-0.5 -right-0.5 fill-current ${isUserOnline(accessCode.last_active) ? 'text-green-500' : 'text-red-500'}`}
                                            />
                                          </div>
                                          <span className="font-mono font-semibold text-foreground truncate group-hover:text-primary transition-colors">{accessCode.code}</span>
                                          {accessCode.label && <span className="text-muted-foreground group-hover:text-primary/60 transition-colors truncate text-[11px]">({accessCode.label})</span>}
                                        </div>
                                        <div className="flex gap-0.5 flex-shrink-0">
                                          <span className={`px-1 py-0.25 rounded text-[10px] font-semibold leading-tight ${isUserOnline(accessCode.last_active) ? 'bg-green-500/20 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-500/20 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                                            {isUserOnline(accessCode.last_active) ? 'online' : 'offline'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* OFFICES TAB - Card design */}
        {tab === 'offices' && (
          <div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">All Offices/Units</h3>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportOfficesToCSV(
                    allOfficesWithStats,
                    allDepartments,
                    allOfficesWithStats.flatMap(o => o.previewEntries)
                  )} 
                  className="text-xs whitespace-nowrap"
                  title="Export as CSV"
                >
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportOfficesToJSON(
                    allOfficesWithStats,
                    allDepartments,
                    allOfficesWithStats.flatMap(o => o.previewEntries)
                  )} 
                  className="text-xs whitespace-nowrap"
                  title="Export as JSON"
                >
                  <Download className="w-4 h-4 mr-1" /> JSON
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setImportOfficeDialogOpen(true)} 
                  className="text-xs whitespace-nowrap"
                  title="Import from JSON"
                >
                  <Upload className="w-4 h-4 mr-1" /> Import
                </Button>

                <Button onClick={openAddOffice} size="sm" className="text-xs whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-1" /> Add Office
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allOfficesWithStats.map(office => (
                <div key={office.id} className="bg-gradient-to-br from-card to-card/90 rounded-xl border border-border p-0 overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 flex flex-col group cursor-pointer">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-900/20 dark:to-cyan-900/20 border-b border-border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">{office.name}</h4>
                      </div>
                    </div>
                    {office.description && <p className="text-xs text-muted-foreground ml-11 line-clamp-1">{office.description}</p>}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1" onClick={() => { setSelectedOfficeId(office.id); setTab('departments'); }}>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200/30 dark:border-green-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-semibold text-muted-foreground">Departments</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{office.departmentCount}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-3 border border-orange-200/30 dark:border-orange-800/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Phone className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-xs font-semibold text-muted-foreground">Extensions</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{office.entryCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="border-t border-border/50 px-4 py-3 bg-muted/30 flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditOffice(office); }} className="h-8 w-8 p-0" title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(office.id); setDeleteConfirmType('office'); }} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <Button variant="default" size="sm" onClick={() => { setSelectedOfficeId(office.id); setTab('departments'); }} className="text-xs">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
              {allOfficesWithStats.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No offices yet. Add your first office!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEPARTMENTS TAB */}
        {tab === 'departments' && selectedOfficeId && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Button variant="ghost" size="sm" onClick={() => { setTab('offices'); setSelectedOfficeId(''); }} className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Offices
                </Button>
                <h3 className="text-lg font-semibold">{selectedOffice?.name} — Departments</h3>
              </div>
              <Button onClick={openAddDept} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Department</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => {
                const deptExtCount = entries.filter(e => e.department_id === dept.id).length;
                return (
                  <div key={dept.id} className="bg-gradient-to-br from-card to-card/90 rounded-xl border border-border p-0 overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 flex flex-col group cursor-pointer" onClick={() => { setSelectedDeptId(dept.id); setTab('entries'); }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-border p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">{dept.name}</h4>
                      </div>
                      {dept.description && <p className="text-xs text-muted-foreground ml-11 line-clamp-1">{dept.description}</p>}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-primary mb-2">{deptExtCount}</div>
                        <div className="text-sm font-semibold text-muted-foreground">Extension{deptExtCount !== 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-border/50 px-4 py-3 bg-muted/30 flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDept(dept); }} className="h-8 w-8 p-0" title="Edit"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(dept.id); setDeleteConfirmType('department'); }} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <Button variant="default" size="sm" onClick={() => { setSelectedDeptId(dept.id); setTab('entries'); }} className="text-xs">
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {departments.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No departments yet. Add your first department!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ENTRIES TAB */}
        {tab === 'entries' && selectedDeptId && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Button variant="ghost" size="sm" onClick={() => { setTab('departments'); setSelectedDeptId(''); }} className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Departments
                </Button>
                <h3 className="text-lg font-semibold">{selectedOffice?.name} — {selectedDept?.name}</h3>
              </div>
              <Button onClick={openAddEntry} size="sm"><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="header-gradient text-primary-foreground">
                      <th className="px-4 py-3 text-left font-semibold">Ext.</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Designation</th>
                      <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-extension font-bold">{entry.extension}</td>
                        <td className="px-4 py-3 font-medium">{entry.name}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{entry.designation}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{entry.phone || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{entry.email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditEntry(entry)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeleteConfirmId(entry.id); setDeleteConfirmType('entry'); }}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {entries.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No entries yet. Add your first entry!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DIALOG */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md z-50">
            <DialogHeader>
              <DialogTitle>
                {editId ? 'Edit' : 'Add'} {dialogType === 'access_code' ? 'Access ID' : dialogType === 'office' ? 'Office/Unit' : dialogType === 'department' ? 'Department' : 'Entry'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {dialogType === 'access_code' ? (
                <>
                  <div>
                    <Label>Access ID *</Label>
                    <Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 12345" className="mt-1" />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. User Name" className="mt-1" />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={form.role || 'user'} onValueChange={v => setForm({ ...form, role: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit/Office</Label>
                    <Select value={form.office_id || 'none'} onValueChange={v => setForm({ ...form, office_id: v === 'none' ? '' : v, department_id: '' })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select Office" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.office_id && (
                    <div>
                      <Label>Department</Label>
                      <Select value={form.department_id || 'none'} onValueChange={v => setForm({ ...form, department_id: v === 'none' ? '' : v })}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Department" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— None —</SelectItem>
                          {allDepartments.filter(d => d.office_id === form.office_id).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {editId && (
                    <div>
                      <Label>Status</Label>
                      <Select value={form.is_active || 'true'} onValueChange={v => setForm({ ...form, is_active: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : dialogType === 'entry' ? (
                <>
                  <div>
                    <Label>Extension</Label>
                    <Input value={form.extension || ''} onChange={e => setForm({ ...form, extension: e.target.value })} placeholder="e.g. 501" className="mt-1" />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="mt-1" />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={form.designation || ''} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Manager" className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +880..." className="mt-1" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={dialogType === 'office' ? 'e.g. MNR Group Head Office' : 'e.g. HR & Admin'} className="mt-1" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="mt-1" />
                  </div>
                  {(dialogType === 'office' || dialogType === 'department') && (
                    <div>
                      <Label>Order (Display Position)</Label>
                      <Input type="number" value={form.sort_order || '0'} onChange={e => setForm({ ...form, sort_order: e.target.value })} placeholder="0 = First" className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">Lower number = Earlier position (0 = First)</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editId ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Access Code Details Modal */}
        <Dialog open={!!selectedAccessCode} onOpenChange={(open) => !open && setSelectedAccessCode(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Access ID Details
              </DialogTitle>
            </DialogHeader>
            {selectedAccessCode && (
              <div className="space-y-4">
                {/* Access Code Info */}
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Access Code</p>
                  <p className="font-mono font-bold text-lg text-foreground">{selectedAccessCode.code}</p>
                  {selectedAccessCode.label && <p className="text-sm text-muted-foreground mt-2">{selectedAccessCode.label}</p>}
                </div>

                {/* Device Info Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Device Information</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Device:</span>
                        <span className="font-medium">{accessCodeDetails.deviceName || 'Loading...'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Browser:</span>
                        <span className="font-medium">{accessCodeDetails.browserName || 'Loading...'}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium text-right">{accessCodeDetails.locationName || 'Loading...'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Card */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-purple-500/20 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Current Date & Time</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{accessCodeDetails.dateTime.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{accessCodeDetails.dateTime.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Day:</span>
                        <span className="font-medium">{accessCodeDetails.dateTime.day}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duration & Access Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-green-500/20 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-green-900 dark:text-green-200">Duration Stayed</p>
                    </div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-300">{accessCodeDetails.durationStayed || 'Just now'}</p>
                    <p className="text-xs text-muted-foreground mt-2">Last active: {timeAgo(selectedAccessCode.last_active)}</p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Access Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <p className="font-semibold capitalize">{selectedAccessCode.role}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="font-semibold">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${selectedAccessCode.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {selectedAccessCode.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="z-50">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {deleteConfirmType === 'access_code' && (
                <>
                  <p className="text-foreground mb-4">
                    Are you sure you want to delete this access code? This action cannot be undone.
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Access Code</p>
                    <p className="font-mono font-bold text-lg">{selectedUserForView?.code}</p>
                  </div>
                </>
              )}
              {deleteConfirmType === 'office' && (
                <>
                  <p className="text-foreground mb-4">
                    Are you sure you want to delete this office? All associated departments and data will be removed. This action cannot be undone.
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Office</p>
                    <p className="font-bold text-lg">{offices.find(o => o.id === deleteConfirmId)?.name || 'Unknown'}</p>
                  </div>
                </>
              )}
              {deleteConfirmType === 'department' && (
                <>
                  <p className="text-foreground mb-4">
                    Are you sure you want to delete this department? All associated access codes will be removed. This action cannot be undone.
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Department</p>
                    <p className="font-bold text-lg">{departments.find(d => d.id === deleteConfirmId)?.name || 'Unknown'}</p>
                  </div>
                </>
              )}
              {deleteConfirmType === 'entry' && (
                <>
                  <p className="text-foreground mb-4">
                    Are you sure you want to delete this phone entry? This action cannot be undone.
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Phone Entry</p>
                    <p className="font-bold text-lg">{entries.find(p => p.id === deleteConfirmId)?.phone || 'Unknown'}</p>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDeleteConfirmId(null); setDeleteConfirmType(null); }}>Cancel</Button>
              <Button 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (deleteConfirmId && deleteConfirmType) {
                    await handleDelete(deleteConfirmType, deleteConfirmId);
                    setDeleteConfirmId(null);
                    setDeleteConfirmType(null);
                    if (deleteConfirmType === 'access_code') {
                      setViewMode('department');
                      setSelectedUserForView(null);
                    }
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Offices Dialog */}
        <Dialog open={importOfficeDialogOpen} onOpenChange={setImportOfficeDialogOpen}>
          <DialogContent className="z-50">
            <DialogHeader>
              <DialogTitle>Import Offices & Data</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">Upload a JSON file previously exported from this application.</p>
              <Input 
                type="file" 
                accept=".json" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImportOffices(file);
                  }
                }}
                className="cursor-pointer"
              />
            </div>
          </DialogContent>
        </Dialog>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
