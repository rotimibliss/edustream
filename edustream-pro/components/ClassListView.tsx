
import React, { useState, useEffect } from 'react';
import { SchoolClass, Student, Teacher } from '../types';
import { apiService as dataService } from '../services/apiService';

const ClassListView: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    const cls = dataService.getClasses();
    setClasses(cls);
    setStudents(dataService.getStudents());
    setTeachers(dataService.getTeachers());
    
    if (cls.length > 0) {
      setSelectedClassId(cls[0].id);
    }
  }, []);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStudents = students.filter(s => s.classId === selectedClassId);
  const classTeacher = teachers.find(t => t.id === selectedClass?.classTeacherId);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row bg-[#F8FAFC] animate-fadeIn">
      {/* Sidebar: Class List */}
      <div className="w-full lg:w-80 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-indigo-50/10">
          <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Explore Classes</h2>
          <p className="text-2xl font-black text-gray-800 tracking-tighter">{classes.length} Total Units</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`w-full p-5 rounded-[28px] text-left transition-all border-2 group relative overflow-hidden ${
                selectedClassId === cls.id 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                : 'bg-white border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-600'
              }`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black leading-none mb-1">{cls.name}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${selectedClassId === cls.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                    Arm {cls.arm}
                  </div>
                </div>
                <div className={`text-xs font-black px-3 py-1 rounded-full ${selectedClassId === cls.id ? 'bg-white/20' : 'bg-gray-50 text-gray-400'}`}>
                  {students.filter(s => s.classId === cls.id).length} Wards
                </div>
              </div>
              {selectedClassId === cls.id && (
                <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-white/5 to-transparent"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Class Details & Roster */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedClass ? (
          <>
            {/* Header: Teacher & Stats */}
            <div className="p-10 bg-white border-b border-gray-50 space-y-10 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[32px] flex items-center justify-center relative shadow-sm border border-indigo-100 overflow-hidden">
                    {classTeacher ? (
                      <img src={classTeacher.avatar} alt={classTeacher.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Official Class Teacher</div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tighter">{classTeacher?.name || 'Unassigned'}</h1>
                    <div className="flex items-center space-x-4 mt-2">
                       <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 flex items-center">
                         <span className={`w-2 h-2 rounded-full mr-2 ${classTeacher?.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                         {classTeacher?.subject || 'N/A Faculty'}
                       </span>
                       <span className="text-xs font-bold text-gray-400 italic">|</span>
                       <span className="text-xs font-bold text-gray-400">{classTeacher?.email || 'no-email@lincoln.edu'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-12 px-8 py-6 bg-gray-50/50 rounded-[40px] border border-gray-100/50 shadow-inner">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Enrolled</p>
                      <p className="text-2xl font-black text-indigo-600">{classStudents.length}</p>
                   </div>
                   <div className="w-[1px] h-10 bg-gray-200"></div>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Score</p>
                      <p className="text-2xl font-black text-gray-800">
                        {classStudents.length > 0 
                          ? Math.round(classStudents.reduce((acc, s) => acc + (s.performance || 0), 0) / classStudents.length) 
                          : 0}%
                      </p>
                   </div>
                </div>
              </div>
            </div>

            {/* Student Table */}
            <div className="flex-1 overflow-hidden p-10">
              <div className="bg-white h-full rounded-[48px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-indigo-50/5">
                   <h3 className="text-lg font-black text-gray-800">Class Register / Roster</h3>
                   <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-white border border-indigo-100 px-4 py-2 rounded-2xl">
                     {selectedClass.name} Arm {selectedClass.arm}
                   </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/70 border-b border-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Identity</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Age</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Attendance</th>
                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Current Perf.</th>
                        <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Account Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {classStudents.length > 0 ? classStudents.map(student => (
                        <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors group">
                          <td className="px-10 py-6">
                            <div className="flex items-center space-x-4">
                              <img src={student.avatar} className="w-12 h-12 rounded-2xl border border-gray-100 object-cover shadow-sm" alt="" />
                              <div className="min-w-0">
                                <div className="text-sm font-black text-gray-800 truncate">{student.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: {student.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center text-sm font-bold text-gray-600">{student.age} yrs</td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col items-center">
                              <div className="w-24 bg-gray-100 h-1.5 rounded-full mb-1">
                                <div className={`h-full rounded-full ${student.attendance > 85 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${student.attendance}%` }}></div>
                              </div>
                              <span className="text-[9px] font-black text-gray-400 uppercase">{student.attendance}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-xl font-black text-sm ${student.performance >= 75 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                               {student.performance || 0}%
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                             <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                               student.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                             }`}>
                               {student.status}
                             </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-10 py-32 text-center">
                             <div className="opacity-20 flex flex-col items-center">
                                <div className="w-20 h-20 bg-gray-100 rounded-[28px] flex items-center justify-center mb-6">
                                   <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                                <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-600">No students currently assigned to this class</p>
                             </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40">
            <svg className="w-24 h-24 text-gray-200 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <p className="font-black text-xs uppercase tracking-widest text-gray-500">Select a class from the explorer to view its roster</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassListView;
