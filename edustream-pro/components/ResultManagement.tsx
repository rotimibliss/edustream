import React, { useState, useEffect, useRef } from 'react';
import { Subject, Result, Student, SchoolClass, AcademicSession, AffectiveTrait, PsychomotorTrait, StudentReport, AuthUser } from '../types';
import { apiService as dataService } from '../services/apiService';

interface ParsedResultRow {
  studentId: string;
  studentName: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  remark: string;
  isValid: boolean;
  errors: string[];
}

const ResultManagement: React.FC = () => {
  const [currentUser] = useState<AuthUser | null>(dataService.getCurrentUser());
  const [activeMode, setActiveMode] = useState<'subject' | 'evaluation' | 'cumulative'>('subject');
  const [entryMode, setEntryMode] = useState<'manual' | 'batch'>('manual');
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [affectiveTraits, setAffectiveTraits] = useState<AffectiveTrait[]>([]);
  const [psychomotorTraits, setPsychomotorTraits] = useState<PsychomotorTrait[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [localResults, setLocalResults] = useState<Record<string, Partial<Result>>>({});
  const [localReports, setLocalReports] = useState<Record<string, StudentReport>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [csvInput, setCsvInput] = useState('');
  const [parsedResultsPreview, setParsedResultsPreview] = useState<ParsedResultRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmBatchModalOpen, setIsConfirmBatchModalOpen] = useState(false);

  const refreshData = async () => {
    try {
      setLoading(true);
      const sessionData = await dataService.getActiveSession();
      const [allSubjects, classesData, studentsData, resultsData, reportsData] = await Promise.all([
        dataService.getSubjects(),
        dataService.getClasses(),
        dataService.getStudents(),
        dataService.getResults(),
        dataService.getStudentReports().catch(() => [])
      ]);

      const subjectsArr = Array.isArray(allSubjects) ? allSubjects : [];
      if (currentUser?.role === 'teacher') {
        setSubjects(subjectsArr.filter((s: Subject) => s.teacherId === currentUser.id));
      } else {
        setSubjects(subjectsArr);
      }

      setClasses(Array.isArray(classesData) ? classesData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setSession(sessionData);

      // FIX 5: Load traits from DB instead of hardcoding
      const [affectiveData, psychomotorData] = await Promise.all([
        dataService.getAffectiveTraits(),
        dataService.getPsychomotorTraits()
      ]);
      setAffectiveTraits(Array.isArray(affectiveData) ? affectiveData : []);
      setPsychomotorTraits(Array.isArray(psychomotorData) ? psychomotorData : []);

      const resultsArr = Array.isArray(resultsData) ? resultsData : [];
      const resultState: Record<string, Partial<Result>> = {};
      resultsArr.forEach((r: Result) => {
        resultState[`${r.studentId}_${r.subjectId}_${r.classId}_${r.session}_${r.term}`] = r;
      });
      setLocalResults(resultState);

      const reportsArr = Array.isArray(reportsData) ? reportsData : [];
      const reportState: Record<string, StudentReport> = {};
      reportsArr.forEach((r: StudentReport) => { reportState[r.studentId] = r; });
      setLocalReports(reportState);
    } catch (error) {
      console.error('Failed to load result data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const enrolledStudents = students.filter(s => s.classId === selectedClassId);
  const classSubjects = subjects.filter(s => (s.classIds || []).includes(selectedClassId || ''));

  const calculateRemark = (total: number) => {
    if (total >= 75) return 'Excellent';
    if (total >= 60) return 'Very Good';
    if (total >= 50) return 'Good';
    if (total >= 40) return 'Pass';
    return 'Fail';
  };

  const handleScoreChange = (studentId: string, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    if (!selectedSubjectId || !selectedClassId) return;
    const numValue = Math.min(field === 'exam' ? 60 : 20, Math.max(0, parseInt(value) || 0));
    const key = `${studentId}_${selectedSubjectId}_${selectedClassId}_${session?.year}_${session?.term}`;
    const current = localResults[key] || { studentId, subjectId: selectedSubjectId, classId: selectedClassId, term: session?.term, session: session?.year, ca1: 0, ca2: 0, exam: 0 };
    const updated = { ...current, [field]: numValue };
    const total = (updated.ca1 || 0) + (updated.ca2 || 0) + (updated.exam || 0);
    setLocalResults({ ...localResults, [key]: { ...updated, total, remark: calculateRemark(total) } });
  };

  const handleTraitChange = (studentId: string, traitId: string, type: 'affective' | 'psychomotor', score: number) => {
    const current = localReports[studentId] || {
      id: `RPT${Date.now()}`, studentId, classId: selectedClassId!, term: session?.term, session: session?.year,
      affectiveScores: {}, psychomotorScores: {}, teacherComment: '', timesOpened: 0, timesPresent: 0, timesAbsent: 0
    };
    const updated = { ...current };
    if (type === 'affective') updated.affectiveScores = { ...updated.affectiveScores, [traitId]: score };
    else updated.psychomotorScores = { ...updated.psychomotorScores, [traitId]: score };
    setLocalReports({ ...localReports, [studentId]: updated });
  };

  const handleAttendanceChange = (studentId: string, field: 'timesOpened' | 'timesPresent' | 'timesAbsent', value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    const current = localReports[studentId] || {
      id: `RPT${Date.now()}`, studentId, classId: selectedClassId!, term: session?.term, session: session?.year,
      affectiveScores: {}, psychomotorScores: {}, teacherComment: '', timesOpened: 0, timesPresent: 0, timesAbsent: 0
    };
    setLocalReports({ ...localReports, [studentId]: { ...current, [field]: numValue } });
  };

  const handleCommentChange = (studentId: string, value: string) => {
    const current = localReports[studentId] || {
      id: `RPT${Date.now()}`, studentId, classId: selectedClassId!, term: session?.term, session: session?.year,
      affectiveScores: {}, psychomotorScores: {}, teacherComment: '', timesOpened: 0, timesPresent: 0, timesAbsent: 0
    };
    setLocalReports({ ...localReports, [studentId]: { ...current, teacherComment: value } });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (activeMode === 'subject' && selectedSubjectId && selectedClassId) {
        for (const res of Object.values(localResults) as Partial<Result>[]) {
          if (res.studentId && res.subjectId === selectedSubjectId && res.classId === selectedClassId) {
            await dataService.saveResult(res as Result);
          }
        }
      } else {
        for (const rpt of Object.values(localReports) as StudentReport[]) {
          await dataService.saveStudentReport(rpt);
        }
      }
      alert("All records saved successfully!");
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save some records.');
    } finally {
      setIsSaving(false);
    }
  };

  const parseResultsCSV = (csvString: string): ParsedResultRow[] => {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const idIdx = headers.indexOf('studentid');
    const ca1Idx = headers.indexOf('ca1');
    const ca2Idx = headers.indexOf('ca2');
    const examIdx = headers.indexOf('exam');
    if (idIdx === -1 || ca1Idx === -1 || ca2Idx === -1 || examIdx === -1) {
      alert("Invalid CSV headers. Required: StudentID, CA1, CA2, Exam");
      return [];
    }
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const sId = vals[idIdx];
      const student = enrolledStudents.find(s => s.id === sId);
      const ca1 = parseInt(vals[ca1Idx]) || 0;
      const ca2 = parseInt(vals[ca2Idx]) || 0;
      const exam = parseInt(vals[examIdx]) || 0;
      const total = ca1 + ca2 + exam;
      const errors: string[] = [];
      if (!student) errors.push(`Student ID ${sId} not found.`);
      if (ca1 > 20) errors.push("CA1 exceeds 20");
      if (ca2 > 20) errors.push("CA2 exceeds 20");
      if (exam > 60) errors.push("Exam exceeds 60");
      return { studentId: sId, studentName: student?.name || 'Unknown', ca1, ca2, exam, total, remark: calculateRemark(total), isValid: errors.length === 0, errors };
    });
  };

  const handleParseCsv = () => {
    setIsParsing(true);
    setTimeout(() => { setParsedResultsPreview(parseResultsCSV(csvInput)); setIsParsing(false); }, 400);
  };

  const downloadTemplate = () => {
    const header = "StudentID,StudentName,CA1,CA2,Exam\n";
    const rows = enrolledStudents.map(s => `${s.id},${s.name},0,0,0`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `gradebook_template.csv`; a.click();
  };

  const executeBatchUpload = async () => {
    setIsConfirmBatchModalOpen(false);
    setIsSaving(true);
    try {
      for (const row of parsedResultsPreview.filter(r => r.isValid)) {
        await dataService.saveResult({
          studentId: row.studentId, subjectId: selectedSubjectId!,
          classId: selectedClassId!, term: session!.term, session: session!.year,
          ca1: row.ca1, ca2: row.ca2, exam: row.exam, total: row.total, remark: row.remark
        } as Result);
      }
      setEntryMode('manual'); setCsvInput(''); setParsedResultsPreview([]);
      await refreshData();
      alert("Batch scores uploaded successfully!");
    } catch (error) {
      alert('Failed to upload some results.');
    } finally {
      setIsSaving(false);
    }
  };

  const goToRoot = () => { setSelectedClassId(null); setSelectedSubjectId(null); setEntryMode('manual'); };
  const goToClassSubjects = () => { setSelectedSubjectId(null); setEntryMode('manual'); };

  const getTermAverage = (studentId: string, term: AcademicSession['term']) => {
    if (!session || !selectedClassId) return null;
    const results = Object.values(localResults).filter(r =>
      r.studentId === studentId &&
      r.classId === selectedClassId &&
      r.session === session.year &&
      r.term === term &&
      typeof r.total === 'number'
    );
    if (results.length === 0) return null;
    const sum = results.reduce((acc, r) => acc + (r.total || 0), 0);
    return sum / results.length;
  };

  const formatAvg = (value: number | null) => (value === null ? '—' : value.toFixed(1));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600">Loading assessment data...</p>
        </div>
      </div>
    );
  }

  // ── STEP 1: Class selection ───────────────────────────────────────────────────
  if (!selectedClassId) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Assessment Center</h1>
            <p className="text-gray-500 mt-2 font-medium">Select a class to begin entering results, evaluations, or view cumulative scores.</p>
          </div>
          <div className="bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 flex">
            <button onClick={() => { setActiveMode('subject'); setEntryMode('manual'); }} className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeMode === 'subject' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <span>Subject Grades</span>
            </button>
            <button onClick={() => { setActiveMode('evaluation'); setEntryMode('manual'); }} className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeMode === 'evaluation' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Behavioral & Attendance</span>
            </button>
            <button onClick={() => { setActiveMode('cumulative'); setEntryMode('manual'); }} className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${activeMode === 'cumulative' ? 'bg-amber-600 text-white shadow-xl shadow-amber-100' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 19l5-5 4 4 7-7" /></svg>
              <span>Cumulative Score</span>
            </button>
          </div>
        </header>

        {classes.length === 0 ? (
          <div className="py-20 text-center opacity-30">
            <p className="text-xl font-black uppercase tracking-[0.3em]">No classes found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => {
              const subjectCount = subjects.filter(s => (s.classIds || []).includes(cls.id)).length;
              const studentCount = students.filter(s => s.classId === cls.id).length;
              const accent = activeMode === 'subject' ? 'indigo' : activeMode === 'evaluation' ? 'emerald' : 'amber';
              return (
                <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); if (activeMode === 'evaluation') setSelectedSubjectId('__eval__'); if (activeMode === 'cumulative') setSelectedSubjectId('__cumulative__'); }}
                  className={`bg-white p-8 rounded-[40px] border-2 border-transparent hover:border-${accent}-400 hover:shadow-2xl transition-all text-left group shadow-sm flex flex-col h-full`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 bg-${accent}-50 rounded-3xl flex items-center justify-center`}>
                      <svg className={`w-7 h-7 text-${accent}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {activeMode === 'subject'
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          : activeMode === 'evaluation'
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 19l5-5 4 4 7-7" />}
                      </svg>
                    </div>
                    <div className={`bg-${accent}-50 text-${accent}-600 text-[10px] font-black px-3 py-1.5 rounded-xl`}>
                      {activeMode === 'subject'
                        ? `${subjectCount} Subject${subjectCount !== 1 ? 's' : ''}`
                        : activeMode === 'evaluation'
                          ? 'Evaluation'
                          : 'Session Avg'}
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 mb-1">{cls.name}</h3>
                  <p className={`text-${accent}-500 font-black text-sm mb-1`}>{cls.arm}</p>
                  <p className="text-gray-400 text-xs font-medium mb-auto">{studentCount} student{studentCount !== 1 ? 's' : ''} enrolled</p>
                  <div className={`mt-6 flex items-center text-${accent}-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all`}>
                    {activeMode === 'subject' ? 'View Subjects' : activeMode === 'evaluation' ? 'Start Evaluation' : 'View Cumulative'}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── STEP 2: Subject list ──────────────────────────────────────────────────────
  const selectedClass = classes.find(c => c.id === selectedClassId);

  if (activeMode === 'subject' && !selectedSubjectId) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-fadeIn">
        <div className="mb-10">
          <button onClick={goToRoot} className="flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-6 hover:-translate-x-1 transition-transform bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 w-fit">
            <svg className="w-4 h-4 mr-2 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
            All Classes
          </button>
          <div className="flex items-center space-x-2 mb-4 text-[11px] font-black uppercase tracking-widest text-gray-300">
            <span className="text-gray-400 cursor-pointer hover:text-indigo-500" onClick={goToRoot}>Select Class</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            <span className="text-indigo-600">{selectedClass?.name} {selectedClass?.arm}</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            <span>Select Subject</span>
          </div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tighter">{selectedClass?.name} — {selectedClass?.arm}</h1>
        </div>

        {classSubjects.length === 0 ? (
          <div className="py-20 text-center opacity-30"><p className="text-xl font-black uppercase tracking-[0.3em]">No subjects assigned</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classSubjects.map((sub, idx) => {
              const filledCount = enrolledStudents.filter(s => localResults[`${s.id}_${sub.id}_${selectedClassId}`]?.total).length;
              const totalStudents = enrolledStudents.length;
              const pct = totalStudents > 0 ? Math.round((filledCount / totalStudents) * 100) : 0;
              const palettes = [
                { bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-500', border: 'hover:border-indigo-400' },
                { bg: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500', border: 'hover:border-violet-400' },
                { bg: 'bg-sky-50', text: 'text-sky-600', bar: 'bg-sky-500', border: 'hover:border-sky-400' },
                { bg: 'bg-teal-50', text: 'text-teal-600', bar: 'bg-teal-500', border: 'hover:border-teal-400' },
                { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', border: 'hover:border-orange-400' },
              ];
              const p = palettes[idx % palettes.length];
              return (
                <button key={sub.id} onClick={() => setSelectedSubjectId(sub.id)}
                  className={`bg-white p-8 rounded-[40px] border-2 border-transparent ${p.border} hover:shadow-2xl transition-all text-left group shadow-sm flex flex-col h-full`}>
                  <div className={`w-14 h-14 ${p.bg} rounded-3xl flex items-center justify-center mb-5`}>
                    <svg className={`w-7 h-7 ${p.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-1">{sub.name}</h3>
                  <p className="text-gray-400 text-xs font-medium mb-4">{filledCount}/{totalStudents} scores entered</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
                    <div className={`${p.bar} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className={`mt-auto flex items-center ${p.text} font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all`}>
                    Open Gradebook
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── STEP 3: Gradebook / Evaluation ───────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <button onClick={activeMode === 'subject' ? goToClassSubjects : goToRoot}
            className="flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4 hover:-translate-x-1 transition-transform bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 w-fit">
            <svg className="w-4 h-4 mr-2 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
            {activeMode === 'subject' ? 'Back to Subjects' : 'Back to Classes'}
          </button>
          <div className="flex items-center space-x-2 mb-3 text-[11px] font-black uppercase tracking-widest text-gray-300">
            <span className="cursor-pointer hover:text-indigo-400 transition-colors" onClick={goToRoot}>Classes</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            {activeMode === 'subject' ? (
              <>
                <span className="cursor-pointer hover:text-indigo-400 transition-colors" onClick={goToClassSubjects}>{selectedClass?.name} {selectedClass?.arm}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                <span className="text-indigo-500">{subjects.find(s => s.id === selectedSubjectId)?.name}</span>
              </>
            ) : activeMode === 'evaluation' ? (
              <span className="text-emerald-500">{selectedClass?.name} {selectedClass?.arm} — Evaluation</span>
            ) : (
              <span className="text-amber-600">{selectedClass?.name} {selectedClass?.arm} — Cumulative</span>
            )}
          </div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">
            {activeMode === 'subject'
              ? subjects.find(s => s.id === selectedSubjectId)?.name
              : activeMode === 'evaluation'
                ? 'Behavioral & Attendance Records'
                : 'Cumulative Session Scores'}
          </h1>
          <div className="flex items-center space-x-3 mt-2">
            <span className="bg-indigo-900 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase">
              {selectedClass?.name} ({selectedClass?.arm})
            </span>
          </div>
        </div>

        {(activeMode === 'subject' || activeMode === 'evaluation') && (
        <div className="flex items-center space-x-4">
          {activeMode === 'subject' && (
            <div className="bg-white p-1 rounded-2xl border border-gray-200 flex">
              <button onClick={() => setEntryMode('manual')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entryMode === 'manual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>Manual</button>
              <button onClick={() => setEntryMode('batch')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entryMode === 'batch' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>Batch CSV</button>
            </div>
          )}
          <button
            onClick={entryMode === 'manual' ? handleSaveAll : () => setIsConfirmBatchModalOpen(true)}
            disabled={isSaving || (entryMode === 'batch' && parsedResultsPreview.filter(r => r.isValid).length === 0)}
            className={`px-10 py-5 rounded-[28px] font-black uppercase tracking-[0.2em] text-[11px] text-white transition-all shadow-2xl disabled:opacity-70 flex items-center space-x-4 active:scale-95 ${activeMode === 'subject' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 shadow-emerald-100'}`}
          >
            {isSaving
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            }
            <span>{isSaving ? 'Saving...' : (entryMode === 'manual' ? 'Save Changes' : 'Sync Batch')}</span>
          </button>
        </div>
        )}
      </div>

      {entryMode === 'manual' ? (
        <>
          {/* ── SUBJECT GRADEBOOK ── */}
          {activeMode === 'subject' && (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-100">
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Student</th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100">CA1 <span className="text-gray-300">/20</span></th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100">CA2 <span className="text-gray-300">/20</span></th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100">Exam <span className="text-gray-300">/60</span></th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100 bg-indigo-50/50">Total</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase text-center">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center opacity-30 italic">No students in this class</td></tr>
                  ) : enrolledStudents.map((student, idx) => {
                    const res = localResults[`${student.id}_${selectedSubjectId}_${selectedClassId}_${session?.year}_${session?.term}`] ?? {};
                    const total = res.total || 0;
                    const remarkColor = total >= 75 ? 'bg-emerald-50 text-emerald-600' : total >= 60 ? 'bg-blue-50 text-blue-600' : total >= 50 ? 'bg-yellow-50 text-yellow-600' : total >= 40 ? 'bg-orange-50 text-orange-600' : 'bg-rose-50 text-rose-500';
                    return (
                      <tr key={student.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-indigo-50/20 transition-colors`}>
                        {/* FIX 1: border-r on each cell for column demarcation */}
                        <td className="px-8 py-5 border-r border-gray-100">
                          <div className="flex items-center space-x-3">
                            <img src={student.avatar} className="w-10 h-10 rounded-2xl border border-gray-100 shrink-0" alt={student.name} />
                            <div>
                              <div className="font-black text-gray-800 text-sm">{student.name}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase">{student.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center border-r border-gray-100">
                          <input type="number" min="0" max="20"
                            className="w-16 text-center py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-sm focus:bg-white focus:border-indigo-400 outline-none transition-all"
                            value={res.ca1 ?? ''} onChange={e => handleScoreChange(student.id, 'ca1', e.target.value)} />
                        </td>
                        <td className="px-6 py-5 text-center border-r border-gray-100">
                          <input type="number" min="0" max="20"
                            className="w-16 text-center py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-sm focus:bg-white focus:border-indigo-400 outline-none transition-all"
                            value={res.ca2 ?? ''} onChange={e => handleScoreChange(student.id, 'ca2', e.target.value)} />
                        </td>
                        <td className="px-6 py-5 text-center border-r border-gray-100">
                          <input type="number" min="0" max="60"
                            className="w-16 text-center py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-sm focus:bg-white focus:border-indigo-400 outline-none transition-all"
                            value={res.exam ?? ''} onChange={e => handleScoreChange(student.id, 'exam', e.target.value)} />
                        </td>
                        <td className="px-6 py-5 text-center border-r border-gray-100 bg-indigo-50/30">
                          <span className="font-black text-xl text-indigo-600">{total}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${remarkColor}`}>{res.remark || '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── EVALUATION SHEET (FIX 2, 3, 4) ── */}
          {/* CUMULATIVE VIEW */}
          {activeMode === 'cumulative' && (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-100">
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Student</th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100">1st Term Avg</th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100">2nd Term Avg</th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100">3rd Term Avg</th>
                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase text-center border-r border-gray-100 bg-amber-50/60">Cumulative Avg</th>
                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase text-center">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center opacity-30 italic">No students in this class</td></tr>
                  ) : (() => {
                    const rows = enrolledStudents.map(student => {
                      const t1 = getTermAverage(student.id, '1st Term');
                      const t2 = getTermAverage(student.id, '2nd Term');
                      const t3 = getTermAverage(student.id, '3rd Term');
                      const termAverages = [t1, t2, t3].filter(v => v !== null) as number[];
                      const cumulative = termAverages.length === 3 ? termAverages.reduce((a, b) => a + b, 0) / 3 : null;
                      return { student, t1, t2, t3, cumulative };
                    });
                    const ranked = [...rows]
                      .filter(r => r.cumulative !== null)
                      .sort((a, b) => (b.cumulative as number) - (a.cumulative as number));
                    const getRank = (studentId: string) => {
                      const idx = ranked.findIndex(r => r.student.id === studentId);
                      return idx === -1 ? '�' : `${idx + 1}`;
                    };
                    return rows.map((row, idx) => {
                      const isTop = row.cumulative !== null && ranked.findIndex(r => r.student.id === row.student.id) < 3;
                      return (
                        <tr key={row.student.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-amber-50/20 transition-colors`}>
                          <td className="px-8 py-5 border-r border-gray-100">
                            <div className="flex items-center space-x-3">
                              <img src={row.student.avatar} className="w-10 h-10 rounded-2xl border border-gray-100 shrink-0" alt={row.student.name} />
                              <div>
                                <div className="font-black text-gray-800 text-sm">{row.student.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">{row.student.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center border-r border-gray-100 font-black text-gray-700">{formatAvg(row.t1)}</td>
                          <td className="px-6 py-5 text-center border-r border-gray-100 font-black text-gray-700">{formatAvg(row.t2)}</td>
                          <td className="px-6 py-5 text-center border-r border-gray-100 font-black text-gray-700">{formatAvg(row.t3)}</td>
                          <td className="px-6 py-5 text-center border-r border-gray-100 bg-amber-50/40">
                            <span className="font-black text-xl text-amber-600">{formatAvg(row.cumulative)}</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${isTop ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                              {getRank(row.student.id)}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {activeMode === 'evaluation' && (
            <div className="space-y-6">
              {enrolledStudents.length === 0 ? (
                <div className="bg-white rounded-[32px] p-20 text-center opacity-30">
                  <p className="font-black uppercase tracking-widest">No students in this class</p>
                </div>
              ) : enrolledStudents.map((student, idx) => {
                const rpt = localReports[student.id] || { affectiveScores: {}, psychomotorScores: {}, teacherComment: '', timesOpened: 0, timesPresent: 0, timesAbsent: 0 };
                return (
                  <div key={student.id} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                    {/* Student header bar */}
                    <div className={`px-8 py-4 border-b border-gray-100 flex items-center space-x-4 ${idx % 2 === 0 ? 'bg-indigo-50/40' : 'bg-emerald-50/30'}`}>
                      <img src={student.avatar} className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm shrink-0" alt={student.name} />
                      <div>
                        <p className="font-black text-gray-800">{student.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{student.id} • {selectedClass?.name} {selectedClass?.arm}</p>
                      </div>
                    </div>

                    {/* FIX 2: Card-per-student layout instead of wide table row */}
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                      {/* Affective Traits */}
                      <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 pb-2 border-b border-indigo-100">Affective Domain</p>
                        <div className="space-y-3">
                          {affectiveTraits.map(t => (
                            <div key={t.id} className="flex items-center justify-between gap-3">
                              <span className="text-xs font-black uppercase text-gray-500 flex-1 truncate">{t.name}</span>
                              <div className="flex gap-1 shrink-0">
                                {[1,2,3,4,5].map(s => (
                                  <button key={s} type="button"
                                    onClick={() => handleTraitChange(student.id, t.id, 'affective', s)}
                                    className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all ${(rpt.affectiveScores?.[t.id] || 0) >= s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-300 hover:bg-indigo-100'}`}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Psychomotor Traits */}
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 pb-2 border-b border-emerald-100">Psychomotor Domain</p>
                        <div className="space-y-3">
                          {psychomotorTraits.map(t => (
                            <div key={t.id} className="flex items-center justify-between gap-3">
                              <span className="text-xs font-black uppercase text-gray-500 flex-1 truncate">{t.name}</span>
                              <div className="flex gap-1 shrink-0">
                                {[1,2,3,4,5].map(s => (
                                  <button key={s} type="button"
                                    onClick={() => handleTraitChange(student.id, t.id, 'psychomotor', s)}
                                    className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all ${(rpt.psychomotorScores?.[t.id] || 0) >= s ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-300 hover:bg-emerald-100'}`}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Attendance */}
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">Attendance</p>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Days School Opened</label>
                            <input type="number" placeholder="0"
                              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-black focus:bg-white focus:border-indigo-400 outline-none transition-all"
                              value={rpt.timesOpened || ''} onChange={e => handleAttendanceChange(student.id, 'timesOpened', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 block">Days Present</label>
                            <input type="number" placeholder="0"
                              className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 focus:bg-white focus:border-emerald-400 outline-none transition-all"
                              value={rpt.timesPresent || ''} onChange={e => handleAttendanceChange(student.id, 'timesPresent', e.target.value)} />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1 block">Days Absent</label>
                            <input type="number" placeholder="0"
                              className="w-full bg-rose-50 border-2 border-rose-100 rounded-xl px-4 py-3 text-sm font-black text-rose-600 focus:bg-white focus:border-rose-400 outline-none transition-all"
                              value={rpt.timesAbsent || ''} onChange={e => handleAttendanceChange(student.id, 'timesAbsent', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FIX 3: Comment in its own full-width row */}
                    <div className="px-8 pb-8 border-t border-gray-50 pt-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Class Teacher's Remark</label>
                      <textarea
                        rows={3}
                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-indigo-400 outline-none resize-none transition-all"
                        placeholder="Write assessment remarks for this student..."
                        value={rpt.teacherComment || ''}
                        onChange={e => handleCommentChange(student.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Batch CSV view ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
          <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 space-y-6">
            <div>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">Upload Spreadsheet</h3>
              <p className="text-sm text-gray-400 font-medium">Bulk import scores for the current class.</p>
            </div>
            <div onClick={() => csvFileInputRef.current?.click()}
              className="border-4 border-dashed border-gray-50 bg-gray-50/30 p-12 rounded-[40px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-200 transition-all group">
              <input ref={csvFileInputRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onload = ev => setCsvInput(ev.target?.result as string); r.readAsText(file); } }} />
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                </svg>
              </div>
              <p className="font-black text-gray-800 text-sm">Drop CSV or Click to Browse</p>
            </div>
            <button onClick={downloadTemplate} className="w-full py-4 bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-100">Download Template</button>
            <textarea rows={5} placeholder="Or paste CSV data here..."
              className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-[32px] text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none"
              value={csvInput} onChange={e => setCsvInput(e.target.value)} />
            <button onClick={handleParseCsv} disabled={!csvInput.trim() || isParsing}
              className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-100 flex items-center justify-center space-x-3 disabled:opacity-50">
              {isParsing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Preview & Validate</span>}
            </button>
          </div>

          <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
            <h3 className="text-xl font-black text-gray-800 mb-6">Validation Results ({parsedResultsPreview.length})</h3>
            <div className="flex-1 overflow-y-auto">
              {parsedResultsPreview.length > 0 ? (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase">Student</th>
                      <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase text-center">Score</th>
                      <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {parsedResultsPreview.map((row, i) => (
                      <tr key={i} className={`text-xs ${!row.isValid ? 'bg-rose-50/50' : ''}`}>
                        <td className="px-4 py-3"><p className="font-black text-gray-700">{row.studentName}</p><p className="text-[9px] text-gray-400">{row.studentId}</p></td>
                        <td className="px-4 py-3 text-center font-black text-indigo-600">{row.total}/100</td>
                        <td className="px-4 py-3 text-right">
                          {row.isValid
                            ? <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Clear</span>
                            : <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1 rounded-lg">Error</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex items-center justify-center opacity-20 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.3em]">No data parsed yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm batch modal */}
      {isConfirmBatchModalOpen && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md animate-fadeIn p-10 text-center">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight mb-2">Sync Batch Results?</h2>
            <p className="text-sm text-gray-500 font-medium mt-2 mb-8">
              Upload <span className="text-indigo-600 font-black">{parsedResultsPreview.filter(r => r.isValid).length}</span> valid student scores.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setIsConfirmBatchModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
              <button onClick={executeBatchUpload} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-200">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultManagement;





