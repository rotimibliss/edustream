import React, { useState, useEffect } from 'react';
import { apiService as dataService } from '../services/apiService';

const SystemMaintenance: React.FC = () => {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    parents: 0,
    classes: 0,
    subjects: 0,
    results: 0,
    reports: 0,
    sessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    refreshStats();
  }, []);

  const refreshStats = async () => {
    try {
      setLoading(true);
      const [students, teachers, parents, classes, subjects, results, reports, sessions] = await Promise.all([
        dataService.getStudents(),
        dataService.getTeachers(),
        dataService.getParents(),
        dataService.getClasses(),
        dataService.getSubjects(),
        dataService.getResults(),
        dataService.getStudentReports(),
        dataService.getSessions()
      ]);
      
      setStats({
        students: Array.isArray(students) ? students.length : 0,
        teachers: Array.isArray(teachers) ? teachers.length : 0,
        parents: Array.isArray(parents) ? parents.length : 0,
        classes: Array.isArray(classes) ? classes.length : 0,
        subjects: Array.isArray(subjects) ? subjects.length : 0,
        results: Array.isArray(results) ? results.length : 0,
        reports: Array.isArray(reports) ? reports.length : 0,
        sessions: Array.isArray(sessions) ? sessions.length : 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!confirm('Export all database records to JSON? This may take a moment for large datasets.')) return;
    
    try {
      setIsExporting(true);
      
      // Fetch all data
      const [students, teachers, parents, classes, subjects, results, reports, sessions, traits] = await Promise.all([
        dataService.getStudents(),
        dataService.getTeachers(),
        dataService.getParents(),
        dataService.getClasses(),
        dataService.getSubjects(),
        dataService.getResults(),
        dataService.getStudentReports(),
        dataService.getSessions(),
        Promise.all([
          dataService.getAffectiveTraits(),
          dataService.getPsychomotorTraits()
        ])
      ]);

      const backup = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          students,
          teachers,
          parents,
          classes,
          subjects,
          results,
          reports,
          sessions,
          affectiveTraits: traits[0],
          psychomotorTraits: traits[1]
        }
      };

      // Download as JSON
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `edustream_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      alert('Database backup exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading System Stats...</p>
        </div>
      </div>
    );
  }

  const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <header>
        <h1 className="text-4xl font-black text-gray-800 tracking-tighter">System Maintenance</h1>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Database Health & Backup Management</p>
      </header>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { key: 'students', label: 'Students', icon: '👤', color: 'indigo' },
          { key: 'teachers', label: 'Teachers', icon: '👨‍🏫', color: 'purple' },
          { key: 'parents', label: 'Parents', icon: '👨‍👩‍👧', color: 'emerald' },
          { key: 'classes', label: 'Classes', icon: '🏫', color: 'blue' },
          { key: 'subjects', label: 'Subjects', icon: '📚', color: 'amber' },
          { key: 'results', label: 'Results', icon: '📊', color: 'rose' },
          { key: 'reports', label: 'Reports', icon: '📄', color: 'cyan' },
          { key: 'sessions', label: 'Sessions', icon: '📅', color: 'pink' }
        ].map(({ key, label, icon, color }) => (
          <div key={key} className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 text-center hover:shadow-xl transition-all group">
            <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">{icon}</div>
            <div className={`text-4xl font-black text-${color}-600 mb-2`}>{stats[key as keyof typeof stats]}</div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[40px] p-10 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest opacity-80 mb-2">Total Database Records</h3>
            <p className="text-6xl font-black">{totalRecords.toLocaleString()}</p>
          </div>
          <div className="w-24 h-24 bg-white/10 rounded-[28px] flex items-center justify-center">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800">Export Database</h3>
              <p className="text-xs text-gray-400 font-medium">Download complete backup as JSON</p>
            </div>
          </div>
          <button 
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full py-5 bg-emerald-600 text-white rounded-[28px] font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </span>
            ) : (
              'Download Backup'
            )}
          </button>
        </div>

        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800">Refresh Stats</h3>
              <p className="text-xs text-gray-400 font-medium">Reload live database metrics</p>
            </div>
          </div>
          <button 
            onClick={refreshStats}
            className="w-full py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-[32px] p-8 flex items-start space-x-4">
        <svg className="w-6 h-6 text-amber-600 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="text-sm font-black text-amber-900 mb-1">Backup Recommendations</h4>
          <p className="text-xs text-amber-700 font-medium leading-relaxed">
            Export your database regularly (weekly recommended). Store backups securely off-site. The JSON export contains all students, teachers, classes, subjects, results, and system settings. You can restore data by re-importing through the API or database admin panel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemMaintenance;
