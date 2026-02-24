import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OfficeCard from '@/components/OfficeCard';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllData } from '@/hooks/useAllData';
import { Building2, X } from 'lucide-react';
import ExtensionTable from '@/components/ExtensionTable';
import ExtensionCardGrid from '@/components/ExtensionCardGrid';

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
  const [selectedDeptName, setSelectedDeptName] = useState<string>('all');

  const { offices, departments, loading } = useAllData(search, 'all');

  // Get the selected office (if any)
  const selectedOffice = selectedOffices.length === 1
    ? offices.find(o => o.id === selectedOffices[0])
    : null;

  // Get unique department names - filtered by selected office if applicable
  const uniqueDeptNames = selectedOffice
    ? Array.from(new Set(
        departments
          .filter(d => selectedOffice.previewEntries.some(e => e.department_id === d.id))
          .map(d => d.name)
      )).sort()
    : Array.from(new Set(departments.map(d => d.name))).sort();

  // Get department IDs that match the selected department name (across all offices)
  const matchingDeptIds = selectedDeptName !== 'all'
    ? departments.filter(d => d.name === selectedDeptName).map(d => d.id)
    : [];
  
  // Filter offices: respect office selection regardless of department selection
  let filteredOffices = selectedOffices.length === 0
    ? offices
    : offices.filter(office => selectedOffices.includes(office.id));
  
  const finalOffices = filteredOffices.map(office => {
    let filteredEntries = office.previewEntries;

    // Apply selected department filter by name (matching all dept IDs with that name)
    if (selectedDeptName !== 'all') {
      filteredEntries = filteredEntries.filter(entry => matchingDeptIds.includes(entry.department_id));
    }

    return {
      ...office,
      previewEntries: filteredEntries,
      entryCount: filteredEntries.length,
    };
  }).filter(office => office.entryCount > 0);

  const hasFilters = search.trim() !== '' || selectedOffices.length > 0 || selectedDeptName !== 'all';

  const handleClearFilters = () => {
    setSearch('');
    setSelectedOffices([]);
    setSelectedDeptName('all');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Header />

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="rounded-2xl p-2 sm:p-3 relative">
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 lg:items-end">
              {/* Search bar */}
              <div className="w-full sm:w-60 lg:w-48">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Search</label>
                <SearchBar value={search} onChange={setSearch} />
              </div>

              {/* Office and Dept filters - responsive layout */}
              <div className="flex gap-2 items-end flex-wrap sm:flex-nowrap lg:flex-nowrap">
                <div className="w-32 sm:w-36 lg:w-40">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Office</label>
                  <Select value={selectedOffices.length === 1 ? selectedOffices[0] : 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedOffices([]);
                    } else {
                      setSelectedOffices([value]);
                    }
                    // Reset department filter when office changes
                    setSelectedDeptName('all');
                  }}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs rounded-lg border-slate-300 dark:border-slate-600 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent align="start" className="w-40">
                      <SelectItem value="all">All Offices</SelectItem>
                      {offices.map(office => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-32 sm:w-36 lg:w-40">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dept</label>
                  <Select value={selectedDeptName} onValueChange={(value) => setSelectedDeptName(value)}>
                    <SelectTrigger className="h-8 sm:h-9 text-xs rounded-lg border-slate-300 dark:border-slate-600 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent align="start" className="w-40">
                      <SelectItem value="all">All Depts</SelectItem>
                      {uniqueDeptNames.map(name => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasFilters && (
                  <Button
                    variant="outline"
                    className="h-8 sm:h-9 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 sm:px-3 whitespace-nowrap"
                    onClick={handleClearFilters}
                  >
                    <X className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedOffices.length === 0 && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 animate-pulse h-56 sm:h-64" />
                ))}
              </div>
            ) : offices.length === 0 ? (
              <div className="text-center py-16 sm:py-20">
                <div className="inline-block p-3 sm:p-4 bg-blue-100 dark:bg-blue-900 rounded-full mb-3 sm:mb-4">
                  <Building2 className="w-8 sm:w-12 h-8 sm:h-12 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">No offices found</p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                  {finalOffices.map(office => (
                    <OfficeCard
                      key={office.id}
                      office={office}
                      onClick={() => navigate(`/office/${office.id}`)}
                      showAll={selectedDeptName !== 'all'}
                      departments={departments}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedOffices.length === 1 && finalOffices.length > 0 && (
          <div>
            <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-900 dark:text-slate-50">{finalOffices.length}</span> office
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              {finalOffices.map(office => (
                <OfficeCard
                  key={office.id}
                  office={office}
                  onClick={() => navigate(`/office/${office.id}`)}
                  showAll={selectedDeptName !== 'all' || selectedOffices.length === 1}
                  departments={departments}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
