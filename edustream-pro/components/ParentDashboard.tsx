
import React, { useState, useEffect } from 'react';
import { Parent, Student, Result, Subject, AcademicSession, StudentReport } from '../types';
import { apiService as dataService } from '../services/apiService';

const ParentDashboard: React.FC = () => {
  const [activeParent, setActiveParent] = useState<Parent | null>(null);
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [session] = useState<AcademicSession>(dataService.getActiveSession());
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const parents = dataService.getParents();
    setAllParents(parents);
    const currentUser = dataService.getCurrentUser();
    
    // Attempt to match current user to a parent record
    if (currentUser && currentUser.role === 'parent') {
      const matched = parents.find(p => p.id === currentUser.id);
      if (matched) setActiveParent(matched);
      else if (parents.length > 0) setActiveParent(parents[0]);
    } else if (parents.length > 0) {
      setActiveParent(parents[0]);
    }

    setSubjects(dataService.getSubjects());
    setReports(dataService.getStudentReports());
  }, []);

  useEffect(() => {
    if (activeParent) {
      const students = dataService.getStudents();
      const parentChildren = students.filter(s => s.parentId === activeParent.id);
      setChildren(parentChildren);
      if (parentChildren.length > 0) {
        setSelectedChildId(parentChildren[0].id);
      }
      
      const allResults = dataService.getResults();
      setResults(allResults);
    }
  }, [activeParent]);

  // Reset result visibility when switching children
  useEffect(() => {
    setShowResults(false);
  }, [selectedChildId]);

  const selectedChild = children.find(c => c.id === selectedChildId);
  const childResults = results.filter(r => r.studentId === selectedChildId && r.term === session.term && r.session === session.year);
  const childReport = reports.find(r => r.studentId === selectedChildId && r.term === session.term && r.session === session.year);

  if (!activeParent) {
    return <div className="p-20 text-center font-bold text-gray-400">Loading Portal...</div>;
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-7xl mx-auto pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Welcome, {activeParent.name}</h1>
          <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px]">Guardian & Parent Dashboard • Digital Progress Portal</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center space-x-8">
           <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Wards</p>
              <p className="text-2xl font-black text-gray-800">{children.length}</p>
           </div>
           <div className="w-[1px] h-10 bg-gray-100"></div>
           <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Session</p>
              <p className="text-2xl font-black text-indigo-600">{session.year.split('/')[0]}</p>
           </div>
        </div>
      </header>

      {/* Children Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {children.map(child => (
          <button 
            key={child.id}
            onClick={() => setSelectedChildId(child.id)}
            className={`p-6 rounded-[40px] border-2 transition-all text-left group relative overflow-hidden ${
              selectedChildId === child.id 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-100' 
              : 'bg-white border-transparent hover:border-indigo-200 shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-4 relative z-10">
               <img src={child.avatar} className={`w-14 h-14 rounded-2xl shadow-md border-2 border-white/20 ${selectedChildId === child.id ? '' : 'bg-gray-50'}`} />
               <div className="min-w-0">
                  <h3 className="text-lg font-black leading-tight truncate">{child.name}</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedChildId === child.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                    {child.grade}
                  </p>
               </div>
            </div>
          </button>
        ))}
        {children.length === 0 && (
          <div className="col-span-full p-12 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 text-center">
             <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No wards linked to this account</p>
          </div>
        )}
      </div>

      {selectedChild && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bio Data & Attendance Summary */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-8 h-fit">
             <div>
                <h3 className="text-xl font-black text-gray-800 mb-6">Attendance Record</h3>
                {childReport ? (
                   <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="bg-gray-50 p-4 rounded-3xl text-center border border-gray-100">
                         <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Opened</p>
                         <p className="text-xl font-black text-gray-800">{childReport.timesOpened || 0}</p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-3xl text-center border border-emerald-100">
                         <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Present</p>
                         <p className="text-xl font-black text-emerald-600">{childReport.timesPresent || 0}</p>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-3xl text-center border border-rose-100">
                         <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-1">Absent</p>
                         <p className="text-xl font-black text-rose-600">{childReport.timesAbsent || 0}</p>
                      </div>
                   </div>
                ) : (
                   <div className="p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center mb-8">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No attendance data for this term</p>
                   </div>
                )}

                <div className="space-y-4">
                   <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admission No</span>
                      <span className="text-sm font-bold text-gray-700">{selectedChild.id}</span>
                   </div>
                   <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Age</span>
                      <span className="text-sm font-bold text-gray-700">{selectedChild.age} Years</span>
                   </div>
                </div>
             </div>

             <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100/50">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Academic Advisory</p>
                <div className="text-indigo-900/80 text-xs font-medium leading-relaxed italic">
                   "{childReport?.teacherComment || 'Your child is doing well. A detailed termly evaluation will be available after final assessments.'}"
                </div>
             </div>
          </div>

          {/* Academic Results Selection/Display */}
          <div className="lg:col-span-2 space-y-6">
            {!showResults ? (
              <div className="bg-white p-12 rounded-[48px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn">
                 <div className="w-24 h-24 bg-indigo-50 rounded-[36px] flex items-center justify-center text-indigo-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-gray-800 tracking-tighter">Performance Report</h3>
                    <p className="text-sm text-gray-400 font-medium max-w-sm mx-auto mt-2">
                      Access the official terminal results for <span className="text-indigo-600 font-black">{selectedChild.name}</span> for the {session.term} session.
                    </p>
                 </div>
                 <button 
                  onClick={() => setShowResults(true)}
                  className="px-12 py-5 bg-indigo-600 text-white rounded-[28px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center space-x-3"
                 >
                   <span>View Termly Result</span>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 </button>
              </div>
            ) : (
              <div className="bg-white rounded-[48px] shadow-2xl border border-indigo-100 overflow-hidden flex flex-col animate-fadeIn">
                 <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-50/20">
                    <div>
                       <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
                          <h3 className="text-xl font-black text-gray-800">Term Result Sheet</h3>
                       </div>
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{session.year} Academic Year • {session.term}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                       <button onClick={() => setShowResults(false)} className="px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Hide Records</button>
                       <button className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                       </button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Curriculum</th>
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">CA (40)</th>
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Exam (60)</th>
                          <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Total</th>
                          <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {childResults.length > 0 ? childResults.map(res => {
                          const subject = subjects.find(s => s.id === res.subjectId);
                          return (
                            <tr key={res.id} className="hover:bg-indigo-50/5 transition-colors">
                              <td className="px-10 py-6">
                                 <p className="font-black text-gray-800 text-sm leading-none">{subject?.name || 'Academic Course'}</p>
                                 <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Verified Entry</p>
                              </td>
                              <td className="px-6 py-6 text-center font-bold text-gray-600">{(res.ca1 || 0) + (res.ca2 || 0)}</td>
                              <td className="px-6 py-6 text-center font-bold text-gray-600">{res.exam}</td>
                              <td className="px-6 py-6 text-center">
                                <span className={`inline-block px-4 py-2 rounded-xl font-black text-sm shadow-sm ${res.total >= 70 ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                                   {res.total}
                                </span>
                              </td>
                              <td className="px-10 py-6">
                                 <span className={`text-[10px] font-black uppercase tracking-widest ${res.total >= 50 ? 'text-indigo-500' : 'text-rose-500'}`}>{res.remark}</span>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-24 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.4em]">Academic grades pending synchronization</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                 </div>
                 {childResults.length > 0 && (
                   <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Term Avg</p>
                            <p className="text-xl font-black text-gray-800 mt-1">
                               {Math.round(childResults.reduce((acc, r) => acc + r.total, 0) / childResults.length)}%
                            </p>
                         </div>
                         <div className="w-[1px] h-8 bg-gray-200"></div>
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Units</p>
                            <p className="text-xl font-black text-gray-800 mt-1">{childResults.length}</p>
                         </div>
                      </div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                         <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                         Verified Certificate
                      </p>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
