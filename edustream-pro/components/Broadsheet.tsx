import React, { useState, useEffect, useCallback } from 'react';
import { SchoolClass, Student, Subject, Result, AcademicSession } from '../types';
import { apiService as dataService } from '../services/apiService';

const Broadsheet: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Load initial data: classes + active session
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [classesData, sessionData] = await Promise.all([
          dataService.getClasses(),
          dataService.getActiveSession()
        ]);
        setClasses(Array.isArray(classesData) ? classesData : []);
        setSession(sessionData);
      } catch (error) {
        console.error('Broadsheet init error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Load class-specific data when class selected
  useEffect(() => {
    if (!selectedClassId || !session) return;
    const loadClassData = async () => {
      try {
        setLoadingData(true);
        const [allStudents, allSubjects, allResults] = await Promise.all([
          dataService.getStudents(),
          dataService.getSubjects(),
          dataService.getResults()
        ]);

        const classStudents = allStudents.filter(s => s.classId === selectedClassId);
        const classSubjects = allSubjects.filter(sub =>
          Array.isArray(sub.classIds) && sub.classIds.includes(selectedClassId)
        );
        const relevantResults = allResults.filter(r =>
          r.classId === selectedClassId &&
          r.term === session.term &&
          r.session === session.year
        );

        setStudents(classStudents);
        setSubjects(classSubjects);
        setResults(relevantResults);
      } catch (error) {
        console.error('Load class data error:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadClassData();
  }, [selectedClassId, session]);

  const getRankedStudents = useCallback(() => {
    const studentsWithTotals = students.map(student => {
      const totalMarks = subjects.reduce((sum, sub) => {
        const res = results.find(r => r.studentId === student.id && r.subjectId === sub.id);
        return sum + (res?.total || 0);
      }, 0);
      return { ...student, totalMarks };
    });

    const sorted = [...studentsWithTotals].sort((a, b) => b.totalMarks - a.totalMarks);

    return sorted.map((s, index, arr) => {
      let rank = index + 1;
      if (index > 0 && s.totalMarks === arr[index - 1].totalMarks) {
        rank = arr.findIndex(item => item.totalMarks === s.totalMarks) + 1;
      }
      const suffix = (r: number) => {
        const j = r % 10, k = r % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
      };
      return { ...s, position: `${rank}${suffix(rank)}` };
    });
  }, [students, subjects, results]);

  const rankedStudents = getRankedStudents();
  const selectedClass = classes.find(c => c.id === selectedClassId);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Broadsheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:mb-4">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Terminal Broadsheet</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
            {session ? `${session.term} (${session.year})` : 'Loading session...'} • Master Performance Matrix
          </p>
        </div>
        <div className="flex items-center space-x-4 print:hidden">
          <select
            className="bg-white border-2 border-gray-100 rounded-2xl px-6 py-3.5 font-bold text-sm outline-none focus:border-indigo-500 shadow-sm transition-all"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
          >
            <option value="">-- Select Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name} {cls.arm}</option>
            ))}
          </select>
          {selectedClassId && students.length > 0 && (
            <button
              onClick={() => window.print()}
              className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
              title="Print Broadsheet"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {!selectedClassId ? (
        <div className="py-32 text-center opacity-20 flex flex-col items-center justify-center">
          <svg className="w-24 h-24 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-xl font-black uppercase tracking-[0.4em]">Select a class to generate broadsheet</p>
        </div>
      ) : loadingData ? (
        <div className="py-40 text-center opacity-30 flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black uppercase tracking-[0.3em] text-xs">Generating Broadsheet Matrix...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="py-32 text-center opacity-30 flex flex-col items-center">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="font-black uppercase tracking-[0.3em] text-sm">No students in {selectedClass?.name} {selectedClass?.arm}</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="py-32 text-center opacity-30 flex flex-col items-center">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-black uppercase tracking-[0.3em] text-sm">No subjects assigned to this class</p>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-gray-50/80 border-b-2 border-gray-100">
                <tr>
                  <th className="sticky left-0 bg-gray-50 z-20 px-8 py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 w-72">
                    Student Identity
                  </th>
                  {subjects.map(sub => (
                    <th key={sub.id} className="px-1 py-4 border-r border-gray-100 align-bottom w-16">
                      <div className="flex flex-col items-center justify-end h-48 pb-4">
                        <span className="whitespace-nowrap inline-block -rotate-90 uppercase tracking-widest font-black text-[10px] text-gray-600 origin-center translate-y-[-20px]">
                          {sub.name}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="w-20 px-2 py-10 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center bg-indigo-50/30 border-l-2 border-indigo-100">
                    Total
                  </th>
                  <th className="w-20 px-2 py-10 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center bg-emerald-50/30">
                    Pos.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rankedStudents.map(student => (
                  <tr key={student.id} className="hover:bg-indigo-50/5 transition-colors group">
                    <td className="sticky left-0 bg-white group-hover:bg-indigo-50/5 z-10 px-8 py-4 border-r border-gray-100">
                      <div className="flex items-center space-x-3">
                        <img
                          src={student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=6366f1&color=fff`}
                          className="w-9 h-9 rounded-xl border border-gray-100 bg-gray-50 print:hidden object-cover"
                          alt={student.name}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-800 truncate">{student.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{student.id}</p>
                        </div>
                      </div>
                    </td>
                    {subjects.map(sub => {
                      const res = results.find(r => r.studentId === student.id && r.subjectId === sub.id);
                      const score = res?.total || 0;
                      return (
                        <td key={sub.id} className="px-1 py-4 text-center border-r border-gray-50 font-bold text-sm">
                          <span className={score === 0 ? 'text-gray-300' : score < 40 ? 'text-rose-500' : score >= 70 ? 'text-emerald-600' : 'text-gray-600'}>
                            {score > 0 ? score : '-'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-4 text-center font-black text-indigo-600 bg-indigo-50/20 text-lg border-l-2 border-indigo-100">
                      {student.totalMarks}
                    </td>
                    <td className="px-2 py-4 text-center bg-emerald-50/20">
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs shadow-sm border border-emerald-200">
                        {student.position}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <div className="flex space-x-8">
              <span>Students: {students.length}</span>
              <span>Subjects: {subjects.length}</span>
              <span>Class: {selectedClass?.name} {selectedClass?.arm}</span>
            </div>
            <span className="print:hidden">Max Score per Subject: 100</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Broadsheet;
