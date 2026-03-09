import React, { useState, useEffect, useCallback } from 'react';
import { SchoolClass, Student, Subject, Result, AcademicSession, AuthUser, SchoolSettings } from '../types';
import { apiService as dataService } from '../services/apiService';

interface SubjectResultSummary {
  highestScorer: Student | null;
  highestScore: number;
  lowestScorer: Student | null;
  lowestScore: number;
  classAverage: number;
  passCount: number;
  failCount: number;
}

interface StudentResultDetail extends Student {
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  position: number;
  remark: string;
}

const ViewSubjectResults: React.FC = () => {
  const [currentUser] = useState<AuthUser | null>(dataService.getCurrentUser());
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  // Data states
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [session, setSession] = useState<AcademicSession | null>(null);

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // UI states
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [summary, setSummary] = useState<SubjectResultSummary | null>(null);

  // Authorization check
  useEffect(() => {
    if (currentUser && !['admin', 'teacher', 'principal', 'headteacher'].includes(currentUser.role)) {
      // Redirect unauthorized users would happen at parent level
      console.warn('Unauthorized access attempt:', currentUser.role);
    }
  }, [currentUser]);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [classesData, sessionData, settingsData] = await Promise.all([
          dataService.getClasses(),
          dataService.getActiveSession(),
          dataService.getSettings()
        ]);

        setClasses(Array.isArray(classesData) ? classesData : []);
        setSession(sessionData);
        setSettings(settingsData);
      } catch (error) {
        console.error('ViewSubjectResults init error:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Load subjects and students based on selected class
  useEffect(() => {
    if (!selectedClassId || !session) {
      setSubjects([]);
      setStudents([]);
      return;
    }

    const loadClassData = async () => {
      try {
        setLoadingData(true);
        const [allSubjects, allStudents, allResults] = await Promise.all([
          dataService.getSubjects(),
          dataService.getStudents(),
          dataService.getResults()
        ]);

        const classSubjects = allSubjects.filter(sub =>
          Array.isArray(sub.classIds) && sub.classIds.includes(selectedClassId)
        );

        let filteredSubjects = classSubjects;
        // If user is a teacher, only show their subjects
        if (currentUser?.role === 'teacher') {
          filteredSubjects = classSubjects.filter(s => s.teacherId === currentUser.id);
        }

        const classStudents = allStudents.filter(s => s.classId === selectedClassId);
        const relevantResults = allResults.filter(r =>
          r.classId === selectedClassId &&
          r.term === session.term &&
          r.session === session.year
        );

        setSubjects(filteredSubjects);
        setStudents(classStudents);
        setResults(relevantResults);
        setSelectedSubjectId('');
      } catch (error) {
        console.error('Load class data error:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadClassData();
  }, [selectedClassId, session, currentUser]);

  // Calculate grades based on total score
  const calculateGrade = (total: number): string => {
    if (total >= 90) return 'A+';
    if (total >= 80) return 'A';
    if (total >= 70) return 'B';
    if (total >= 60) return 'C';
    if (total >= 50) return 'D';
    if (total >= 40) return 'E';
    return 'F';
  };

  // Calculate remark based on total score
  const calculateRemark = (total: number): string => {
    if (total >= 75) return 'Excellent';
    if (total >= 60) return 'Very Good';
    if (total >= 50) return 'Good';
    if (total >= 40) return 'Pass';
    return 'Fail';
  };

  // Get student results with rankings
  const getStudentResults = useCallback((): StudentResultDetail[] => {
    if (!selectedSubjectId) return [];

    // Get all results for this subject and class in this term/session
    const subjectResults = results.filter(r =>
      r.subjectId === selectedSubjectId &&
      r.classId === selectedClassId &&
      r.term === session?.term &&
      r.session === session?.year
    );

    // Map students with their results
    const studentsWithResults = students.map(student => {
      const result = subjectResults.find(r => r.studentId === student.id);
      const total = result?.total || 0;

      return {
        ...student,
        ca1: result?.ca1 || 0,
        ca2: result?.ca2 || 0,
        exam: result?.exam || 0,
        total: total,
        grade: calculateGrade(total),
        position: 0,
        remark: calculateRemark(total)
      };
    });

    // Sort by total score descending and assign positions
    const sorted = [...studentsWithResults].sort((a, b) => b.total - a.total);

    return sorted.map((s, index, arr) => {
      let position = index + 1;
      if (index > 0 && s.total === arr[index - 1].total) {
        position = arr.findIndex(item => item.total === s.total) + 1;
      }
      return { ...s, position };
    });
  }, [selectedSubjectId, selectedClassId, students, results, session]);

  // Calculate summary statistics
  useEffect(() => {
    if (!selectedSubjectId || !selectedClassId) {
      setSummary(null);
      return;
    }

    const studentResults = getStudentResults();
    if (studentResults.length === 0) {
      setSummary(null);
      return;
    }

    const validResults = studentResults.filter(r => r.total > 0);

    if (validResults.length === 0) {
      setSummary(null);
      return;
    }

    const totalSum = validResults.reduce((sum, r) => sum + r.total, 0);
    const classAverage = totalSum / validResults.length;

    const passCount = validResults.filter(r => r.total >= 40).length;
    const failCount = validResults.filter(r => r.total < 40).length;

    const sorted = [...validResults].sort((a, b) => b.total - a.total);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    setSummary({
      highestScorer: highest,
      highestScore: highest.total,
      lowestScorer: lowest,
      lowestScore: lowest.total,
      classAverage: Math.round(classAverage * 10) / 10,
      passCount,
      failCount
    });
  }, [selectedSubjectId, selectedClassId, getStudentResults]);

  const studentResults = getStudentResults();
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  if (!currentUser || !['admin', 'teacher', 'principal', 'headteacher'].includes(currentUser.role)) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4v2m0 0v2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-black uppercase tracking-[0.3em] text-sm text-gray-400">Unauthorized Access</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Subject Results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-full">

      {/* School Info Header - Visible Both Web & Print */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[40px] p-8 border-2 border-indigo-100 shadow-lg">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          {/* School Logo */}
          {settings?.logo && (
            <div className="mb-2">
              <img 
                src={settings.logo} 
                alt={settings.name} 
                className="h-20 w-20 object-contain rounded-2xl shadow-md"
              />
            </div>
          )}
          
          {/* School Name */}
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">{settings?.name || 'School Name'}</h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mt-2 rounded-full"></div>
          </div>

          {/* School Details */}
          <div className="space-y-1">
            <p className="text-base text-gray-700 font-bold leading-none">{settings?.address || 'Address'}</p>
            <div className="flex flex-col sm:flex-row sm:justify-center items-center space-y-0.5 sm:space-y-0 sm:space-x-4 text-xs text-gray-600 font-semibold leading-none">
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{settings?.email || 'email@school.com'}</span>
              </span>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948-.684l1.498-4.493a1 1 0 011.502-.684l1.498 4.493a1 1 0 00.948.684H19a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                </svg>
                <span>{settings?.phone || '+1 (555) 000-0000'}</span>
              </span>
            </div>
          </div>

          {/* Session & Report Info */}
          <div className="pt-2 border-t border-indigo-200 w-full">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-1 sm:space-y-0 sm:space-x-6">
              <div className="text-center leading-none">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Academic Period</p>
                <p className="text-sm font-black text-gray-900">{session?.term} - {session?.year}</p>
              </div>
              <div className="hidden sm:block w-px h-6 bg-indigo-200"></div>
              <div className="text-center leading-none">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Report Type</p>
                <p className="text-sm font-black text-gray-900">Subject Performance Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Information Bar */}
      {selectedClassId && selectedSubjectId && (
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm font-bold text-gray-900 leading-none">
              <div className="space-y-1">
                <p><span className="text-indigo-600">Students Assessed:</span> {studentResults.length}</p>
                <p><span className="text-indigo-600">Class:</span> {selectedClass?.name} {selectedClass?.arm}</p>
                <p><span className="text-indigo-600">Subject:</span> {selectedSubject?.name}</p>
              </div>
              <div className="text-xs font-bold text-gray-800 leading-tight">
                <p className="mb-1 font-black text-gray-900">GRADING SCALE:</p>
                <p>A+ (90-100) • A (80-89) • B (70-79) • C (60-69) • D (50-59) • E (40-49) • F (&lt;40)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex flex-col sm:flex-row gap-4 print:hidden">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Select Class</label>
          <select
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-3.5 font-bold text-sm outline-none focus:border-indigo-500 shadow-sm transition-all"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
          >
            <option value="">-- Choose a Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name} {cls.arm}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Select Subject</label>
          <select
            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-6 py-3.5 font-bold text-sm outline-none focus:border-indigo-500 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            disabled={!selectedClassId}
          >
            <option value="">-- Choose a Subject --</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tighter">Results Overview</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
            {selectedClass?.name} {selectedClass?.arm} • {selectedSubject?.name}
          </p>
        </div>
        {selectedClassId && selectedSubjectId && (
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all font-bold text-sm uppercase tracking-widest flex items-center space-x-2 justify-center print:hidden"
            title="Print Results"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Report</span>
          </button>
        )}
      </div>

      {/* No Selection Message */}
      {!selectedClassId || !selectedSubjectId ? (
        <div className="py-32 text-center opacity-20 flex flex-col items-center justify-center">
          <svg className="w-24 h-24 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-xl font-black uppercase tracking-[0.4em]">Select a class and subject to view results</p>
        </div>
      ) : loadingData ? (
        <div className="py-40 text-center opacity-30 flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black uppercase tracking-[0.3em] text-xs">Loading Results Data...</p>
        </div>
      ) : studentResults.length === 0 ? (
        <div className="py-32 text-center opacity-30 flex flex-col items-center">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-black uppercase tracking-[0.3em] text-sm">No enrolled students in {selectedClass?.name} {selectedClass?.arm}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Results Table */}
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden print:border-none print:shadow-none">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-8 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 w-48 leading-none">
                      Student Name
                    </th>
                    <th className="px-6 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 w-20 text-center leading-none">
                      CA1 (20)
                    </th>
                    <th className="px-6 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 w-20 text-center leading-none">
                      CA2 (20)
                    </th>
                    <th className="px-6 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 w-20 text-center leading-none">
                      Exam (60)
                    </th>
                    <th className="px-6 py-2 text-[9px] font-black text-indigo-600 uppercase tracking-widest border-r border-indigo-100 bg-indigo-50/30 w-20 text-center leading-none">
                      Total (100)
                    </th>
                    <th className="px-6 py-2 text-[9px] font-black text-purple-600 uppercase tracking-widest border-r border-purple-100 bg-purple-50/30 w-16 text-center leading-none">
                      Grade
                    </th>
                    <th className="px-6 py-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest border-r border-emerald-100 bg-emerald-50/30 w-16 text-center leading-none">
                      Pos.
                    </th>
                    <th className="px-6 py-2 text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/30 w-32 text-center leading-none">
                      Remark
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {studentResults.map(student => {
                    const isExcellent = student.total >= 75;
                    const isFailing = student.total < 40;

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-indigo-50/5 transition-colors group ${
                          isExcellent ? 'bg-green-50/20' : isFailing ? 'bg-red-50/20' : ''
                        }`}
                      >
                        <td className="px-8 py-2 border-r border-gray-100 leading-none">
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
                        <td className="px-6 py-2 text-center border-r border-gray-50 font-bold text-xs leading-none">
                          <span className={student.ca1 === 0 ? 'text-gray-300' : 'text-gray-700'}>
                            {student.ca1 > 0 ? student.ca1 : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-center border-r border-gray-50 font-bold text-xs leading-none">
                          <span className={student.ca2 === 0 ? 'text-gray-300' : 'text-gray-700'}>
                            {student.ca2 > 0 ? student.ca2 : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-center border-r border-gray-50 font-bold text-xs leading-none">
                          <span className={student.exam === 0 ? 'text-gray-300' : 'text-gray-700'}>
                            {student.exam > 0 ? student.exam : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-center border-r border-indigo-100 bg-indigo-50/20 font-black text-base text-indigo-700 leading-none">
                          {student.total > 0 ? student.total : '-'}
                        </td>
                        <td className="px-6 py-2 text-center border-r border-purple-100 bg-purple-50/20 font-bold text-xs leading-none">
                          <span className={`px-2.5 py-0.5 rounded-lg font-black text-[10px] inline-block ${
                            student.total >= 90 ? 'bg-green-100 text-green-700' :
                            student.total >= 70 ? 'bg-blue-100 text-blue-700' :
                            student.total >= 50 ? 'bg-amber-100 text-amber-700' :
                            student.total >= 40 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {student.grade}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-center border-r border-emerald-100 bg-emerald-50/20 leading-none">
                          <span className="px-3 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-black text-[10px] shadow-sm border border-emerald-200 inline-block">
                            {student.position}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-center bg-blue-50/20 font-bold text-xs leading-none">
                          <span className={`px-2.5 py-0.5 rounded-lg inline-block font-black text-[10px] ${
                            student.total >= 75 ? 'bg-green-100 text-green-700' :
                            student.total >= 60 ? 'bg-blue-100 text-blue-700' :
                            student.total >= 50 ? 'bg-amber-100 text-amber-700' :
                            student.total >= 40 ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {student.remark}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">
              <span>Total Students: {studentResults.length}</span>
            </div>
          </div>

          {/* Summary Section */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Highest Scorer */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-[30px] p-8 border border-emerald-200 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Highest Scorer</p>
                    <p className="text-3xl font-black text-emerald-700 mt-2">{summary.highestScore}</p>
                  </div>
                  <div className="bg-emerald-200 rounded-2xl p-3">
                    <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="border-t border-emerald-200 pt-4">
                  <p className="text-sm font-black text-emerald-900">{summary.highestScorer?.name}</p>
                  <p className="text-xs text-emerald-600 font-bold uppercase mt-1">{summary.highestScorer?.id}</p>
                </div>
              </div>

              {/* Lowest Scorer */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-[30px] p-8 border border-orange-200 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Lowest Scorer</p>
                    <p className="text-3xl font-black text-orange-700 mt-2">{summary.lowestScore}</p>
                  </div>
                  <div className="bg-orange-200 rounded-2xl p-3">
                    <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17v6H3v-2s0-4 5-4 5 4 5 4m8-15a4 4 0 11-8 0 4 4 0 018 0zM21 7a.5.5 0 01.5.5v5a.5.5 0 01-1 0v-5a.5.5 0 01.5-.5z" />
                    </svg>
                  </div>
                </div>
                <div className="border-t border-orange-200 pt-4">
                  <p className="text-sm font-black text-orange-900">{summary.lowestScorer?.name}</p>
                  <p className="text-xs text-orange-600 font-bold uppercase mt-1">{summary.lowestScorer?.id}</p>
                </div>
              </div>

              {/* Class Average */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-[30px] p-8 border border-indigo-200 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Class Average</p>
                    <p className="text-3xl font-black text-indigo-700 mt-2">{summary.classAverage.toFixed(1)}</p>
                  </div>
                  <div className="bg-indigo-200 rounded-2xl p-3">
                    <svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="border-t border-indigo-200 pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-indigo-600 font-bold">Pass Rate:</span>
                    <span className="text-indigo-900 font-black">{summary.passCount} students</span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(summary.passCount / studentResults.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-[30px] p-8 border border-purple-200 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Class Statistics</p>
                    <p className="text-2xl font-black text-purple-700 mt-2">{studentResults.length}</p>
                    <p className="text-[10px] text-purple-600 font-bold mt-1">Total Students</p>
                  </div>
                  <div className="bg-purple-200 rounded-2xl p-3">
                    <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="border-t border-purple-200 pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-600 font-bold">Failures:</span>
                    <span className="text-purple-900 font-black">{summary.failCount}</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(summary.failCount / studentResults.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViewSubjectResults;
