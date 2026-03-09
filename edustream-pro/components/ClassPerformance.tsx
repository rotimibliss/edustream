import React, { useState, useEffect } from 'react';
import { SchoolClass, Student, Subject, Result, AcademicSession, AuthUser } from '../types';
import { apiService as dataService } from '../services/apiService';

// ─── Tiny custom bar chart — no external deps, always renders ────────────────
const BarChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  if (!data.length) return <p className="text-xs text-gray-300 italic text-center py-10">No data to display</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full space-y-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-400 uppercase w-28 shrink-0 truncate text-right">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
              style={{ width: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: d.color }}
            >
              <span className="text-[10px] font-black text-white drop-shadow">{d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Donut chart — pure SVG, always renders ──────────────────────────────────
const DonutChart: React.FC<{ segments: { label: string; value: number; color: string }[] }> = ({ segments }) => {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="text-xs text-gray-300 italic text-center py-10">No data to display</p>;

  const r = 70, cx = 100, cy = 100, innerR = 42;
  let cumAngle = -Math.PI / 2;

  const slices = segments.map(seg => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const xi1 = cx + innerR * Math.cos(cumAngle - angle);
    const yi1 = cy + innerR * Math.sin(cumAngle - angle);
    const xi2 = cx + innerR * Math.cos(cumAngle);
    const yi2 = cy + innerR * Math.sin(cumAngle);
    return { ...seg, path: `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${xi2},${yi2} A${innerR},${innerR} 0 ${largeArc} 0 ${xi1},${yi1} Z` };
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} className="transition-all hover:opacity-80" />)}
        <text x="100" y="96" textAnchor="middle" className="text-xl" style={{ fontSize: 22, fontWeight: 900, fill: '#1f2937' }}>{total}</text>
        <text x="100" y="116" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Students</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] font-black text-gray-500 uppercase">{s.label} <span className="text-gray-800">({s.value})</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ClassPerformance: React.FC = () => {
  const [currentUser] = useState<AuthUser | null>(dataService.getCurrentUser());
  const [viewMode, setViewMode] = useState<'student' | 'subject'>('student');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
   (async () => {
     try {
       setLoading(true);
       console.log('CP: fetching active session first...'); // ← add this line
       const sessionData = await dataService.getActiveSession();
       console.log('CP: session =', sessionData.year, sessionData.term); // ← and this
       const [allClasses, allSubjects, allResults] = await Promise.all([
         dataService.getClasses(),
         dataService.getSubjects(),
         dataService.getResults(),
       ]);
        const classArr: SchoolClass[] = Array.isArray(allClasses) ? allClasses : [];
        const subjectArr: Subject[] = Array.isArray(allSubjects) ? allSubjects : [];

        if (currentUser?.role === 'teacher') {
          const teacherSubjects = subjectArr.filter(s => s.teacherId === currentUser.id);
          const taughtClassIds = new Set(teacherSubjects.flatMap(s => s.classIds || []));
          setClasses(classArr.filter(c => c.classTeacherId === currentUser.id || taughtClassIds.has(c.id)));
        } else {
          setClasses(classArr);
        }

        setSubjects(subjectArr);
        setResults(Array.isArray(allResults) ? allResults : []);
        setSession(sessionData ?? null);
      } catch (e) {
        console.error('Failed to load performance data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  // ── Load students when class changes ───────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return;
    (async () => {
      try {
        const all = await dataService.getStudents();
        setStudents((Array.isArray(all) ? all : []).filter((s: Student) => s.classId === selectedClassId));
        setSelectedStudentId('');
        setSelectedSubjectId('');
      } catch (e) {
        console.error('Failed to load students:', e);
      }
    })();
  }, [selectedClassId]);

  // ── Derived data ────────────────────────────────────────────────────────────
  // Filter by session — but if session is still loading, show all results to avoid empty chart flash
  const sessionResults = (r: Result) =>
    !session || (r.term === session.term && r.session === session.year);

  const studentResults = results.filter(r => r.studentId === selectedStudentId && sessionResults(r));

  const subjectResults = results.filter(
    r => r.classId === selectedClassId && r.subjectId === selectedSubjectId && sessionResults(r)
  );

  // Bar chart data for individual student
  const studentBarData = studentResults.map(r => ({
    label: subjects.find(s => s.id === r.subjectId)?.name ?? r.subjectId,
    value: r.total ?? 0,
    color: (r.total ?? 0) >= 70 ? '#10b981' : (r.total ?? 0) >= 50 ? '#6366f1' : (r.total ?? 0) >= 40 ? '#f59e0b' : '#f43f5e',
  }));

  // Donut data for subject grade distribution
  const gradeGroups = [
    { label: 'Excellent 70+', color: '#10b981', test: (v: number) => v >= 70 },
    { label: 'Credit 50–69',  color: '#6366f1', test: (v: number) => v >= 50 && v < 70 },
    { label: 'Pass 40–49',    color: '#f59e0b', test: (v: number) => v >= 40 && v < 50 },
    { label: 'Below 40',      color: '#f43f5e', test: (v: number) => v < 40 },
  ];
  const subjectDonutData = gradeGroups
    .map(g => ({ label: g.label, color: g.color, value: subjectResults.filter(r => g.test(r.total ?? 0)).length }))
    .filter(d => d.value > 0);

  const classSubjects = subjects.filter(s => Array.isArray(s.classIds) && s.classIds.includes(selectedClassId));

  const avg = (arr: Result[]) =>
    arr.length ? Math.round(arr.reduce((s, r) => s + (r.total ?? 0), 0) / arr.length) : 0;

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedClass   = classes.find(c => c.id === selectedClassId);

  // ── Class‑wide histogram data ────────────────────────────────────────────
  // compute each student's average in the selected class (filtered by session)
  const classStudentAverages = students.map(s => {
    const srs = results.filter(r => r.studentId === s.id && sessionResults(r));
    return { student: s, avg: avg(srs) };
  });
  const classAvgOverall = classStudentAverages.length
    ? Math.round(classStudentAverages.reduce((sum, e) => sum + e.avg, 0) / classStudentAverages.length)
    : 0;
  const aboveCount = classStudentAverages.filter(e => e.avg >= classAvgOverall).length;
  const belowCount = classStudentAverages.filter(e => e.avg < classAvgOverall).length;
  const histogramData = [
    { label: 'Above Avg', value: aboveCount, color: '#6366f1' },
    { label: 'Below Avg', value: belowCount, color: '#f43f5e' },
  ];

  // ── Student-by-student performance chart ─────────────────────────────────
  // create bar data for each student showing their average mark
  const studentPerformanceChartData = classStudentAverages
    .filter(e => e.avg > 0) // only show students with recorded marks
    .map(e => ({
      label: e.student.name,
      value: e.avg,
      color: e.avg >= 70 ? '#10b981' : e.avg >= 50 ? '#6366f1' : e.avg >= 40 ? '#f59e0b' : '#f43f5e',
    }))
    .sort((a, b) => b.value - a.value); // sort descending by average

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Performance Data...</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-full">

      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Performance Hub</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
            {session ? `${session.term} · ${session.year}` : 'All Sessions'} — Analytics Engine
          </p>
        </div>

        {/* Mode toggle */}
        <div className="bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 flex">
          <button
            onClick={() => { setViewMode('student'); setSelectedSubjectId(''); }}
            className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2
              ${viewMode === 'student' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Individual Analysis</span>
          </button>
          <button
            onClick={() => { setViewMode('subject'); setSelectedStudentId(''); }}
            className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2
              ${viewMode === 'subject' ? 'bg-purple-600 text-white shadow-xl shadow-purple-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Subject Analysis</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* ── Sidebar ── */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">

            {/* Class selector */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Target Class</label>
              <select
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
              >
                <option value="">— Choose Class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
              </select>
            </div>

            {/* Student / Subject list */}
            {selectedClassId && (
              <div className="animate-fadeIn">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  {viewMode === 'student' ? 'Select Student' : 'Select Subject'}
                </label>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {viewMode === 'student' ? (
                    students.length === 0
                      ? <p className="text-xs text-gray-400 italic p-4">No students in this class</p>
                      : students.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStudentId(s.id)}
                            className={`w-full p-4 rounded-2xl text-left transition-all flex items-center space-x-3 border-2
                              ${selectedStudentId === s.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'}`}
                          >
                            <img
                              src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`}
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                              alt={s.name}
                            />
                            <span className="text-xs font-black truncate">{s.name}</span>
                          </button>
                        ))
                  ) : (
                    classSubjects.length === 0
                      ? <p className="text-xs text-gray-400 italic p-4">No subjects assigned to this class</p>
                      : classSubjects.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubjectId(sub.id)}
                            className={`w-full p-4 rounded-2xl text-left transition-all border-2
                              ${selectedSubjectId === sub.id ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'}`}
                          >
                            <span className="text-xs font-black">{sub.name}</span>
                          </button>
                        ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main display ── */}
        <div className="lg:col-span-3 space-y-8">

          {/* ── Class overview histogram (above/below average) ── */}
          {selectedClassId && students.length > 0 && (
            <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-800 mb-2">Class Performance Overview</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Distribution of students relative to the class average ({classAvgOverall}%)
              </p>
              {histogramData.reduce((s, d) => s + d.value, 0) === 0 ? (
                <div className="py-12 text-center opacity-30">
                  <p className="text-sm font-black uppercase tracking-widest">No student results yet</p>
                </div>
              ) : (
                <BarChart data={histogramData} />
              )}
            </div>
          )}

          {/* No class selected */}
          {!selectedClassId && (
            <div className="py-32 text-center opacity-20 flex flex-col items-center">
              <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-xl font-black uppercase tracking-[0.3em]">Select a class to begin</p>
            </div>
          )}

          {/* ── INDIVIDUAL ANALYSIS ── */}
          {selectedClassId && viewMode === 'student' && (
            !selectedStudentId ? (
              <div className="py-32 text-center opacity-30">
                <p className="text-base font-black uppercase tracking-[0.2em] text-gray-400">Select a student from the sidebar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">

                {/* Student card */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <img
                    src={selectedStudent?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent?.name ?? 'S')}&background=e0e7ff&color=4f46e5&size=128`}
                    className="w-32 h-32 rounded-[40px] border-4 border-indigo-50 shadow-xl mb-6 object-cover"
                    alt="Student"
                  />
                  <h3 className="text-xl font-black text-gray-800 leading-tight">{selectedStudent?.name}</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">{selectedStudentId}</p>

                  <div className="mt-8 pt-8 border-t border-gray-50 w-full space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase">Class</span>
                      <span className="text-sm font-black text-gray-700">{selectedClass?.name} {selectedClass?.arm}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase">Subjects</span>
                      <span className="text-2xl font-black text-gray-800">{studentResults.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400 uppercase">Term Avg</span>
                      <span className="text-2xl font-black text-indigo-600">{avg(studentResults)}%</span>
                    </div>
                    {/* Colour-coded grade pill */}
                    <div className="pt-2">
                      <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase
                        ${avg(studentResults) >= 70 ? 'bg-emerald-50 text-emerald-600'
                        : avg(studentResults) >= 50 ? 'bg-indigo-50 text-indigo-600'
                        : avg(studentResults) >= 40 ? 'bg-amber-50 text-amber-600'
                        : 'bg-rose-50 text-rose-500'}`}
                      >
                        {avg(studentResults) >= 70 ? 'Excellent' : avg(studentResults) >= 50 ? 'Credit' : avg(studentResults) >= 40 ? 'Pass' : studentResults.length ? 'Below Pass' : 'No Data'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject performance breakdown chart */}
                <div className="lg:col-span-2 bg-white p-10 rounded-[48px] shadow-sm border border-gray-100">
                  <h3 className="text-xl font-black text-gray-800 mb-2">Subject Performance Breakdown</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">
                    {session?.term} · {session?.year}
                  </p>
                  {studentBarData.length === 0 ? (
                    <div className="py-16 text-center opacity-30">
                      <p className="text-sm font-black uppercase tracking-widest">No results recorded yet</p>
                    </div>
                  ) : (
                    <BarChart data={studentBarData} />
                  )}

                  {/* Legend */}
                  {studentBarData.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-gray-50">
                      {[
                        { label: 'Excellent (70+)', color: '#10b981' },
                        { label: 'Credit (50–69)', color: '#6366f1' },
                        { label: 'Pass (40–49)', color: '#f59e0b' },
                        { label: 'Below Pass', color: '#f43f5e' },
                      ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="text-[10px] font-black text-gray-400 uppercase">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* ── SUBJECT ANALYSIS ── */}
          {selectedClassId && viewMode === 'subject' && (
            !selectedSubjectId ? (
              <div className="py-32 text-center opacity-30">
                <p className="text-base font-black uppercase tracking-[0.2em] text-gray-400">Select a subject from the sidebar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">

                {/* Subject stats card */}
                <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100">
                  <h3 className="text-2xl font-black text-gray-800 mb-1">{selectedSubject?.name}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">
                    {selectedClass?.name} {selectedClass?.arm} · Class-wide Metrics
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-gray-50 rounded-[24px]">
                      <span className="text-xs font-black text-gray-500 uppercase">Total Entries</span>
                      <span className="text-3xl font-black text-gray-800">{subjectResults.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-indigo-50 rounded-[24px]">
                      <span className="text-xs font-black text-indigo-500 uppercase">Class Average</span>
                      <span className="text-3xl font-black text-indigo-600">{avg(subjectResults)}%</span>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-emerald-50 rounded-[24px]">
                      <span className="text-xs font-black text-emerald-600 uppercase">Excellence Rate</span>
                      <span className="text-3xl font-black text-emerald-600">
                        {subjectResults.length
                          ? Math.round((subjectResults.filter(r => (r.total ?? 0) >= 70).length / subjectResults.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-rose-50 rounded-[24px]">
                      <span className="text-xs font-black text-rose-500 uppercase">Below Pass</span>
                      <span className="text-3xl font-black text-rose-500">
                        {subjectResults.filter(r => (r.total ?? 0) < 40).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grade distribution donut */}
                <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 flex flex-col">
                  <h3 className="text-xl font-black text-gray-800 mb-1">Grade Distribution</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">
                    Breakdown of student performance bands
                  </p>
                  {subjectDonutData.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center opacity-30">
                      <p className="text-sm font-black uppercase tracking-widest">No results recorded yet</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <DonutChart segments={subjectDonutData} />
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* ── Student-by-student performance chart (at bottom) ── */}
          {selectedClassId && students.length > 0 && studentPerformanceChartData.length > 0 && (
            <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-800 mb-2">Class Average by Student</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Individual student performance across all subjects — {session?.term} · {session?.year}
              </p>
              <BarChart data={studentPerformanceChartData} />
              
              {/* Legend */}
              <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-gray-50">
                {[
                  { label: 'Excellent (70+)', color: '#10b981' },
                  { label: 'Credit (50–69)', color: '#6366f1' },
                  { label: 'Pass (40–49)', color: '#f59e0b' },
                  { label: 'Below Pass', color: '#f43f5e' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-[10px] font-black text-gray-400 uppercase">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassPerformance;
