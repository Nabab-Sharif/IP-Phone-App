import { Users, Building2, ChevronRight } from 'lucide-react';
import { PhoneEntry, Department } from '@/types/phone';

interface OfficeCardProps {
  office: {
    id: string;
    name: string;
    description?: string | null;
    departmentCount: number;
    entryCount: number;
    previewEntries: PhoneEntry[];
  };
  onClick: () => void;
  showAll?: boolean;
  departments?: Department[];
}

const OfficeCard = ({ office, onClick, showAll = false, departments = [] }: OfficeCardProps) => {
  const getDepartmentName = (departmentId: string): string => {
    return departments.find(d => d.id === departmentId)?.name || '';
  };

  // Show 3 extensions by default, or all extensions when showAll is true
  const entriesToShow = showAll ? office.previewEntries : office.previewEntries.slice(0, 3);
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-orange-400 dark:border-orange-500 flex flex-col p-6 cursor-pointer group min-h-80 hover:shadow-xl hover:border-orange-500 dark:hover:border-orange-400 transition-all"
    >
      {/* Header with office name */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 truncate flex-1">{office.name}</h3>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-5">
        <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg">
          <span className="font-semibold text-slate-900 dark:text-slate-50">{office.entryCount}</span>
          <span className="text-xs">Extensions</span>
        </span>
        <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg">
          <Users className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-50">{office.departmentCount}</span>
          <span className="text-xs">Depts</span>
        </span>
      </div>

      <div className="space-y-2 w-full">
        {entriesToShow.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-1 p-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 transition-colors hover:border-orange-400 dark:hover:border-orange-500">
              <div className="flex items-center gap-2">
                <span className="text-orange-600 dark:text-orange-400 font-bold text-sm min-w-[40px] bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{entry.extension}</span>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{entry.name}</p>
            </div>
            {getDepartmentName(entry.department_id) && (
              <p className="text-xs text-slate-500 dark:text-slate-400 ml-2">{getDepartmentName(entry.department_id)}</p>
            )}
          </div>
        ))}
      </div>

      {!showAll && office.entryCount > 3 && (
        <p className="text-orange-600 dark:text-orange-400 text-sm mt-3 font-semibold">
          +{office.entryCount - 3} more extensions
        </p>
      )}
    </div>
  );
};

export default OfficeCard;
