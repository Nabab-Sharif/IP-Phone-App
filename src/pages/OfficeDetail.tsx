import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DepartmentCard from '@/components/DepartmentCard';
import ExtensionTable from '@/components/ExtensionTable';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, X } from 'lucide-react';
import { useOfficeDetail } from '@/hooks/useOfficeDetail';

const OfficeDetail = () => {
  const { officeId } = useParams<{ officeId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const { office, departments, loading } = useOfficeDetail(officeId);

  const filteredDepts = useMemo(() => {
    let result = [...departments].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    // Filter by department if selected
    if (departmentFilter !== 'all') {
      result = result.filter(d => d.id === departmentFilter);
    }
    
    // Filter by search
    if (!search.trim()) {
      return result;
    }
    
    const q = search.toLowerCase();
    return result.map(d => ({
      ...d,
      entries: d.entries.filter(e => {
        const matchesSearch = !search.trim() || (
          e.extension.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q)
        );
        return matchesSearch;
      }),
    })).filter(d => d.entries.length > 0 || d.name.toLowerCase().includes(q));
  }, [departments, search, departmentFilter]);

  const selectedDept = selectedDeptId
    ? filteredDepts.find(d => d.id === selectedDeptId)
    : null;

  const totalEntries = departments.reduce((sum, d) => sum + d.entries.length, 0);
  const filteredEntries = filteredDepts.reduce((sum, d) => sum + d.entries.length, 0);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Header />
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-48" />
            <div className="h-12 bg-slate-300 dark:bg-slate-700 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-300 dark:bg-slate-700 rounded-xl" />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900\">
      <Header />
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => selectedDeptId ? setSelectedDeptId(null) : navigate('/')}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 mb-3 sm:mb-0 text-sm sm:text-base"
          >
            <ArrowLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1.5 sm:mr-2" />
            {selectedDeptId ? 'Back to Departments' : 'Back to Offices'}
          </Button>
        </div>

        <div className="rounded-2xl p-2 sm:p-3 mb-6 sm:mb-8 relative">
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 lg:items-end">
            {/* Search bar */}
            <div className="w-full sm:w-60 lg:w-48">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Search</label>
              <SearchBar value={search} onChange={setSearch} placeholder="Search..." />
            </div>

            {/* Dept filter - responsive layout */}
            <div className="flex gap-2 items-end flex-wrap sm:flex-nowrap lg:flex-nowrap">
              {!selectedDept && (
                <div className="w-32 sm:w-36 lg:w-40 relative">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dept</label>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs rounded-lg border-slate-300 dark:border-slate-600 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent align="start" className="w-44">
                      <SelectItem value="all">All Departments</SelectItem>
                      {[...departments].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(search.trim() !== '' || departmentFilter !== 'all') && (
                <Button
                  variant="outline"
                  className="h-8 sm:h-9 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 sm:px-3 whitespace-nowrap"
                  onClick={() => {
                    setSearch('');
                    setDepartmentFilter('all');
                  }}
                >
                  <X className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {selectedDept ? (
          <ExtensionTable entries={selectedDept.entries} title={`${office?.name} — ${selectedDept.name}`} departments={departments} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredDepts.map(dept => (
              <DepartmentCard
                key={dept.id}
                department={dept}
                onClick={() => setSelectedDeptId(dept.id)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default OfficeDetail;
