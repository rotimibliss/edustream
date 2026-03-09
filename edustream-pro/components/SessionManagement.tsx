import React, { useState, useEffect, useCallback } from 'react';
import { AcademicSession } from '../types';

// ─── Direct API helpers — zero apiService dependency ─────────────────────────
const API_BASE = 'http://localhost:3001/api/sessions';

const apiFetch = async (url: string, options?: RequestInit) => {
  const token = localStorage.getItem('edustream_auth_token') || sessionStorage.getItem('edustream_auth_token') || '';
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
};

const SessionsAPI = {
  getAll: (): Promise<AcademicSession[]> => apiFetch(API_BASE),
  create: (year: string, term: string)  => apiFetch(API_BASE, { method: 'POST', body: JSON.stringify({ year, term }) }),
  activate: (id: string)                => apiFetch(`${API_BASE}/${id}/activate`, { method: 'PUT' }),
  remove: (id: string)                  => apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' }),
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TERMS = ['1st Term', '2nd Term', '3rd Term'] as const;
type Term = typeof TERMS[number];

const defaultYear = () => {
  const y = new Date().getFullYear();
  return `${y}/${y + 1}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
const SessionManagement: React.FC = () => {
  const [sessions,    setSessions]    = useState<AcademicSession[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [pageError,   setPageError]   = useState('');

  // Modal
  const [modalOpen,   setModalOpen]   = useState(false);
  const [year,        setYear]        = useState(defaultYear());
  const [term,        setTerm]        = useState<Term>('1st Term');
  const [formError,   setFormError]   = useState('');
  const [saving,      setSaving]      = useState(false);

  // Per-card loading
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setPageError('');
    try {
      const data = await SessionsAPI.getAll();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setPageError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open modal ────────────────────────────────────────────────────────────
  const openModal = () => {
    setYear(defaultYear());
    setTerm('1st Term');
    setFormError('');
    setModalOpen(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedYear = year.trim();
    if (!trimmedYear) { setFormError('Please enter an academic year.'); return; }

    // Instant duplicate check (no round trip needed)
    if (sessions.some(s => s.year === trimmedYear && s.term === term)) {
      setFormError(`"${trimmedYear} · ${term}" already exists.`);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await SessionsAPI.create(trimmedYear, term);
      await load();
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Could not create session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Activate ──────────────────────────────────────────────────────────────
  const handleActivate = async (s: AcademicSession) => {
    if (!window.confirm(
      `Switch the active term to "${s.year} · ${s.term}"?\n\nThis will affect all result lookups globally.`
    )) return;

    setActivatingId(s.id);
    try {
      await SessionsAPI.activate(s.id);
      await load();
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to activate session.');
    } finally {
      setActivatingId(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm(
      'Permanently delete this session?\n\nResult records linked to it may become orphaned.'
    )) return;

    setDeletingId(id);
    try {
      await SessionsAPI.remove(id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to delete session.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Sessions...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const sessionsByYear = sessions.reduce<Record<string, AcademicSession[]>>((acc, s) => {
    if (!acc[s.year]) acc[s.year] = [];
    acc[s.year].push(s);
    return acc;
  }, {});

  const sortedYears = Object.keys(sessionsByYear).sort((a, b) => b.localeCompare(a));
  const termOrder = (t: string) => TERMS.indexOf(t as Term);

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-6xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Academic Sessions</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
            Global Term Control · {sessions.length} session{sessions.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={openModal}
          className="bg-indigo-600 text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 w-fit"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          New Term / Session
        </button>
      </div>

      {/* ── Page-level error ── */}
      {pageError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {pageError}
        </div>
      )}

      {/* -- Sessions grid -- */}
      <div className="space-y-10">
        {sessions.length === 0 ? (
          <div className="py-32 text-center opacity-20 flex flex-col items-center gap-4">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xl font-black uppercase tracking-[0.3em]">No Sessions Yet</p>
            <p className="text-sm">Click "New Term / Session" to get started</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedYears.map(yearKey => (
              <div key={yearKey} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">{yearKey}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{sessionsByYear[yearKey].length} term{sessionsByYear[yearKey].length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sessionsByYear[yearKey]
                    .slice()
                    .sort((a, b) => termOrder(a.term) - termOrder(b.term))
                    .map(s => (
                      <div
                        key={s.id}
                        className={`relative bg-white rounded-[40px] p-8 border-2 transition-all overflow-hidden group shadow-sm
                          ${s.isActive
                            ? 'border-emerald-400 shadow-2xl shadow-emerald-50'
                            : 'border-transparent hover:border-indigo-100 hover:shadow-xl'
                          }`}
                      >
                        {/* Active badge */}
                        {s.isActive && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white px-5 py-2 rounded-bl-[24px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                            Active Term
                          </div>
                        )}

                        <div className="space-y-6">
                          <div className="pt-2">
                            <h3 className="text-3xl font-black text-gray-800 tracking-tight leading-none">{s.year}</h3>
                            <p className={`text-sm font-black uppercase tracking-[0.2em] mt-2 ${s.isActive ? 'text-emerald-500' : 'text-gray-400'}`}>
                              {s.term}
                            </p>
                          </div>

                          <div className="pt-5 border-t border-gray-50 flex items-center justify-between">
                            {/* Activate / live indicator */}
                            {s.isActive ? (
                              <div className="flex items-center gap-2 text-emerald-500">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-widest">Currently Live</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleActivate(s)}
                                disabled={!!activatingId}
                                className="text-xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                {activatingId === s.id
                                  ? <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                  : null
                                }
                                Activate Term
                              </button>
                            )}

                            {/* Delete (inactive only, revealed on hover) */}
                            {!s.isActive && (
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={!!deletingId}
                                className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40"
                                title="Delete session"
                              >
                                {deletingId === s.id
                                  ? <div className="w-5 h-5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
                                  : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )
                                }
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* "Add new" card */}
        <button
          onClick={openModal}
          className="bg-white rounded-[40px] border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all p-12 flex flex-col items-center justify-center gap-4 group min-h-[200px]"
        >
          <div className="w-16 h-16 rounded-[24px] bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all group-hover:rotate-12">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-indigo-600 transition-colors">
            Setup New Term
          </span>
        </button>
      </div>

      {/* -- Modal ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg animate-fadeIn overflow-hidden">

            {/* Modal header */}
            <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">Create New Term</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                  New sessions start inactive — activate when ready
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-50 p-3 rounded-2xl text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSave} className="px-10 py-8 space-y-7">

              {/* Year */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Academic Year
                </label>
                <input
                  required
                  placeholder="e.g. 2025/2026"
                  className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-3xl font-black text-lg focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  value={year}
                  onChange={e => { setYear(e.target.value); setFormError(''); }}
                />
              </div>

              {/* Term picker */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Term
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TERMS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTerm(t); setFormError(''); }}
                      className={`py-4 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all
                        ${term === t
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inline error */}
              {formError && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-600 px-5 py-4 rounded-2xl">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-xs font-black leading-relaxed">{formError}</p>
                </div>
              )}

              {/* CTA buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-3"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Saving...' : 'Save Term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;

