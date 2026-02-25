import { Phone, Users, ChevronRight } from 'lucide-react';
import { PhoneEntry } from '@/types/phone';

interface DepartmentCardProps {
  department: {
    id: string;
    name: string;
    entries: PhoneEntry[];
  };
  onClick: () => void;
}

const DepartmentCard = ({ department, onClick }: DepartmentCardProps) => {
  // Filter entries to only show those with extension numbers
  const entriesWithExtension = department.entries.filter(entry => entry.extension?.trim());
  const displayEntries = entriesWithExtension.slice(0, 10);
  const remaining = entriesWithExtension.length - 10;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 hover:-translate-y-1 p-6 cursor-pointer group flex flex-col"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
          <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{department.name}</h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg w-fit">
        <Phone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        <span className="font-semibold text-slate-900 dark:text-slate-50">{entriesWithExtension.length}</span>
        <span className="text-xs">Extensions</span>
      </p>

      <div className="space-y-0.5 mb-3 flex-1 overflow-y-auto max-h-60">
        {displayEntries.map(entry => (
          <div key={entry.id} className="flex items-start gap-1.5 p-0.5 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
            <span className="text-green-600 dark:text-green-400 font-bold text-xs min-w-[24px]">{entry.extension}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 dark:text-slate-50 truncate">{entry.name}</p>
            </div>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <p className="text-green-600 dark:text-green-400 text-xs font-semibold mb-2">+{remaining} more extensions</p>
      )}

      <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
        <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
      </div>
    </div>
  );
};

export default DepartmentCard;
