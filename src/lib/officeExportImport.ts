import { Office, Department, PhoneEntry } from '@/types/phone';

export interface OfficeExportData {
  offices: Office[];
  departments: Department[];
  entries: PhoneEntry[];
  exportDate: string;
  version: string;
}

export const exportOfficesToCSV = (offices: Office[], departments: Department[], entries: PhoneEntry[]) => {
  const rows: string[] = [];
  
  // Header
  rows.push('Office ID,Office Name,Office Description,Office Sort Order,Department ID,Department Name,Department Description,Department Sort Order,Extension,Name,Designation,Phone,Email,Status');
  
  // Data
  offices.forEach(office => {
    const officeDepts = departments.filter(d => d.office_id === office.id);
    
    if (officeDepts.length === 0) {
      rows.push(`"${office.id}","${office.name}","${office.description || ''}","${office.sort_order || 0}","","","","","","","","","","")`);
    } else {
      officeDepts.forEach(dept => {
        const deptEntries = entries.filter(e => e.department_id === dept.id);
        
        if (deptEntries.length === 0) {
          rows.push(`"${office.id}","${office.name}","${office.description || ''}","${office.sort_order || 0}","${dept.id}","${dept.name}","${dept.description || ''}","${dept.sort_order || 0}","","","","","","")`);
        } else {
          deptEntries.forEach(entry => {
            rows.push(
              `"${office.id}","${office.name}","${office.description || ''}","${office.sort_order || 0}","${dept.id}","${dept.name}","${dept.description || ''}","${dept.sort_order || 0}","${entry.extension}","${entry.name}","${entry.designation || ''}","${entry.phone || ''}","${entry.email || ''}","${entry.status}"`
            );
          });
        }
      });
    }
  });
  
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `offices-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportOfficesToJSON = (offices: Office[], departments: Department[], entries: PhoneEntry[]) => {
  const exportData: OfficeExportData = {
    offices,
    departments,
    entries,
    exportDate: new Date().toISOString(),
    version: '1.0',
  };
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `offices-export-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importOfficesFromJSON = (file: File): Promise<OfficeExportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as OfficeExportData;
        if (!data.offices || !data.departments || !data.entries) {
          reject(new Error('Invalid import file format'));
        } else {
          resolve(data);
        }
      } catch (err) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
