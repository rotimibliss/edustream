import React, { useState, useEffect } from 'react';
import { Student, SchoolClass, AcademicSession, AuthUser } from '../types';
import { apiService as dataService } from '../services/apiService';

type PromotionMode = 'promote' | 'graduate';

interface PromotionStudent extends Student {
  selected: boolean;
}

const PromotionManagement: React.FC = () => {
  const [currentUser] = useState<AuthUser | null>(dataService.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [activeSession, setActiveSession] = useState<AcademicSession | null>(null);

  // Step state: 'config' | 'select' | 'confirm' | 'done'
  const [step, setStep] = useState<'config' | 'select' | 'confirm' | 'done'>('config');
  const [mode, setMode] = useState<PromotionMode>('promote');

  // Config selections
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [fromSession, setFromSession] = useState('');
  const [toSession, setToSession] = useState('');

  // Student selection
  const [promotionStudents, setPromotionStudents] = useState<PromotionStudent[]>([]);

  // Result
  const [isPromoting, setIsPromoting] = useState(false);
  const [result, setResult] = useState<{ promoted: number; graduated: number; errors: any[] } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [classesData, studentsData, sessionsData, sessionData] = await Promise.all([
          dataService.getClasses(),
          dataService.getStudents(),
          dataService.getSessions(),
          dataService.getActiveSession(),
        ]);
        setClasses(Array.isArray(classesData) ? classesData : []);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setActiveSession(sessionData);

        // Pre-fill fromSession with active session year
        if (sessionData?.year) setFromSession(sessionData.year);
      } catch (err) {
        console.error('Promotion init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Unique session years
  const sessionYears = Array.from(new Set(sessions.map(s => s.year))).sort().reverse();

  // Students in the selected fromClass that are Active
  const fromClassStudents = students.filter(
    s => s.classId === fromClassId && s.status === 'Active'
  );

  const fromClass = classes.find(c => c.id === fromClassId);
  const toClass = classes.find(c => c.id === toClassId);

  const selectedCount = promotionStudents.filter(s => s.selected).length;

  // ── Step 1: validate config and move to student selection ────────────────
  const handleProceed = () => {
    if (!fromClassId || !fromSession) return;
    if (mode === 'promote' && (!toClassId || !toSession)) return;
    if (fromClassId === toClassId && mode === 'promote') return;

    const list: PromotionStudent[] = fromClassStudents.map(s => ({ ...s, selected: true }));
    setPromotionStudents(list);
    setStep('select');
  };

  const toggleStudent = (id: string) => {
    setPromotionStudents(prev =>
      prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s)
    );
  };

  const toggleAll = () => {
    const allSelected = promotionStudents.every(s => s.selected);
    setPromotionStudents(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  // ── Execute promotion ──────────────────────────────────────────────────────
  const handleExecute = async () => {
    const selectedIds = promotionStudents.filter(s => s.selected).map(s => s.id);
    if (!selectedIds.length) return;

    setIsPromoting(true);
    try {
      const res = await (dataService as any).promoteStudents({
        studentIds: selectedIds,
        fromClassId,
        toClassId: mode === 'promote' ? toClassId : undefined,
        fromSession,
        toSession: mode === 'promote' ? toSession : undefined,
        graduate: mode === 'graduate',
      });
      setResult(res);
      setStep('done');
    } catch (err) {
      alert('Promotion failed. Please try again.');
      console.error(err);
    } finally {
      setIsPromoting(false);
    }
  };

  const handleReset = () => {
    setStep('config');
    setFromClassId('');
    setToClassId('');
    setFromSession(activeSession?.year || '');
    setToSession('');
    setPromotionStudents([]);
    setResult(null);
    setMode('promote');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Promotion Data...</p>
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ────────────────────────────────────────────────────────────
  if (step === 'done' && result) {
    return (
      <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] animate-fadeIn">
        <div className="w-28 h-28 rounded-[40px] bg-emerald-50 flex items-center justify-center mb-8 shadow-xl shadow-emerald-100">
          <svg className="w-14 h-14 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-4xl font-black text-gray-800 tracking-tighter text-center mb-2">
          {mode === 'graduate' ? 'Graduation Complete!' : 'Promotion Complete!'}
        </h1>
        <p className="text-gray-400 font-bold text-center mb-10">
          {mode === 'graduate'
            ? `${result.graduated} student${result.graduated !== 1 ? 's' : ''} have been graduated`
            : `${result.promoted} student${result.promoted !== 1 ? 's' : ''} moved from ${fromClass?.name} → ${toClass?.name}`
          }
        </p>

        <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl text-sm font-black flex items-center gap-3 mb-6">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          {mode === 'graduate'
            ? 'Graduation completed successfully.'
            : 'Promotion completed successfully.'}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 w-full mb-8">
          <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm text-center">
            <p className="text-4xl font-black text-emerald-600">{mode === 'graduate' ? result.graduated : result.promoted}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              {mode === 'graduate' ? 'Graduated' : 'Promoted'}
            </p>
          </div>
          <div className={`bg-white rounded-[28px] p-6 border shadow-sm text-center ${result.errors?.length > 0 ? 'border-rose-100' : 'border-gray-100'}`}>
            <p className={`text-4xl font-black ${result.errors?.length > 0 ? 'text-rose-500' : 'text-gray-300'}`}>
              {result.errors?.length || 0}
            </p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Errors</p>
          </div>
        </div>

        {result.errors?.length > 0 && (
          <div className="w-full bg-rose-50 rounded-2xl p-4 mb-6 border border-rose-100">
            <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-2">Failed Students</p>
            {result.errors.map((e: any, i: number) => (
              <p key={i} className="text-xs text-rose-500">{e.studentId}: {e.error}</p>
            ))}
          </div>
        )}

        <button onClick={handleReset}
          className="w-full py-5 bg-violet-600 text-white rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95">
          Start Another Promotion
        </button>
      </div>
    );
  }

  // ── CONFIRM SCREEN ─────────────────────────────────────────────────────────
  if (step === 'confirm') {
    const selected = promotionStudents.filter(s => s.selected);
    return (
      <div className="p-8 max-w-2xl mx-auto animate-fadeIn">
        <button onClick={() => setStep('select')}
          className="flex items-center text-violet-600 font-black text-[10px] uppercase tracking-widest mb-8 hover:-translate-x-1 transition-transform">
          <svg className="w-4 h-4 mr-2 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
          </svg>
          Back to Selection
        </button>

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className={`p-8 ${mode === 'graduate' ? 'bg-amber-50' : 'bg-violet-50'}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center ${mode === 'graduate' ? 'bg-amber-100' : 'bg-violet-100'}`}>
                <svg className={`w-7 h-7 ${mode === 'graduate' ? 'text-amber-600' : 'text-violet-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mode === 'graduate'
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  }
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800">Confirm {mode === 'graduate' ? 'Graduation' : 'Promotion'}</h2>
                <p className="text-sm text-gray-500 font-medium">Review before executing</p>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white rounded-2xl p-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">From</p>
                <p className="font-black text-gray-800 text-sm mt-1">{fromClass?.name} {fromClass?.arm}</p>
                <p className="text-[10px] text-gray-400">{fromSession}</p>
              </div>
              {mode === 'promote' && (
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">To</p>
                  <p className="font-black text-gray-800 text-sm mt-1">{toClass?.name} {toClass?.arm}</p>
                  <p className="text-[10px] text-gray-400">{toSession}</p>
                </div>
              )}
              {mode === 'graduate' && (
                <div className="bg-amber-100 rounded-2xl p-4 flex items-center justify-center">
                  <p className="font-black text-amber-700 text-sm text-center">Marked as<br/>Graduated ✓</p>
                </div>
              )}
            </div>
          </div>

          {/* Student list */}
          <div className="p-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              {selected.length} Student{selected.length !== 1 ? 's' : ''} Selected
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selected.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                  <img src={s.avatar} className="w-8 h-8 rounded-xl border border-gray-100" alt={s.name} />
                  <div>
                    <p className="font-black text-gray-800 text-sm leading-none">{s.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="px-6 pb-6">
            <div className={`rounded-2xl p-4 flex gap-3 ${mode === 'graduate' ? 'bg-amber-50 border border-amber-100' : 'bg-violet-50 border border-violet-100'}`}>
              <svg className={`w-5 h-5 shrink-0 mt-0.5 ${mode === 'graduate' ? 'text-amber-500' : 'text-violet-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs font-bold text-gray-600">
                {mode === 'graduate'
                  ? 'Graduated students will be marked read-only. Their full academic history remains accessible.'
                  : 'This will move students to the new class. Their previous session records remain intact and accessible.'
                }
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-8 flex gap-3">
            <button onClick={() => setStep('select')}
              className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all">
              Back
            </button>
            <button onClick={handleExecute} disabled={isPromoting}
              className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${mode === 'graduate' ? 'bg-amber-500 shadow-amber-100 hover:bg-amber-600' : 'bg-violet-600 shadow-violet-100 hover:bg-violet-700'}`}>
              {isPromoting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing...</>
                : mode === 'graduate' ? '🎓 Graduate Now' : '🚀 Promote Now'
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SELECT SCREEN ──────────────────────────────────────────────────────────
  if (step === 'select') {
    const allSelected = promotionStudents.every(s => s.selected);
    return (
      <div className="p-8 max-w-4xl mx-auto animate-fadeIn">
        <button onClick={() => setStep('config')}
          className="flex items-center text-violet-600 font-black text-[10px] uppercase tracking-widest mb-6 hover:-translate-x-1 transition-transform">
          <svg className="w-4 h-4 mr-2 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
          </svg>
          Back to Setup
        </button>

        {/* Route summary bar */}
        <div className="bg-white rounded-[28px] border border-gray-100 shadow-sm p-5 mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="bg-violet-100 text-violet-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">{fromClass?.name} {fromClass?.arm}</span>
            <span className="text-gray-300 font-black text-sm">{fromSession}</span>
          </div>
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
          {mode === 'promote' ? (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">{toClass?.name} {toClass?.arm}</span>
              <span className="text-gray-300 font-black text-sm">{toSession}</span>
            </div>
          ) : (
            <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">🎓 Graduate</span>
          )}
          <div className="ml-auto">
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${mode === 'graduate' ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-violet-600'}`}>
              {selectedCount} / {promotionStudents.length} selected
            </span>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${allSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300 hover:border-violet-400'}`}>
                {allSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select All</span>
            </div>
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              {fromClassStudents.length} students in {fromClass?.name}
            </span>
          </div>

          {/* Students */}
          {promotionStudents.length === 0 ? (
            <div className="py-20 text-center opacity-30">
              <p className="font-black uppercase tracking-widest">No active students in this class</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {promotionStudents.map(student => (
                <div key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`flex items-center gap-5 px-8 py-5 cursor-pointer transition-all ${student.selected ? 'bg-violet-50/40' : 'hover:bg-gray-50/50'}`}>
                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${student.selected ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`}>
                    {student.selected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  {/* Avatar */}
                  <img src={student.avatar} className="w-11 h-11 rounded-2xl border border-gray-100 shrink-0" alt={student.name} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800">{student.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{student.id} • {student.gender}</p>
                  </div>
                  {/* Status badge */}
                  <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl shrink-0 transition-all ${student.selected
                    ? mode === 'graduate' ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'
                    : 'bg-gray-100 text-gray-400'}`}>
                    {student.selected ? (mode === 'graduate' ? 'Graduate' : 'Promote') : 'Skip'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div className="px-8 py-6 border-t border-gray-50 bg-gray-50/30">
            <button
              onClick={() => { if (selectedCount > 0) setStep('confirm'); }}
              disabled={selectedCount === 0}
              className={`w-full py-5 text-white rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl transition-all disabled:opacity-40 active:scale-95 ${mode === 'graduate' ? 'bg-amber-500 shadow-amber-100 hover:bg-amber-600' : 'bg-violet-600 shadow-violet-100 hover:bg-violet-700'}`}>
              Continue with {selectedCount} Student{selectedCount !== 1 ? 's' : ''} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── CONFIG SCREEN (Step 1) ─────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Student Promotion</h1>
        <p className="text-gray-400 mt-2 font-medium text-sm uppercase tracking-widest">
          Move students between classes across academic sessions
        </p>
      </header>

      {/* Mode toggle */}
      <div className="bg-white p-2 rounded-[28px] shadow-sm border border-gray-100 flex gap-2 mb-8 w-fit">
        <button onClick={() => setMode('promote')}
          className={`px-8 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'promote' ? 'bg-violet-600 text-white shadow-xl shadow-violet-100' : 'text-gray-400 hover:text-gray-600'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
          Promote to Next Class
        </button>
        <button onClick={() => setMode('graduate')}
          className={`px-8 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'graduate' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'text-gray-400 hover:text-gray-600'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          Graduate Final Class
        </button>
      </div>

      <div className={`grid gap-8 ${mode === 'promote' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-lg'}`}>

        {/* FROM card */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</p>
              <p className="text-sm font-black text-gray-700">Current Class & Session</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Session Year</label>
              <select
                value={fromSession}
                onChange={e => setFromSession(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-violet-400 outline-none transition-all appearance-none">
                <option value="">Select session year...</option>
                {sessionYears.map(y => (
                  <option key={y} value={y}>{y}{y === activeSession?.year ? ' (Active)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Class</label>
              <select
                value={fromClassId}
                onChange={e => setFromClassId(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-violet-400 outline-none transition-all appearance-none">
                <option value="">Select class...</option>
                {classes.map(c => {
                  const count = students.filter(s => s.classId === c.id && s.status === 'Active').length;
                  return <option key={c.id} value={c.id}>{c.name} {c.arm} ({count} active students)</option>;
                })}
              </select>
            </div>

            {/* Preview count */}
            {fromClassId && (
              <div className={`rounded-2xl p-4 flex items-center gap-3 ${fromClassStudents.length > 0 ? 'bg-violet-50' : 'bg-gray-50'}`}>
                <span className={`text-2xl font-black ${fromClassStudents.length > 0 ? 'text-violet-600' : 'text-gray-400'}`}>
                  {fromClassStudents.length}
                </span>
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Active student{fromClassStudents.length !== 1 ? 's' : ''} eligible for {mode === 'graduate' ? 'graduation' : 'promotion'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* TO card — only for promote mode */}
        {mode === 'promote' && (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">To</p>
                <p className="text-sm font-black text-gray-700">Destination Class & Session</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Session Year</label>
                <select
                  value={toSession}
                  onChange={e => setToSession(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-violet-400 outline-none transition-all appearance-none">
                  <option value="">Select session year...</option>
                  {sessionYears.map(y => (
                    <option key={y} value={y}>{y}{y === activeSession?.year ? ' (Active)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Class</label>
                <select
                  value={toClassId}
                  onChange={e => setToClassId(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-violet-400 outline-none transition-all appearance-none">
                  <option value="">Select destination class...</option>
                  {classes.filter(c => c.id !== fromClassId).map(c => {
                    const count = students.filter(s => s.classId === c.id && s.status === 'Active').length;
                    return <option key={c.id} value={c.id}>{c.name} {c.arm} ({count} current students)</option>;
                  })}
                </select>
              </div>

              {/* Arrow indicator */}
              {fromClassId && toClassId && (
                <div className="bg-violet-50 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-violet-700">{fromClass?.name} {fromClass?.arm}</span>
                  <svg className="w-5 h-5 text-violet-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-black text-violet-700">{toClass?.name} {toClass?.arm}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Graduate info card */}
        {mode === 'graduate' && (
          <div className="bg-amber-50 rounded-[32px] border border-amber-100 p-6 flex gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-amber-800 mb-1">What happens on graduation?</p>
              <ul className="text-xs text-amber-700 font-medium space-y-1">
                <li>• Student status changes to "Graduated"</li>
                <li>• Graduation year is recorded</li>
                <li>• All academic history remains accessible</li>
                <li>• Student appears in Alumni section</li>
                <li>• Records become read-only</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Proceed button */}
      <div className="mt-8">
        <button
          onClick={handleProceed}
          disabled={
            !fromClassId || !fromSession || fromClassStudents.length === 0 ||
            (mode === 'promote' && (!toClassId || !toSession || fromClassId === toClassId))
          }
          className={`w-full max-w-sm py-5 text-white rounded-[28px] font-black uppercase tracking-widest text-sm shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${mode === 'graduate' ? 'bg-amber-500 shadow-amber-100 hover:bg-amber-600' : 'bg-violet-600 shadow-violet-100 hover:bg-violet-700'}`}>
          Select Students to {mode === 'graduate' ? 'Graduate' : 'Promote'} →
        </button>

        {/* Validation hints */}
        {fromClassId && fromClassStudents.length === 0 && (
          <p className="text-xs font-bold text-rose-400 mt-3 ml-1">⚠ No active students found in this class</p>
        )}
        {mode === 'promote' && fromClassId && toClassId && fromClassId === toClassId && (
          <p className="text-xs font-bold text-rose-400 mt-3 ml-1">⚠ From and To class must be different</p>
        )}
      </div>
    </div>
  );
};

export default PromotionManagement;

